import type { ReactNode } from "react";
import { Archive, ArchiveRestore, Eye, EyeOff, MoreHorizontal, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useConfirm } from "@/components/feedback/confirm-context";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ContentResource } from "@/config/resources";
import { formatDateTime } from "@/lib/format";
import type { ContentRepository } from "@/repositories/content";
import type { ContentStatus } from "@/types";
import { ReadOnlyNotice } from "./ReadOnlyNotice";
import { useContentActions } from "./useContent";

interface EditorLayoutProps<TRow, TItem, TInput> {
  resource: ContentResource;
  repository: ContentRepository<TRow, TItem, TInput>;
  isNew: boolean;
  recordId: string;
  title: string;
  status: ContentStatus;
  updatedAt?: string | null;
  canManage: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onSubmit: (status?: ContentStatus) => void;
  /** Mention « Programmé » (article publié avec une date future). */
  scheduled?: boolean;
  main: ReactNode;
  aside: ReactNode;
}

/** Écran d'édition commun : en-tête, actions de publication, colonnes principale / latérale. */
export function EditorLayout<TRow, TItem, TInput>({
  resource,
  repository,
  isNew,
  recordId,
  title,
  status,
  updatedAt,
  canManage,
  isSaving,
  isDirty,
  onSubmit,
  scheduled,
  main,
  aside,
}: EditorLayoutProps<TRow, TItem, TInput>) {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { remove } = useContentActions(resource, repository);

  const archive = async () => {
    const ok = await confirm({
      title: "Archiver ce contenu ?",
      description: "Il ne sera plus visible sur le site. Vous pourrez le restaurer à tout moment.",
      confirmLabel: "Archiver",
    });
    if (ok) onSubmit("archived");
  };

  const unpublish = async () => {
    const ok = await confirm({ title: "Dépublier ce contenu ?", description: "Il sera retiré du site public et repassera en brouillon.", confirmLabel: "Dépublier" });
    if (ok) onSubmit("draft");
  };

  const destroy = async () => {
    const ok = await confirm({
      tone: "danger",
      title: "Supprimer définitivement ?",
      description: "Ce contenu sera supprimé de manière irréversible. Les fichiers de la médiathèque ne sont pas supprimés.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    remove.mutate(recordId, { onSuccess: () => navigate(resource.path, { replace: true }) });
  };

  const menu: DropdownItem[] = [];
  if (!isNew && status !== "archived") menu.push({ label: "Archiver", icon: Archive, onSelect: () => void archive() });
  if (!isNew && status === "archived") menu.push({ label: "Supprimer définitivement", icon: Trash2, tone: "danger", onSelect: () => void destroy() });

  const actions = canManage ? (
    <>
      {menu.length ? <Dropdown trigger={(props) => <IconButton icon={MoreHorizontal} label="Plus d'actions" variant="secondary" {...props} />} items={menu} /> : null}
      {isNew ? (
        <>
          <Button variant="secondary" icon={Save} loading={isSaving} onClick={() => onSubmit("draft")}>
            Enregistrer le brouillon
          </Button>
          <Button icon={Eye} loading={isSaving} onClick={() => onSubmit("published")}>
            Publier
          </Button>
        </>
      ) : status === "draft" ? (
        <>
          <Button variant="secondary" icon={Save} loading={isSaving} onClick={() => onSubmit()}>
            Enregistrer
          </Button>
          <Button icon={Eye} loading={isSaving} onClick={() => onSubmit("published")}>
            Publier
          </Button>
        </>
      ) : status === "published" ? (
        <>
          <Button variant="ghost" icon={EyeOff} disabled={isSaving} onClick={() => void unpublish()}>
            Dépublier
          </Button>
          <Button icon={Save} loading={isSaving} onClick={() => onSubmit()}>
            Enregistrer
          </Button>
        </>
      ) : (
        <>
          <Button variant="secondary" icon={ArchiveRestore} loading={isSaving} onClick={() => onSubmit("draft")}>
            Restaurer en brouillon
          </Button>
          <Button icon={Save} loading={isSaving} onClick={() => onSubmit()}>
            Enregistrer
          </Button>
        </>
      )}
    </>
  ) : null;

  return (
    <>
      <PageHeader
        back={{ to: resource.path, label: resource.label }}
        title={isNew ? title : title || "Sans titre"}
        meta={
          <>
            {!isNew ? <ContentStatusBadge status={status} scheduled={scheduled} /> : null}
            {isDirty && canManage ? <span className="text-xs font-semibold text-warning">Modifications non enregistrées</span> : null}
          </>
        }
        description={!isNew && updatedAt ? `Dernière modification : ${formatDateTime(updatedAt)}` : undefined}
        actions={actions}
      />
      {!canManage ? <ReadOnlyNotice /> : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canManage) onSubmit();
        }}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]"
      >
        <fieldset disabled={!canManage} className="min-w-0 space-y-6">
          {main}
        </fieldset>
        <fieldset disabled={!canManage} className="min-w-0 space-y-6">
          {aside}
        </fieldset>
        {/* Entrée clavier = enregistrer, sans bouton visible supplémentaire. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </>
  );
}

export function FormSection({ title, description, children, actions }: { title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} actions={actions} />
      <CardBody className="space-y-5">{children}</CardBody>
    </Card>
  );
}

/** États de chargement / erreur d'un écran d'édition. */
export function EditorStatus({ isLoading, error, onRetry }: { isLoading: boolean; error: unknown; onRetry: () => void }) {
  if (isLoading) return <LoadingState />;
  if (error)
    return (
      <Card>
        <ErrorState error={error} onRetry={onRetry} />
      </Card>
    );
  return null;
}
