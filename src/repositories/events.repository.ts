import { unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { EventInsert, EventRow } from "@/types";
import { deleteContent, setContentStatus, type ContentRepository } from "./content";

export type EventInput = Omit<EventInsert, "id" | "created_at" | "updated_at">;

export const eventsRepository: ContentRepository<EventRow, EventRow, EventInput> = {
  async list({ page, pageSize, search, filters }) {
    let query = supabase.from("events").select("*", { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.featured) query = query.eq("is_featured", true);
    const term = search ? searchFilter(["title", "slug", "location"], search) : null;
    if (term) query = query.or(term);
    const result = await query.order("event_date", { ascending: false }).range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id) {
    return unwrap(await supabase.from("events").select("*").eq("id", id).single());
  },

  async create(input) {
    return unwrap(await supabase.from("events").insert(input).select("*").single());
  },

  async update(id, input) {
    return unwrap(await supabase.from("events").update(input).eq("id", id).select("*").single());
  },

  setStatus: (id, status) => setContentStatus("events", id, status),
  remove: (id) => deleteContent("events", id),
};
