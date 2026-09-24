import { ALLOWED_IMAGE_MIME_TYPES, getPublicStorageUrl, type StorageBucket } from "@upcom/supabase";
import { env } from "@/config/env";

export { buildStoragePath } from "@upcom/supabase";

/** URL publique (CDN) d'un chemin stocké en base (`*_path`). */
export const publicUrl = (bucket: StorageBucket, path: string | null | undefined): string | null =>
  env.supabaseUrl ? getPublicStorageUrl(env.supabaseUrl, bucket, path) : null;

/** Limites des buckets (miroir de la migration storage du backend, pour un retour immédiat). */
export const BUCKET_RULES: Record<StorageBucket, { maxBytes: number; mimeTypes: readonly string[]; label: string }> = {
  "site-assets": {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: [...ALLOWED_IMAGE_MIME_TYPES, "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"],
    label: "Site (logos)",
  },
  services: { maxBytes: 5 * 1024 * 1024, mimeTypes: ALLOWED_IMAGE_MIME_TYPES, label: "Services" },
  projects: { maxBytes: 10 * 1024 * 1024, mimeTypes: ALLOWED_IMAGE_MIME_TYPES, label: "Réalisations" },
  team: { maxBytes: 5 * 1024 * 1024, mimeTypes: ALLOWED_IMAGE_MIME_TYPES, label: "Équipe" },
  articles: { maxBytes: 5 * 1024 * 1024, mimeTypes: ALLOWED_IMAGE_MIME_TYPES, label: "Actualités" },
  events: { maxBytes: 10 * 1024 * 1024, mimeTypes: ALLOWED_IMAGE_MIME_TYPES, label: "Événements" },
  testimonials: { maxBytes: 2 * 1024 * 1024, mimeTypes: ALLOWED_IMAGE_MIME_TYPES, label: "Témoignages" },
};

export const BUCKETS = Object.keys(BUCKET_RULES) as StorageBucket[];

/** Validation côté client (la même règle est appliquée par Storage côté serveur). */
export function validateFile(bucket: StorageBucket, file: File): string | null {
  const rules = BUCKET_RULES[bucket];
  if (!rules.mimeTypes.includes(file.type)) {
    return `Format non autorisé (${file.name}). Formats acceptés : ${formatMimeList(rules.mimeTypes)}.`;
  }
  if (file.size > rules.maxBytes) {
    return `${file.name} dépasse la taille maximale de ${Math.round(rules.maxBytes / (1024 * 1024))} Mo.`;
  }
  return null;
}

export const formatMimeList = (types: readonly string[]): string =>
  [...new Set(types.map((type) => type.replace("image/", "").replace("svg+xml", "svg").replace(/x-icon|vnd\.microsoft\.icon/, "ico").toUpperCase()))].join(", ");

export const acceptAttribute = (bucket: StorageBucket): string => BUCKET_RULES[bucket].mimeTypes.join(",");
