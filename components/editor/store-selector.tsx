/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React from "react";
import type { StoreLinks, StoreAvailability } from "@/types/database";
import { Check, ExternalLink } from "lucide-react";
import { AppStoreBadge, GooglePlayBadge, TestFlightBadge } from "@/components/ui/store-badges";

interface StoreSelectorProps {
  value: StoreLinks;
  onChange: (value: StoreLinks) => void;
}

/** Pure vector Google Play icon */
export function GooglePlayVectorIcon({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 3.5v17c0 .4.2.8.6 1l9.4-9.5L3.6 2.5c-.4.2-.6.6-.6 1z" fill="#00E5FF"/>
      <path d="M17.4 11.5l3.2 1.8c.6.3.6.9 0 1.2l-3.2 1.8-3.9-3.9 3.9-3.9z" fill="#FFC107"/>
      <path d="M3.6 2.5L13.5 12l3.9-3.9-9.4-5.5c-.4-.2-.8-.2-1.2 0-.2.1-.4.2-.4.4z" fill="#FF3D00"/>
      <path d="M3.6 21.5l9.9-9.5 3.9 3.9-9.4 5.5c-.2.1-.4.1-.6.1-.2-.1-.4-.2-.4-.4z" fill="#4CAF50"/>
    </svg>
  );
}

/** Pure vector Apple silhouette */
export function AppleVectorIcon({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={`${className} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z"/>
    </svg>
  );
}

/** Pure vector TestFlight icon */
export function TestFlightVectorIcon({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" stroke="#0a84ff" strokeWidth="1.75" />
      <path
        d="M12 6.5v11M7.5 9.5l9 5M7.5 14.5l9-5"
        stroke="#0a84ff"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StoreSelector({ value, onChange }: StoreSelectorProps) {
  const currentAvailability: StoreAvailability = value.availability || "both";

  const setAvailability = (availability: StoreAvailability) => {
    onChange({
      ...value,
      availability,
    });
  };

  const updateField = (field: keyof StoreLinks, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  const options: {
    id: StoreAvailability;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "both",
      label: "iOS & Android",
      description: "App Store & Google Play",
      icon: (
        <div className="flex items-center gap-1.5">
          <AppleVectorIcon className="w-3.5 h-3.5" />
          <GooglePlayVectorIcon className="w-3.5 h-3.5" />
        </div>
      ),
    },
    {
      id: "app_store_only",
      label: "App Store Only",
      description: "Apple iOS exclusive",
      icon: <AppleVectorIcon className="w-4 h-4" />,
    },
    {
      id: "play_store_only",
      label: "Google Play Only",
      description: "Android exclusive",
      icon: <GooglePlayVectorIcon className="w-4 h-4" />,
    },
    {
      id: "testflight",
      label: "TestFlight Beta",
      description: "Public beta release",
      icon: <TestFlightVectorIcon className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Explanation */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          Store Availability & Direct Links
        </h4>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Choose where visitors can install your app. Official SVG download buttons will automatically render in your Hero and download stations.
        </p>
      </div>

      {/* 2. Availability Mode Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const isSelected = currentAvailability === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAvailability(opt.id)}
              className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-zinc-950 bg-zinc-900 text-white shadow-sm ring-1 ring-zinc-950 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:ring-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isSelected
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {opt.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-white dark:text-zinc-950" />
                  )}
                </div>
                <p
                  className={`mt-0.5 text-[11px] leading-tight ${
                    isSelected
                      ? "text-zinc-300 dark:text-zinc-600"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Dynamic URL Inputs */}
      <div className="space-y-4 rounded-2xl border border-zinc-200/90 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        {(currentAvailability === "both" || currentAvailability === "app_store_only") && (
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center gap-2">
                <AppleVectorIcon className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                Apple App Store URL
              </span>
              <span className="text-[11px] font-normal text-zinc-400">
                iOS / iPadOS
              </span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={value.app_store_url || ""}
                onChange={(e) => updateField("app_store_url", e.target.value)}
                placeholder="https://apps.apple.com/app/your-app-name/id123456789"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Paste the public App Store product page URL from App Store Connect.
            </p>
          </div>
        )}

        {(currentAvailability === "both" || currentAvailability === "play_store_only") && (
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center gap-2">
                <GooglePlayVectorIcon className="h-3.5 w-3.5" />
                Google Play Store URL
              </span>
              <span className="text-[11px] font-normal text-zinc-400">
                Android
              </span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={value.play_store_url || ""}
                onChange={(e) => updateField("play_store_url", e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=com.yourcompany.app"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Paste the Google Play Console store listing URL.
            </p>
          </div>
        )}

        {currentAvailability === "testflight" && (
          <div>
            <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              <span className="flex items-center gap-2">
                <TestFlightVectorIcon className="h-3.5 w-3.5" />
                Apple TestFlight Public Invite Link
              </span>
              <span className="text-[11px] font-normal text-zinc-400">
                Public Beta
              </span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={value.testflight_url || ""}
                onChange={(e) => updateField("testflight_url", e.target.value)}
                placeholder="https://testflight.apple.com/join/AbCdEfGh"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Public TestFlight link configured in App Store Connect.
            </p>
          </div>
        )}
      </div>

      {/* 4. Live Visual Preview of Download Badges */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Live Button Preview (Rendered on Page)
          </span>
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> Exact Production SVG
          </span>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          {(currentAvailability === "both" || currentAvailability === "play_store_only") && (
            <GooglePlayBadge
              href={value.play_store_url || "#"}
              isPreview={true}
              className="w-full sm:w-auto"
            />
          )}

          {(currentAvailability === "both" || currentAvailability === "app_store_only") && (
            <AppStoreBadge
              href={value.app_store_url || "#"}
              isPreview={true}
              className="w-full sm:w-auto"
            />
          )}

          {currentAvailability === "testflight" && (
            <TestFlightBadge
              href={value.testflight_url || "#"}
              isPreview={true}
              className="w-full sm:w-auto"
            />
          )}
        </div>
      </div>
    </div>
  );
}
