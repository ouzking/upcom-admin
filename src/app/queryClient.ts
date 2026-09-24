import { QueryClient } from "@tanstack/react-query";
import { AppError } from "@/lib/errors";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        // Inutile de réessayer un refus de droits ou un élément introuvable.
        retry: (failureCount, error) =>
          !(error instanceof AppError && (error.code === "forbidden" || error.code === "not_found")) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}
