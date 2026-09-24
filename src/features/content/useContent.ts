import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import type { ContentResource } from "@/config/resources";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import type { ContentFilters, ContentRepository } from "@/repositories/content";
import type { ContentStatus, ListParams } from "@/types";

export const STATUS_SUCCESS: Record<ContentStatus, string> = {
  published: "Publication effectuée.",
  draft: "Contenu repassé en brouillon.",
  archived: "Contenu archivé.",
};

export function useContentList<TRow, TItem, TInput>(
  resource: ContentResource,
  repository: ContentRepository<TRow, TItem, TInput>,
  params: ListParams<ContentFilters>,
) {
  return useQuery({
    queryKey: queryKeys.contentList(resource.table, params),
    queryFn: () => repository.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useContentItem<TRow, TItem, TInput>(
  resource: ContentResource,
  repository: ContentRepository<TRow, TItem, TInput>,
  id: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.contentItem(resource.table, id ?? "new"),
    queryFn: () => repository.get(id as string),
    enabled: Boolean(id),
  });
}

/** Mutations communes (statut, suppression) avec retours utilisateur et rafraîchissement des vues. */
export function useContentActions<TRow, TItem, TInput>(resource: ContentResource, repository: ContentRepository<TRow, TItem, TInput>) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.content(resource.table) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    ]);
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContentStatus }) => repository.setStatus(id, status),
    onSuccess: async (_, { status }) => {
      toast.success(STATUS_SUCCESS[status]);
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSuccess: async () => {
      toast.success("Suppression effectuée.");
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return { setStatus, remove, invalidate };
}
