/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React from "react";
import type { SiteContent, SitePage } from "@/types/database";
import Link from "next/link";
import { ArrowLeft, Mail, ArrowUpRight } from "lucide-react";

interface PageRendererProps {
  content: SiteContent;
  page: SitePage;
  homeHref?: string;
}

export function PageRenderer({
  content,
  page,
  homeHref = "/",
}: PageRendererProps) {
  const brand = content?.brand || { name: "App" };
  const appName = brand.name || content?.hero?.app_name || "App";
  const contactEmail = content?.footer?.contact_email || "support@example.com";

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-950 antialiased selection:bg-zinc-950 selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-xs font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-80 dark:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {appName}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Official Legal & Support
            </span>
          </div>
        </div>
      </header>

      {/* Main Page Article Container */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Custom Markdown Parser / Renderer */}
          <MarkdownViewer markdown={page.content_markdown || ""} />
        </article>

        {/* Quick Contact Footer Strip */}
        <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Have questions or need assistance?
              </div>
              <div className="text-[11px] text-zinc-500">
                Direct developer contact for {appName}
              </div>
            </div>
          </div>
          <a
            href={`mailto:${contactEmail}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
          >
            <span>Contact {contactEmail}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href={homeHref} className="hover:underline">Home</Link>
            {((content?.pages || []).filter((p) => p.is_published !== false && p.slug !== "home").length > 0
              ? (content?.pages || []).filter((p) => p.is_published !== false && p.slug !== "home")
              : [
                  { id: "fallback-privacy", slug: "privacy", title: "Privacy" },
                  { id: "fallback-terms", slug: "terms", title: "Terms" },
                  { id: "fallback-support", slug: "support", title: "Support" },
                ]
            ).map((p) => (
              <Link
                key={p.id || p.slug}
                href={`${homeHref === "/" ? "" : homeHref}/${p.slug}`}
                className="hover:underline"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Lightweight, robust Markdown Viewer adhering to typography rules.
 */
function MarkdownViewer({ markdown }: { markdown: string }) {
  if (!markdown) {
    return <p className="text-zinc-500 italic">No content available for this page.</p>;
  }

  const lines = markdown.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${renderedElements.length}`} className="my-4 list-disc pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      listItems.push(line.slice(2));
      return;
    } else {
      flushList();
    }

    if (line.startsWith("# ")) {
      renderedElements.push(
        <h1 key={index} className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-6 mb-4">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      renderedElements.push(
        <h2 key={index} className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-8 mb-3 border-b border-zinc-100 pb-2 dark:border-zinc-800">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      renderedElements.push(
        <h3 key={index} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-6 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      renderedElements.push(
        <h4 key={index} className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-4 mb-1">
          {line.slice(5)}
        </h4>
      );
    } else if (line === "---" || line === "***") {
      renderedElements.push(
        <hr key={index} className="my-8 border-zinc-200 dark:border-zinc-800" />
      );
    } else if (line.length > 0) {
      renderedElements.push(
        <p key={index} className="my-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }
  });

  flushList();

  return <>{renderedElements}</>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-950 dark:text-zinc-50">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-zinc-900 underline underline-offset-4 font-medium dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400" target="_blank" rel="noopener noreferrer">$1</a>');
}
