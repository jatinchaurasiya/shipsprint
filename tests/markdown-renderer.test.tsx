import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  parseInlineMarkdown,
  parseMarkdownBlocks,
  safeMarkdownHref,
} from "@/lib/markdown";
import { MarkdownViewer } from "@/components/renderer/markdown-viewer";
import {
  generatePrivacyPolicy,
  generateSupportPage,
} from "@/lib/legal-pages";

const ROOT = process.cwd();

function render(markdown: string): string {
  return renderToStaticMarkup(<MarkdownViewer markdown={markdown} />);
}

describe("C3 — safeMarkdownHref", () => {
  it("allows http, https, mailto, tel, root-relative and anchors", () => {
    expect(safeMarkdownHref("https://example.com")).toBe("https://example.com");
    expect(safeMarkdownHref("http://example.com/a?b=c")).toBe("http://example.com/a?b=c");
    expect(safeMarkdownHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(safeMarkdownHref("mailto:hello@example.com?subject=Hi")).toBe(
      "mailto:hello@example.com?subject=Hi",
    );
    expect(safeMarkdownHref("tel:+15551234567")).toBe("tel:+15551234567");
    expect(safeMarkdownHref("/terms")).toBe("/terms");
    expect(safeMarkdownHref("/site/botch/privacy")).toBe("/site/botch/privacy");
    expect(safeMarkdownHref("#faq")).toBe("#faq");
  });

  it("rejects script-bearing schemes and smuggling attempts", () => {
    const blocked = [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "blob:https://example.com/uuid",
      "about:blank",
      "//evil.com",
      "/\\evil.com",
      "https://example.com/\" onmouseover=\"alert(1)",
      "https://example.com/\\evil.com",
      "https://example.com/' onload='alert(1)",
      "",
      "   ",
    ];
    for (const value of blocked) {
      expect(safeMarkdownHref(value), `expected blocked: ${value}`).toBe("#");
    }
  });
});

describe("C3 — parseInlineMarkdown", () => {
  it("returns plain text untouched (React will escape it)", () => {
    expect(parseInlineMarkdown("hello world")).toEqual([
      { type: "text", value: "hello world" },
    ]);
    expect(parseInlineMarkdown("<img src=x onerror=alert(1)>")).toEqual([
      { type: "text", value: "<img src=x onerror=alert(1)>" },
    ]);
  });

  it("parses bold and italic", () => {
    const nodes = parseInlineMarkdown("**bold** and *italic*");
    expect(nodes[0]).toMatchObject({ type: "strong" });
    expect(nodes[1]).toEqual({ type: "text", value: " and " });
    expect(nodes[2]).toMatchObject({ type: "em" });
  });

  it("parses links and sanitizes the href", () => {
    const ok = parseInlineMarkdown("[label](https://example.com)");
    expect(ok[0]).toMatchObject({ type: "link", href: "https://example.com" });

    const bad = parseInlineMarkdown("[label](javascript:alert(1))");
    expect(bad[0]).toMatchObject({ type: "link", href: "#" });

    const mail = parseInlineMarkdown("[mail](mailto:a@b.com)");
    expect(mail[0]).toMatchObject({ type: "link", href: "mailto:a@b.com" });
  });

  it("supports nested formatting inside a link label", () => {
    const nodes = parseInlineMarkdown("[**bold link**](https://example.com)");
    expect(nodes[0]).toMatchObject({ type: "link", href: "https://example.com" });
    const link = nodes[0];
    if (link && link.type === "link") {
      expect(link.children[0]).toMatchObject({ type: "strong" });
    }
  });

  it("treats unmatched markers as text", () => {
    expect(parseInlineMarkdown("2 * 3 = 6")).toEqual([
      { type: "text", value: "2 * 3 = 6" },
    ]);
    expect(parseInlineMarkdown("a ** b")).toEqual([{ type: "text", value: "a ** b" }]);
  });
});

describe("C3 — parseMarkdownBlocks", () => {
  it("parses headings, paragraphs, lists and rules", () => {
    expect(parseMarkdownBlocks("# Title")).toEqual([
      { type: "heading", level: 1, text: "Title" },
    ]);
    expect(parseMarkdownBlocks("## Sub")).toEqual([
      { type: "heading", level: 2, text: "Sub" },
    ]);
    expect(parseMarkdownBlocks("### Sub")).toEqual([
      { type: "heading", level: 3, text: "Sub" },
    ]);
    expect(parseMarkdownBlocks("#### Sub")).toEqual([
      { type: "heading", level: 4, text: "Sub" },
    ]);
    expect(parseMarkdownBlocks("- one\n- two")).toEqual([
      { type: "list", items: ["one", "two"] },
    ]);
    expect(parseMarkdownBlocks("---")).toEqual([{ type: "hr" }]);
    expect(parseMarkdownBlocks("hello")).toEqual([
      { type: "paragraph", text: "hello" },
    ]);
  });

  it("parses a mixed document", () => {
    const blocks = parseMarkdownBlocks(
      "# Title\n\nHello **world**\n\n- a\n- b\n\n---\n\nBye",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "hr",
      "paragraph",
    ]);
  });
});

describe("C3 — rendered output is XSS-proof", () => {
  it("escapes raw HTML instead of executing it", () => {
    const html = render("<img src=x onerror=alert(document.domain)>");
    expect(html).not.toContain("<img");
    // no element with an event-handler attribute is ever emitted
    expect(html).not.toMatch(/<[a-z][^>]*\bon[a-z]+\s*=/i);
    expect(html).toContain("&lt;img");
  });

  it("neutralizes javascript: links", () => {
    const html = render("[click](javascript:alert(document.cookie))");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("href=\"#\"");
  });

  it("neutralizes data: and vbscript: links", () => {
    expect(render("[x](data:text/html,<script>alert(1)</script>)")).not.toContain("data:");
    expect(render("[x](vbscript:msgbox(1))")).not.toContain("vbscript:");
  });

  it("keeps legitimate links working", () => {
    expect(render("[ok](https://example.com)")).toContain("href=\"https://example.com\"");
    expect(render("[mail](mailto:a@b.com)")).toContain("href=\"mailto:a@b.com\"");
    expect(render("[terms](/terms)")).toContain("href=\"/terms\"");
  });

  it("renders bold/italic/headings/lists as React elements", () => {
    const html = render("# Title\n\n**bold** and *italic*\n\n- one\n- two");
    expect(html).toContain("<h1");
    expect(html).toContain("<strong");
    expect(html).toContain("<em");
    expect(html).toContain("<li");
  });

  it("survives a combined attack payload", () => {
    const payload = [
      "# Title <img src=x onerror=alert(1)>",
      "[x](javascript:alert(1))",
      "[ok](https://example.com)",
      "**bold <script>alert(1)</script>**",
      "- <svg onload=alert(1)>",
    ].join("\n");
    const html = render(payload);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<svg");
    expect(html).not.toMatch(/<[a-z][^>]*\bon[a-z]+\s*=/i);
    expect(html).not.toContain("javascript:");
    // the legitimate link still works
    expect(html).toContain("href=\"https://example.com\"");
  });

  it("makes malicious brand names in generated legal pages inert", () => {
    const evilName = "App <img src=x onerror=alert(1)>";
    const html = render(generatePrivacyPolicy(evilName, "a@b.com"));
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<[a-z][^>]*\bon[a-z]+\s*=/i);
    expect(html).toContain("&lt;img");

    const support = render(generateSupportPage("App", "support@app.com"));
    expect(support).toContain("href=\"mailto:support@app.com\"");
  });
});

describe("C3 — the old HTML sink is gone", () => {
  it("page-renderer.tsx no longer uses dangerouslySetInnerHTML or formatInline", () => {
    const src = readFileSync(
      join(ROOT, "components/renderer/page-renderer.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
    expect(src).not.toMatch(/formatInline/);
  });

  it("no renderer builds HTML strings from markdown", () => {
    for (const file of [
      "components/renderer/markdown-viewer.tsx",
      "lib/markdown.ts",
    ]) {
      const src = readFileSync(join(ROOT, file), "utf8");
      expect(src).not.toMatch(/dangerouslySetInnerHTML\s*=/);
      expect(src).not.toMatch(/\.innerHTML\s*=/);
    }
  });
});