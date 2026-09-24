import type { ListParams, Page } from "@/types";
import { toAppError } from "./errors";

/** Bornes `range()` PostgREST pour une page (1-indexée). */
export function pageRange(page: number, pageSize: number): [number, number] {
  const from = Math.max(0, (page - 1) * pageSize);
  return [from, from + pageSize - 1];
}

/**
 * Filtre `or()` de recherche insensible à la casse sur plusieurs colonnes.
 * Les caractères réservés de la syntaxe PostgREST (virgule, parenthèses,
 * guillemets) et les jokers LIKE sont retirés pour éviter toute injection de filtre.
 */
export function searchFilter(columns: readonly string[], term: string): string | null {
  const cleaned = term
    .replace(/[,()"\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return columns.map((column) => `${column}.ilike.*${cleaned}*`).join(",");
}

export function toPage<T>(
  result: { data: T[] | null; error: unknown; count: number | null },
  params: Pick<ListParams, "page" | "pageSize">,
): Page<T> {
  if (result.error) throw toAppError(result.error);
  return { items: result.data ?? [], total: result.count ?? 0, page: params.page, pageSize: params.pageSize };
}

/** Convertit les chaînes vides d'un formulaire en NULL pour la base. */
export function emptyToNull<T extends Record<string, unknown>>(values: T): { [K in keyof T]: T[K] extends string ? T[K] | null : T[K] } {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    output[key] = typeof value === "string" && value.trim() === "" ? null : typeof value === "string" ? value.trim() : value;
  }
  return output as { [K in keyof T]: T[K] extends string ? T[K] | null : T[K] };
}
