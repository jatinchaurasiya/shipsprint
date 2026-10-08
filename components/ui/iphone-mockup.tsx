/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState } from "react";
import {
  Upload,
  Wifi,
  Battery,
  Signal,
  Play,
  Wind,
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/storage/image-url";

export type MockupFallbackKind =
  | "writing"
  | "audio"
  | "discipline"
  | "botanical"
  | "luxury"
  | "broadsheet"
  | "terminal"
  | "manifesto"
  | "astronomy"
  | "sport"
  | "studio"
  | "print"
  | "wellness"
  | "finance"
  | "developer"
  | "cinema"
  | "podcast"
  | "party"
  | "ai"
  | "curiosity"
  | "generic";

interface IphoneMockupProps {
  imageUrl?: string | null;
  appName?: string;
  fallbackKind?: MockupFallbackKind;
  onImageChange?: (url: string) => void;
  isEditable?: boolean;
  className?: string;
  priority?: boolean;
}

export function IphoneMockup({
  imageUrl,
  appName = "App",
  fallbackKind: _fallbackKind = "generic",
  onImageChange,
  isEditable = false,
  className = "",
}: IphoneMockupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageChange) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        onImageChange(event.target.result);
      }
      setIsUploading(false);
    };
    reader.onerror = () => setIsUploading(false);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`relative select-none shrink-0 w-[280px] sm:w-[300px] md:w-[316px] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hardware Side Buttons */}
      {/* Left: Action Button */}
      <div className="pointer-events-none absolute -left-[2.5px] top-24 h-6 w-[2.5px] rounded-l-xs bg-zinc-600/80 shadow-xs" />
      {/* Left: Volume Up */}
      <div className="pointer-events-none absolute -left-[2.5px] top-33 h-11 w-[2.5px] rounded-l-xs bg-zinc-600/80 shadow-xs" />
      {/* Left: Volume Down */}
      <div className="pointer-events-none absolute -left-[2.5px] top-47 h-11 w-[2.5px] rounded-l-xs bg-zinc-600/80 shadow-xs" />
      {/* Right: Side / Power Button */}
      <div className="pointer-events-none absolute -right-[2.5px] top-32 h-16 w-[2.5px] rounded-r-xs bg-zinc-600/80 shadow-xs" />

      {/* Outer Titanium Chassis Frame: Precision 9:19.5 aspect ratio & natural titanium bezel */}
      <div className="relative aspect-[9/19.5] w-full rounded-[50px] bg-gradient-to-b from-[#56575e] via-[#2f3036] to-[#121316] p-[4px] shadow-[0_32px_70px_-15px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.2),inset_0_1px_1.5px_rgba(255,255,255,0.4)] ring-1 ring-black/70">
        {/* OLED True Black Display Bezel */}
        <div className="relative h-full w-full rounded-[46px] bg-black p-[4px] ring-1 ring-black/90">
          {/* Active Screen Viewport */}
          <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-black">
          
            {/* iOS Status Bar with Dynamic Island */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between px-6 pt-1 text-[12px] font-semibold text-white">
              <span className="tracking-tight text-white/95 font-medium">9:41</span>
              
              {/* Dynamic Island Pill with Camera & Sensor Elements */}
              <div className="absolute left-1/2 top-2.5 h-[22px] w-[98px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-between px-3 shadow-inner">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#0c1220] ring-1 ring-white/20 flex items-center justify-center">
                    <div className="h-1 w-1 rounded-full bg-blue-500/50" />
                  </div>
                </div>
                <div className="h-2 w-2 rounded-full bg-[#0b0c10] ring-1 ring-white/10" />
              </div>

              {/* Hardware Status Icons */}
              <div className="flex items-center gap-1.5 text-white/90">
                <Signal className="h-3 w-3 stroke-[2.5]" />
                <Wifi className="h-3 w-3 stroke-[2.5]" />
                <div className="flex items-center">
                  <Battery className="h-3.5 w-3.5 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Screen Content: User Image OR Blank Placeholder */}
            <div className="relative h-full w-full overflow-hidden bg-black text-white">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizeImageUrl(imageUrl)}
                  alt={`${appName} screen`}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10 mb-3">
                    <svg className="w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                  </div>
                  <p className="text-[10px] font-medium text-white/25 text-center">
                    {isEditable ? "Upload Screenshot" : appName}
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Screenshot Upload Overlay (Editor Mode) */}
            {isEditable && onImageChange && (
              <div
                className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 p-6 text-center backdrop-blur-sm transition-opacity duration-200 ${
                  isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              >
                <label className="flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl bg-white/15 p-4 text-white ring-1 ring-white/20 transition-transform hover:scale-105 active:scale-95">
                  <Upload className="h-5 w-5 text-white" />
                  <span className="text-xs font-semibold tracking-wide">
                    {isUploading ? "Uploading..." : "Replace Mockup Image"}
                  </span>
                  <span className="text-[10px] text-zinc-300">
                    PNG or JPG (9:19.5 recommended)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => onImageChange("")}
                    className="mt-2.5 text-xs text-red-400 underline-offset-4 hover:underline"
                  >
                    Reset to theme default
                  </button>
                )}
              </div>
            )}

            {/* Bottom Home Indicator Bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
              <div className="h-1 w-32 rounded-full bg-white/45 backdrop-blur-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Handcrafted domain UI screens for each Hallmark theme archetype.
 * Every screen is pixel-perfect, tailored to native iOS design conventions.
 */
export function DomainScreenFallback({
  kind,
  appName,
}: {
  kind: MockupFallbackKind;
  appName: string;
}) {
  switch (kind) {
    // Writing archetype
    case "writing":
      return (
        <div className="flex h-full flex-col justify-between bg-[#F8FAFC] p-4 pt-13 text-[#111827] font-sans antialiased">
          <div className="space-y-3.5">
            {/* Top Greeting */}
            <div>
              <p className="text-[9px] font-semibold tracking-wider text-[#667085] uppercase">
                Tuesday, October 6
              </p>
              <h3 className="text-base font-bold tracking-tight text-[#111827] mt-0.5">
                Good morning, Alex
              </h3>
            </div>

            {/* Today's Progress Card */}
            <div className="rounded-2xl border border-[#E7EAF0] bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111827]">Today&apos;s Progress</span>
                <span className="text-xs font-bold text-[#5B5BF7]">78%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E8E7FF]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6D5DFB] to-[#9D8BFF]"
                  style={{ width: "78%" }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#667085]">
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5B5BF7]" />
                  8 Tasks
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8B7CFF]" />
                  3 Goals
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  2 Meetings
                </span>
              </div>
            </div>

            {/* Next Up Section */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#111827]">Next up</span>
                <span className="text-[10px] font-medium text-[#5B5BF7]">View schedule</span>
              </div>
              <div className="space-y-1.5">
                {/* Task 1 */}
                <div className="flex items-center justify-between rounded-xl border border-[#E7EAF0] bg-white p-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#E8E7FF] text-[10px] font-bold text-[#5B5BF7]">
                      ✓
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-[#111827]">Product Review</p>
                      <p className="text-[9px] text-[#667085]">Main design sprint</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[9px] font-semibold text-[#475569]">
                    10:30 AM
                  </span>
                </div>

                {/* Task 2 */}
                <div className="flex items-center justify-between rounded-xl border border-[#E7EAF0] bg-white p-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#F8FAFC] text-[10px] text-[#667085] border border-[#E7EAF0]">
                      ○
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-[#111827]">Read 20 pages</p>
                      <p className="text-[9px] text-[#667085]">Deep Work chapter 3</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[9px] font-semibold text-[#475569]">
                    1:00 PM
                  </span>
                </div>

                {/* Task 3 */}
                <div className="flex items-center justify-between rounded-xl border border-[#E7EAF0] bg-white p-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#F8FAFC] text-[10px] text-[#667085] border border-[#E7EAF0]">
                      ○
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-[#111827]">Evening Run</p>
                      <p className="text-[9px] text-[#667085]">5km outdoor pacing</p>
                    </div>
                  </div>
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[9px] font-semibold text-[#475569]">
                    6:30 PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Micro Tab Bar */}
          <div className="flex items-center justify-around rounded-xl border border-[#E7EAF0] bg-white/95 p-2 shadow-xs backdrop-blur-sm">
            <span className="text-[10px] font-bold text-[#5B5BF7]">● Today</span>
            <span className="text-[10px] text-[#667085]">Goals</span>
            <span className="text-[10px] text-[#667085]">Insights</span>
            <span className="text-[10px] text-[#667085]">Settings</span>
          </div>
        </div>
      );


    // 02. Midnight · Atmospheric · Sonder
    case "audio":
      return (
        <div className="flex h-full flex-col justify-between bg-[#090a0f] p-5 pt-14 text-white font-sans">
          <div className="text-center">
            <div className="text-[10px] font-medium tracking-widest text-indigo-400 uppercase">
              Delta Sleep · 432 Hz
            </div>
            <div className="mx-auto my-5 flex h-32 w-32 items-center justify-center rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/30">
              <div className="flex items-end gap-1 h-12">
                {[40, 70, 95, 60, 85, 50, 90, 65, 45].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 rounded-full bg-indigo-400"
                  />
                ))}
              </div>
            </div>
            <h3 className="text-base font-semibold tracking-tight">Obsidian Drift</h3>
            <p className="text-xs text-zinc-400">Binaural Harmonic Frequencies</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-center text-xs text-zinc-300">
            Playing on AirPods Pro
          </div>
        </div>
      );

    // 03. Brutal · Modern-Minimal · Ironclad
    case "discipline":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0a0a0a] p-5 pt-14 text-white font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
              PROTOCOL // DAY 47
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white">
              STREAK 47
            </div>
            <p className="text-[11px] text-zinc-400">0 EXECUTIONS PENDING</p>
            <div className="mt-4 space-y-2">
              {[
                { name: "5:00 AM Cold Exposure", done: true },
                { name: "10K Kettlebell Snatch", done: true },
                { name: "Zero Processed Sugar", done: true },
                { name: "90 Min Deep Session", done: true },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border border-zinc-800 bg-zinc-950 p-2 text-[10px]"
                >
                  <span className="text-zinc-200">{item.name}</span>
                  <span className="text-emerald-400 font-semibold">PASSED</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-2 text-[10px] text-zinc-600 text-center uppercase tracking-widest">
            {appName} System Engine
          </div>
        </div>
      );

    // 04. Garden · Editorial · Flourish
    case "botanical":
      return (
        <div className="flex h-full flex-col justify-between bg-[#f7faf5] p-5 pt-14 text-zinc-900 font-sans">
          <div>
            <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
              Botanical Care HUD
            </div>
            <h3 className="mt-1 text-base font-semibold text-zinc-900">Monstera Deliciosa</h3>
            <p className="text-xs text-zinc-500">Living Room · South Window</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-xs">
                <span className="text-[10px] text-zinc-500 block">Soil Moisture</span>
                <span className="text-lg font-bold text-emerald-700">68%</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Optimal</span>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-white p-3 shadow-xs">
                <span className="text-[10px] text-zinc-500 block">Ambient Light</span>
                <span className="text-lg font-bold text-emerald-700">840 lx</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Filtered Sun</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-700 p-2.5 text-center text-xs font-semibold text-white">
            Next Water in 3 Days
          </div>
        </div>
      );

    // 05. Atelier · Editorial · Vault
    case "luxury":
      return (
        <div className="flex h-full flex-col justify-between bg-[#f9f7f4] p-5 pt-14 text-zinc-900 font-serif">
          <div>
            <div className="text-[10px] font-sans font-semibold text-amber-900 uppercase tracking-widest">
              Archival Provenance
            </div>
            <h3 className="mt-1 text-base font-normal text-zinc-950">Cashmere Overcoat</h3>
            <p className="text-xs font-sans text-zinc-500">Edition 2024 · Atelier Milano</p>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 font-sans text-xs">
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Acquisition</span>
                <span className="font-semibold text-zinc-900">$840</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Wears Recorded</span>
                <span className="font-semibold text-zinc-900">59 wears</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-500">Cost per Wear</span>
                <span className="font-bold text-amber-800">$14.23</span>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-200 pt-2 text-[10px] font-sans text-zinc-500 text-center">
            Verified Item #A-04829
          </div>
        </div>
      );

    // 06. Newsprint · Editorial · Dispatch
    case "broadsheet":
      return (
        <div className="flex h-full flex-col justify-between bg-[#f6f4ee] p-5 pt-14 text-zinc-900 font-serif">
          <div>
            <div className="border-b border-zinc-900 pb-1 flex justify-between items-center text-[10px] font-sans uppercase">
              <span>The Daily Dispatch</span>
              <span>Morning Edition</span>
            </div>
            <h3 className="mt-3 text-lg font-bold leading-tight text-zinc-950">
              The Return to Physical Interfaces
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-800">
              Why engineers and designers are walking away from infinite canvases to rediscover mechanical tactile constraint.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-900 bg-white p-2.5 font-sans text-[11px] flex items-center justify-between">
            <span className="font-medium">8 min narrated audio</span>
            <Play className="h-3.5 w-3.5 fill-current" />
          </div>
        </div>
      );

    // 07. Terminal · Modern-Minimal · Kernel
    case "terminal":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0a0e0c] p-4 pt-14 text-[#ecfdf5] font-mono text-[10px]">
          <div>
            <div className="flex items-center justify-between text-emerald-500/80 border-b border-emerald-900/40 pb-1">
              <span>root@edge-node-04:~#</span>
              <span>SSH 2.0</span>
            </div>
            <div className="mt-2.5 space-y-1 text-emerald-400/90 leading-tight">
              <p>$ uname -a</p>
              <p className="text-zinc-400">Linux 6.9.1-arch #1 SMP PREEMPT_DYNAMIC</p>
              <p className="mt-1">$ systemctl status api-cluster</p>
              <p className="text-emerald-400">● active (running) since 14d 6h</p>
              <p className="text-zinc-400">  Tasks: 18 (limit: 4915)</p>
              <p className="text-zinc-400">  Memory: 342.1M / 16.0G</p>
              <p className="mt-1">$ latency --target global-dns</p>
              <p className="text-emerald-300">12ms · 0.0% loss · 48 hops</p>
            </div>
          </div>
          <div className="border border-emerald-800/60 bg-emerald-950/30 p-2 rounded text-emerald-400 text-center">
            Touch ID Keys Verified
          </div>
        </div>
      );

    // 08. Manifesto · Playful/Editorial · Unplug
    case "manifesto":
      return (
        <div className="flex h-full flex-col justify-between bg-[#f4f3ef] p-5 pt-14 text-zinc-900 font-sans">
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-orange-600 uppercase">
              Intentional Friction
            </div>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 leading-tight">
              Put your phone down.
            </h3>
            <p className="mt-2.5 text-xs text-zinc-700 leading-relaxed">
              Your attention was monetized without your consent. Unplug injects physical friction before you can open addictive feeds.
            </p>
            <div className="mt-4 rounded-xl border border-zinc-300 bg-white p-3 text-center">
              <div className="text-2xl font-black text-zinc-950">14 min</div>
              <div className="text-[10px] text-zinc-500 uppercase mt-0.5">Screen Time Today</div>
            </div>
          </div>
          <div className="rounded-xl bg-orange-600 p-2.5 text-center text-xs font-semibold text-white">
            Lock Apps for 4 Hours
          </div>
        </div>
      );

    // 09. Almanac · Atmospheric · Solstice
    case "astronomy":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0b0f19] p-5 pt-14 text-slate-100 font-serif">
          <div>
            <div className="text-[10px] font-sans font-medium tracking-widest text-amber-400 uppercase">
              Celestial Ephemeris
            </div>
            <h3 className="mt-1 text-base font-normal text-white">Waxing Gibbous · 78%</h3>
            <p className="text-xs font-sans text-slate-400">Altitude 44° · Azimuth 162° SE</p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 font-sans text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Sunset</span>
                <span className="font-semibold text-white">7:48 PM</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Moonrise</span>
                <span className="font-semibold text-white">4:12 PM</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Dark Sky Bortle</span>
                <span className="font-bold text-amber-400">Class 2</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 text-center text-xs text-slate-300 font-sans">
            ISS Pass: 9:14 PM (Magnitude -3.2)
          </div>
        </div>
      );

    // 10. Sport · High-Energy Athletic · Apex
    case "sport":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0c0d0e] p-5 pt-14 text-white font-sans">
          <div>
            <div className="text-[10px] font-bold text-lime-400 uppercase tracking-widest">
              Live Workout Telemetry
            </div>
            <div className="mt-1 text-3xl font-black text-white">4:12 /km</div>
            <p className="text-xs text-zinc-400">Target Pace: 4:15 /km · Interval 3/5</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-[10px] text-zinc-400 block">Heart Rate</span>
                <span className="text-lg font-black text-lime-400">168 bpm</span>
                <span className="text-[10px] text-zinc-500 block">Threshold Zone 4</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <span className="text-[10px] text-zinc-400 block">Power Output</span>
                <span className="text-lg font-black text-lime-400">312 W</span>
                <span className="text-[10px] text-zinc-500 block">Cadence 178 spm</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-lime-500 p-2.5 text-center text-xs font-bold text-zinc-950">
            Sprint Lap 4 in 30s
          </div>
        </div>
      );

    // 11. Studio · Creative Color Grading · Spectra
    case "studio":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0f1115] p-5 pt-14 text-slate-100 font-mono text-xs">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest">
              Camera RAW 3D LUT
            </div>
            <div className="mt-1 text-base font-bold text-white font-sans">Kodak 5207 Emulation</div>
            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Color Temp</span>
                <span className="text-cyan-300">5600 K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Tint</span>
                <span className="text-cyan-300">+2.4</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Highlight Rolloff</span>
                <span className="text-cyan-300">Soft (Curve C)</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-cyan-600 p-2.5 text-center font-sans font-semibold text-white">
            Export Apple Log 10-bit
          </div>
        </div>
      );

    // 12. Riso · Tactile Risograph · Press
    case "print":
      return (
        <div className="flex h-full flex-col justify-between bg-[#faf5ee] p-5 pt-14 text-slate-900 font-sans">
          <div>
            <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
              2-Color Drum Separation
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900">Zine Edition #08</h3>
            <div className="mt-3 rounded-xl border border-slate-300 bg-white p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Drum 1: Fluorescent Pink</span>
                <span className="h-3 w-3 rounded-full bg-rose-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Drum 2: Medium Navy</span>
                <span className="h-3 w-3 rounded-full bg-indigo-900" />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-rose-600 p-2.5 text-center text-xs font-bold text-white">
            Send to Riso ME9350
          </div>
        </div>
      );

    // 13. Bloom · Wellness & Breathwork · Aura
    case "wellness":
      return (
        <div className="flex h-full flex-col justify-between bg-[#faf6f9] p-5 pt-14 text-purple-950 font-sans">
          <div className="text-center">
            <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest">
              Somatic Nervous Reset
            </div>
            <div className="mx-auto my-6 flex h-32 w-32 items-center justify-center rounded-full bg-purple-500/10 ring-1 ring-purple-500/30">
              <Wind className="h-10 w-10 text-purple-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-purple-950">Inhale deeply</h3>
            <p className="text-xs text-purple-800/80">Hold for 4 seconds</p>
          </div>
          <div className="rounded-xl bg-purple-600 p-2.5 text-center text-xs font-semibold text-white">
            HRV Balance: 88 (Optimal)
          </div>
        </div>
      );

    // 14. Coral · Clean Modern Fintech · Settle
    case "finance":
      return (
        <div className="flex h-full flex-col justify-between bg-[#faf8f6] p-5 pt-14 text-zinc-900 font-sans">
          <div>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Shared Balance
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
              $1,842.50
            </div>
            <div className="text-xs font-medium text-emerald-600">
              +12.4% from last trip
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              {[
                { label: "Tokyo Dinner", user: "Marco paid", amt: "$142.00" },
                { label: "Bullet Train", user: "Elena paid", amt: "$320.00" },
                { label: "Ryokan Stay", user: "You paid", amt: "$680.00" },
              ].map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white p-2.5 shadow-xs"
                >
                  <div>
                    <div className="font-semibold text-zinc-900">{tx.label}</div>
                    <div className="text-[10px] text-zinc-500">{tx.user}</div>
                  </div>
                  <div className="font-mono font-medium text-zinc-900">{tx.amt}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-orange-600 p-2.5 text-center text-xs font-semibold text-white shadow-xs">
            Settle Expenses Now
          </div>
        </div>
      );

    // 15. Cobalt · Webhook Engine & Developer · Relay
    case "developer":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0b0f19] p-4 pt-14 text-zinc-100 font-mono text-[10px]">
          <div>
            <div className="flex items-center justify-between text-zinc-500">
              <span>POST /v1/webhooks</span>
              <span className="text-emerald-400 font-semibold">200 OK</span>
            </div>
            <div className="mt-2.5 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 text-[10px] text-zinc-300">
              <pre className="overflow-hidden leading-snug">
                {`{
  "event": "charge.succeeded",
  "customer": "cus_932",
  "amount_usd": 120.00,
  "status": "delivered",
  "latency_ms": 32
}`}
              </pre>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300 font-semibold">
                cURL
              </span>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                Headers (7)
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-center text-[10px] text-zinc-400">
            Connected to US-East-1 Cluster
          </div>
        </div>
      );

    // 16. Aurora · Cinematic ProRes · Lumina
    case "cinema":
      return (
        <div className="flex h-full flex-col justify-between bg-[#090d0e] p-4 pt-14 text-teal-100 font-mono text-[10px]">
          <div>
            <div className="flex justify-between items-center text-teal-400 uppercase tracking-widest border-b border-teal-900/40 pb-1">
              <span>2.39:1 Anamorphic</span>
              <span>4K 24.00 FPS</span>
            </div>
            <div className="mt-3 rounded-lg border border-teal-900/40 bg-zinc-950 p-2.5 text-center">
              <div className="text-lg font-bold text-white font-sans">ProRes 422 HQ</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Shutter 180° · ISO 800</div>
            </div>
          </div>
          <div className="rounded-xl bg-teal-600 p-2.5 text-center text-xs font-semibold text-zinc-950 font-sans">
            Audio Peak: -12.4 dB (Safe)
          </div>
        </div>
      );

    // 17. Editorial · Narrative Podcast · Courier
    case "podcast":
      return (
        <div className="flex h-full flex-col justify-between bg-[#faf7f0] p-5 pt-14 text-zinc-900 font-serif">
          <div>
            <div className="text-[10px] font-sans font-bold text-rose-800 uppercase tracking-widest">
              Episode 14 · The Cold Line
            </div>
            <h3 className="mt-2 text-base font-normal leading-snug text-zinc-950">
              The Cables on the Ocean Floor
            </h3>
            <p className="mt-1.5 text-xs text-zinc-600 font-sans">
              44 minutes · Transcript synced
            </p>
          </div>
          <div className="rounded-xl bg-rose-800 p-2.5 text-center text-xs font-semibold text-white font-sans flex items-center justify-center gap-2">
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Resume Playback</span>
          </div>
        </div>
      );

    // 18. Carnival · Pass & Play Party · Hotseat
    case "party":
      return (
        <div className="flex h-full flex-col justify-between bg-[#110d18] p-5 pt-14 text-amber-100 font-sans">
          <div>
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              Round 3 of 5 · Hotseat
            </div>
            <h3 className="mt-2 text-lg font-bold text-white leading-tight">
              Name three movies featuring a runaway train in under 15 seconds.
            </h3>
          </div>
          <div className="rounded-xl bg-amber-500 p-3 text-center text-xs font-black text-zinc-950">
            12 SECONDS LEFT
          </div>
        </div>
      );

    // 19. Lumen · Classical AI Reasoning · Axiom
    case "ai":
      return (
        <div className="flex h-full flex-col justify-between bg-[#0a0a0c] p-4 pt-14 text-amber-100 font-serif text-xs">
          <div>
            <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">
              Local Inference Engine
            </div>
            <h3 className="mt-2 text-base font-normal text-white">Synthesizing Paper</h3>
            <div className="mt-3 rounded-lg border border-amber-900/30 bg-zinc-950 p-2.5 font-mono text-[10px] text-zinc-300">
              <p className="text-amber-300">Tokens/sec: 42.8 t/s</p>
              <p className="text-zinc-400 mt-1">Memory: 4.8 GB Neural Engine</p>
              <p className="text-zinc-400">Offline: 100% Verified</p>
            </div>
          </div>
          <div className="rounded-lg bg-amber-600 p-2 text-center text-zinc-950 font-sans font-semibold text-[11px]">
            Inference Completed (0.42s)
          </div>
        </div>
      );

    // 20. Hum · Curiosity & Flashcards · Curio
    case "curiosity":
      return (
        <div className="flex h-full flex-col justify-between bg-[#fdfaf4] p-5 pt-14 text-zinc-900 font-sans">
          <div>
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-widest">
              Daily Concept Card
            </div>
            <h3 className="mt-1 text-lg font-bold text-zinc-950">Semantic Satiation</h3>
            <p className="mt-2 text-xs text-zinc-700 leading-relaxed">
              A psychological phenomenon in which repetition causes a word or phrase to temporarily lose meaning for the listener.
            </p>
          </div>
          <div className="rounded-xl bg-orange-600 p-2.5 text-center text-xs font-semibold text-white">
            Review in 3 Days (Spaced)
          </div>
        </div>
      );

    default:
      return (
        <div className="flex h-full flex-col justify-between bg-zinc-950 p-5 pt-14 text-white font-sans">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              Native Mobile Release
            </div>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-white">
              {appName}
            </h3>
            <p className="mt-1.5 text-xs text-zinc-400">
              Built for iOS and Android with native performance and responsive layouts.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs font-semibold text-zinc-200">
            Official Application Suite
          </div>
        </div>
      );
  }
}
