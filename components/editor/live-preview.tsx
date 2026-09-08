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
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono hidden sm:inline">
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
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
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
          /* iPhone-styled Mockup Frame */
          <div className="w-[375px] my-4 rounded-[48px] border-[10px] border-zinc-800 dark:border-zinc-700 bg-zinc-950 p-2 shadow-2xl shrink-0 overflow-hidden relative">
            {/* Dynamic island slot */}
            <div className="w-28 h-4 bg-zinc-800 rounded-full mx-auto mb-2" />
            <div className="rounded-[36px] overflow-y-auto max-h-[720px] bg-white dark:bg-black scrollbar-thin">
              <SiteRenderer content={content} plan={plan} isPreview={true} />
            </div>
          </div>
        ) : (
          /* Desktop Browser Mockup Frame */
          <div className="w-full max-w-5xl rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden my-2">
            {/* Browser Header Bar */}
            <div className="h-9 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-auto max-w-xs w-full bg-white dark:bg-zinc-950 rounded-md px-3 py-1 text-[11px] font-mono text-zinc-400 text-center truncate border border-zinc-200 dark:border-zinc-800/60">
                preview.shipsprint.site
              </div>
            </div>

            <div className="max-h-[780px] overflow-y-auto scrollbar-thin">
              <SiteRenderer content={content} plan={plan} isPreview={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
