import { assertOk, unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { ArticleCategoryRow, ArticleInsert, ArticleRow } from "@/types";
import { deleteContent, setContentStatus, type ContentRepository } from "./content";

export type ArticleListItem = ArticleRow & { category: Pick<ArticleCategoryRow, "id" | "name"> | null };
export type ArticleInput = Omit<ArticleInsert, "id" | "created_at" | "updated_at" | "author_id">;

export const articlesRepository: ContentRepository<ArticleRow, ArticleListItem, ArticleInput> = {
  async list({ page, pageSize, search, filters }) {
    let query = supabase.from("articles").select("*, category:article_categories(id, name)", { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.featured) query = query.eq("is_featured", true);
    const term = search ? searchFilter(["title", "slug", "excerpt", "author_name"], search) : null;
    if (term) query = query.or(term);
    const result = await query
      .order("published_at", { ascending: false, nullsFirst: true })
      .order("updated_at", { ascending: false })
      .range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id) {
    return unwrap(await supabase.from("articles").select("*").eq("id", id).single());
  },

  // author_id est renseigné par défaut côté base (auth.uid()).
  async create(input) {
    return unwrap(await supabase.from("articles").insert(input).select("*").single());
  },

  async update(id, input) {
    return unwrap(await supabase.from("articles").update(input).eq("id", id).select("*").single());
  },

  setStatus: (id, status) => setContentStatus("articles", id, status),
  remove: (id) => deleteContent("articles", id),
};

export const articleCategoriesRepository = {
  async list(): Promise<ArticleCategoryRow[]> {
    return unwrap(await supabase.from("article_categories").select("*").order("display_order").order("name"));
  },
  async create(name: string): Promise<ArticleCategoryRow> {
    return unwrap(await supabase.from("article_categories").insert({ name: name.trim() }).select("*").single());
  },
  async rename(id: string, name: string): Promise<void> {
    assertOk(await supabase.from("article_categories").update({ name: name.trim() }).eq("id", id));
  },
  async remove(id: string): Promise<void> {
    assertOk(await supabase.from("article_categories").delete().eq("id", id));
  },
};
