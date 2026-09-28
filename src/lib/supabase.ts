import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@upcom/supabase";
import { env, isSupabaseConfigured } from "@/config/env";
import { AppError } from "./errors";

export type UpcomClient = SupabaseClient<Database>;

let client: UpcomClient | null = null;

/**
 * Client Supabase unique du back-office, créé à la première utilisation et
 * UNIQUEMENT avec la configuration fournie au build (aucune adresse par défaut).
 *
 * Il utilise la clé publishable + la SESSION de l'utilisateur (JWT) : toutes les
 * requêtes sont soumises aux policies RLS du backend. L'interface adapte
 * l'affichage aux permissions, mais la sécurité réelle est appliquée en base.
 */
function getClient(): UpcomClient {
  if (client) return client;
  if (!isSupabaseConfigured || !env.supabaseUrl || !env.supabaseKey) {
    throw new AppError("Le back-office n'est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).", { code: "not_configured" });
  }
  client = createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Liens d'invitation / de réinitialisation : la session est lue depuis l'URL.
      detectSessionInUrl: true,
      storageKey: "upcom-admin-auth",
    },
  });
  return client;
}

/** Accès paresseux : aucune connexion réseau n'est tentée tant que la configuration est absente. */
export const supabase: UpcomClient = new Proxy({} as UpcomClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
