/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { SiteRenderer } from "@/components/renderer/site-renderer";
import type { SiteContent, Plan } from "@/types/database";
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  Signal,
  Wifi,
  Battery,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  type ViewportMode,
  VIEWPORT_CONFIGS,
} from "@/lib/editor";

interface LivePreviewProps {
  content: SiteContent;
  plan?: Plan | null;
  theme?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function LivePreview({
  content,
  plan,
  theme,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: LivePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<ViewportMode>("desktop");
  const [desktopMode, setDesktopMode] = useState<"fit" | "fluid">("fit");
  const [scaleMode, setScaleMode] = useState<"fit" | "actual">("fit");
  const [scrolledToTop, setScrolledToTop] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const activeConfig = VIEWPORT_CONFIGS[deviceMode];

  // Observe canvas dimensions to compute seamless auto-scale
  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setCanvasSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Proportional scale factor for Desktop (1200px widescreen)
  const desktopScale = useMemo(() => {
    if (!canvasSize.width || canvasSize.width <= 0) return 1;
    const availWidth = Math.max(320, canvasSize.width - 24);
    if (availWidth >= 1200) return 1;
    return Math.min(1, Math.max(0.35, Number((availWidth / 1200).toFixed(3))));
  }, [canvasSize.width]);

  // Proportional scale factor for Tablet iPad (800px × 1056px outer frame)
  const tabletScale = useMemo(() => {
    if (scaleMode === "actual") return 1;
    if (!canvasSize.width || !canvasSize.height) return 0.7;
    const availWidth = Math.max(300, canvasSize.width - 32);
    const availHeight = Math.max(300, canvasSize.height - 32);
    const scaleW = availWidth / 800;
    const scaleH = availHeight / 1056;
    return Math.min(1, Math.max(0.35, Number(Math.min(scaleW, scaleH).toFixed(3))));
  }, [canvasSize.width, canvasSize.height, scaleMode]);

  // Proportional scale factor for Mobile Apple iPhone 17 Pro (422px × 894px outer frame, 402px × 874px screen)
  const mobileScale = useMemo(() => {
    if (scaleMode === "actual") return 1;
    if (!canvasSize.width || !canvasSize.height) return 0.85;
    const availWidth = Math.max(280, canvasSize.width - 32);
    const availHeight = Math.max(300, canvasSize.height - 32);
    const scaleW = availWidth / 422;
    const scaleH = availHeight / 894;
    return Math.min(1, Math.max(0.4, Number(Math.min(scaleW, scaleH).toFixed(3))));
  }, [canvasSize.width, canvasSize.height, scaleMode]);

  const activeScale = useMemo(() => {
    if (deviceMode === "desktop") {
      return desktopMode === "fit" ? desktopScale : 1;
    }
    if (deviceMode === "tablet") return tabletScale;
    return mobileScale;
  }, [deviceMode, desktopMode, desktopScale, tabletScale, mobileScale]);

  const handleScrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      setScrolledToTop(true);
      setTimeout(() => setScrolledToTop(false), 1500);
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-100/70 dark:bg-zinc-950/60 overflow-hidden">
      {/* Top Device & Workspace Control Bar */}
      <header className="h-12 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Indicator & Sidebar Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={
                isSidebarCollapsed
                  ? "Expand editor sidebar"
                  : "Collapse sidebar (Full-width Desktop preview)"
              }
              aria-label={
                isSidebarCollapsed
                  ? "Expand editor sidebar"
                  : "Collapse sidebar"
              }
              className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs mr-1"
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Show Editor</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Expand View</span>
                </>
              )}
            </button>
          )}

          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            Live Preview
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden lg:inline shrink-0">
            (Zero-Drift)
          </span>
        </div>

        {/* Center: Viewport Mode Switcher */}
        <div
          role="group"
          aria-label="Preview viewport selector"
          className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <button
            type="button"
            onClick={() => setDeviceMode("desktop")}
            aria-pressed={deviceMode === "desktop"}
            title="Desktop (Computer / 1200px widescreen)"
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
            title="Tablet (Apple iPad / 768px)"
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
            title="Mobile (Apple iPhone 17 Pro · 402px)"
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

        {/* Right: View & Scale Controls + Reset */}
        <div className="flex items-center gap-1.5">
          {/* Desktop Fit / Fluid Toggle */}
          {deviceMode === "desktop" ? (
            <button
              type="button"
              onClick={() =>
                setDesktopMode((prev) => (prev === "fit" ? "fluid" : "fit"))
              }
              title={
                desktopMode === "fit"
                  ? "Switch to Fluid 100% canvas"
                  : "Switch to 1200px Desktop Fit"
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              {desktopMode === "fit" ? (
                <>
                  <Minimize2 className="w-3 h-3 text-blue-500" />
                  <span className="hidden xs:inline">1200px Fit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 text-emerald-500" />
                  <span className="hidden xs:inline">Fluid 100%</span>
                </>
              )}
            </button>
          ) : (
            /* Tablet/Mobile Fit vs 100% Toggle */
            <button
              type="button"
              onClick={() =>
                setScaleMode((prev) => (prev === "fit" ? "actual" : "fit"))
              }
              title={
                scaleMode === "fit"
                  ? "View at 100% actual scale"
                  : "Fit device frame to screen"
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              <span>{Math.round(activeScale * 100)}%</span>
              <span className="text-zinc-400">·</span>
              <span className="capitalize">{scaleMode}</span>
            </button>
          )}

          {/* Scroll to Top */}
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

      {/* Viewport Canvas Area — Dedicated Container with Single Scroll Authority */}
      <main
        ref={canvasRef}
        className="flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center relative p-2 sm:p-3"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(160, 160, 160, 0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* ======================================================== */}
        {/* DESKTOP VIEWPORT: 1200px True Widescreen or Fluid Canvas */}
        {/* ======================================================== */}
        {deviceMode === "desktop" && (
          <div
            className="h-full w-full flex items-center justify-center overflow-hidden"
            style={{
              perspective: "1000px",
            }}
          >
            {desktopMode === "fit" ? (
              /* 1200px Scaled Desktop Window: No squished columns or distorted wraps */
              <div
                style={{
                  width: 1200,
                  height: canvasSize.height
                    ? Math.max(500, (canvasSize.height - 24) / desktopScale)
                    : "100%",
                  transform: `scale(${desktopScale})`,
                  transformOrigin: "top center",
                }}
                className="flex flex-col rounded-2xl border border-zinc-300/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden transition-transform duration-150"
              >
                {/* Safari / macOS Desktop Chrome Bar */}
                <header className="h-9 shrink-0 px-4 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/95 dark:bg-zinc-900/95 select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 shadow-2xs" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 shadow-2xs" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50 shadow-2xs" />
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 shadow-2xs min-w-[240px] justify-center">
                    <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{activeConfig.label}</span>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 bg-zinc-200/60 dark:bg-zinc-800/60 px-2 py-0.5 rounded">
                    1200px Desktop
                  </div>
                </header>

                {/* Primary Scroll Container */}
                <div
                  ref={scrollContainerRef}
                  data-lenis-prevent
                  className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-white dark:bg-zinc-950 select-text"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    isolation: "isolate",
                  }}
                >
                  <SiteRenderer
                    content={content}
                    plan={plan}
                    isPreview={true}
                    theme={theme}
                    viewport="desktop"
                  />
                </div>
              </div>
            ) : (
              /* Fluid Desktop: 100% Canvas Width */
              <figure
                className={`h-full max-h-full flex flex-col rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden transition-[max-width,width] duration-200 ease-out ${activeConfig.widthClass}`}
              >
                <figcaption className="h-8 shrink-0 px-3 sm:px-4 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/95 dark:bg-zinc-900/95 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 select-none">
                  <span className="truncate">{activeConfig.label}</span>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-zinc-800/50 shrink-0 ml-2">
                    {activeConfig.dimensions}
                  </span>
                </figcaption>

                <div
                  ref={scrollContainerRef}
                  data-lenis-prevent
                  className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-white dark:bg-zinc-950 select-text"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    isolation: "isolate",
                  }}
                >
                  <SiteRenderer
                    content={content}
                    plan={plan}
                    isPreview={true}
                    theme={theme}
                    viewport="desktop"
                  />
                </div>
              </figure>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TABLET VIEWPORT: Authentic Apple iPad 768 × 1024 Frame    */}
        {/* ======================================================== */}
        {deviceMode === "tablet" && (
          <div
            className="h-full w-full flex items-center justify-center overflow-auto p-2"
            style={{
              perspective: "1000px",
            }}
          >
            <div
              style={{
                width: 800,
                height: 1056,
                transform: `scale(${tabletScale})`,
                transformOrigin: "center center",
              }}
              className="shrink-0 rounded-[38px] bg-gradient-to-b from-[#44454d] via-[#24252a] to-[#141517] p-[16px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.18),inset_0_1px_2px_rgba(255,255,255,0.4)] ring-1 ring-black/80 flex flex-col transition-transform duration-150"
            >
              {/* FaceTime Camera Pinhole in top bezel */}
              <div className="h-3 w-full flex items-center justify-center mb-1 shrink-0">
                <div className="h-2 w-2 rounded-full bg-[#0a0f18] ring-1 ring-white/10" />
              </div>

              {/* iPad Display Screen */}
              <div className="relative flex-1 min-h-0 w-full rounded-[24px] overflow-hidden bg-white dark:bg-zinc-950 flex flex-col ring-1 ring-black/90">
                {/* iPad iOS Status Bar */}
                <div className="h-7 shrink-0 px-5 pt-1 flex items-center justify-between bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200/60 dark:border-zinc-800/60 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 select-none z-10">
                  <span>9:41</span>
                  <div className="flex items-center gap-2">
                    <Signal className="w-3 h-3" />
                    <Wifi className="w-3 h-3" />
                    <Battery className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Scroll Container */}
                <div
                  ref={scrollContainerRef}
                  data-lenis-prevent
                  className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-white dark:bg-zinc-950 select-text"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    isolation: "isolate",
                  }}
                >
                  <SiteRenderer
                    content={content}
                    plan={plan}
                    isPreview={true}
                    theme={theme}
                    viewport="tablet"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MOBILE VIEWPORT: Authentic Apple iPhone 17 Pro Frame      */}
        {/* ======================================================== */}
        {deviceMode === "mobile" && (
          <div
            className="h-full w-full flex items-center justify-center overflow-auto p-2"
            style={{
              perspective: "1000px",
            }}
          >
            <div
              style={{
                width: 422,
                height: 894,
                transform: `scale(${mobileScale})`,
                transformOrigin: "center center",
              }}
              className="relative shrink-0 rounded-[55px] bg-gradient-to-b from-[#56575e] via-[#2f3036] to-[#121316] p-[3.5px] shadow-[0_36px_90px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.25),inset_0_1px_1.5px_rgba(255,255,255,0.5)] ring-1 ring-black/80 flex flex-col transition-transform duration-150"
            >
              {/* iPhone 17 Pro Hardware Side Buttons */}
              {/* Left: Action Button */}
              <div className="pointer-events-none absolute -left-[2.5px] top-[16%] h-[5%] w-[2.5px] rounded-l-xs bg-[#6a6b72] shadow-xs" />
              {/* Left: Volume Up */}
              <div className="pointer-events-none absolute -left-[2.5px] top-[24%] h-[7.5%] w-[2.5px] rounded-l-xs bg-[#6a6b72] shadow-xs" />
              {/* Left: Volume Down */}
              <div className="pointer-events-none absolute -left-[2.5px] top-[33%] h-[7.5%] w-[2.5px] rounded-l-xs bg-[#6a6b72] shadow-xs" />
              {/* Right: Side / Power Button */}
              <div className="pointer-events-none absolute -right-[2.5px] top-[23%] h-[11%] w-[2.5px] rounded-r-xs bg-[#6a6b72] shadow-xs" />
              {/* Right: Camera Control Touch Sensor (iPhone 16/17 Pro signature hardware) */}
              <div className="pointer-events-none absolute -right-[2.5px] top-[72%] h-[8%] w-[2.5px] rounded-r-xs bg-[#404147] ring-1 ring-black/40 shadow-inner" />

              {/* OLED True Black Display Bezel: Ultra-thin 1.2mm Apple display border */}
              <div className="relative h-full w-full rounded-[51px] bg-black p-[3.5px] ring-1 ring-black/90 flex flex-col overflow-hidden">
                {/* Active Screen Display Area: Exact Apple 402 × 874 pt display surface */}
                <div className="relative flex-1 min-h-0 w-full rounded-[48px] overflow-hidden bg-white dark:bg-zinc-950 flex flex-col ring-1 ring-white/10">
                  
                  {/* Frosted iOS Status Bar with Dynamic Island */}
                  {/* Fixed frosted header so scrolling content glides underneath without colliding */}
                  <div className="sticky top-0 z-40 h-11 shrink-0 px-6 pt-1 flex items-center justify-between bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200/40 dark:border-zinc-800/40 text-[11px] font-semibold text-zinc-900 dark:text-white select-none">
                    <span className="tracking-tight font-medium">9:41</span>

                    {/* Apple iPhone 17 Pro Dynamic Island Pill */}
                    <div className="absolute left-1/2 top-2 h-[26px] w-[110px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-between px-3 shadow-inner">
                      <div className="flex items-center gap-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#0c1220] ring-1 ring-white/20 flex items-center justify-center">
                          <div className="h-1 w-1 rounded-full bg-blue-500/60" />
                        </div>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-[#0b0c10] ring-1 ring-white/10" />
                    </div>

                    {/* Hardware Status Icons */}
                    <div className="flex items-center gap-1.5">
                      <Signal className="h-3 w-3 stroke-[2.5]" />
                      <Wifi className="h-3 w-3 stroke-[2.5]" />
                      <Battery className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Scrollable Screen Content */}
                  <div
                    ref={scrollContainerRef}
                    data-lenis-prevent
                    className="flex-1 min-h-0 pb-8 overflow-y-auto scrollbar-none bg-white dark:bg-zinc-950 select-text"
                    style={{
                      WebkitOverflowScrolling: "touch",
                      overscrollBehavior: "contain",
                      isolation: "isolate",
                    }}
                  >
                    <SiteRenderer
                      content={content}
                      plan={plan}
                      isPreview={true}
                      theme={theme}
                      viewport="mobile"
                    />
                  </div>

                  {/* Apple Home Indicator Bar */}
                  <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 z-40 h-[4px] w-[134px] rounded-full bg-zinc-900/40 dark:bg-white/40 shadow-xs" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
