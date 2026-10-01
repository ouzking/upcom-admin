import { assertOk, assertAffected } from "@/lib/errors";
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
  assertAffected(await supabase.from(table).update({ status }).eq("id", id).select("id"));
}

export async function deleteContent(table: ContentTable, id: string): Promise<void> {
  assertAffected(await supabase.from(table).delete().eq("id", id).select("id"));
}

export async function countContent(table: ContentTable, status?: ContentStatus): Promise<number> {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  assertOk({ error });
  return count ?? 0;
}

/** Rubriques dotées d'une colonne display_order. */
export type OrderableTable = "services" | "projects" | "team_members" | "testimonials";

export interface OrderableItem {
  id: string;
  label: string;
  detail: string | null;
  status: ContentStatus;
  imagePath: string | null;
}

/** Tous les éléments (hors archivés) dans l'ordre d'affichage actuel, pour la réorganisation. */
export async function listForOrdering(table: OrderableTable): Promise<OrderableItem[]> {
  switch (table) {
    case "services": {
      const { data, error } = await supabase.from("services").select("id, title, short_description, status, image_path, display_order").neq("status", "archived").order("display_order").order("title");
      assertOk({ error });
      return (data ?? []).map((row) => ({ id: row.id, label: row.title, detail: row.short_description, status: row.status, imagePath: row.image_path }));
    }
    case "projects": {
      const { data, error } = await supabase.from("projects").select("id, title, client_name, status, cover_image_path, display_order").neq("status", "archived").order("display_order").order("title");
      assertOk({ error });
      return (data ?? []).map((row) => ({ id: row.id, label: row.title, detail: row.client_name, status: row.status, imagePath: row.cover_image_path }));
    }
    case "team_members": {
      const { data, error } = await supabase.from("team_members").select("id, name, position, status, photo_path, display_order").neq("status", "archived").order("display_order").order("name");
      assertOk({ error });
      return (data ?? []).map((row) => ({ id: row.id, label: row.name, detail: row.position, status: row.status, imagePath: row.photo_path }));
    }
    case "testimonials": {
      const { data, error } = await supabase.from("testimonials").select("id, name, company, status, photo_path, display_order").neq("status", "archived").order("display_order").order("created_at");
      assertOk({ error });
      return (data ?? []).map((row) => ({ id: row.id, label: row.name, detail: row.company, status: row.status, imagePath: row.photo_path }));
    }
  }
}

/** Enregistre le nouvel ordre : display_order = 10, 20, 30… (laisse de la place pour des insertions). */
export async function saveOrder(table: OrderableTable, ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, index) => supabase.from(table).update({ display_order: (index + 1) * 10 }).eq("id", id).select("id")),
  );
  for (const result of results) assertAffected(result);
}
