import React from "react";
import {
  parseInlineMarkdown,
  parseMarkdownBlocks,
  type InlineNode,
} from "@/lib/markdown";

/**
 * Renders the safe markdown token tree (lib/markdown.ts) as React elements.
 *
 * There is no `dangerouslySetInnerHTML` here and no HTML string is ever built:
 * React escapes every text node and attribute, so markdown content — including
 * customer-authored page bodies, blog posts and the generated legal pages —
 * cannot inject markup or script.
 */

function InlineNodes({ nodes }: { nodes: InlineNode[] }): React.ReactElement {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case "text":
            return <React.Fragment key={index}>{node.value}</React.Fragment>;
          case "strong":
            return (
              <strong
                key={index}
                className="font-semibold text-zinc-950 dark:text-zinc-50"
              >
                <InlineNodes nodes={node.children} />
              </strong>
            );
          case "em":
            return (
              <em key={index} className="italic">
                <InlineNodes nodes={node.children} />
              </em>
            );
          case "link":
            return (
              <a
                key={index}
                href={node.href}
                className="text-zinc-900 underline underline-offset-4 font-medium dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InlineNodes nodes={node.children} />
              </a>
            );
        }
      })}
    </>
  );
}

const HEADING_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-6 mb-4",
  2: "text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mt-8 mb-3 border-b border-zinc-100 pb-2 dark:border-zinc-800",
  3: "text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-6 mb-2",
  4: "text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-4 mb-1",
};

function Heading({
  level,
  children,
}: {
  level: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}): React.ReactElement {
  const className = HEADING_CLASS[level];
  if (level === 1) return <h1 className={className}>{children}</h1>;
  if (level === 2) return <h2 className={className}>{children}</h2>;
  if (level === 3) return <h3 className={className}>{children}</h3>;
  return <h4 className={className}>{children}</h4>;
}

export function MarkdownViewer({
  markdown,
}: {
  markdown: string;
}): React.ReactElement {
  if (!markdown) {
    return (
      <p className="text-zinc-500 italic">No content available for this page.</p>
    );
  }

  const blocks = parseMarkdownBlocks(markdown);

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <Heading key={index} level={block.level}>
                <InlineNodes nodes={parseInlineMarkdown(block.text)} />
              </Heading>
            );
          case "paragraph":
            return (
              <p
                key={index}
                className="my-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
              >
                <InlineNodes nodes={parseInlineMarkdown(block.text)} />
              </p>
            );
          case "list":
            return (
              <ul
                key={index}
                className="my-4 list-disc pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineNodes nodes={parseInlineMarkdown(item)} />
                  </li>
                ))}
              </ul>
            );
          case "hr":
            return (
              <hr key={index} className="my-8 border-zinc-200 dark:border-zinc-800" />
            );
        }
      })}
    </>
  );
}