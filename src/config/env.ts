/**
 * Variables d'environnement publiques, lues une seule fois et typées.
 * Aucune valeur secrète ne doit transiter par une variable VITE_* : seules
 * l'URL du projet et la clé publishable/anon sont attendues ici.
 */
const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const env = {
  supabaseUrl: clean(import.meta.env.VITE_SUPABASE_URL)?.replace(/\/+$/, "") ?? null,
  supabaseKey: clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ?? clean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  publicSiteUrl: clean(import.meta.env.VITE_PUBLIC_SITE_URL)?.replace(/\/+$/, "") ?? null,
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey);
