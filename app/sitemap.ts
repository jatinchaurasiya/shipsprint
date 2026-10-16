/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveSitemapEntries } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let host = "";
  try {
    const reqHeaders = await headers();
    host = reqHeaders.get("host") || "";
  } catch {
    // Graceful fallback if headers() is unavailable
  }

  return resolveSitemapEntries(host);
}
