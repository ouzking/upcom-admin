import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { articleCategoriesRepository } from "@/repositories/articles.repository";

export function useArticleCategories() {
  return useQuery({ queryKey: queryKeys.articleCategories, queryFn: articleCategoriesRepository.list, staleTime: 5 * 60_000 });
}

export function useArticleCategoryMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onSuccess = (message: string) => async () => {
    toast.success(message);
    await queryClient.invalidateQueries({ queryKey: queryKeys.articleCategories });
  };
  const onError = (error: unknown) => toast.error(errorMessage(error));

  return {
    create: useMutation({ mutationFn: articleCategoriesRepository.create, onSuccess: onSuccess("Catégorie créée avec succès."), onError }),
    rename: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => articleCategoriesRepository.rename(id, name),
      onSuccess: onSuccess("Modification enregistrée."),
      onError,
    }),
    remove: useMutation({ mutationFn: articleCategoriesRepository.remove, onSuccess: onSuccess("Catégorie supprimée."), onError }),
  };
}
