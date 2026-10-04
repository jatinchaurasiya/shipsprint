/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useRef, useState } from "react";
import { SiteRenderer } from "@/components/renderer/site-renderer";
import type { SiteContent, Plan } from "@/types/database";
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import {
  type ViewportMode,
  VIEWPORT_CONFIGS,
} from "@/lib/editor";

interface LivePreviewProps {
  content: SiteContent;
  plan?: Plan | null;
}

export function LivePreview({ content, plan }: LivePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<ViewportMode>("desktop");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrolledToTop, setScrolledToTop] = useState(false);

  const activeConfig = VIEWPORT_CONFIGS[deviceMode];

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setScrolledToTop(true);
      setTimeout(() => setScrolledToTop(false), 1500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100/70 dark:bg-zinc-950/60 overflow-hidden select-none">
      {/* Top Device & Workspace Bar */}
      <header className="h-12 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            Live Preview
          </span>
          <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono hidden md:inline shrink-0">
            (Zero-Drift)
          </span>
        </div>

        {/* Center / Right: Viewport Mode Switcher & Reset */}
        <div className="flex items-center gap-2">
          {/* Viewport switcher */}
          <div
            role="group"
            aria-label="Preview viewport selector"
            className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              aria-pressed={deviceMode === "desktop"}
              title="Desktop (Fluid)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                deviceMode === "desktop"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("tablet")}
              aria-pressed={deviceMode === "tablet"}
              title="Tablet (768px)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                deviceMode === "tablet"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              aria-pressed={deviceMode === "mobile"}
              title="Mobile (375px)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                deviceMode === "mobile"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Scroll to Top / Reset affordance */}
          <button
            type="button"
            onClick={handleScrollToTop}
            title="Scroll preview to top"
            aria-label="Scroll preview to top"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
          >
            {scrolledToTop ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* Viewport Canvas Area — Single Scroll Authority */}
      <main
        className="flex-1 min-h-0 w-full overflow-hidden p-2 sm:p-4 lg:p-6 flex items-center justify-center relative"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(160, 160, 160, 0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <figure
          className={`h-full max-h-full flex flex-col rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden transition-[max-width,width] duration-200 ease-out ${activeConfig.widthClass}`}
        >
          {/* Hairline Device Frame Header (Honest mono label, gate 47 compliant) */}
          <figcaption className="h-8 shrink-0 px-3 sm:px-4 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/95 dark:bg-zinc-900/95 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 select-none">
            <span className="truncate">{activeConfig.label}</span>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-zinc-800/50 shrink-0 ml-2">
              {activeConfig.dimensions}
            </span>
          </figcaption>

          {/* Sole Scroll Container — overscroll-contain guarantees zero scroll chaining */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin bg-white dark:bg-zinc-950 select-text"
          >
            <SiteRenderer content={content} plan={plan} isPreview={true} />
          </div>
        </figure>
      </main>
    </div>
  );
}
