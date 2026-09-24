import { useQuery } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { Constants } from "@upcom/supabase";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { Modal } from "@/components/ui/Modal";
import { assertOk } from "@/lib/errors";
import { PERMISSION_LABELS, ROLE_LABELS } from "@/lib/labels";
import { supabase } from "@/lib/supabase";
import type { AppPermission, AppRole } from "@/types";

const ROLES = Constants.public.Enums.app_role as readonly AppRole[];
const PERMISSIONS = Constants.public.Enums.app_permission as readonly AppPermission[];

/** Matrice rôle → permissions lue en base (table role_permissions, source de vérité). */
export function RolesMatrix({ open, onClose }: { open: boolean; onClose: () => void }) {
  const query = useQuery({
    queryKey: ["role-permissions"],
    enabled: open,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("role, permission");
      assertOk({ error });
      return new Set((data ?? []).map((row) => `${row.role}:${row.permission}`));
    },
  });

  const has = (role: AppRole, permission: AppPermission) => role === "super_admin" || Boolean(query.data?.has(`${role}:${permission}`));

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Rôles et permissions" description="Matrice définie dans le backend (modifiable uniquement par migration). Les droits sont appliqués par la base de données.">
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-4 text-left text-xs font-semibold text-muted uppercase">
                  Permission
                </th>
                {ROLES.map((role) => (
                  <th key={role} scope="col" className="px-2 py-2 text-center text-xs font-semibold text-ink">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-ink-soft">
                    {PERMISSION_LABELS[permission]}
                  </th>
                  {ROLES.map((role) => (
                    <td key={role} className="px-2 py-2 text-center">
                      {has(role, permission) ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Oui" />
                      ) : (
                        <Minus className="mx-auto size-4 text-line-strong" aria-label="Non" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[13px] text-muted">Tous les membres actifs peuvent consulter les contenus (brouillons compris) et la médiathèque.</p>
        </div>
      )}
    </Modal>
  );
}
