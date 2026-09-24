import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppPermission, MyAccess, ProfileRow } from "@/types";

/**
 * - loading    : lecture de la session / des droits en cours
 * - signed_out : aucune session
 * - no_access  : session valide mais profil sans rôle ou désactivé (= visiteur pour la RLS)
 * - ready      : membre actif du back-office
 */
export type AuthStatus = "loading" | "signed_out" | "no_access" | "ready";

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: ProfileRow | null;
  access: MyAccess | null;
  /** Vrai si la session provient d'un lien de réinitialisation du mot de passe. */
  isRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: AppPermission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return context;
}

/** Nom d'affichage : nom complet, sinon partie locale de l'e-mail. */
export function displayName(profile: Pick<ProfileRow, "full_name" | "email"> | null | undefined): string {
  if (!profile) return "";
  return profile.full_name?.trim() || profile.email.split("@")[0] || profile.email;
}

export function firstName(profile: Pick<ProfileRow, "full_name" | "email"> | null | undefined): string {
  return displayName(profile).split(/\s+/)[0] ?? "";
}

/** Destination après connexion : chemin interne uniquement (pas de redirection ouverte). */
export function redirectTarget(state: unknown): string {
  const from = typeof state === "object" && state !== null && "from" in state ? (state as { from: unknown }).from : null;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/";
}
