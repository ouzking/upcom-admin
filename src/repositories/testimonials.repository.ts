import { unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { TestimonialInsert, TestimonialRow } from "@/types";
import { deleteContent, setContentStatus, type ContentRepository } from "./content";

export type TestimonialInput = Omit<TestimonialInsert, "id" | "created_at" | "updated_at">;

export const testimonialsRepository: ContentRepository<TestimonialRow, TestimonialRow, TestimonialInput> = {
  async list({ page, pageSize, search, filters }) {
    let query = supabase.from("testimonials").select("*", { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.featured) query = query.eq("is_featured", true);
    const term = search ? searchFilter(["name", "company", "content"], search) : null;
    if (term) query = query.or(term);
    const result = await query
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id) {
    return unwrap(await supabase.from("testimonials").select("*").eq("id", id).single());
  },

  async create(input) {
    return unwrap(await supabase.from("testimonials").insert(input).select("*").single());
  },

  async update(id, input) {
    return unwrap(await supabase.from("testimonials").update(input).eq("id", id).select("*").single());
  },

  setStatus: (id, status) => setContentStatus("testimonials", id, status),
  remove: (id) => deleteContent("testimonials", id),
};
