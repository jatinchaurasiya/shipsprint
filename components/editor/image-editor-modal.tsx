"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FlipHorizontal2,
  FlipVertical2,
  Check,
  Undo2,
  Loader2,
  Maximize2,
  Smartphone,
  Image as ImageIcon,
} from "lucide-react";
import { normalizeImageUrl } from "@/lib/storage/image-url";

export interface CroppedImageResult {
  dataUrl: string;
  blob: Blob;
  file: File;
}

/* ------------------------------------------------------------------ */
/* Canvas helper: crop + transform the image purely on the client.     */
/* Returns a Blob, File, and base-64 data-url.                        */
/* ------------------------------------------------------------------ */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  flipH: boolean,
  flipV: boolean
): Promise<CroppedImageResult> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const rotRad = (rotation * Math.PI) / 180;

  // bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedBBox(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  // Extract the crop area from the full-canvas
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas 2D context unavailable");

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob returned null"));
        return;
      }
      const file = new File([blob], "edited-image.png", { type: "image/png" });
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve({ dataUrl: reader.result, blob, file });
        } else {
          reject(new Error("FileReader result is not a string"));
        }
      };
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(blob);
    }, "image/png");
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = normalizeImageUrl(url);
  });
}

function getRotatedBBox(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) +
      Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) +
      Math.abs(Math.cos(rotRad) * height),
  };
}

/* ------------------------------------------------------------------ */
/* Aspect ratio presets                                                 */
/* ------------------------------------------------------------------ */
const ASPECT_PRESETS = [
  { label: "Free", value: undefined, icon: Maximize2 },
  { label: "9:19.5", value: 9 / 19.5, icon: Smartphone },
  { label: "1:1", value: 1, icon: ImageIcon },
  { label: "4:3", value: 4 / 3, icon: ImageIcon },
  { label: "16:9", value: 16 / 9, icon: ImageIcon },
] as const;

/* ------------------------------------------------------------------ */
/* Modal component                                                     */
/* ------------------------------------------------------------------ */
interface ImageEditorModalProps {
  /** The raw image source (data-url or remote URL) to edit */
  imageSrc: string;
  /** Called with the final cropped image result when the user applies */
  onApply: (result: CroppedImageResult) => void | Promise<void>;
  /** Called when the user closes without applying */
  onClose: () => void;
  /** Optional: override the default aspect ratio (9:19.5 for phone mockup) */
  defaultAspect?: number;
  /** Optional: label shown in the header */
  title?: string;
}

export function ImageEditorModal({
  imageSrc,
  onApply,
  onClose,
  defaultAspect,
  title = "Edit Image",
}: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);
  const [activeAspectIdx, setActiveAspectIdx] = useState(() => {
    if (defaultAspect === undefined) return 0;
    const idx = ASPECT_PRESETS.findIndex(
      (p) => p.value !== undefined && Math.abs(p.value - defaultAspect) < 0.01
    );
    return idx >= 0 ? idx : 0;
  });

  const modalRef = useRef<HTMLDivElement>(null);

  const currentAspect = ASPECT_PRESETS[activeAspectIdx]?.value;

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    const normalizedSrc = normalizeImageUrl(imageSrc);
    try {
      const result = await getCroppedImg(
        normalizedSrc,
        croppedAreaPixels,
        rotation,
        flipH,
        flipV
      );
      await onApply(result);
    } catch (err) {
      console.error("Image crop failed:", err);
      alert("Failed to process image. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="relative flex flex-col w-[95vw] max-w-[700px] h-[90vh] max-h-[700px] rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            aria-label="Close editor"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Crop Canvas */}
        <div className="relative flex-1 min-h-0 bg-zinc-900">
          <Cropper
            image={normalizeImageUrl(imageSrc)}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={currentAspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
            style={{
              containerStyle: {
                background: "#18181b",
              },
              cropAreaStyle: {
                border: "2px solid rgba(255,255,255,0.8)",
                borderRadius: "8px",
              },
            }}
            transform={[
              `translate(${crop.x}px, ${crop.y}px)`,
              `rotateZ(${rotation}deg)`,
              `rotateY(${flipH ? 180 : 0}deg)`,
              `rotateX(${flipV ? 180 : 0}deg)`,
              `scale(${zoom})`,
            ].join(" ")}
          />
        </div>

        {/* Controls Bar */}
        <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-zinc-900/95 px-4 py-3 space-y-3">
          {/* Aspect Ratio Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mr-1.5">
              Aspect
            </span>
            {ASPECT_PRESETS.map((preset, idx) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setActiveAspectIdx(idx)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    activeAspectIdx === idx
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Transform Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {/* Zoom Controls */}
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <div className="w-[100px]">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                  aria-label="Zoom"
                />
              </div>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

              {/* Rotate */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Flip H */}
              <button
                type="button"
                onClick={() => setFlipH((v) => !v)}
                className={`p-1.5 rounded-lg border transition-colors shadow-xs ${
                  flipH
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
              </button>

              {/* Flip V */}
              <button
                type="button"
                onClick={() => setFlipV((v) => !v)}
                className={`p-1.5 rounded-lg border transition-colors shadow-xs ${
                  flipV
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="Flip Vertical"
              >
                <FlipVertical2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                title="Reset all transforms"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Apply / Cancel */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleApply()}
                disabled={applying || !croppedAreaPixels}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-colors shadow-sm active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {applying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
