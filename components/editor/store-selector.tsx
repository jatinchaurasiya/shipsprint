/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React from "react";
import type { StoreLinks, StoreAvailability } from "@/types/database";
import { Apple, Smartphone, TestTube, Check } from "lucide-react";

interface StoreSelectorProps {
  value: StoreLinks;
  onChange: (value: StoreLinks) => void;
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
      description: "Both Apple App Store & Google Play",
      icon: (
        <div className="flex items-center gap-1">
          <Apple className="h-4 w-4" />
          <Smartphone className="h-4 w-4" />
        </div>
      ),
    },
    {
      id: "app_store_only",
      label: "App Store Only",
      description: "Apple iOS exclusive launch",
      icon: <Apple className="h-4 w-4" />,
    },
    {
      id: "play_store_only",
      label: "Google Play Only",
      description: "Android exclusive launch",
      icon: <Smartphone className="h-4 w-4" />,
    },
    {
      id: "testflight",
      label: "TestFlight Beta",
      description: "Apple public beta testing link",
      icon: <TestTube className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Availability Mode Selector Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const isSelected = currentAvailability === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAvailability(opt.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? "border-zinc-950 bg-zinc-50 shadow-xs ring-1 ring-zinc-950 dark:border-zinc-100 dark:bg-zinc-900 dark:ring-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {opt.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-zinc-950 dark:text-zinc-100" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {opt.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Link Inputs depending on Availability */}
      <div className="space-y-3 pt-2">
        {(currentAvailability === "both" || currentAvailability === "app_store_only") && (
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Apple className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                Apple App Store URL
              </span>
              <span className="text-[11px] text-zinc-400">
                e.g. apps.apple.com/app/id...
              </span>
            </label>
            <input
              type="url"
              value={value.app_store_url || ""}
              onChange={(e) => updateField("app_store_url", e.target.value)}
              placeholder="https://apps.apple.com/app/your-app-name/id123456789"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>
        )}

        {(currentAvailability === "both" || currentAvailability === "play_store_only") && (
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Google Play Store URL
              </span>
              <span className="text-[11px] text-zinc-400">
                e.g. play.google.com/store/apps...
              </span>
            </label>
            <input
              type="url"
              value={value.play_store_url || ""}
              onChange={(e) => updateField("play_store_url", e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=com.yourcompany.app"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>
        )}

        {currentAvailability === "testflight" && (
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <TestTube className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Apple TestFlight Public Link
              </span>
              <span className="text-[11px] text-zinc-400">
                e.g. testflight.apple.com/join/...
              </span>
            </label>
            <input
              type="url"
              value={value.testflight_url || ""}
              onChange={(e) => updateField("testflight_url", e.target.value)}
              placeholder="https://testflight.apple.com/join/AbCdEfGh"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>
        )}
      </div>
    </div>
  );
}
