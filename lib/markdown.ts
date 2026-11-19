/**
 * Safe, dependency-free markdown subset parser.
 *
 * Why this exists
 * ---------------
 * The previous renderer injected markdown into the DOM with
 * `dangerouslySetInnerHTML` and no escaping. Any site owner could put
 * `<img src=x onerror=...>` or `[x](javascript:...)` in a page body and
 * execute script on the public site — a stored XSS that could steal the
 * session of any logged-in ShipSprint user (the auth cookie is scoped to the
 * apex domain and is not httpOnly).
 *
 * This parser returns a token tree. The renderer maps the tree to React
 * elements, and React escapes every text node and attribute by construction —
 * there is no HTML string anywhere in the pipeline, so there is no injection
 * sink to get wrong.
 *
 * Supported subset (deliberately small):
 *   - headings: `# `, `## `, `### `, `#### `
 *   - paragraphs (one per non-empty line)
 *   - unordered lists: `- item` / `* item`
 *   - horizontal rules: `---` / `***`
 *   - inline: `**bold**`, `*italic*`, `[label](href)`
 *
 * This module is isomorphic (no node-only imports) so both the renderer and
 * the unit tests can import it.
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "hr" };

/** C0 controls and DEL. The URL parser strips \t \n \r, enabling scheme smuggling. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Reduces an untrusted markdown link target to a safe href.
 *
 * Allowed:
 *   - http: / https: absolute URLs
 *   - mailto: / tel: (needed by the generated legal/support pages)
 *   - root-relative paths (`/terms`) and in-page anchors (`#faq`)
 *
 * Everything else — `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`,
 * protocol-relative `//host`, backslash-smuggled `/\host`, control chars,
 * quotes — becomes `#`, which React renders as an inert link.
 */
export function safeMarkdownHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "#";

  // Control characters and quote/backslash breakout attempts.
  if (CONTROL_CHARS.test(trimmed)) return "#";
  if (trimmed.includes("\\")) return "#";
  if (trimmed.includes('"') || trimmed.includes("'")) return "#";

  // In-page anchor.
  if (trimmed.startsWith("#")) return trimmed;

  // Root-relative path, but not protocol-relative.
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? "#" : trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:" ||
      url.protocol === "tel:"
    ) {
      return trimmed;
    }
  } catch {
    // not an absolute URL
  }

  return "#";
}

/**
 * Matches the first inline token in a string:
 *   1. `**bold**`
 *   2. `*italic*`
 *   3. `[label](href)`
 *
 * Alternation order matters: bold must be tried before italic so `**x**` is
 * not read as an italic `*` followed by `*x*`.
 */
const INLINE_TOKEN = /\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|\[([\s\S]*?)\]\(([\s\S]*?)\)/;

/**
 * Parses inline markdown into a token tree. Never throws; never produces HTML.
 * Unmatched markers are plain text.
 */
export function parseInlineMarkdown(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = INLINE_TOKEN.exec(rest);
    if (!match || match.index === undefined) {
      nodes.push({ type: "text", value: rest });
      break;
    }

    if (match.index > 0) {
      nodes.push({ type: "text", value: rest.slice(0, match.index) });
    }

    if (match[1] !== undefined) {
      nodes.push({ type: "strong", children: parseInlineMarkdown(match[1]) });
    } else if (match[2] !== undefined) {
      nodes.push({ type: "em", children: parseInlineMarkdown(match[2]) });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push({
        type: "link",
        href: safeMarkdownHref(match[4]),
        children: parseInlineMarkdown(match[3]),
      });
    }

    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

/**
 * Parses a full markdown document into block tokens.
 *
 * One non-empty line = one paragraph (matching the previous renderer's
 * behaviour). Lists are grouped across consecutive `- ` / `* ` lines.
 */
export function parseMarkdownBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
      continue;
    }

    flushList();

    if (line === "") continue;

    if (line === "---" || line === "***") {
      blocks.push({ type: "hr" });
      continue;
    }

    if (line.startsWith("#### ")) {
      blocks.push({ type: "heading", level: 4, text: line.slice(5) });
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, text: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", level: 2, text: line.slice(3) });
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "heading", level: 1, text: line.slice(2) });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  flushList();
  return blocks;
}