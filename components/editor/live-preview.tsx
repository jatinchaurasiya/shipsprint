"use client";

import { useState } from "react";
import { SiteRenderer } from "@/components/renderer/site-renderer";
import type { SiteContent, Plan } from "@/types/database";
import { Smartphone, Monitor } from "lucide-react";

interface LivePreviewProps {
  content: SiteContent;
  plan?: Plan | null;
}

export function LivePreview({ content, plan }: LivePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100 dark:bg-zinc-900/60 overflow-hidden">
      {/* Top Device Bar */}
      <div className="h-12 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Real-Time Live Preview
          </span>
          <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono hidden sm:inline">
            (Zero-Drift Component)
          </span>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
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
            onClick={() => setDeviceMode("mobile")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              deviceMode === "mobile"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Viewport Display Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
        {deviceMode === "mobile" ? (
          /* Mobile preview — hairline frame with label, no re-drawn phone chrome (gate 47) */
          <figure className="my-4 w-full max-w-[375px] shrink-0 overflow-hidden rounded-2xl border border-zinc-300 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
            <figcaption className="border-b border-zinc-200 px-4 py-2 text-center text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              Mobile preview — 375px
            </figcaption>
            <div className="max-h-[720px] overflow-y-auto bg-white scrollbar-thin dark:bg-black">
              <SiteRenderer content={content} plan={plan} isPreview={true} />
            </div>
          </figure>
        ) : (
          /* Desktop preview — hairline frame with label, no traffic-light chrome (gate 47) */
          <figure className="my-2 w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-800/80 dark:bg-zinc-950">
            <figcaption className="border-b border-zinc-200 px-4 py-2 text-center font-mono text-[11px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              preview.shipsprint.site
            </figcaption>

            <div className="max-h-[780px] overflow-y-auto scrollbar-thin">
              <SiteRenderer content={content} plan={plan} isPreview={true} />
            </div>
          </figure>
        )}
      </div>
    </div>
  );
}
