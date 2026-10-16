/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { NextResponse, type NextRequest } from "next/server";
import { resolveSitemapEntries, formatSitemapXml } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/**
 * Route handler for /site.xml to support Google Search Crawler and other tools
 * requesting site.xml directly. Produces valid XML with Sitemaps.org and Google Image
 * namespaces and correct caching directives.
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const entries = await resolveSitemapEntries(host);
  const xml = formatSitemapXml(entries);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
