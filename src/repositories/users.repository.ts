import { EDGE_FUNCTIONS } from "@upcom/supabase";
import { assertOk, unwrap } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { AdminInviteUserPayload, AdminInviteUserResult, AppRole, ProfileRow } from "@/types";
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
    assertOk(await supabase.from("profiles").update({ role }).eq("id", id));
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    assertOk(await supabase.from("profiles").update({ is_active: isActive }).eq("id", id));
  },

  async updateName(id: string, fullName: string): Promise<void> {
    assertOk(await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", id));
  },

  invite: (payload: AdminInviteUserPayload) =>
    invokeFunction<AdminInviteUserResult>(EDGE_FUNCTIONS.adminInviteUser, payload),
};
