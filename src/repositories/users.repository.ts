import { EDGE_FUNCTIONS } from "@upcom/supabase";
import { unwrap, assertAffected } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { AdminDeleteUserResult, AdminInviteUserPayload, AdminInviteUserResult, AppRole, ProfileRow } from "@/types";
import { invokeFunction } from "./functions";

/**
 * Profils du back-office. La création de comptes passe par l'Edge Function
 * `admin-invite-user` (l'Admin API Auth exige la service_role, qui ne quitte
 * jamais le serveur). Rôle / statut : contrôlés par RLS + trigger
 * `guard_profile_changes` (users.manage, super_admin, dernier super_admin).
 */
export const usersRepository = {
  async list(): Promise<ProfileRow[]> {
    return unwrap(await supabase.from("profiles").select("*").order("created_at", { ascending: true }));
  },

  /** Membres actifs ayant un rôle (assignation des demandes). */
  async listStaff(): Promise<Pick<ProfileRow, "id" | "full_name" | "email" | "role">[]> {
    return unwrap(
      await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .not("role", "is", null)
        .eq("is_active", true)
        .order("full_name"),
    );
  },

  async updateRole(id: string, role: AppRole | null): Promise<void> {
    assertAffected(await supabase.from("profiles").update({ role }).eq("id", id).select("id"));
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    assertAffected(await supabase.from("profiles").update({ is_active: isActive }).eq("id", id).select("id"));
  },

  async updateName(id: string, fullName: string): Promise<void> {
    assertAffected(await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", id).select("id"));
  },

  invite: (payload: AdminInviteUserPayload) =>
    invokeFunction<AdminInviteUserResult>(EDGE_FUNCTIONS.adminInviteUser, payload),

  /**
   * Suppression définitive (Auth + profil) via l'Edge Function admin-delete-user.
   * Refusée côté serveur pour son propre compte et le dernier super_admin actif ;
   * contenus et demandes liés sont conservés (auteur / attribution vidés).
   */
  remove: (userId: string) => invokeFunction<AdminDeleteUserResult>(EDGE_FUNCTIONS.adminDeleteUser, { user_id: userId }),
};
