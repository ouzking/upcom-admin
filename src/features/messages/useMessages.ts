import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { messagesRepository, type MessageFilters } from "@/repositories/messages.repository";
import type { ContactMessageUpdate, ListParams } from "@/types";

export function useMessagesList(params: ListParams<MessageFilters>) {
  return useQuery({ queryKey: queryKeys.messagesList(params), queryFn: () => messagesRepository.list(params), placeholderData: keepPreviousData });
}

export function useMessage(id: string | null) {
  return useQuery({ queryKey: queryKeys.message(id ?? ""), queryFn: () => messagesRepository.get(id as string), enabled: Boolean(id) });
}

export function useMessageMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.messages }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    ]);

  return {
    update: useMutation({
      mutationFn: ({ id, changes }: { id: string; changes: ContactMessageUpdate; silent?: boolean; message?: string }) => messagesRepository.update(id, changes),
      onSuccess: async (_, { silent, message }) => {
        if (!silent) toast.success(message ?? "Modification enregistrée.");
        await refresh();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    remove: useMutation({
      mutationFn: messagesRepository.remove,
      onSuccess: async () => {
        toast.success("Message supprimé.");
        await refresh();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}
