import type { AppPermission, AppRole, MyAccess, StorageBucket } from "@/types";
import { BUCKET_WRITE_PERMISSION } from "@upcom/supabase";

/**
 * Contrôles d'affichage uniquement.
 *
 * Les droits viennent de la RPC `get_my_access` (matrice role_permissions en
 * base). L'interface masque ce que l'utilisateur ne peut pas faire, mais chaque
 * requête reste contrôlée par la RLS : masquer un bouton n'est jamais une
 * mesure de sécurité.
 */
export function can(access: MyAccess | null | undefined, permission: AppPermission): boolean {
  if (!access) return false;
  return access.role === "super_admin" || access.permissions.includes(permission);
}

export function canAny(access: MyAccess | null | undefined, permissions: readonly AppPermission[]): boolean {
  return permissions.some((permission) => can(access, permission));
}

export function canWriteBucket(access: MyAccess | null | undefined, bucket: StorageBucket): boolean {
  return can(access, BUCKET_WRITE_PERMISSION[bucket]);
}

/** Rôles qu'un utilisateur peut attribuer (miroir du trigger guard_profile_changes). */
export function assignableRoles(access: MyAccess | null | undefined): AppRole[] {
  if (!can(access, "users.manage")) return [];
  const roles: AppRole[] = ["editor", "communication_manager", "commercial"];
  return access?.role === "super_admin" ? ["super_admin", ...roles] : roles;
}
