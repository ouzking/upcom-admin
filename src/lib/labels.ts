/**
 * Libellés français partagés (source : package @upcom/supabase) et tons
 * visuels associés aux statuts.
 */
import type { ContactStatus, ContentStatus, QuoteStatus } from "@/types";

export {
  CONTACT_STATUS_LABELS,
  CONTENT_STATUS_LABELS,
  PERMISSION_LABELS,
  QUOTE_STATUS_LABELS,
  ROLE_LABELS,
  SOCIAL_PLATFORM_LABELS,
} from "@upcom/supabase";

export type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";

export const CONTENT_STATUS_TONES: Record<ContentStatus, Tone> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};

export const QUOTE_STATUS_TONES: Record<QuoteStatus, Tone> = {
  new: "accent",
  in_progress: "brand",
  contacted: "warning",
  converted: "success",
  closed: "neutral",
};

export const CONTACT_STATUS_TONES: Record<ContactStatus, Tone> = {
  new: "accent",
  read: "brand",
  replied: "success",
  archived: "neutral",
};

export const CONTENT_STATUSES: ContentStatus[] = ["draft", "published", "archived"];
export const QUOTE_STATUSES: QuoteStatus[] = ["new", "in_progress", "contacted", "converted", "closed"];
export const CONTACT_STATUSES: ContactStatus[] = ["new", "read", "replied", "archived"];
