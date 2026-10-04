"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SiteContent,
  FeatureItem,
  ReleaseInfo,
  Plan,
  DomainStatus,
  SslStatus,
} from "@/types/database";
import {
  Upload,
  Plus,
  Trash2,
  Lock,
  ArrowUpRight,
  Loader2,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { AVAILABLE_ICONS } from "@/lib/icons";

interface EditorPanelProps {
  content: SiteContent;
  onChange: (updated: SiteContent) => void;
  plan?: Plan | null;
  siteId?: string;
  initialDomain?: string | null;
}

interface DnsInstructions {
  ownership: { type: string; name: string; value: string; note: string };
  routing: { type: string; name: string; value: string; note: string };
}

interface DomainState {
  status: DomainStatus | null;
  ssl_status: SslStatus | null;
  dns_resolves?: boolean;
  instructions?: DnsInstructions | null;
}

/** Human-readable status. Never claims a certificate exists before it does. */
function domainStatusCopy(state: DomainState | null): {
  label: string;
  detail: string;
  tone: "amber" | "emerald" | "red";
} {
  switch (state?.status) {
    case "active":
      return {
        label: "Active",
        detail: "DNS verified and a certificate has been issued.",
        tone: "emerald",
      };
    case "pending_validation":
      return {
        label: "Waiting for DNS",
        detail:
          "Ownership verified. Add the routing record so traffic reaches this site.",
        tone: "amber",
      };
    case "failed":
      return {
        label: "Verification failed",
        detail: "The expected DNS records were not found. Check them and retry.",
        tone: "red",
      };
    case "pending_dns":
    default:
      return {
        label: "Pending DNS",
        detail:
          "Add the ownership TXT record below. Nothing goes live until DNS resolves.",
        tone: "amber",
      };
  }
}

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
  // Generic image picker serving feature / logo-wall / release targets.
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageTarget, setImageTarget] = useState<{
    kind: "feature" | "logo" | "release";
    index: number;
  } | null>(null);

  // Custom domain state
  const [domainInput, setDomainInput] = useState<string>(initialDomain || "");
  const [connectedDomain, setConnectedDomain] = useState<string | null>(initialDomain || null);
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Real verification state, fetched from the API. The previous UI hardcoded
  // "Active & TLS Verified" the moment Connect was clicked, before any DNS
  // record existed.
  const [domainState, setDomainState] = useState<DomainState | null>(null);

  const refreshDomainState = useCallback(async () => {
    if (!siteId || !connectedDomain) return;
    try {
      const res = await fetch(
        `/api/domains?site_id=${encodeURIComponent(siteId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setDomainState({
        status: data.status,
        ssl_status: data.ssl_status,
        dns_resolves: data.dns_resolves,
        instructions: data.instructions,
      });
    } catch {
      // Leave the last known state in place; DNS checks are best-effort.
    }
  }, [siteId, connectedDomain]);

  // Poll while the domain is not yet active. DNS propagation and on-demand TLS
  // issuance are both asynchronous, so a one-shot read is not enough.
  useEffect(() => {
    if (!connectedDomain || domainState?.status === "active") return;

    // Deferred rather than called inline: the first check happens on a timer so
    // this effect does not synchronously schedule a state update.
    const initial = setTimeout(() => void refreshDomainState(), 400);
    const timer = setInterval(refreshDomainState, 15000);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [connectedDomain, domainState?.status, refreshDomainState]);

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
      setDomainState({
        status: data.status,
        ssl_status: data.ssl_status,
        dns_resolves: undefined,
        instructions: data.instructions,
      });
      setDomainMessage({
        type: "success",
        text:
          data.status === "active"
            ? `${data.domain} is live with a valid certificate.`
            : `${data.domain} added. Add the DNS records below, then publish your site.`,
      });
    } catch (err) {
      setDomainMessage({ type: "error", text: (err instanceof Error ? err.message : undefined) || "Failed to connect domain." });
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
    } catch (err) {
      setDomainMessage({ type: "error", text: (err instanceof Error ? err.message : undefined) || "Failed to disconnect domain." });
    } finally {
      setConnectingDomain(false);
    }
  };

  const isCustomDomainAllowed = plan?.has_custom_domain ?? false;

  // Derived once, used by the status panel and the DNS table.
  const domainCopy = domainStatusCopy(domainState);
  const domainInstructions = domainState?.instructions ?? null;
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
    } catch (err) {
      alert((err instanceof Error ? err.message : undefined) || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    e.target.value = "";
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

  const pickImageFor = (
    kind: "feature" | "logo" | "release",
    index: number
  ) => {
    setImageTarget({ kind, index });
    // Let state settle before opening the picker so the target is current.
    setTimeout(() => imageInputRef.current?.click(), 0);
  };

  const blankRelease: ReleaseInfo = {
    eyebrow: "",
    title: "",
    description: "",
    version: "",
    rating: "",
    rating_count: "",
    age_rating: "",
    chart_rank: "",
    release_notes: [],
    image_url: "",
  };

  const updateRelease = (field: keyof ReleaseInfo, value: string | string[]) => {
    updateContent((prev) => ({
      ...prev,
      release: { ...blankRelease, ...prev.release, [field]: value },
    }));
  };

  const handleGenericImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = imageTarget;
    if (!file || !target) return;

    handleFileUpload(
      file,
      (url) => {
        updateContent((prev) => {
          if (target.kind === "feature") {
            const updated = [...prev.features];
            const existing = updated[target.index];
            if (!existing) return prev;
            updated[target.index] = { ...existing, image_url: url };
            return { ...prev, features: updated };
          }
          if (target.kind === "logo") {
            const logos = [...(prev.logo_wall?.logos ?? [])];
            const existing = logos[target.index];
            if (!existing) return prev;
            logos[target.index] = { ...existing, image_url: url };
            return {
              ...prev,
              logo_wall: {
                eyebrow: prev.logo_wall?.eyebrow ?? "",
                logos,
              },
            };
          }
          return {
            ...prev,
            release: { ...blankRelease, ...prev.release, image_url: url },
          };
        });
      },
      setUploadingImage
    );
  };

  const addLogoEntry = () => {
    updateContent((prev) => ({
      ...prev,
      logo_wall: {
        eyebrow: prev.logo_wall?.eyebrow ?? "Featured in",
        logos: [
          ...(prev.logo_wall?.logos ?? []),
          {
            id: `logo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            name: "Press name",
            image_url: "",
          },
        ],
      },
    }));
  };

  const removeLogoEntry = (indexToRemove: number) => {
    updateContent((prev) => ({
      ...prev,
      logo_wall: {
        eyebrow: prev.logo_wall?.eyebrow ?? "",
        logos: (prev.logo_wall?.logos ?? []).filter(
          (_, idx) => idx !== indexToRemove
        ),
      },
    }));
  };

  const addFooterColumn = () => {
    updateContent((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        columns: [
          ...(prev.footer.columns ?? []),
          { heading: "Column", links: [] },
        ],
      },
    }));
  };

  const addFeature = () => {
    // `Date.now()` is not unique: two adds in the same millisecond produce
    // duplicate React keys and duplicate feature ids.
    const newFeature: FeatureItem = {
      id: `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
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
      const existing = updated[index];
      if (!existing) return prev;
      updated[index] = { ...existing, [field]: value };
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
    { id: "logos", label: `Logo Wall (${content.logo_wall?.logos?.length || 0})` },
    { id: "release", label: "Release" },
    { id: "footer", label: "Footer & Legal" },
    { id: "domain", label: "Custom Domain" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 overflow-y-auto">
      {/* Section Switcher Tabs */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/95 dark:bg-zinc-900/90 sticky top-0 z-[200] backdrop-blur-md">
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
        {/* Shared picker for feature / logo-wall / release images */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleGenericImageSelect}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
        />
        {/* 1. HERO & BRAND SECTION */}
        {activeSection === "hero" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Brand & App Identity
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
                    <ImageIcon className="w-6 h-6 text-zinc-600" />
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
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{content.brand?.logo_url ? "Change Icon" : "Upload Icon"}</span>
                  </button>
                  <span className="text-[11px] text-zinc-600">
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="Gentle nudges, intuitive progress rings, and private cloud sync designed to make healthy routines stick."
              />
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Email Capture Form
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        email_capture_enabled: !(prev.hero.email_capture_enabled ?? false),
                      },
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    content.hero?.email_capture_enabled
                      ? "bg-blue-600"
                      : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={content.hero?.email_capture_enabled ?? false}
                  aria-label="Show email capture form on the landing page"
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      content.hero?.email_capture_enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {content.hero?.email_capture_enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Input Placeholder
                    </label>
                    <input
                      type="text"
                      value={content.hero?.email_placeholder || ""}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, email_placeholder: e.target.value },
                        }))
                      }
                      placeholder="Your email address"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={content.hero?.email_cta_label || ""}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, email_cta_label: e.target.value },
                        }))
                      }
                      placeholder="Get Early Access"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Success Message
                    </label>
                    <input
                      type="text"
                      value={content.hero?.email_success_message || ""}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, email_success_message: e.target.value },
                        }))
                      }
                      placeholder="You're on the list. We'll be in touch."
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Sample phase: the form validates and confirms inline.
                    Addresses are not stored yet.
                  </p>
                </div>
              )}
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
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
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
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
                    <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                      Feature #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="p-1 text-zinc-600 hover:text-red-500 transition-colors"
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
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Phone Image <span className="font-normal">(powers the dark phone band)</span>
                    </label>
                    {feature.image_url ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={feature.image_url}
                          alt=""
                          aria-hidden="true"
                          className="h-16 w-10 rounded-lg border border-zinc-200 dark:border-zinc-800 object-cover"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => pickImageFor("feature", idx)}
                            disabled={uploadingImage}
                            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {uploadingImage ? "Uploading…" : "Replace"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateFeature(idx, "image_url", "")}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => pickImageFor("feature", idx)}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? "Uploading…" : "Upload phone image"}</span>
                      </button>
                    )}
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
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
                className="w-full py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
              >
                {uploadingScreenshot ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : (
                  <Upload className="w-5 h-5 text-zinc-600" />
                )}
                <span>
                  {uploadingScreenshot
                    ? "Uploading screenshot to R2..."
                    : "Upload Screenshot"}
                </span>
                <span className="text-[10px] text-zinc-600">
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

        {/* 5. LOGO WALL SECTION */}
        {activeSection === "logos" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Press & Trust Logos
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Only add logos you have the right to display. Each entry
                  needs a name and, ideally, a monochrome logo image.
                </p>
              </div>
              <button
                type="button"
                onClick={addLogoEntry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Logo</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Strip Eyebrow
              </label>
              <input
                type="text"
                value={content.logo_wall?.eyebrow || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    logo_wall: {
                      eyebrow: e.target.value,
                      logos: prev.logo_wall?.logos ?? [],
                    },
                  }))
                }
                placeholder="Featured in"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-4">
              {(content.logo_wall?.logos ?? []).map((logo, idx) => (
                <div
                  key={logo.id || idx}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                      Logo #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLogoEntry(idx)}
                      className="p-1 text-zinc-600 hover:text-red-500 transition-colors"
                      title="Delete Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={logo.name}
                      onChange={(e) =>
                        updateContent((prev) => {
                          const logos = [...(prev.logo_wall?.logos ?? [])];
                          const existing = logos[idx];
                          if (!existing) return prev;
                          logos[idx] = { ...existing, name: e.target.value };
                          return {
                            ...prev,
                            logo_wall: {
                              eyebrow: prev.logo_wall?.eyebrow ?? "",
                              logos,
                            },
                          };
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Logo Image
                    </label>
                    {logo.image_url ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logo.image_url}
                          alt=""
                          aria-hidden="true"
                          className="h-8 w-auto max-w-[120px] rounded-md border border-zinc-200 dark:border-zinc-800 bg-white object-contain p-1"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => pickImageFor("logo", idx)}
                            disabled={uploadingImage}
                            className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {uploadingImage ? "Uploading…" : "Replace"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateContent((prev) => {
                                const logos = [...(prev.logo_wall?.logos ?? [])];
                                const existing = logos[idx];
                                if (!existing) return prev;
                                logos[idx] = { ...existing, image_url: "" };
                                return {
                                  ...prev,
                                  logo_wall: {
                                    eyebrow: prev.logo_wall?.eyebrow ?? "",
                                    logos,
                                  },
                                };
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => pickImageFor("logo", idx)}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? "Uploading…" : "Upload logo image"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(content.logo_wall?.logos ?? []).length === 0 && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
                  No logos yet. The strip stays hidden until you add at least one.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 6. RELEASE SECTION */}
        {activeSection === "release" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                App Release Panel
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                The App Store listing block: rating, age, chart, version, and
                notes. Only use numbers that are real for your app.
              </p>
            </div>

            {(
              [
                ["eyebrow", "Eyebrow", "Now available"],
                ["title", "Title", "To be released on the App Store soon…"],
                ["version", "Version", "2.4"],
                ["rating", "Rating (e.g. 4.8)", "4.8"],
                ["rating_count", "Rating Count (e.g. 12.4K ratings)", "12.4K ratings"],
                ["age_rating", "Age Rating (e.g. 4+)", "4+"],
                ["chart_rank", "Chart Rank (e.g. #3 in Finance)", "#3 in Finance"],
              ] as [keyof ReleaseInfo, string, string][]
            ).map(([field, label, placeholder]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {label}
                </label>
                <input
                  type="text"
                  value={(content.release?.[field] as string) || ""}
                  onChange={(e) => updateRelease(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={content.release?.description || ""}
                onChange={(e) => updateRelease("description", e.target.value)}
                placeholder="What ships in this release and why it matters."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Release Notes <span className="font-normal">(one per line)</span>
              </label>
              <textarea
                rows={3}
                value={(content.release?.release_notes ?? []).join("\n")}
                onChange={(e) =>
                  updateRelease(
                    "release_notes",
                    e.target.value.split("\n").map((line) => line.trim()).filter(Boolean)
                  )
                }
                placeholder={"Instant QR transfers\nLive transaction detail\nCard spend controls"}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Release Image
              </label>
              {content.release?.image_url ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={content.release.image_url}
                    alt=""
                    aria-hidden="true"
                    className="h-20 w-16 rounded-lg border border-zinc-200 dark:border-zinc-800 object-cover"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => pickImageFor("release", 0)}
                      disabled={uploadingImage}
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {uploadingImage ? "Uploading…" : "Replace"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRelease("image_url", "")}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => pickImageFor("release", 0)}
                  disabled={uploadingImage}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-blue-500 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingImage ? "Uploading…" : "Upload release image"}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 7. FOOTER SECTION */}
        {activeSection === "footer" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Footer & Legal Links
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                placeholder="support@zenhabit.app"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Footer Tagline
              </label>
              <input
                type="text"
                value={content.footer?.tagline || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, tagline: e.target.value },
                  }))
                }
                placeholder="A launch page built with ShipSprint."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Link Columns
                </label>
                <button
                  type="button"
                  onClick={addFooterColumn}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Column</span>
                </button>
              </div>
              {(content.footer?.columns ?? []).map((column, colIdx) => (
                <div
                  key={colIdx}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={column.heading}
                      onChange={(e) =>
                        updateContent((prev) => {
                          const columns = [...(prev.footer.columns ?? [])];
                          const existing = columns[colIdx];
                          if (!existing) return prev;
                          columns[colIdx] = { ...existing, heading: e.target.value };
                          return { ...prev, footer: { ...prev.footer, columns } };
                        })
                      }
                      placeholder="Column heading"
                      aria-label={`Column ${colIdx + 1} heading`}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateContent((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            columns: (prev.footer.columns ?? []).filter((_, i) => i !== colIdx),
                          },
                        }))
                      }
                      className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors shrink-0"
                      title="Delete column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {column.links.map((link, linkIdx) => (
                    <div key={linkIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) =>
                          updateContent((prev) => {
                            const columns = [...(prev.footer.columns ?? [])];
                            const existing = columns[colIdx];
                            if (!existing) return prev;
                            const links = [...existing.links];
                            const current = links[linkIdx];
                            if (!current) return prev;
                            links[linkIdx] = { ...current, label: e.target.value };
                            columns[colIdx] = { ...existing, links };
                            return { ...prev, footer: { ...prev.footer, columns } };
                          })
                        }
                        placeholder="Label"
                        aria-label={`Column ${colIdx + 1} link ${linkIdx + 1} label`}
                        className="w-1/3 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) =>
                          updateContent((prev) => {
                            const columns = [...(prev.footer.columns ?? [])];
                            const existing = columns[colIdx];
                            if (!existing) return prev;
                            const links = [...existing.links];
                            const current = links[linkIdx];
                            if (!current) return prev;
                            links[linkIdx] = { ...current, url: e.target.value };
                            columns[colIdx] = { ...existing, links };
                            return { ...prev, footer: { ...prev.footer, columns } };
                          })
                        }
                        placeholder="/terms or https://…"
                        aria-label={`Column ${colIdx + 1} link ${linkIdx + 1} URL`}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateContent((prev) => {
                            const columns = [...(prev.footer.columns ?? [])];
                            const existing = columns[colIdx];
                            if (!existing) return prev;
                            columns[colIdx] = {
                              ...existing,
                              links: existing.links.filter((_, i) => i !== linkIdx),
                            };
                            return { ...prev, footer: { ...prev.footer, columns } };
                          })
                        }
                        className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors shrink-0"
                        title="Delete link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateContent((prev) => {
                        const columns = [...(prev.footer.columns ?? [])];
                        const existing = columns[colIdx];
                        if (!existing) return prev;
                        columns[colIdx] = {
                          ...existing,
                          links: [...existing.links, { label: "New link", url: "" }],
                        };
                        return { ...prev, footer: { ...prev.footer, columns } };
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-blue-500 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Link</span>
                  </button>
                </div>
              ))}
              {(content.footer?.columns ?? []).length === 0 && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
                  No columns yet. The footer shows the flat legal-links row until you add one.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 6. CUSTOM DOMAIN SECTION (PRO GATED) */}
        {activeSection === "domain" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="block">Custom Domain</span>
                {!isCustomDomainAllowed && (
                  <span className="mt-1.5 inline-block whitespace-nowrap px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-semibold uppercase tracking-wider">
                    Pro Tier Only
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                  Free and Basic tiers publish to `your-app.shipsprint.site`. Upgrade to Pro to connect unlimited custom domains with zero-touch SSL.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-colors"
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
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      domainCopy.tone === "emerald"
                        ? "border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                        : domainCopy.tone === "red"
                          ? "border-red-200/80 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20"
                          : "border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            domainCopy.tone === "emerald"
                              ? "bg-emerald-500"
                              : domainCopy.tone === "red"
                                ? "bg-red-500"
                                : "bg-amber-500 animate-pulse"
                          }`}
                        />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 font-mono truncate">
                          {connectedDomain}
                        </span>
                      </div>

                      {domainCopy.tone === "emerald" && (
                        <a
                          href={`https://${connectedDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span>Visit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="pt-2 flex items-start justify-between gap-3 border-t border-zinc-200/50 dark:border-zinc-900/40 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {domainCopy.label}
                        </span>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {domainCopy.detail}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {domainCopy.tone !== "emerald" && (
                          <button
                            type="button"
                            onClick={() => void refreshDomainState()}
                            className="text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 text-[11px] font-medium"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Recheck
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleDisconnectDomain}
                          disabled={connectingDomain}
                          className="text-red-600 dark:text-red-400 hover:underline text-[11px] font-medium"
                        >
                          {connectingDomain ? "Disconnecting..." : "Disconnect"}
                        </button>
                      </div>
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
                        className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleConnectDomain}
                        disabled={connectingDomain || !domainInput.trim()}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-55 text-white text-xs font-semibold shadow-sm transition-colors shrink-0 inline-flex items-center gap-1.5"
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
                    <span>DNS Configuration</span>
                  </div>

                  {domainInstructions ? (
                    <>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                        Add both records at your DNS provider (Cloudflare, Namecheap,
                        GoDaddy). The exact values come from the API so they always
                        match what we actually check.
                      </p>

                      <div className="space-y-2">
                        {(
                          [
                            [domainInstructions.ownership, "Ownership"],
                            [domainInstructions.routing, "Routing"],
                          ] as const
                        ).map(([record, label]) => (
                          <div
                            key={label}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden text-[11px] font-mono"
                          >
                            <div className="bg-zinc-100 dark:bg-zinc-900 px-2 py-1.5 text-zinc-600 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                              {label}
                            </div>
                            <div className="p-2 space-y-1">
                              <div className="flex gap-2">
                                <span className="text-zinc-600 w-10 shrink-0">
                                  Type
                                </span>
                                <span className="text-zinc-800 dark:text-zinc-200">
                                  {record.type}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-zinc-600 w-10 shrink-0">
                                  Name
                                </span>
                                <span className="text-zinc-800 dark:text-zinc-200 break-all">
                                  {record.name}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-zinc-600 w-10 shrink-0">
                                  Value
                                </span>
                                <span className="text-blue-600 dark:text-blue-400 break-all">
                                  {record.value || "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-zinc-600">
                        {domainInstructions.routing.note} Once DNS resolves, a
                        certificate is issued and renewed automatically — you do not
                        need to do anything else.
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-zinc-600">
                      Connect a domain to see the exact DNS records required.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
