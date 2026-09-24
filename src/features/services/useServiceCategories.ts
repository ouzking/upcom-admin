import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { listServiceCategories } from "@/repositories/services.repository";

/** Les pôles d'activité (données de référence, rarement modifiées). */
export function useServiceCategories() {
  return useQuery({ queryKey: queryKeys.serviceCategories, queryFn: listServiceCategories, staleTime: 30 * 60_000 });
}
