import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@upcom/supabase";
import { env } from "@/config/env";

export type UpcomClient = SupabaseClient<Database>;

/**
 * Client Supabase unique du back-office.
 *
 * Il utilise la clé publishable/anon + la SESSION de l'utilisateur (JWT) : toutes
 * les requêtes sont donc soumises aux policies RLS du backend. L'interface adapte
 * l'affichage aux permissions, mais la sécurité réelle est appliquée en base.
 * Si la configuration manque, l'application affiche un écran dédié (voir App).
 */
export const supabase: UpcomClient = createClient<Database>(
  env.supabaseUrl ?? "http://127.0.0.1:54321",
  env.supabaseKey ?? "missing-publishable-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Nécessaire pour les liens d'invitation / de réinitialisation (jetons dans l'URL).
      detectSessionInUrl: true,
      storageKey: "upcom-admin-auth",
    },
  },
);
