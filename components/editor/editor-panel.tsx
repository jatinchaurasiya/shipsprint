/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Site,
  SiteContent,
  FeatureItem,
  ReleaseInfo,
  Plan,
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
import {
  type DomainState,
  type EditorSectionId,
  domainStatusCopy,
  generateFeatureId,
  parseReleaseNotes,
  BLANK_RELEASE,
} from "@/lib/editor";
import { StoreSelector } from "./store-selector";
import { PageManager } from "./page-manager";
import { LogoManager } from "./logo-manager";
import { ImageEditorModal, type CroppedImageResult } from "./image-editor-modal";
import { AiDiscoveryPanel } from "./ai-discovery-panel";
import { normalizeImageUrl } from "@/lib/storage/image-url";
import { getDefaultSitePages } from "@/lib/legal-pages";
import type { SitePage } from "@/types/database";

export type ImageEditorTarget =
  | { kind: "primary_screenshot" }
  | { kind: "secondary_screenshot" }
  | { kind: "logo" }
  | { kind: "screenshot_gallery"; index?: number }
  | { kind: "feature"; index: number }
  | { kind: "logo_wall"; index: number }
  | { kind: "release" };

interface EditorPanelProps {
  content: SiteContent;
  onChange: (updated: SiteContent) => void;
  plan?: Plan | null;
  siteId?: string;
  initialDomain?: string | null;
}

export function EditorPanel({
  content,
  onChange,
  plan,
  siteId,
  initialDomain,
}: EditorPanelProps) {
  const [activeSection, setActiveSection] = useState<EditorSectionId>("hero");
  const [activePageId, setActivePageId] = useState<string>("page-home");
  const [uploadingLogo] = useState(false);
  const [uploadingScreenshot] = useState(false);
  const [uploadingImage] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Dedicated scroll container for the form
  const formScrollRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Generic image picker serving feature / logo-wall / release targets
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageTarget, setImageTarget] = useState<{
    kind: "feature" | "logo" | "release";
    index: number;
  } | null>(null);

  // Image editor modal state
  const [imageEditorState, setImageEditorState] = useState<{
    src: string;
    target: ImageEditorTarget;
    defaultAspect?: number;
  } | null>(null);

  // Custom domain state
  const [domainInput, setDomainInput] = useState<string>(initialDomain || "");
  const [connectedDomain, setConnectedDomain] = useState<string | null>(
    initialDomain || null
  );
  const [connectingDomain, setConnectingDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
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
      // Best-effort DNS query; keep last known state
    }
  }, [siteId, connectedDomain]);

  useEffect(() => {
    if (!connectedDomain || domainState?.status === "active") return;

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
        setDomainMessage({
          type: "error",
          text: data.error || "Failed to connect domain.",
        });
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
      setDomainMessage({
        type: "error",
        text:
          (err instanceof Error ? err.message : undefined) ||
          "Failed to connect domain.",
      });
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
        setDomainMessage({
          type: "error",
          text: data.error || "Failed to disconnect domain.",
        });
        return;
      }

      setConnectedDomain(null);
      setDomainInput("");
      setDomainMessage({
        type: "success",
        text: "Domain disconnected successfully.",
      });
    } catch (err) {
      setDomainMessage({
        type: "error",
        text:
          (err instanceof Error ? err.message : undefined) ||
          "Failed to disconnect domain.",
      });
    } finally {
      setConnectingDomain(false);
    }
  };

  const isCustomDomainAllowed = plan?.has_custom_domain ?? false;
  const domainCopy = domainStatusCopy(domainState);
  const domainInstructions = domainState?.instructions ?? null;

  const updateContent = (updater: (prev: SiteContent) => SiteContent) => {
    const updated = updater(content);
    onChange(updated);
  };

  // Upload handler helper for cropped files
  const uploadImageFile = async (
    file: File
  ): Promise<{ url?: string; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || "Upload failed" };
      }
      return { url: data.url };
    } catch (err) {
      return {
        error:
          (err instanceof Error ? err.message : undefined) ||
          "Upload failed to reach server",
      };
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageEditorState({
          src: event.target.result,
          target: { kind: "logo" },
          defaultAspect: 1,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageEditorState({
          src: event.target.result,
          target: { kind: "screenshot_gallery" },
          defaultAspect: 9 / 19.5,
        });
      }
    };
    reader.readAsDataURL(file);
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
    setTimeout(() => imageInputRef.current?.click(), 0);
  };

  const updateRelease = (
    field: keyof ReleaseInfo,
    value: string | string[]
  ) => {
    updateContent((prev) => ({
      ...prev,
      release: { ...BLANK_RELEASE, ...prev.release, [field]: value },
    }));
  };

  const handleGenericImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = imageTarget;
    if (!file || !target) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageEditorState({
          src: event.target.result,
          target:
            target.kind === "feature"
              ? { kind: "feature", index: target.index }
              : target.kind === "release"
              ? { kind: "release" }
              : { kind: "logo_wall", index: target.index },
          defaultAspect: target.kind === "feature" ? 9 / 19.5 : undefined,
        });
      }
    };
    reader.readAsDataURL(file);
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
    const newFeature: FeatureItem = {
      id: generateFeatureId(),
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

  const appPages =
    content.pages && content.pages.length > 0
      ? content.pages
      : getDefaultSitePages(
          content.brand?.name || content.hero?.app_name || "App",
          content.footer?.contact_email
        );

  const handleUpdatePage = (updatedPage: SitePage) => {
    updateContent((prev) => {
      const currentPages =
        prev.pages && prev.pages.length > 0 ? prev.pages : appPages;
      const index = currentPages.findIndex((p) => p.id === updatedPage.id);
      if (index === -1) {
        return { ...prev, pages: [...currentPages, updatedPage] };
      }
      const updated = [...currentPages];
      updated[index] = updatedPage;
      return { ...prev, pages: updated };
    });
  };

  const handleAddCustomPage = (title: string, slug: string) => {
    const newPage: SitePage = {
      id: `page-${Date.now()}`,
      slug,
      title,
      nav_label: title,
      show_in_nav: true,
      show_in_footer: true,
      page_type: "custom",
      is_system: false,
      is_published: true,
      content_markdown: `# ${title}\n\nAdd your content here...`,
      updated_at: new Date().toISOString(),
    };
    updateContent((prev) => ({
      ...prev,
      pages: [
        ...(prev.pages && prev.pages.length > 0 ? prev.pages : appPages),
        newPage,
      ],
    }));
    setActivePageId(newPage.id);
  };

  const handleDeleteCustomPage = (pageId: string) => {
    updateContent((prev) => ({
      ...prev,
      pages: (prev.pages && prev.pages.length > 0 ? prev.pages : appPages).filter(
        (p) => p.id !== pageId
      ),
    }));
    setActivePageId("page-home");
  };

  const sections: { id: EditorSectionId; label: string; badge?: number | string }[] = [
    { id: "hero", label: "App & Hero" },
    { id: "impacts", label: "Impacts Bento" },
    { id: "features", label: "Features", badge: content.features?.length || 0 },
    { id: "how", label: "How It Works" },
    { id: "store", label: "Store Links" },
    { id: "pages", label: "Legal & Pages", badge: appPages.length },
    { id: "footer", label: "Footer" },
    { id: "domain", label: "Domain" },
    { id: "ai_discovery", label: "AI & Search" },
  ];

  // Select section with smooth scroll reset & tab auto-visibility
  const handleSelectSection = (secId: EditorSectionId) => {
    setActiveSection(secId);
    formScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    tabRefs.current[secId]?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  };

  // Keyboard navigation for section tabs
  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % sections.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = sections.length - 1;
    }

    if (nextIndex !== currentIndex) {
      const nextSec = sections[nextIndex];
      if (nextSec) {
        handleSelectSection(nextSec.id);
        tabRefs.current[nextSec.id]?.focus();
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
      {/* Fixed Section Switcher Tabs (Zero Sticky Jitter) */}
      <nav
        ref={tabListRef}
        role="tablist"
        aria-label="Editor Configuration Sections"
        className="p-2 sm:p-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/95 dark:bg-zinc-900/90 shrink-0"
      >
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {sections.map((sec, idx) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                ref={(el) => {
                  tabRefs.current[sec.id] = el;
                }}
                id={`tab-${sec.id}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`panel-${sec.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelectSection(sec.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 cursor-pointer ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70"
                }`}
              >
                <span>{sec.label}</span>
                {sec.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? "bg-zinc-800 text-zinc-300 dark:bg-zinc-200 dark:text-zinc-700"
                        : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Image Editor Modal */}
      {imageEditorState && (
        <ImageEditorModal
          imageSrc={imageEditorState.src}
          defaultAspect={imageEditorState.defaultAspect}
          title={
            imageEditorState.target.kind === "primary_screenshot"
              ? "Edit iPhone Mockup Screenshot"
              : imageEditorState.target.kind === "secondary_screenshot"
              ? "Edit Secondary iPhone Screenshot"
              : imageEditorState.target.kind === "logo"
              ? "Edit App Icon / Logo"
              : imageEditorState.target.kind === "screenshot_gallery"
              ? "Edit App Screenshot"
              : imageEditorState.target.kind === "feature"
              ? "Edit Feature Image"
              : "Edit Image"
          }
          onClose={() => setImageEditorState(null)}
          onApply={async (result: CroppedImageResult) => {
            const target = imageEditorState.target;
            let finalUrl = result.dataUrl;

            // In production, upload the cropped image to Cloudflare R2 via /api/upload
            const uploadRes = await uploadImageFile(result.file);
            if (uploadRes.url) {
              finalUrl = uploadRes.url;
            } else if (
              uploadRes.error &&
              !uploadRes.error.includes("Object storage is not configured")
            ) {
              alert(uploadRes.error);
              return;
            }

            if (target.kind === "primary_screenshot") {
              updateContent((prev) => ({
                ...prev,
                hero: { ...prev.hero, device_screenshot_url: finalUrl },
              }));
            } else if (target.kind === "secondary_screenshot") {
              updateContent((prev) => ({
                ...prev,
                hero: {
                  ...prev.hero,
                  device_screenshot_url_secondary: finalUrl,
                },
              }));
            } else if (target.kind === "logo") {
              updateContent((prev) => ({
                ...prev,
                brand: {
                  ...prev.brand,
                  logo_url: finalUrl,
                  app_icon_url: prev.brand.app_icon_url || finalUrl,
                },
              }));
            } else if (target.kind === "screenshot_gallery") {
              updateContent((prev) => {
                if (target.index !== undefined) {
                  const updated = [...(prev.screenshots || [])];
                  updated[target.index] = finalUrl;
                  return { ...prev, screenshots: updated };
                }
                return {
                  ...prev,
                  screenshots: [...(prev.screenshots || []), finalUrl],
                };
              });
            } else if (target.kind === "feature") {
              updateContent((prev) => {
                const updated = [...prev.features];
                const existing = updated[target.index];
                if (!existing) return prev;
                updated[target.index] = { ...existing, image_url: finalUrl };
                return { ...prev, features: updated };
              });
            } else if (target.kind === "logo_wall") {
              updateContent((prev) => {
                const logos = [...(prev.logo_wall?.logos ?? [])];
                const existing = logos[target.index];
                if (!existing) return prev;
                logos[target.index] = { ...existing, image_url: finalUrl };
                return {
                  ...prev,
                  logo_wall: {
                    eyebrow: prev.logo_wall?.eyebrow ?? "",
                    logos,
                  },
                };
              });
            } else if (target.kind === "release") {
              updateContent((prev) => ({
                ...prev,
                release: {
                  ...BLANK_RELEASE,
                  ...prev.release,
                  image_url: finalUrl,
                },
              }));
            }
            setImageEditorState(null);
          }}
        />
      )}

      {/* Form Content: Dedicated Scroll Container */}
      <div
        ref={formScrollRef}
        id={`panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeSection}`}
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 pb-32 sm:pb-40 scrollbar-thin"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          isolation: "isolate",
        }}
      >
        {/* Hidden shared picker for feature / logo-wall / release images */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleGenericImageSelect}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          aria-hidden="true"
        />

        {/* 1. HERO & BRAND SECTION */}
        {activeSection === "hero" && (
          <div className="space-y-5 animate-in fade-in duration-150">
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
                      src={normalizeImageUrl(content.brand.logo_url)}
                      alt="Logo preview"
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
                    aria-hidden="true"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
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
                      <span>
                        {content.brand?.logo_url ? "Change Icon" : "Upload Icon"}
                      </span>
                    </button>
                    {content.brand?.logo_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setImageEditorState({
                            src: normalizeImageUrl(content.brand?.logo_url || ""),
                            target: { kind: "logo" },
                            defaultAspect: 1,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Edit Icon
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    PNG, JPG, or WebP (square 1:1 recommended)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="input-hero-app-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                App Name
              </label>
              <input
                id="input-hero-app-name"
                type="text"
                value={content.hero?.app_name || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, app_name: e.target.value },
                    brand: { ...prev.brand, name: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                placeholder="ZenHabit"
              />
            </div>

            <div>
              <label
                htmlFor="input-hero-badge"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Badge Pill Text
              </label>
              <input
                id="input-hero-badge"
                type="text"
                value={content.hero?.badge_text || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, badge_text: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                placeholder="Now Available on iOS & Android"
              />
            </div>

            <div>
              <label
                htmlFor="input-hero-header"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Headline Header
              </label>
              <textarea
                id="input-hero-header"
                rows={3}
                value={content.hero?.header || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, header: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all leading-relaxed"
                placeholder="Build habits that quietly transform your daily life."
              />
            </div>

            <div>
              <label
                htmlFor="input-hero-desc"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Short Description
              </label>
              <textarea
                id="input-hero-desc"
                rows={3}
                value={content.hero?.short_description || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, short_description: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all leading-relaxed"
                placeholder="Gentle nudges, intuitive progress rings, and private cloud sync designed to make healthy routines stick."
              />
            </div>

            {/* Device Mockup Screenshot */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                iPhone Mockup Screen Image
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={screenshotInputRef}
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      // Read as data URL and open image editor
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (typeof event.target?.result === "string") {
                          setImageEditorState({
                            src: event.target.result,
                            target: { kind: "primary_screenshot" },
                            defaultAspect: 9 / 19.5,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => screenshotInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {content.hero?.device_screenshot_url
                        ? "Replace Screenshot"
                        : "Upload Screenshot"}
                    </span>
                  </button>
                  {content.hero?.device_screenshot_url && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setImageEditorState({
                            src: normalizeImageUrl(content.hero?.device_screenshot_url || ""),
                            target: { kind: "primary_screenshot" },
                            defaultAspect: 9 / 19.5,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Edit Image
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, device_screenshot_url: "" },
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
                <input
                  type="url"
                  value={content.hero?.device_screenshot_url || ""}
                  onChange={(e) =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, device_screenshot_url: e.target.value },
                    }))
                  }
                  placeholder="or paste image URL for iPhone frame (leave blank for blank mockup)"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Shown inside the hardware frame in the hero. Leave empty for a blank placeholder.
              </p>
            </div>

            {/* Secondary iPhone Mockup Screenshot (Back Frame) */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Secondary iPhone Screen Image (Background Phone)
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (typeof event.target?.result === "string") {
                          setImageEditorState({
                            src: event.target.result,
                            target: { kind: "secondary_screenshot" },
                            defaultAspect: 9 / 19.5,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                    id="secondary-screenshot-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("secondary-screenshot-input") as HTMLInputElement | null;
                      input?.click();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {content.hero?.device_screenshot_url_secondary
                        ? "Replace Secondary"
                        : "Upload Secondary"}
                    </span>
                  </button>
                  {content.hero?.device_screenshot_url_secondary && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setImageEditorState({
                            src: normalizeImageUrl(content.hero?.device_screenshot_url_secondary || ""),
                            target: { kind: "secondary_screenshot" },
                            defaultAspect: 9 / 19.5,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Edit Image
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateContent((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, device_screenshot_url_secondary: "" },
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
                <input
                  type="url"
                  value={content.hero?.device_screenshot_url_secondary || ""}
                  onChange={(e) =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        device_screenshot_url_secondary: e.target.value,
                      },
                    }))
                  }
                  placeholder="Paste image URL for the tilted back iPhone frame"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Shown inside the cascading back iPhone (-1.5° tilt). If empty, mirrors the primary screenshot.
              </p>
            </div>

            {/* Official App Download Buttons (Hero CTA) */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Official App Download Buttons
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your Hero displays crisp, vector Google Play and App Store buttons. Configure URLs and availability in the Store Links tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectSection("store")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-xs shrink-0 cursor-pointer"
                >
                  Configure Links <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Star Rating Proof */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Rating Stars (1 - 5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={content.hero?.rating_stars || 5}
                  onChange={(e) =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        rating_stars: parseInt(e.target.value, 10) || 5,
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Rating Proof Text
                </label>
                <input
                  type="text"
                  value={content.hero?.rating_text || ""}
                  onChange={(e) =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, rating_text: e.target.value },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  placeholder="Built for App Store launches"
                />
              </div>
            </div>

            {/* Category Tags */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Category Tags (comma-separated)
              </label>
              <input
                type="text"
                value={(content.brand?.categories || []).join(", ")}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    brand: {
                      ...prev.brand,
                      categories: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                placeholder="Habit, Focus, Productivity, Health, Design, Life"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Shown in the category proof strip right below the hero chamber.
              </p>
            </div>

            {/* Email Capture Form Toggle & Settings */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label
                    htmlFor="toggle-email-capture"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block"
                  >
                    Email Capture Form
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Collect visitor emails directly from the hero
                  </span>
                </div>
                <button
                  id="toggle-email-capture"
                  type="button"
                  onClick={() =>
                    updateContent((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        email_capture_enabled: !(
                          prev.hero.email_capture_enabled ?? false
                        ),
                      },
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    content.hero?.email_capture_enabled
                      ? "bg-zinc-900 dark:bg-zinc-100"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                  role="switch"
                  aria-checked={content.hero?.email_capture_enabled ?? false}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${
                      content.hero?.email_capture_enabled
                        ? "translate-x-4"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {content.hero?.email_capture_enabled && (
                <div className="space-y-3 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
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
                          hero: {
                            ...prev.hero,
                            email_placeholder: e.target.value,
                          },
                        }))
                      }
                      placeholder="Your email address"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
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
                          hero: {
                            ...prev.hero,
                            email_cta_label: e.target.value,
                          },
                        }))
                      }
                      placeholder="Get Early Access"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Success Confirmation Message
                    </label>
                    <input
                      type="text"
                      value={content.hero?.email_success_message || ""}
                      onChange={(e) =>
                        updateContent((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            email_success_message: e.target.value,
                          },
                        }))
                      }
                      placeholder="You're on the list. We'll be in touch."
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IMPACTS BENTO SECTION */}
        {activeSection === "impacts" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Impacts Bento Mosaic
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Highlight social proof, ratings, uptime SLA, and launch speed metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Section Eyebrow
                </label>
                <input
                  type="text"
                  value={content.impacts?.eyebrow || "Our impacts"}
                  onChange={(e) =>
                    updateContent((prev) => ({
                      ...prev,
                      impacts: { ...prev.impacts, eyebrow: e.target.value },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 transition-all"
                  placeholder="Our impacts"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Section Title
                </label>
                <input
                  type="text"
                  value={content.impacts?.title || "Real results. Real impact."}
                  onChange={(e) =>
                    updateContent((prev) => ({
                      ...prev,
                      impacts: { ...prev.impacts, title: e.target.value },
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 transition-all"
                  placeholder="Real results. Real impact."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Description Subtitle
              </label>
              <textarea
                rows={2}
                value={content.impacts?.description || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    impacts: { ...prev.impacts, description: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 transition-all leading-relaxed"
                placeholder="See how indie makers turn visitors into installs..."
              />
            </div>

            {/* Tile 1: Trust & Volume */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Tile 1: Trust & Active Users
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Metric Stat (e.g. 1,200+)
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.metric_stat || "1,200+"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, metric_stat: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Metric Label
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.metric_label || "Live app landing pages published worldwide"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, metric_label: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Tile 2: Tall Dark Rating Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Tile 2: Star Rating Score
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Rating Score (0 to 5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={content.impacts?.rating_score ?? 4.9}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, rating_score: parseFloat(e.target.value) || 5 },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Rating Subtitle
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.rating_reviews_label || "Average indie maker rating across launches"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, rating_reviews_label: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            {/* Tile 3 & 4: SLA and Speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Tile 3: Reliability / SLA
                </h4>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Stat (e.g. 99.9%)
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.sla_stat || "99.9%"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, sla_stat: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.sla_label || "Uptime SLA via Caddy edge & automated TLS"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, sla_label: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Tile 4: Speed / Efficiency Chip
                </h4>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Stat (e.g. &lt; 2 min)
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.speed_stat || "< 2 min"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, speed_stat: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={content.impacts?.speed_label || "From setup to live custom domain"}
                    onChange={(e) =>
                      updateContent((prev) => ({
                        ...prev,
                        impacts: { ...prev.impacts, speed_label: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. STORE LINKS SECTION */}
        {activeSection === "store" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Store Availability & Download Links
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Select your release platform (iOS, Android, Both, or TestFlight Beta).
                Buttons automatically configure on the live landing page.
              </p>
            </div>

            <StoreSelector
              value={content.store_links || {}}
              onChange={(store_links) =>
                updateContent((prev) => ({ ...prev, store_links }))
              }
            />
          </div>
        )}

        {/* 3. FEATURES SECTION */}
        {activeSection === "features" && (
          <div className="space-y-5 animate-in fade-in duration-150">
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
                    <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      Feature #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Delete Feature"
                      aria-label={`Delete Feature ${idx + 1}`}
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
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
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
                      onChange={(e) =>
                        updateFeature(idx, "title", e.target.value)
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
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
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Phone Mockup Image{" "}
                      <span className="font-normal text-zinc-400">
                        (featured in the phone showcase band)
                      </span>
                    </label>
                    {feature.image_url ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={normalizeImageUrl(feature.image_url)}
                          alt=""
                          aria-hidden="true"
                          className="h-16 w-10 rounded-lg border border-zinc-200 dark:border-zinc-800 object-cover"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setImageEditorState({
                                src: normalizeImageUrl(feature.image_url!),
                                target: { kind: "feature", index: idx },
                                defaultAspect: 9 / 19.5,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-xs"
                          >
                            <ImageIcon className="w-3 h-3" />
                            Edit Crop
                          </button>
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
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingImage ? "Uploading…" : "Upload phone image"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOW IT WORKS SECTION */}
        {activeSection === "how" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                How It Works (3 Steps)
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Explain the simple 3-step sequence for your app or onboarding.
              </p>
            </div>

            <div className="space-y-4">
              {(content.how_it_works && content.how_it_works.length > 0
                ? content.how_it_works
                : [
                    {
                      step: "Step 1",
                      title: "Craft your identity",
                      description:
                        "Add your icon, screenshots, store links, and copy. Watch the live preview update instantly with zero drift.",
                    },
                    {
                      step: "Step 2",
                      title: "Showcase verified proof",
                      description:
                        "Highlight core capabilities, checklist milestones, and verified ratings to build immediate trust with visitors.",
                    },
                    {
                      step: "Step 3",
                      title: "Publish & track installs",
                      description:
                        "Publish to your subdomain or custom domain with automated TLS. Track cookieless store taps from day one.",
                    },
                  ]
              ).map((stepItem, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {stepItem.step || `Step ${idx + 1}`}
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={stepItem.title}
                      onChange={(e) => {
                        const current =
                          content.how_it_works && content.how_it_works.length > 0
                            ? [...content.how_it_works]
                            : [
                                {
                                  step: "Step 1",
                                  title: "Craft your identity",
                                  description:
                                    "Add your icon, screenshots, store links, and copy.",
                                },
                                {
                                  step: "Step 2",
                                  title: "Showcase verified proof",
                                  description:
                                    "Highlight core capabilities, checklist milestones, and ratings.",
                                },
                                {
                                  step: "Step 3",
                                  title: "Publish & track installs",
                                  description:
                                    "Publish to your custom domain with automated TLS.",
                                },
                              ];
                        current[idx] = { ...current[idx]!, title: e.target.value };
                        updateContent((prev) => ({ ...prev, how_it_works: current }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Step Description
                    </label>
                    <textarea
                      rows={2}
                      value={stepItem.description}
                      onChange={(e) => {
                        const current =
                          content.how_it_works && content.how_it_works.length > 0
                            ? [...content.how_it_works]
                            : [
                                {
                                  step: "Step 1",
                                  title: "Craft your identity",
                                  description:
                                    "Add your icon, screenshots, store links, and copy.",
                                },
                                {
                                  step: "Step 2",
                                  title: "Showcase verified proof",
                                  description:
                                    "Highlight core capabilities, checklist milestones, and ratings.",
                                },
                                {
                                  step: "Step 3",
                                  title: "Publish & track installs",
                                  description:
                                    "Publish to your custom domain with automated TLS.",
                                },
                              ];
                        current[idx] = {
                          ...current[idx]!,
                          description: e.target.value,
                        };
                        updateContent((prev) => ({ ...prev, how_it_works: current }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SCREENSHOTS SECTION */}
        {activeSection === "screenshots" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Screenshots Gallery
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Upload your mobile app screenshots to showcase the interface.
                The first image displays inside the hero iPhone mockup.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="file"
                ref={screenshotInputRef}
                onChange={handleScreenshotSelect}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => screenshotInputRef.current?.click()}
                disabled={uploadingScreenshot}
                className="w-full py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer"
              >
                {uploadingScreenshot ? (
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-900 dark:text-zinc-100" />
                ) : (
                  <Upload className="w-5 h-5 text-zinc-400" />
                )}
                <span>
                  {uploadingScreenshot
                    ? "Uploading screenshot..."
                    : "Upload Screenshot"}
                </span>
                <span className="text-[10px] text-zinc-500">
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
                      src={normalizeImageUrl(url)}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
                      #{idx + 1} {idx === 0 && "(Hero)"}
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() =>
                          setImageEditorState({
                            src: normalizeImageUrl(url),
                            target: { kind: "screenshot_gallery", index: idx },
                            defaultAspect: 9 / 19.5,
                          })
                        }
                        className="p-1.5 rounded-lg bg-zinc-900/85 hover:bg-zinc-950 text-white transition-colors shadow-sm"
                        title="Crop / Edit screenshot"
                        aria-label={`Edit screenshot ${idx + 1}`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeScreenshot(idx)}
                        className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
                        title="Delete screenshot"
                        aria-label={`Delete screenshot ${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. LOGO WALL & APP IDENTITY SECTION */}
        {activeSection === "logos" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Brand &amp; Press Proof Assets
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Customize your App Store icon, navbar brand logo, and featured press/partner mentions.
              </p>
            </div>

            <LogoManager
              appIconUrl={content.brand?.app_icon_url || content.brand?.logo_url}
              brandLogoUrl={content.brand?.logo_url}
              appName={content.hero?.app_name || content.brand?.name || "App"}
              logoWall={content.logo_wall}
              onAppIconChange={(url) =>
                updateContent((prev) => ({
                  ...prev,
                  brand: {
                    ...prev.brand,
                    app_icon_url: url,
                    logo_url: prev.brand.logo_url || url,
                  },
                }))
              }
              onBrandLogoChange={(url) =>
                updateContent((prev) => ({
                  ...prev,
                  brand: { ...prev.brand, logo_url: url },
                }))
              }
              onLogoWallChange={(logoWall) =>
                updateContent((prev) => ({
                  ...prev,
                  logo_wall: logoWall,
                }))
              }
            />
          </div>
        )}

        {/* 6. RELEASE SECTION */}
        {activeSection === "release" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                App Release Panel
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                App Store listing metadata: rating, age, chart, version, and
                notes. Always state honest metrics for your app.
              </p>
            </div>

            {(
              [
                ["eyebrow", "Eyebrow", "Now available"],
                ["title", "Title", "To be released on the App Store soon…"],
                ["version", "Version", "2.4"],
                ["rating", "Rating (e.g. 4.8)", "4.8"],
                [
                  "rating_count",
                  "Rating Count (e.g. 12.4K ratings)",
                  "12.4K ratings",
                ],
                ["age_rating", "Age Rating (e.g. 4+)", "4+"],
                [
                  "chart_rank",
                  "Chart Rank (e.g. #3 in Finance)",
                  "#3 in Finance",
                ],
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
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
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
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Release Notes{" "}
                <span className="font-normal text-zinc-400">
                  (one bullet point per line)
                </span>
              </label>
              <textarea
                rows={3}
                value={(content.release?.release_notes ?? []).join("\n")}
                onChange={(e) =>
                  updateRelease(
                    "release_notes",
                    parseReleaseNotes(e.target.value)
                  )
                }
                placeholder={
                  "Instant QR transfers\nLive transaction detail\nCard spend controls"
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all font-mono leading-relaxed"
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
                    src={normalizeImageUrl(content.release.image_url)}
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploadingImage ? "Uploading…" : "Upload release image"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6.5 LEGAL & PAGES SECTION */}
        {activeSection === "pages" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                App Pages & Regulatory Compliance
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Apple App Store Guideline 1.5 & 5.1.1 require active Privacy and Support URLs.
                Free accounts include the 4 core compliance pages; Pro unlocks custom subpages.
              </p>
            </div>

            <PageManager
              pages={appPages}
              activePageId={activePageId}
              planId={plan?.id}
              onSelectPage={setActivePageId}
              onUpdatePage={handleUpdatePage}
              onAddCustomPage={handleAddCustomPage}
              onDeleteCustomPage={handleDeleteCustomPage}
            />
          </div>
        )}

        {/* 7. FOOTER SECTION */}
        {activeSection === "footer" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Footer & Legal Links
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Configure your copyright branding, support contact, and legal
                navigation.
              </p>
            </div>

            <div>
              <label
                htmlFor="input-footer-brand"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Footer Brand Name
              </label>
              <input
                id="input-footer-brand"
                type="text"
                value={content.footer?.brand_name || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, brand_name: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                placeholder="ZenHabit Technologies Inc."
              />
            </div>

            <div>
              <label
                htmlFor="input-footer-contact"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Support / Contact Email
              </label>
              <input
                id="input-footer-contact"
                type="email"
                value={content.footer?.contact_email || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, contact_email: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                placeholder="support@zenhabit.app"
              />
            </div>

            <div>
              <label
                htmlFor="input-footer-tagline"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Footer Tagline
              </label>
              <input
                id="input-footer-tagline"
                type="text"
                value={content.footer?.tagline || ""}
                onChange={(e) =>
                  updateContent((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, tagline: e.target.value },
                  }))
                }
                placeholder="A launch page built with ShipSprint."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
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
                          columns[colIdx] = {
                            ...existing,
                            heading: e.target.value,
                          };
                          return {
                            ...prev,
                            footer: { ...prev.footer, columns },
                          };
                        })
                      }
                      placeholder="Column heading"
                      aria-label={`Column ${colIdx + 1} heading`}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateContent((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            columns: (prev.footer.columns ?? []).filter(
                              (_, i) => i !== colIdx
                            ),
                          },
                        }))
                      }
                      className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                      title="Delete column"
                      aria-label={`Delete column ${colIdx + 1}`}
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
                            links[linkIdx] = {
                              ...current,
                              label: e.target.value,
                            };
                            columns[colIdx] = { ...existing, links };
                            return {
                              ...prev,
                              footer: { ...prev.footer, columns },
                            };
                          })
                        }
                        placeholder="Label"
                        aria-label={`Column ${colIdx + 1} link ${linkIdx + 1} label`}
                        className="w-1/3 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all"
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
                            links[linkIdx] = {
                              ...current,
                              url: e.target.value,
                            };
                            columns[colIdx] = { ...existing, links };
                            return {
                              ...prev,
                              footer: { ...prev.footer, columns },
                            };
                          })
                        }
                        placeholder="/terms or https://…"
                        aria-label={`Column ${colIdx + 1} link ${linkIdx + 1} URL`}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all font-mono"
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
                              links: existing.links.filter(
                                (_, i) => i !== linkIdx
                              ),
                            };
                            return {
                              ...prev,
                              footer: { ...prev.footer, columns },
                            };
                          })
                        }
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                        title="Delete link"
                        aria-label={`Delete link ${linkIdx + 1}`}
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
                          links: [
                            ...existing.links,
                            { label: "New link", url: "" },
                          ],
                        };
                        return { ...prev, footer: { ...prev.footer, columns } };
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-zinc-900 dark:hover:border-zinc-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Link</span>
                  </button>
                </div>
              ))}

              {(content.footer?.columns ?? []).length === 0 && (
                <p className="text-xs text-zinc-500 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
                  No link columns yet. The footer renders standard legal links
                  until columns are added.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 8. CUSTOM DOMAIN SECTION (PRO GATED) */}
        {activeSection === "domain" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h3 className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="block">Custom Domain</span>
                {!isCustomDomainAllowed && (
                  <span className="mt-1.5 inline-block whitespace-nowrap px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
                    Pro Tier Only
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Connect your custom domain (e.g. `yourcustomapp.com`) with
                automated TLS certificate provisioning.
              </p>
            </div>

            {!isCustomDomainAllowed ? (
              <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Unlock Custom Domains with ShipSprint Pro
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
                  Free and Basic tiers publish to `your-app.shipsprint.site`.
                  Upgrade to Pro to connect custom domains with zero-touch TLS.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-colors"
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
                    <label
                      htmlFor="input-custom-domain"
                      className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Your Custom Domain
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="input-custom-domain"
                        type="text"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="app.myfitnessbrand.com"
                        className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-100/15 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleConnectDomain}
                        disabled={connectingDomain || !domainInput.trim()}
                        className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-55 text-xs font-semibold shadow-sm transition-colors shrink-0 inline-flex items-center gap-1.5"
                      >
                        {connectingDomain && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        <span>Connect</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* DNS Configuration Instructions */}
                <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                    <span>DNS Configuration</span>
                  </div>

                  {domainInstructions ? (
                    <>
                      <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                        Add both records at your DNS registrar (Cloudflare,
                        Namecheap, GoDaddy). The exact values come directly from
                        the API.
                      </p>

                      <div className="space-y-2">
                        {(
                          [
                            [domainInstructions.ownership, "Ownership (TXT)"],
                            [domainInstructions.routing, "Routing (CNAME)"],
                          ] as const
                        ).map(([record, label]) => (
                          <div
                            key={label}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden text-[11px] font-mono"
                          >
                            <div className="bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1.5 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                              {label}
                            </div>
                            <div className="p-2.5 space-y-1">
                              <div className="flex gap-2">
                                <span className="text-zinc-400 w-12 shrink-0">
                                  Type
                                </span>
                                <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                                  {record.type}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-zinc-400 w-12 shrink-0">
                                  Name
                                </span>
                                <span className="text-zinc-800 dark:text-zinc-200 break-all select-all">
                                  {record.name}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-zinc-400 w-12 shrink-0">
                                  Value
                                </span>
                                <span className="text-zinc-900 dark:text-zinc-100 font-semibold break-all select-all">
                                  {record.value || "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-zinc-500">
                        {domainInstructions.routing.note} Once DNS resolves, a
                        TLS certificate is issued automatically.
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-zinc-500">
                      Connect a custom domain to see required DNS records.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Search & LLM Discoverability Section Panel */}
        {activeSection === "ai_discovery" && (
          <div
            id="panel-ai_discovery"
            role="tabpanel"
            aria-labelledby="tab-ai_discovery"
            className="p-4 sm:p-6"
          >
            <AiDiscoveryPanel
              site={
                {
                  id: siteId || "",
                  content,
                  custom_domain: connectedDomain,
                  slug: content.brand?.name?.toLowerCase().replace(/[^a-z0-9]/g, "") || "app",
                  status: "published",
                } as Site
              }
              plan={plan}
              siteId={siteId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
