import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, UserPlus, Users } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { EmptyState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { displayName, useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { assignableRoles } from "@/lib/permissions";
import { queryKeys } from "@/lib/queryKeys";
import { usersRepository } from "@/repositories/users.repository";
import type { AppRole, ProfileRow } from "@/types";
import { InviteUserModal } from "./InviteUserModal";
import { RolesMatrix } from "./RolesMatrix";

/**
 * Gestion des membres du back-office (permission users.manage).
 * Les règles sont appliquées en base (trigger guard_profile_changes) :
 * seul un super_admin attribue super_admin ; le dernier super_admin actif ne
 * peut être ni rétrogradé ni désactivé.
 */
export default function UsersPage() {
  const { access, profile: me } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const query = useQuery({ queryKey: queryKeys.users, queryFn: usersRepository.list });
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const roles = assignableRoles(access);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.users })]);

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AppRole | null }) => usersRepository.updateRole(id, role),
    onSuccess: async () => {
      toast.success("Rôle mis à jour.");
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => usersRepository.setActive(id, active),
    onSuccess: async (_, { active }) => {
      toast.success(active ? "Compte réactivé." : "Compte désactivé.");
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const onRoleChange = async (user: ProfileRow, value: string) => {
    const role = value ? (value as AppRole) : null;
    if (role === user.role) return;
    const ok = await confirm({
      title: role ? `Attribuer le rôle « ${ROLE_LABELS[role]} » ?` : "Retirer l'accès au back-office ?",
      description: role
        ? `${displayName(user)} obtiendra immédiatement les droits associés à ce rôle.`
        : `${displayName(user)} ne pourra plus rien consulter ni modifier dans le back-office.`,
      confirmLabel: role ? "Attribuer" : "Retirer l'accès",
      tone: role ? "default" : "danger",
    });
    if (ok) changeRole.mutate({ id: user.id, role });
  };

  const onToggleActive = async (user: ProfileRow) => {
    const ok = await confirm({
      title: user.is_active ? `Désactiver ${displayName(user)} ?` : `Réactiver ${displayName(user)} ?`,
      description: user.is_active ? "Le compte perdra immédiatement tout accès au back-office. Vous pourrez le réactiver plus tard." : "Le compte retrouvera les droits de son rôle.",
      confirmLabel: user.is_active ? "Désactiver" : "Réactiver",
      tone: user.is_active ? "danger" : "default",
    });
    if (ok) setActive.mutate({ id: user.id, active: !user.is_active });
  };

  const columns: Column<ProfileRow>[] = [
    {
      key: "user",
      header: "Utilisateur",
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={displayName(user)} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-semibold text-ink">
              {user.full_name || <span className="text-muted italic">Nom non renseigné</span>}
              {user.id === me?.id ? <Badge tone="brand">Vous</Badge> : null}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rôle",
      cell: (user) => {
        // Pas d'auto-modification (évite de se retirer ses propres droits) ; un super_admin
        // ne peut être modifié que par un super_admin (règle backend).
        const locked = user.id === me?.id || (user.role === "super_admin" && access?.role !== "super_admin");
        if (locked) return user.role ? <Badge tone={user.role === "super_admin" ? "accent" : "brand"}>{ROLE_LABELS[user.role]}</Badge> : <Badge>Aucun rôle</Badge>;
        return (
          <Select
            aria-label={`Rôle de ${displayName(user)}`}
            value={user.role ?? ""}
            onChange={(event) => void onRoleChange(user, event.target.value)}
            disabled={changeRole.isPending}
            className="h-9 min-w-52"
          >
            <option value="">Aucun rôle (pas d'accès)</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      cell: (user) =>
        !user.is_active ? (
          <Badge tone="danger" dot>
            Désactivé
          </Badge>
        ) : user.role ? (
          <Badge tone="success" dot>
            Actif
          </Badge>
        ) : (
          <Badge tone="warning" dot>
            En attente de rôle
          </Badge>
        ),
    },
    { key: "created", header: "Créé le", hideBelow: "lg", cell: (user) => <span className="text-muted">{formatDate(user.created_at)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (user) =>
        user.id !== me?.id && !(user.role === "super_admin" && access?.role !== "super_admin") ? (
          <Button size="sm" variant={user.is_active ? "ghost" : "secondary"} onClick={() => void onToggleActive(user)} disabled={setActive.isPending}>
            {user.is_active ? "Désactiver" : "Réactiver"}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Membres ayant accès au back-office. Les comptes sont créés uniquement par invitation."
        actions={
          <>
            <Button variant="secondary" icon={Info} onClick={() => setMatrixOpen(true)}>
              Rôles et permissions
            </Button>
            <Button icon={UserPlus} onClick={() => setInviteOpen(true)}>
              Inviter un membre
            </Button>
          </>
        }
      />
      <Card>
        <DataTable
          caption="Utilisateurs du back-office"
          rows={query.data}
          columns={columns}
          rowKey={(user) => user.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={<EmptyState icon={Users} title="Aucun utilisateur" />}
          rowClassName={(user) => (!user.is_active ? "opacity-60" : undefined)}
        />
      </Card>
      <p className="mt-4 text-[13px] text-muted">
        La suppression définitive d'un compte se fait depuis le tableau de bord Supabase (Authentication → Users). Désactiver un compte suffit à lui retirer tout accès.
      </p>
      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} onInvited={refresh} />
      <RolesMatrix open={matrixOpen} onClose={() => setMatrixOpen(false)} />
    </>
  );
}
