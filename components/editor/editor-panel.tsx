"use client";

import React, { useRef, useState } from "react";
import type { SiteContent, FeatureItem, Plan } from "@/types/database";
import {
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Lock,
  ArrowUpRight,
  Loader2,
  Image as ImageIcon,
  Smartphone,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Globe,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface EditorPanelProps {
  content: SiteContent;
  onChange: (updated: SiteContent) => void;
  plan?: Plan | null;
  siteId?: string;
  initialDomain?: string | null;
}

const AVAILABLE_ICONS = [
  "Zap",
  "Shield",
  "Sparkles",
  "Heart",
  "Star",
  "Flame",
  "CheckCircle2",
  "Lock",
  "Layers",
  "Smile",
];

export function EditorPanel({
  content,
  onChange,
  plan,
  siteId,
  initialDomain,
}: EditorPanelProps) {
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Custom domain state
  const [domainInput, setDomainInput] = useState<string>(initialDomain || "");
  const [connectedDomain, setConnectedDomain] = useState<string | null>(initialDomain || null);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleConnectDomain = async () => {
    if (!siteId || !domainInput.trim()) return;
    setConnectingDomain(true);
    setDomainMessage(null);

    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, domain: domainInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDomainMessage({ type: "error", text: data.error || "Failed to connect domain." });
        return;
      }

      setConnectedDomain(data.domain);
      setDomainMessage({
        type: "success",
        text: `Domain ${data.domain} connected! Configure your CNAME record to complete setup.`,
      });
    } catch (err: any) {
      setDomainMessage({ type: "error", text: err?.message || "Failed to connect domain." });
    } finally {
      setConnectingDomain(false);
    }
  };

  const handleDisconnectDomain = async () => {
    if (!siteId) return;
    setConnectingDomain(true);
    setDomainMessage(null);

    try {
      const res = await fetch("/api/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDomainMessage({ type: "error", text: data.error || "Failed to disconnect domain." });
        return;
      }

      setConnectedDomain(null);
      setDomainInput("");
      setDomainMessage({ type: "success", text: "Domain disconnected successfully." });
    } catch (err: any) {
      setDomainMessage({ type: "error", text: err?.message || "Failed to disconnect domain." });
    } finally {
      setConnectingDomain(false);
    }
  };

  const isCustomDomainAllowed = plan?.has_custom_domain ?? false;

  const updateContent = (updater: (prev: SiteContent) => SiteContent) => {
    const updated = updater(content);
    onChange(updated);
  };

  // Upload handler helper
  const handleFileUpload = async (
    file: File,
    onSuccess: (url: string) => void,
    setLoading: (loading: boolean) => void
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Upload failed");
        setLoading(false);
        return;
      }

      onSuccess(data.url);
    } catch (err: any) {
      alert(err?.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleFileUpload(
      file,
      (url) => {
        updateContent((prev) => ({
          ...prev,
          brand: { ...prev.brand, logo_url: url },
        }));
      },
      setUploadingLogo
    );
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleFileUpload(
      file,
      (url) => {
        updateContent((prev) => ({
          ...prev,
          screenshots: [...(prev.screenshots || []), url],
        }));
      },
      setUploadingScreenshot
    );
  };

  const removeScreenshot = (indexToRemove: number) => {
    updateContent((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const addFeature = () => {
    const newFeature: FeatureItem = {
      id: `feat-${Date.now()}`,
      icon: "Sparkles",
      title: "New Feature",
      description: "Explain how this feature benefits your users.",
    };

    updateContent((prev) => ({
      ...prev,
      features: [...(prev.features || []), newFeature],
    }));
  };

  const updateFeature = (
    index: number,
    field: keyof FeatureItem,
    value: string
  ) => {
    updateContent((prev) => {
      const updated = [...prev.features];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, features: updated };
    });
  };

  const removeFeature = (indexToRemove: number) => {
    updateContent((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const sections = [
    { id: "hero", label: "App & Hero Section" },
    { id: "store", label: "Store Links" },
    { id: "features", label: `Features (${content.features?.length || 0})` },
    { id: "screenshots", label: `Screenshots (${content.screenshots?.length || 0})` },
    { id: "footer", label: "Footer & Legal" },
    { id: "domain", label: "Custom Domain" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 overflow-y-auto">
      {/* Section Switcher Tabs */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeSection === sec.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 1. HERO & BRAND SECTION */}
        {activeSection === "hero" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Brand & App Identity
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Upload your app icon and set your brand name.
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                App Icon / Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {content.brand?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={content.brand.logo_url}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    type="file"
                    ref={logoInputRef}
                    onChange={handleLogoSelect}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs disabled:opacity-50"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{content.brand?.logo_url ? "Change Icon" : "Upload Icon"}</span>
                  </button>
                  <span className="text-[11px] text-zinc-400">
                    PNG, JPG, or SVG (max 10MB)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                App Name
              </label>
              <input
                type="text"
                value={content.hero?.app_name || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, app_name: e.target.value },
                    brand: { ...prev.brand, name: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="ZenHabit"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Badge Pill Text
              </label>
              <input
                type="text"
                value={content.hero?.badge_text || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, badge_text: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Now Available on iOS & Android"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Headline Header
              </label>
              <textarea
                rows={3}
                value={content.hero?.header || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, header: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Build habits that quietly transform your daily life."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Short Description
              </label>
              <textarea
                rows={3}
                value={content.hero?.short_description || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, short_description: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Gentle nudges, intuitive progress rings, and private cloud sync designed to make healthy routines stick."
              />
            </div>
          </div>
        )}

        {/* 2. STORE LINKS SECTION */}
        {activeSection === "store" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                App Store & Google Play Links
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Buttons automatically appear on the landing page when URLs are provided.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Apple App Store URL
              </label>
              <input
                type="url"
                value={content.store_links?.app_store_url || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    store_links: {
                      ...prev.store_links,
                      app_store_url: e.target.value,
                    },
                  }))
                }
                placeholder="https://apps.apple.com/app/id..."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Google Play Store URL
              </label>
              <input
                type="url"
                value={content.store_links?.play_store_url || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    store_links: {
                      ...prev.store_links,
                      play_store_url: e.target.value,
                    },
                  }))
                }
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>
        )}

        {/* 3. FEATURES SECTION */}
        {activeSection === "features" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Feature Highlights
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Showcase the key features and benefits of your app.
                </p>
              </div>
              <button
                type="button"
                onClick={addFeature}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Feature</span>
              </button>
            </div>

            <div className="space-y-4">
              {content.features?.map((feature, idx) => (
                <div
                  key={feature.id || idx}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Feature #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Delete Feature"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Icon
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_ICONS.map((iconName) => (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => updateFeature(idx, "icon", iconName)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                            feature.icon === iconName
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {iconName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(idx, "title", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={feature.description}
                      onChange={(e) =>
                        updateFeature(idx, "description", e.target.value)
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SCREENSHOTS SECTION */}
        {activeSection === "screenshots" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Screenshots Gallery
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Upload your mobile app screenshots to showcase the interface. The first image displays inside the hero iPhone mockup.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="file"
                ref={screenshotInputRef}
                onChange={handleScreenshotSelect}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => screenshotInputRef.current?.click()}
                disabled={uploadingScreenshot}
                className="w-full py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                {uploadingScreenshot ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : (
                  <Upload className="w-5 h-5 text-zinc-400" />
                )}
                <span>
                  {uploadingScreenshot
                    ? "Uploading screenshot to R2..."
                    : "Upload Screenshot"}
                </span>
                <span className="text-[10px] text-zinc-400">
                  PNG, JPG, or WebP (portrait mobile aspect ratio recommended)
                </span>
              </button>

              {/* Uploaded Screenshots Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {content.screenshots?.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 aspect-[9/16] bg-zinc-100 dark:bg-zinc-900 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
                      #{idx + 1} {idx === 0 && "(Hero)"}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeScreenshot(idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Delete screenshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. FOOTER SECTION */}
        {activeSection === "footer" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Footer & Legal Links
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Configure your copyright branding, support contact, and legal links.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Footer Brand Name
              </label>
              <input
                type="text"
                value={content.footer?.brand_name || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, brand_name: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="ZenHabit Technologies Inc."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Support / Contact Email
              </label>
              <input
                type="email"
                value={content.footer?.contact_email || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, contact_email: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="support@zenhabit.app"
              />
            </div>
          </div>
        )}

        {/* 6. CUSTOM DOMAIN SECTION (PRO GATED) */}
        {activeSection === "domain" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span>Custom Domain</span>
                {!isCustomDomainAllowed && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-semibold uppercase tracking-wider">
                    Pro Tier Only
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Connect your own domain (e.g. `yourcustomapp.com`) with automatic Let&apos;s Encrypt TLS.
              </p>
            </div>

            {!isCustomDomainAllowed ? (
              <div className="p-6 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-zinc-950 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Unlock Custom Domains with ShipSprint Pro
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                  Free and Basic tiers publish to `your-app.shipsprint.site`. Upgrade to Pro to connect unlimited custom domains with zero-touch SSL.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <span>Upgrade to Pro ($9.99/mo)</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alert feedback */}
                {domainMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      domainMessage.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    {domainMessage.text}
                  </div>
                )}

                {/* Connected Domain Display */}
                {connectedDomain ? (
                  <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 font-mono">
                          {connectedDomain}
                        </span>
                      </div>

                      <a
                        href={`https://${connectedDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>Visit</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-emerald-200/50 dark:border-emerald-900/40 text-xs">
                      <span className="text-zinc-500">Status: Active & TLS Verified</span>
                      <button
                        type="button"
                        onClick={handleDisconnectDomain}
                        disabled={connectingDomain}
                        className="text-red-600 dark:text-red-400 hover:underline text-[11px] font-medium"
                      >
                        {connectingDomain ? "Disconnecting..." : "Disconnect Domain"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Domain Connection Form */
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-3">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Your Custom Domain
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="app.myfitnessbrand.com"
                        className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleConnectDomain}
                        disabled={connectingDomain || !domainInput.trim()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all shrink-0 inline-flex items-center gap-1.5"
                      >
                        {connectingDomain && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Connect</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* DNS Configuration Instructions */}
                <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>DNS Configuration Guide</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Log in to your DNS provider (Cloudflare, Namecheap, GoDaddy) and add the following CNAME record:
                  </p>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden text-[11px] font-mono">
                    <div className="grid grid-cols-3 bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                      <span>Type</span>
                      <span>Name / Host</span>
                      <span>Target Value</span>
                    </div>
                    <div className="grid grid-cols-3 p-2 text-zinc-800 dark:text-zinc-200">
                      <span>CNAME</span>
                      <span>@ or app</span>
                      <span className="text-blue-600 dark:text-blue-400 truncate">cname.shipsprint.site</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400">
                    Once DNS propagates, on-demand TLS automatically issues and renews your SSL certificate on the first visitor request.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
