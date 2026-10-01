import type { ElementType } from "react";
import {
  Zap,
  Shield,
  Sparkles,
  Heart,
  Star,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Smile,
  Globe,
  Cpu,
  BarChart3,
  Smartphone,
  Rocket,
  Mail,
} from "lucide-react";

/**
 * Authoritative icon map for site features and templates.
 * Single source of truth shared by the site renderer, template definitions, and editor.
 */
export const ICON_MAP: Record<string, ElementType> = {
  Zap,
  Shield,
  Sparkles,
  Heart,
  Star,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Smile,
  Globe,
  Cpu,
  BarChart3,
  Smartphone,
  Rocket,
  Mail,
};

export const AVAILABLE_ICONS: string[] = Object.keys(ICON_MAP);

export function getFeatureIcon(iconName?: string | null): ElementType {
  if (!iconName) return Sparkles;
  return ICON_MAP[iconName] || Sparkles;
}
