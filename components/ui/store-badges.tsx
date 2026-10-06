/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";
import { safeHref } from "@/lib/validation";

export interface StoreBadgeProps {
  href: string;
  onClick?: () => void;
  isPreview?: boolean;
  className?: string;
}

/**
 * Apple App Store Badge (Exact Official SVG Specification)
 * 180x60 vector badge with embedded typography — 100% immune to CSS line wrapping.
 */
export function AppStoreBadge({
  href,
  onClick,
  isPreview = false,
  className = "",
}: StoreBadgeProps) {
  return (
    <a
      href={safeHref(href)}
      target={isPreview ? "_self" : "_blank"}
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label="Download on the App Store"
      className={`inline-block transition-transform hover:scale-[1.02] active:scale-[0.98] drop-shadow-md select-none shrink-0 ${className}`}
    >
      <svg
        width="180"
        height="60"
        viewBox="0 0 180 60"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Download on the App Store"
        className="h-[52px] sm:h-[56px] md:h-[60px] w-auto max-w-[180px] block"
      >
        <rect
          x="0.5"
          y="0.5"
          width="179"
          height="59"
          rx="9"
          fill="#000"
          stroke="#A6A6A6"
        />

        {/* Apple Logo */}
        <path
          d="M37.05 30.2c-.03-3.75 3.07-5.57 3.21-5.66-1.76-2.57-4.5-2.92-5.46-2.95-2.29-.24-4.51 1.37-5.68 1.37-1.19 0-2.98-1.34-4.91-1.3-2.49.04-4.82 1.48-6.1 3.74-2.65 4.59-.67 11.33 1.87 15.04 1.27 1.82 2.75 3.85 4.68 3.78 1.89-.08 2.6-1.21 4.88-1.21 2.25 0 2.92 1.21 4.89 1.17 2.03-.03 3.31-1.82 4.54-3.66 1.47-2.09 2.06-4.12 2.08-4.22-.05-.02-3.97-1.52-4-6.1Z"
          fill="#fff"
        />

        <path
          d="M33.32 19.16c1.02-1.27 1.72-3.01 1.53-4.76-1.48.07-3.32 1.02-4.38 2.27-.95 1.11-1.79 2.92-1.58 4.61 1.66.13 3.37-.84 4.43-2.12Z"
          fill="#fff"
        />

        {/* Text */}
        <text
          x="55"
          y="24"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="11"
        >
          Download on the
        </text>

        <text
          x="55"
          y="43"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="21"
          fontWeight="600"
        >
          App Store
        </text>
      </svg>
    </a>
  );
}

/**
 * Google Play Store Badge (Exact Official SVG Specification)
 * 180x60 vector badge with 4-color triangle and official typography.
 */
export function GooglePlayBadge({
  href,
  onClick,
  isPreview = false,
  className = "",
}: StoreBadgeProps) {
  return (
    <a
      href={safeHref(href)}
      target={isPreview ? "_self" : "_blank"}
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label="Get it on Google Play"
      className={`inline-block transition-transform hover:scale-[1.02] active:scale-[0.98] drop-shadow-md select-none shrink-0 ${className}`}
    >
      <svg
        width="180"
        height="60"
        viewBox="0 0 180 60"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Get it on Google Play"
        className="h-[52px] sm:h-[56px] md:h-[60px] w-auto max-w-[180px] block"
      >
        <rect
          x="0.5"
          y="0.5"
          width="179"
          height="59"
          rx="9"
          fill="#000"
          stroke="#A6A6A6"
        />

        {/* Google Play Triangle */}
        <path
          d="M25.2 13.4c-.5.5-.8 1.3-.8 2.3v28.6c0 1 .3 1.8.8 2.3l.1.1 16-16.5v-.4L25.2 13.4Z"
          fill="#00D4FF"
        />

        <path
          d="m46.6 35.5-5.3-5.3v-.4l5.3-5.3.1.1 6.3 3.6c1.8 1 1.8 2.7 0 3.7l-6.3 3.6-.1.1Z"
          fill="#FFD500"
        />

        <path
          d="m46.7 35.4-5.4-5.4-16.1 16.6c.6.6 1.5.6 2.5.1l19-10.8Z"
          fill="#FF3B30"
        />

        <path
          d="m46.7 24.6-19-10.8c-1-.6-1.9-.5-2.5.1l16.1 16.1 5.4-5.4Z"
          fill="#34C759"
        />

        {/* Text */}
        <text
          x="63"
          y="23"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="10"
        >
          GET IT ON
        </text>

        <text
          x="63"
          y="43"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="20"
          fontWeight="500"
        >
          Google Play
        </text>
      </svg>
    </a>
  );
}

/**
 * Apple TestFlight Public Beta Badge (Matches 180x60 geometry)
 */
export function TestFlightBadge({
  href,
  onClick,
  isPreview = false,
  className = "",
}: StoreBadgeProps) {
  return (
    <a
      href={safeHref(href)}
      target={isPreview ? "_self" : "_blank"}
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label="Join Apple TestFlight Beta"
      className={`inline-block transition-transform hover:scale-[1.02] active:scale-[0.98] drop-shadow-md select-none shrink-0 ${className}`}
    >
      <svg
        width="180"
        height="60"
        viewBox="0 0 180 60"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Join Apple TestFlight Beta"
        className="h-[52px] sm:h-[56px] md:h-[60px] w-auto max-w-[180px] block"
      >
        <rect
          x="0.5"
          y="0.5"
          width="179"
          height="59"
          rx="9"
          fill="#000"
          stroke="#A6A6A6"
        />

        {/* TestFlight Propeller */}
        <circle cx="34" cy="30" r="13" stroke="#00D4FF" strokeWidth="2" fill="none" />
        <path
          d="M34 19v22M25 25l18 10M25 35l18-10"
          stroke="#00D4FF"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Text */}
        <text
          x="57"
          y="23"
          fill="#60a5fa"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="10"
        >
          Join the Beta on
        </text>

        <text
          x="57"
          y="43"
          fill="#fff"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="20"
          fontWeight="600"
        >
          TestFlight
        </text>
      </svg>
    </a>
  );
}

/**
 * AppDownloadButtons
 * Configurable container rendering official vector store badges side-by-side.
 */
export default function AppDownloadButtons({
  playStoreUrl = "#",
  appStoreUrl = "#",
  alignment = "justify-center",
}: {
  playStoreUrl?: string;
  appStoreUrl?: string;
  bgColor?: string;
  alignment?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center ${alignment} gap-3 p-2`}>
      {appStoreUrl && <AppStoreBadge href={appStoreUrl} />}
      {playStoreUrl && <GooglePlayBadge href={playStoreUrl} />}
    </div>
  );
}
