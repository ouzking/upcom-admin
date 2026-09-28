/**
 * Variables d'environnement publiques, lues une seule fois, typées et VÉRIFIÉES.
 *
 * Aucune valeur n'est codée en dur : l'URL et la clé du projet Supabase viennent
 * exclusivement de VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (intégrées
 * au moment du build). Si elles manquent ou sont invalides, l'application affiche
 * un écran explicite au lieu d'essayer de joindre un serveur par défaut.
 */
const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const rawUrl = clean(import.meta.env.VITE_SUPABASE_URL)?.replace(/\/+$/, "") ?? null;
const rawKey = clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ?? clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const isLocalHost = (url: string): boolean => {
  try {
    return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

/** Rôle porté par une ancienne clé JWT (anon / service_role), sinon null. */
const jwtRole = (key: string): string | null => {
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    return (JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
};

/** Problème de configuration à afficher, ou null si tout est correct. */
export function configurationProblem(url: string | null, key: string | null, production: boolean): string | null {
  if (!url || !key) return "missing";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid_url";
  }
  // En production, seul un projet hébergé en HTTPS est acceptable (jamais la pile locale).
  if (production && (isLocalHost(url) || parsed.protocol !== "https:")) return "local_url_in_production";
  // Une clé secrète ne doit jamais atteindre le navigateur.
  if (key.startsWith("sb_secret_") || jwtRole(key) === "service_role") return "secret_key";
  return null;
}

export const env = {
  supabaseUrl: rawUrl,
  supabaseKey: rawKey,
  publicSiteUrl: clean(import.meta.env.VITE_PUBLIC_SITE_URL)?.replace(/\/+$/, "") ?? null,
} as const;

export const configProblem = configurationProblem(rawUrl, rawKey, import.meta.env.PROD);

export const isSupabaseConfigured = configProblem === null;
