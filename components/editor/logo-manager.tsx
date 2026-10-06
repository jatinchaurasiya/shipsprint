/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React, { useState, useRef } from "react";
import type { LogoWall, LogoWallLogo } from "@/types/database";
import { Upload, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";

interface LogoManagerProps {
  appIconUrl?: string;
  brandLogoUrl?: string;
  appName: string;
  logoWall?: LogoWall;
  onAppIconChange: (url: string) => void;
  onBrandLogoChange: (url: string) => void;
  onLogoWallChange: (logoWall?: LogoWall) => void;
}

const PRESET_PRESS_LOGOS: { name: string; image_url: string }[] = [
  { name: "TechCrunch", image_url: "https://cdn.worldvectorlogo.com/logos/techcrunch-1.svg" },
  { name: "Product Hunt", image_url: "https://cdn.worldvectorlogo.com/logos/product-hunt.svg" },
  { name: "The Verge", image_url: "https://cdn.worldvectorlogo.com/logos/the-verge-1.svg" },
  { name: "Wired", image_url: "https://cdn.worldvectorlogo.com/logos/wired-1.svg" },
  { name: "Bloomberg", image_url: "https://cdn.worldvectorlogo.com/logos/bloomberg-1.svg" },
  { name: "Forbes", image_url: "https://cdn.worldvectorlogo.com/logos/forbes-2.svg" },
];

export function LogoManager({
  appIconUrl,
  brandLogoUrl,
  appName,
  logoWall,
  onAppIconChange,
  onBrandLogoChange,
  onLogoWallChange,
}: LogoManagerProps) {
  const [newLogoName, setNewLogoName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [uploadingAppIcon, setUploadingAppIcon] = useState(false);
  const [uploadingBrandLogo, setUploadingBrandLogo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const appIconRef = useRef<HTMLInputElement>(null);
  const brandLogoRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    onSuccess: (url: string) => void,
    setLoading: (l: boolean) => void
  ) => {
    setLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      onSuccess(data.url);
    } catch (err) {
      setUploadError(
        (err instanceof Error ? err.message : undefined) || "Failed to upload file"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppIconFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(file, onAppIconChange, setUploadingAppIcon);
  };

  const handleBrandLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(file, onBrandLogoChange, setUploadingBrandLogo);
  };

  const addCustomPressLogo = () => {
    if (!newLogoName.trim()) return;
    const currentList = logoWall?.logos || [];
    const newEntry: LogoWallLogo = {
      id: `logo-${Date.now()}`,
      name: newLogoName.trim(),
      image_url: newLogoUrl.trim() || "",
    };
    onLogoWallChange({
      eyebrow: logoWall?.eyebrow || "Featured in leading publications",
      logos: [...currentList, newEntry],
    });
    setNewLogoName("");
    setNewLogoUrl("");
  };

  const addPresetLogo = (preset: { name: string; image_url: string }) => {
    const currentList = logoWall?.logos || [];
    if (currentList.some((l) => l.name === preset.name)) return;
    const newEntry: LogoWallLogo = {
      id: `logo-preset-${preset.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      name: preset.name,
      image_url: preset.image_url,
    };
    onLogoWallChange({
      eyebrow: logoWall?.eyebrow || "Featured in leading publications",
      logos: [...currentList, newEntry],
    });
  };

  const removePressLogo = (id: string) => {
    const currentList = logoWall?.logos || [];
    const updated = currentList.filter((l) => l.id !== id);
    onLogoWallChange({
      eyebrow: logoWall?.eyebrow || "Featured in leading publications",
      logos: updated,
    });
  };

  const toggleLogoWall = (enabled: boolean) => {
    if (!enabled) {
      onLogoWallChange(undefined);
    } else {
      onLogoWallChange({
        eyebrow: "Featured in leading publications",
        logos: PRESET_PRESS_LOGOS.slice(0, 4).map((p, i) => ({
          id: `preset-${i}`,
          name: p.name,
          image_url: p.image_url,
        })),
      });
    }
  };

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-400">
          {uploadError}
        </div>
      )}

      {/* 1. App Icon Section with Authentic iOS Squircle Mask */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              App Store Icon
            </h4>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Displayed as site icon and header badge with Apple squircle curvature (512x512 recommended).
            </p>
          </div>
          {/* iOS Squircle Preview Frame */}
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[22%] bg-zinc-950 shadow-md ring-1 ring-black/10 dark:ring-white/10">
            {appIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appIconUrl}
                alt={`${appName} Icon`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-bold text-white text-base">
                {appName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={appIconRef}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleAppIconFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => appIconRef.current?.click()}
              disabled={uploadingAppIcon}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              {uploadingAppIcon ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{appIconUrl ? "Replace Icon" : "Upload Icon"}</span>
            </button>
            {appIconUrl && (
              <button
                type="button"
                onClick={() => onAppIconChange("")}
                className="text-xs text-red-500 hover:underline px-2 py-1"
              >
                Remove
              </button>
            )}
          </div>
          <input
            type="url"
            value={appIconUrl || ""}
            onChange={(e) => onAppIconChange(e.target.value)}
            placeholder="or paste icon image URL..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* 2. Brand Wordmark / Header Logo */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          Header Brand Logo (Optional)
        </h4>
        <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          Replaces the plain text brand name in navigation bar.
        </p>

        <div className="mt-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={brandLogoRef}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleBrandLogoFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => brandLogoRef.current?.click()}
              disabled={uploadingBrandLogo}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              {uploadingBrandLogo ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{brandLogoUrl ? "Replace Logo" : "Upload Brand Logo"}</span>
            </button>
            {brandLogoUrl && (
              <button
                type="button"
                onClick={() => onBrandLogoChange("")}
                className="text-xs text-red-500 hover:underline px-2 py-1"
              >
                Remove
              </button>
            )}
          </div>
          <input
            type="url"
            value={brandLogoUrl || ""}
            onChange={(e) => onBrandLogoChange(e.target.value)}
            placeholder="or paste brand logo URL..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* 3. Press / Featured Mention Logo Wall */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Press &amp; Proof Logo Wall
            </h4>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Display &quot;As Featured In&quot; badges to establish trust.
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggleLogoWall(!logoWall)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              logoWall ? "bg-zinc-950 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-zinc-950 ${
                logoWall ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {logoWall && (
          <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Eyebrow Text
              </label>
              <input
                type="text"
                value={logoWall.eyebrow}
                onChange={(e) =>
                  onLogoWallChange({ ...logoWall, eyebrow: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            {/* Existing Press Mentions */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Active Logos ({logoWall.logos.length})
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {logoWall.logos.map((logo) => (
                  <div
                    key={logo.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {logo.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePressLogo(logo.id)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick-Add Tech Press Presets */}
            <div>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quick Add Press Brands:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PRESET_PRESS_LOGOS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addPresetLogo(preset)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Logo Form */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newLogoName}
                onChange={(e) => setNewLogoName(e.target.value)}
                placeholder="Press Name (e.g. Daring Fireball)"
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={addCustomPressLogo}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
