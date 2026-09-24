import {
  BriefcaseBusiness,
  CalendarRange,
  Clapperboard,
  Clock,
  Compass,
  Handshake,
  Layers,
  Megaphone,
  MonitorSmartphone,
  Palette,
  PenTool,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

/**
 * Registre d'icônes autorisées pour la colonne `icon` des services — IDENTIQUE
 * à celui du site public (upcom-frontend/src/lib/icons.ts) : une clé inconnue
 * du site serait remplacée par l'icône par défaut. Toute évolution doit être
 * faite dans les deux dépôts.
 */
export const ICONS = {
  "briefcase-business": BriefcaseBusiness,
  "calendar-range": CalendarRange,
  clapperboard: Clapperboard,
  clock: Clock,
  compass: Compass,
  handshake: Handshake,
  layers: Layers,
  megaphone: Megaphone,
  "monitor-smartphone": MonitorSmartphone,
  palette: Palette,
  "pen-tool": PenTool,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  target: Target,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const isIconName = (value: string | null | undefined): value is IconName =>
  typeof value === "string" && value in ICONS;
