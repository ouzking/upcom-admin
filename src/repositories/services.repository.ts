import { unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { ServiceCategoryRow, ServiceInsert, ServiceRow } from "@/types";
import { deleteContent, setContentStatus, type ContentRepository } from "./content";

export type ServiceListItem = ServiceRow & { category: Pick<ServiceCategoryRow, "id" | "name"> | null };
export type ServiceInput = Omit<ServiceInsert, "id" | "created_at" | "updated_at">;

export const servicesRepository: ContentRepository<ServiceRow, ServiceListItem, ServiceInput> = {
  async list({ page, pageSize, search, filters }) {
    let query = supabase.from("services").select("*, category:service_categories(id, name)", { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.featured) query = query.eq("is_featured", true);
    const term = search ? searchFilter(["title", "slug", "short_description"], search) : null;
    if (term) query = query.or(term);
    const result = await query
      .order("display_order", { ascending: true })
      .order("title", { ascending: true })
      .range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id) {
    return unwrap(await supabase.from("services").select("*").eq("id", id).single());
  },

  async create(input) {
    return unwrap(await supabase.from("services").insert(input).select("*").single());
  },

  async update(id, input) {
    return unwrap(await supabase.from("services").update(input).eq("id", id).select("*").single());
  },

  setStatus: (id, status) => setContentStatus("services", id, status),
  remove: (id) => deleteContent("services", id),
};

/** Les 6 pôles d'activité (données de référence du backend). */
export async function listServiceCategories(): Promise<ServiceCategoryRow[]> {
  return unwrap(await supabase.from("service_categories").select("*").order("display_order"));
}
