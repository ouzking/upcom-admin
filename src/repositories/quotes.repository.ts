import { EDGE_FUNCTIONS } from "@upcom/supabase";
import { assertOk, unwrap } from "@/lib/errors";
import { pageRange, searchFilter, toPage } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { ListParams, Page, ProfileRow, QuoteRequestRow, QuoteRequestUpdate, QuoteStatus, SendNotificationResult, ServiceRow } from "@/types";
import { invokeFunction } from "./functions";

export type QuoteListItem = Omit<QuoteRequestRow, "ip_hash" | "user_agent"> & {
  service: Pick<ServiceRow, "id" | "title"> | null;
  assignee: Pick<ProfileRow, "id" | "full_name" | "email"> | null;
};

export interface QuoteFilters {
  status: QuoteStatus;
  assignedTo: string;
}

// ip_hash / user_agent (anti-abus) ne sont jamais affichés.
const COLUMNS =
  "id, name, company, email, phone, service_id, budget, deadline, message, status, assigned_to, internal_notes, notified_at, created_at, updated_at, service:services(id, title), assignee:profiles(id, full_name, email)" as const;

export const quotesRepository = {
  async list({ page, pageSize, search, filters }: ListParams<QuoteFilters>): Promise<Page<QuoteListItem>> {
    let query = supabase.from("quote_requests").select(COLUMNS, { count: "exact" });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.assignedTo) query = query.eq("assigned_to", filters.assignedTo);
    const term = search ? searchFilter(["name", "company", "email", "phone", "message"], search) : null;
    if (term) query = query.or(term);
    const result = await query.order("created_at", { ascending: false }).range(...pageRange(page, pageSize));
    return toPage(result, { page, pageSize });
  },

  async get(id: string): Promise<QuoteListItem> {
    return unwrap(await supabase.from("quote_requests").select(COLUMNS).eq("id", id).single());
  },

  async countByStatus(): Promise<Record<QuoteStatus, number>> {
    const statuses: QuoteStatus[] = ["new", "in_progress", "contacted", "converted", "closed"];
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabase
          .from("quote_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        assertOk({ error });
        return [status, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(counts) as Record<QuoteStatus, number>;
  },

  /** Seules les colonnes de suivi sont modifiables (privilèges par colonne en base). */
  async update(id: string, changes: QuoteRequestUpdate): Promise<void> {
    assertOk(await supabase.from("quote_requests").update(changes).eq("id", id));
  },

  async remove(id: string): Promise<void> {
    assertOk(await supabase.from("quote_requests").delete().eq("id", id));
  },

  resendNotification: (id: string) => invokeFunction<SendNotificationResult>(EDGE_FUNCTIONS.sendQuoteNotification, { id, force: true }),
};
