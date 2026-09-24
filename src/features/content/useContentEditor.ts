import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useToast } from "@/components/feedback/toast-context";
import type { ContentResource } from "@/config/resources";
import { useAuth } from "@/features/auth/auth-context";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import type { ContentRepository } from "@/repositories/content";
import type { ContentStatus } from "@/types";
import { useContentItem } from "./useContent";

interface EditorOptions<TRow> {
  /** Traitement complémentaire après enregistrement (ex. galerie d'une réalisation). */
  afterSave?: (row: TRow) => Promise<void>;
}

export interface SaveRequest<TInput> {
  input: TInput;
  status: ContentStatus;
}

/**
 * Logique commune des écrans de création / modification d'un contenu :
 * chargement, enregistrement avec statut cible, messages, rafraîchissement.
 * Un identifiant est généré dès la création pour ranger les images téléversées
 * dans `<table>/<id>/` avant même le premier enregistrement.
 */
export function useContentEditor<TRow extends { id: string; status: ContentStatus }, TItem, TInput extends object>(
  resource: ContentResource,
  repository: ContentRepository<TRow, TItem, TInput>,
  id: string | undefined,
  options: EditorOptions<TRow> = {},
) {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftId] = useState(() => crypto.randomUUID());
  const item = useContentItem(resource, repository, id);
  const isNew = !id;
  const recordId = id ?? draftId;

  const save = useMutation({
    mutationFn: async ({ input, status }: SaveRequest<TInput>) => {
      const row = isNew
        ? await repository.create({ ...input, id: draftId, status } as TInput & { id: string })
        : await repository.update(recordId, { ...input, status } as Partial<TInput>);
      await options.afterSave?.(row);
      return row;
    },
    onSuccess: async (row, { status }) => {
      const previous = item.data?.status;
      if (isNew) toast.success(status === "published" ? "Publication effectuée." : resource.createdMessage);
      else if (status !== previous && status === "published") toast.success("Publication effectuée.");
      else if (status !== previous && previous === "published" && status === "draft") toast.success("Contenu dépublié.");
      else if (status !== previous && status === "archived") toast.success("Contenu archivé.");
      else toast.success("Modification enregistrée.");

      queryClient.setQueryData(queryKeys.contentItem(resource.table, row.id), row);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.content(resource.table) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return {
    isNew,
    recordId,
    item,
    canManage: can(resource.permission),
    /** Dossier Storage des images de ce contenu (convention backend : `<bucket>/<id>/<fichier>`). */
    uploadFolder: `${resource.bucket}/${recordId}`,
    save,
    /** Après une création, ouvre la fiche enregistrée (URL définitive). */
    goToSaved: (row: TRow) => {
      if (isNew) navigate(`${resource.path}/${row.id}`, { replace: true });
    },
  };
}

export type ContentEditor<TRow extends { id: string; status: ContentStatus }, TInput extends object> = ReturnType<
  typeof useContentEditor<TRow, unknown, TInput>
>;
