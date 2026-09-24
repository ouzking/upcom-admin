import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AppError, assertOk, toAppError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { MyAccess, ProfileRow } from "@/types";

export const authRepository = {
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw toAppError(error);
    return data.session;
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAppError(error);
    if (!data.session) throw new AppError("Connexion impossible.");
    return data.session;
  },

  async signOut(): Promise<void> {
    // scope « local » : ferme la session de cet appareil uniquement.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw toAppError(error);
  },

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    assertOk(await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo }));
  },

  async updatePassword(password: string): Promise<void> {
    assertOk(await supabase.auth.updateUser({ password }));
  },

  async fetchProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw toAppError(error);
    return data;
  },

  /** Rôle + permissions de l'utilisateur connecté (RPC backend, source de vérité). */
  async fetchAccess(): Promise<MyAccess | null> {
    const { data, error } = await supabase.rpc("get_my_access");
    if (error) throw toAppError(error);
    const row = data?.[0];
    return row ? { role: row.role, permissions: row.permissions ?? [] } : null;
  },

  async updateMyName(userId: string, fullName: string): Promise<void> {
    assertOk(await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", userId));
  },
};
