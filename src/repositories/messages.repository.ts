import { EDGE_FUNCTIONS } from "@upcom/supabase";
import { assertOk, unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { ContactMessageRow, ContactMessageUpdate, ContactStatus, ListParams, Page, SendNotificationResult } from "@/types";
import { invokeFunction } from "./functions";

export type MessageItem = Omit<ContactMessageRow, "ip_hash" | "user_agent">;

export interface MessageFilters {
  status: ContactStatus;
  /** Boîte de réception = tout sauf les archivés. */
  inbox: boolean;
}

const COLUMNS = "id, name, email, phone, subject, message, status, internal_notes, notified_at, created_at, updated_at" as const;

export const messagesRepository = {
  async list({ page, pageSize, search, filters }: ListParams<MessageFilters>): Promise<Page<MessageItem>> {
    let query = supabase.from("contact_messages").select(COLUMNS, { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    else if (filters?.inbox) query = query.neq("status", "archived");
    const term = search ? searchFilter(["name", "email", "phone", "subject", "message"], search) : null;
    if (term) query = query.or(term);
    const result = await query.order("created_at", { ascending: false }).range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id: string): Promise<MessageItem> {
    return unwrap(await supabase.from("contact_messages").select(COLUMNS).eq("id", id).single());
  },

  async countUnread(): Promise<number> {
    const { count, error } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    assertOk({ error });
    return count ?? 0;
  },

  /** Seules les colonnes de suivi sont modifiables (privilèges par colonne en base). */
  async update(id: string, changes: ContactMessageUpdate): Promise<void> {
    assertOk(await supabase.from("contact_messages").update(changes).eq("id", id));
  },

  async remove(id: string): Promise<void> {
    assertOk(await supabase.from("contact_messages").delete().eq("id", id));
  },

  resendNotification: (id: string) => invokeFunction<SendNotificationResult>(EDGE_FUNCTIONS.sendContactNotification, { id, force: true }),
};
