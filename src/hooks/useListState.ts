import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export const DEFAULT_PAGE_SIZE = 20;

/**
 * État d'une liste (page, recherche, filtres) stocké dans l'URL : partageable,
 * conservé au retour depuis une fiche, compatible avec le bouton Précédent.
 */
export function useListState<TKey extends string>(filterKeys: readonly TKey[], pageSize = DEFAULT_PAGE_SIZE) {
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("q") ?? "";

  const filterValues = filterKeys.map((key) => params.get(key) ?? "").join("|");
  const filters = useMemo(() => {
    const values = filterValues.split("|");
    return Object.fromEntries(filterKeys.map((key, index) => [key, values[index] ?? ""])) as Record<TKey, string>;
    // filterKeys est une constante de module pour chaque liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues]);

  const update = useCallback(
    (changes: Record<string, string | number | null>, resetPage = true) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === "" || (key === "page" && value === 1)) next.delete(key);
            else next.set(key, String(value));
          }
          if (resetPage && !("page" in changes)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return {
    page,
    pageSize,
    search,
    filters,
    setPage: (value: number) => update({ page: value }, false),
    setSearch: (value: string) => update({ q: value }),
    setFilter: (key: TKey, value: string) => update({ [key]: value }),
    reset: () => update(Object.fromEntries([["q", null], ...filterKeys.map((key) => [key, null])])),
    hasActiveFilters: Boolean(search) || filterKeys.some((key) => filters[key]),
  };
}
