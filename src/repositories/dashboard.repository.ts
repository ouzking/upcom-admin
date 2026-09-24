import { assertOk, unwrap } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { ContactStatus, ContentStatus, QuoteStatus } from "@/types";
import { countContent, type ContentTable } from "./content";

export interface ContentStat {
  published: number;
  total: number;
}

export interface RecentContentItem {
  table: ContentTable;
  id: string;
  title: string;
  status: ContentStatus;
  updatedAt: string;
}

export interface RecentQuote {
  id: string;
  name: string;
  company: string | null;
  status: QuoteStatus;
  createdAt: string;
  service: string | null;
}

export interface RecentMessage {
  id: string;
  name: string;
  subject: string | null;
  status: ContactStatus;
  createdAt: string;
}

export interface ScheduledArticle {
  id: string;
  title: string;
  publishedAt: string;
}

export const dashboardRepository = {
  async contentStat(table: ContentTable): Promise<ContentStat> {
    const [published, total] = await Promise.all([countContent(table, "published"), countContent(table)]);
    return { published, total };
  },

  async countQuotes(status?: QuoteStatus): Promise<number> {
    let query = supabase.from("quote_requests").select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    const { count, error } = await query;
    assertOk({ error });
    return count ?? 0;
  },

  async countMessages(status?: ContactStatus): Promise<number> {
    let query = supabase.from("contact_messages").select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    const { count, error } = await query;
    assertOk({ error });
    return count ?? 0;
  },

  async recentQuotes(limit = 5, status?: QuoteStatus): Promise<RecentQuote[]> {
    let query = supabase.from("quote_requests").select("id, name, company, status, created_at, service:services(title)");
    if (status) query = query.eq("status", status);
    const rows = unwrap(await query.order("created_at", { ascending: false }).limit(limit));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      company: row.company,
      status: row.status,
      createdAt: row.created_at,
      service: row.service?.title ?? null,
    }));
  },

  async recentMessages(limit = 5, status?: ContactStatus): Promise<RecentMessage[]> {
    let query = supabase.from("contact_messages").select("id, name, subject, status, created_at");
    if (status) query = query.eq("status", status);
    const rows = unwrap(await query.order("created_at", { ascending: false }).limit(limit));
    return rows.map((row) => ({ id: row.id, name: row.name, subject: row.subject, status: row.status, createdAt: row.created_at }));
  },

  /** Derniers contenus modifiés, toutes rubriques confondues (lisibles par tout le back-office). */
  async recentContent(limit = 8): Promise<RecentContentItem[]> {
    const [services, projects, articles, events, team, testimonials] = await Promise.all([
      supabase.from("services").select("id, title, status, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("projects").select("id, title, status, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("articles").select("id, title, status, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("events").select("id, title, status, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("team_members").select("id, name, status, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("testimonials").select("id, name, status, updated_at").order("updated_at", { ascending: false }).limit(limit),
    ]);
    const map = (table: ContentTable, rows: { id: string; status: ContentStatus; updated_at: string; title?: string; name?: string }[]) =>
      rows.map((row) => ({ table, id: row.id, title: row.title ?? row.name ?? "", status: row.status, updatedAt: row.updated_at }));

    return [
      ...map("services", unwrap(services)),
      ...map("projects", unwrap(projects)),
      ...map("articles", unwrap(articles)),
      ...map("events", unwrap(events)),
      ...map("team_members", unwrap(team)),
      ...map("testimonials", unwrap(testimonials)),
    ]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  },

  /** Articles publiés avec une date future (programmés) — visibles publiquement à cette date. */
  async scheduledArticles(): Promise<ScheduledArticle[]> {
    const rows = unwrap(
      await supabase
        .from("articles")
        .select("id, title, published_at")
        .eq("status", "published")
        .gt("published_at", new Date().toISOString())
        .order("published_at", { ascending: true })
        .limit(10),
    );
    return rows.flatMap((row) => (row.published_at ? [{ id: row.id, title: row.title, publishedAt: row.published_at }] : []));
  },

  /** Brouillons par rubrique (contenus « à publier »). */
  async draftCounts(tables: ContentTable[]): Promise<Partial<Record<ContentTable, number>>> {
    const entries = await Promise.all(tables.map(async (table) => [table, await countContent(table, "draft")] as const));
    return Object.fromEntries(entries.filter(([, count]) => count > 0));
  },
};
