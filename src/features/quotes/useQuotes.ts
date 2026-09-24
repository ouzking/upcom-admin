import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { quotesRepository, type QuoteFilters } from "@/repositories/quotes.repository";
import { usersRepository } from "@/repositories/users.repository";
import type { ListParams, QuoteRequestUpdate } from "@/types";

export function useQuotesList(params: ListParams<QuoteFilters>) {
  return useQuery({ queryKey: queryKeys.quotesList(params), queryFn: () => quotesRepository.list(params), placeholderData: keepPreviousData });
}

export function useQuoteCounts() {
  return useQuery({ queryKey: queryKeys.quoteCounts, queryFn: quotesRepository.countByStatus });
}

export function useQuote(id: string) {
  return useQuery({ queryKey: queryKeys.quote(id), queryFn: () => quotesRepository.get(id) });
}

/** Membres actifs du back-office (assignation d'une demande). */
export function useStaff() {
  return useQuery({ queryKey: queryKeys.staff, queryFn: usersRepository.listStaff, staleTime: 5 * 60_000 });
}

export function useQuoteMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    ]);

  return {
    update: useMutation({
      mutationFn: ({ id, changes }: { id: string; changes: QuoteRequestUpdate }) => quotesRepository.update(id, changes),
      onSuccess: async () => {
        toast.success("Modification enregistrée.");
        await refresh();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    remove: useMutation({
      mutationFn: quotesRepository.remove,
      onSuccess: async () => {
        toast.success("Demande supprimée.");
        await refresh();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    resend: useMutation({
      mutationFn: quotesRepository.resendNotification,
      onSuccess: (result) => {
        if (result.status === "skipped") toast.info("Notification non envoyée", "L'envoi d'e-mails n'est pas configuré sur le serveur.");
        else toast.success("Notification envoyée à l'équipe.");
        void queryClient.invalidateQueries({ queryKey: queryKeys.quotes });
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}
