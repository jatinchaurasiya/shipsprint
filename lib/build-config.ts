import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Verification of the `NEXT_PUBLIC_*` values the client bundle was BUILT with.
 *
 * The runtime environment is not evidence of this. `NEXT_PUBLIC_*` variables
 * are substituted into the JavaScript bundle by the compiler, so a container can
 * hold perfectly correct runtime values while shipping a bundle that has no
 * Supabase configuration at all — because `docker-compose` passes them at
 * runtime but the image was built without them as build args.
 *
 * That exact state reached production. The symptom was not a server outage:
 * every page rendered, `/api/health` reported `healthy`, and the failure only
 * appeared in the browser, where `publicEnv()` threw on the first call and the
 * signup form deadlocked with every button permanently disabled.
 *
 * `public-config.json` is written by the Dockerfile during the guarded build and
 * records what the compiler actually received, making it the only ground truth
 * available once the image is running. This module is deliberately free of
 * `server-only` so the evaluation can be unit tested.
 */

export type PublicConfigStatus = "ok" | "missing" | "error";

export interface PublicConfigStamp {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY_SET?: boolean;
  NEXT_PUBLIC_ROOT_DOMAIN?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

export const PUBLIC_CONFIG_FILENAME = "public-config.json";

/**
 * Classifies a build stamp.
 *
 * "error" means a stamp exists but records an unusable value — the signature of
 * an image whose compiler never received the build args. "missing" means there
 * is no stamp at all, which is expected outside the image (local `next dev`)
 * but in production identifies a pre-guard image whose bundle cannot be trusted.
 */
export function evaluatePublicConfigStamp(raw: string | null): PublicConfigStatus {
  if (raw === null) return "missing";

  let stamp: PublicConfigStamp;
  try {
    stamp = JSON.parse(raw) as PublicConfigStamp;
  } catch {
    return "error";
  }

  if (typeof stamp !== "object" || stamp === null) return "error";

  const url = typeof stamp.NEXT_PUBLIC_SUPABASE_URL === "string"
    ? stamp.NEXT_PUBLIC_SUPABASE_URL.trim()
    : "";

  return url && stamp.NEXT_PUBLIC_SUPABASE_ANON_KEY_SET === true ? "ok" : "error";
}

/**
 * Reads the build stamp from disk. A missing file yields "missing" rather than
 * throwing, because that is a meaningful state rather than an error.
 */
export async function readPublicConfigStamp(
  cwd: string = process.cwd()
): Promise<PublicConfigStatus> {
  try {
    const raw = await readFile(join(cwd, PUBLIC_CONFIG_FILENAME), "utf8");
    return evaluatePublicConfigStamp(raw);
  } catch {
    return "missing";
  }
}