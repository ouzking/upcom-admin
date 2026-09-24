import { assertOk } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { ContentStatus, ListParams, Page } from "@/types";

/** Tables éditoriales partageant le cycle de vie draft → published → archived. */
export type ContentTable = "services" | "projects" | "articles" | "events" | "team_members" | "testimonials";

/** Filtres communs des listes de contenus. */
export interface ContentFilters {
  status: ContentStatus;
  featured: boolean;
  categoryId: string;
}

/** Contrat commun des repositories de contenus (consommé par les hooks génériques). */
export interface ContentRepository<TRow, TListItem, TInput> {
  list(params: ListParams<ContentFilters>): Promise<Page<TListItem>>;
  get(id: string): Promise<TRow>;
  create(input: TInput & { id?: string }): Promise<TRow>;
  update(id: string, input: Partial<TInput>): Promise<TRow>;
  setStatus(id: string, status: ContentStatus): Promise<void>;
  remove(id: string): Promise<void>;
}

export async function setContentStatus(table: ContentTable, id: string, status: ContentStatus): Promise<void> {
  assertOk(await supabase.from(table).update({ status }).eq("id", id));
}

export async function deleteContent(table: ContentTable, id: string): Promise<void> {
  assertOk(await supabase.from(table).delete().eq("id", id));
}

export async function countContent(table: ContentTable, status?: ContentStatus): Promise<number> {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  assertOk({ error });
  return count ?? 0;
}
