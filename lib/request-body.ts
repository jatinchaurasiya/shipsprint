/**
 * Bounded, content-type-agnostic request body reading.
 *
 * This exists because the obvious one-liners are all wrong for a public,
 * unauthenticated endpoint like `POST /api/track`:
 *
 *  - `request.json()` throws whenever `Content-Type` is not exactly
 *    `application/json`. `navigator.sendBeacon` with a bare string body, older
 *    WebKit, and several privacy extensions all send `text/plain` or nothing
 *    at all, so the beacon 500s and the page view is lost silently.
 *  - `request.text()` reads the body with no upper bound. The App Router has
 *    no `bodyParser.sizeLimit` equivalent for route handlers, so an
 *    unauthenticated caller can stream an arbitrarily large payload straight
 *    into the heap and take the container down.
 *  - Both of them hand back whatever `JSON.parse` produced, including `null`,
 *    an array, or a number. `const { site_id } = JSON.parse(raw)` then throws
 *    `TypeError: Cannot destructure property 'site_id' of ... as it is null`
 *    — an unhandled 500 on a request that should have been a no-op.
 *
 * The contract here is deliberately absolute: these functions never throw, and
 * they never return anything other than a plain object of primitives. Every
 * failure is a value, so a caller cannot accidentally let one escape.
 *
 * Deliberately isomorphic (no `server-only`) so route handlers and unit tests
 * can both import it.
 */

/** 8 KB. Comfortably above any legitimate API payload, far below an OOM. */
export const DEFAULT_MAX_BODY_BYTES = 8 * 1024;

export type BodyRejectReason = "too_large" | "unreadable" | "malformed";

export type ReadBodyResult =
  | { ok: true; text: string }
  | { ok: false; reason: BodyRejectReason };

/** `charset=` out of a Content-Type header, lowercased. `null` if absent. */
function charsetOf(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const match = /;\s*charset\s*=\s*"?([^";,\s]+)"?/i.exec(contentType);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Decodes bytes to text.
 *
 * `Request.text()` hardcodes UTF-8, which is right for JSON (RFC 8259 requires
 * it) but mangles a `charset=windows-1252` or `iso-8859-1` body — the exact
 * shape a legacy `URLSearchParams` beacon can arrive in, and the shape that
 * would otherwise turn an accented `document.referrer` into replacement
 * characters. An unrecognised label falls back to UTF-8 rather than throwing.
 */
export function decodeBodyText(
  bytes: Uint8Array,
  contentType?: string | null,
): string {
  const charset = charsetOf(contentType);
  if (charset && charset !== "utf-8" && charset !== "utf8" && charset !== "us-ascii") {
    try {
      return new TextDecoder(charset).decode(bytes).replace(/^\uFEFF/, "");
    } catch {
      // Unsupported label: fall through to the UTF-8 default.
    }
  }
  // `TextDecoder("utf-8")` already consumes a leading BOM, but a non-UTF-8
  // decode or a stray concatenation can still leave one, and `JSON.parse`
  // rejects a BOM outright.
  return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

/**
 * Reads a request body as text, refusing anything over `maxBytes`.
 *
 * The declared `Content-Length` is checked first so an oversized request is
 * rejected without reading a single byte, then the stream is consumed chunk by
 * chunk and cancelled the moment the running total crosses the limit. A
 * lying or absent `Content-Length` (chunked transfer, or a deliberate
 * omission) therefore still cannot get more than `maxBytes` into memory.
 */
export async function readBodyText(
  request: Request,
  options: { maxBytes?: number } = {},
): Promise<ReadBodyResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const body = request.body;
  if (!body) return { ok: true, text: "" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    // Aborted mid-stream, or a malformed chunked encoding.
    return { ok: false, reason: "unreadable" };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    ok: true,
    text: decodeBodyText(bytes, request.headers.get("content-type")),
  };
}

/** A JSON object, or `null` for anything that is not one. Never throws. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  // Arrays and `null` are both `typeof "object"`, and both explode when
  // destructured or when `Object.entries` is called on them downstream.
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

/**
 * `URLSearchParams` to a plain record, refusing to write `__proto__`.
 *
 * `Object.fromEntries` defines properties, so it is not itself a pollution
 * vector, but an own `__proto__` key on a config object is a trap for the next
 * person who touches it. Dropping it here keeps the parsed body inert.
 */
function formToRecord(form: URLSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key === "__proto__" || key === "constructor") continue;
    const value = form.get(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

/**
 * Parses a body into a plain object regardless of how the client labelled it.
 *
 * JSON is tried first and is sufficient on its own: a body produced by
 * `JSON.stringify` is never also valid form encoding, so the two readings
 * cannot disagree. Only when JSON parsing fails do we try
 * `application/x-www-form-urlencoded`, which is what `sendBeacon(url, params)`
 * and every `<form>` post actually put on the wire. That widens the set of
 * bodies we *accept*; it does not widen what a caller is *allowed* to do, since
 * every field is still validated by the caller.
 *
 * An empty body is an empty object, not an error — a beacon that fails to send
 * is indistinguishable from one that was never fired, and must be a no-op.
 */
export function parseBodyObject(text: string): Record<string, unknown> | null {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (trimmed === "") return {};

  const asJson = parseJsonObject(trimmed);
  if (asJson) return asJson;

  // A body with no `=` is not form data either; skip the pointless parse.
  if (!trimmed.includes("=")) return null;

  try {
    return formToRecord(new URLSearchParams(trimmed));
  } catch {
    return null;
  }
}
