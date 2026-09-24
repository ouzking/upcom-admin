import { assertOk, unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { ProjectImageRow, ProjectInsert, ProjectRow, ServiceCategoryRow } from "@/types";
import { deleteContent, setContentStatus, type ContentRepository } from "./content";

export type ProjectListItem = ProjectRow & {
  category: Pick<ServiceCategoryRow, "id" | "name"> | null;
  images: { count: number }[];
};
export type ProjectInput = Omit<ProjectInsert, "id" | "created_at" | "updated_at">;

/** Élément de galerie tel que manipulé par le formulaire (id absent = nouvelle image). */
export interface GalleryItem {
  id?: string;
  image_path: string;
  alt_text: string | null;
  caption: string | null;
}

export const projectsRepository: ContentRepository<ProjectRow, ProjectListItem, ProjectInput> = {
  async list({ page, pageSize, search, filters }) {
    let query = supabase
      .from("projects")
      .select("*, category:service_categories(id, name), images:project_images(count)", { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.featured) query = query.eq("is_featured", true);
    const term = search ? searchFilter(["title", "slug", "client_name"], search) : null;
    if (term) query = query.or(term);
    const result = await query
      .order("display_order", { ascending: true })
      .order("year", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id) {
    return unwrap(await supabase.from("projects").select("*").eq("id", id).single());
  },

  async create(input) {
    return unwrap(await supabase.from("projects").insert(input).select("*").single());
  },

  async update(id, input) {
    return unwrap(await supabase.from("projects").update(input).eq("id", id).select("*").single());
  },

  setStatus: (id, status) => setContentStatus("projects", id, status),
  remove: (id) => deleteContent("projects", id),
};

export async function listProjectImages(projectId: string): Promise<ProjectImageRow[]> {
  return unwrap(
    await supabase.from("project_images").select("*").eq("project_id", projectId).order("display_order").order("created_at"),
  );
}

/**
 * Synchronise la galerie d'une réalisation avec l'état du formulaire :
 * suppression des images retirées, mise à jour de l'ordre / des textes,
 * insertion des nouvelles. L'ordre du tableau devient `display_order`.
 * Renvoie la galerie enregistrée (avec les identifiants des nouvelles images).
 */
export async function syncProjectGallery(projectId: string, items: GalleryItem[]): Promise<ProjectImageRow[]> {
  const current = await listProjectImages(projectId);
  const keptIds = new Set(items.flatMap((item) => (item.id ? [item.id] : [])));
  const removedIds = current.filter((image) => !keptIds.has(image.id)).map((image) => image.id);

  if (removedIds.length) assertOk(await supabase.from("project_images").delete().in("id", removedIds));

  const existing = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.id)
    .map(({ item, index }) => ({
      id: item.id as string,
      project_id: projectId,
      image_path: item.image_path,
      alt_text: item.alt_text,
      caption: item.caption,
      display_order: index,
    }));
  if (existing.length) assertOk(await supabase.from("project_images").upsert(existing, { onConflict: "id" }));

  const created = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.id)
    .map(({ item, index }) => ({
      project_id: projectId,
      image_path: item.image_path,
      alt_text: item.alt_text,
      caption: item.caption,
      display_order: index,
    }));
  if (created.length) assertOk(await supabase.from("project_images").insert(created));

  return listProjectImages(projectId);
}
