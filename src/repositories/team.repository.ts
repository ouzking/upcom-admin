import { unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { TeamMemberInsert, TeamMemberRow } from "@/types";
import { deleteContent, setContentStatus, type ContentRepository } from "./content";

export type TeamMemberInput = Omit<TeamMemberInsert, "id" | "created_at" | "updated_at">;

export const teamRepository: ContentRepository<TeamMemberRow, TeamMemberRow, TeamMemberInput> = {
  async list({ page, pageSize, search, filters }) {
    let query = supabase.from("team_members").select("*", { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    const term = search ? searchFilter(["name", "position"], search) : null;
    if (term) query = query.or(term);
    const result = await query
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id) {
    return unwrap(await supabase.from("team_members").select("*").eq("id", id).single());
  },

  async create(input) {
    return unwrap(await supabase.from("team_members").insert(input).select("*").single());
  },

  async update(id, input) {
    return unwrap(await supabase.from("team_members").update(input).eq("id", id).select("*").single());
  },

  setStatus: (id, status) => setContentStatus("team_members", id, status),
  remove: (id) => deleteContent("team_members", id),
};
