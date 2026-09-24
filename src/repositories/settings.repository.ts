import { assertOk, unwrap } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { SiteSettingsRow, SiteSettingsUpdate, SocialLinkInsert, SocialLinkRow } from "@/types";

export type SocialLinkInput = Omit<SocialLinkInsert, "id" | "created_at" | "updated_at">;

/** `site_settings` est un singleton (id = 1) créé par migration : lecture / mise à jour uniquement. */
export const settingsRepository = {
  async get(): Promise<SiteSettingsRow> {
    return unwrap(await supabase.from("site_settings").select("*").eq("id", 1).single());
  },

  async update(changes: Omit<SiteSettingsUpdate, "id" | "created_at" | "updated_at">): Promise<SiteSettingsRow> {
    return unwrap(await supabase.from("site_settings").update(changes).eq("id", 1).select("*").single());
  },
};

export const socialLinksRepository = {
  async list(): Promise<SocialLinkRow[]> {
    return unwrap(await supabase.from("social_links").select("*").order("display_order").order("created_at"));
  },
  async create(input: SocialLinkInput): Promise<void> {
    assertOk(await supabase.from("social_links").insert(input));
  },
  async update(id: string, input: Partial<SocialLinkInput>): Promise<void> {
    assertOk(await supabase.from("social_links").update(input).eq("id", id));
  },
  async remove(id: string): Promise<void> {
    assertOk(await supabase.from("social_links").delete().eq("id", id));
  },
};
