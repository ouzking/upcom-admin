import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type LeadTable = "quote_requests" | "contact_messages";

export interface LeadChange {
  table: LeadTable;
  event: "INSERT" | "UPDATE" | "DELETE";
  /** Nouvelle ligne (INSERT / UPDATE) : uniquement les champs utiles à l'affichage. */
  record: { id?: string; name?: string; company?: string | null; subject?: string | null } | null;
}

/**
 * Abonnement temps réel aux demandes commerciales (publication `supabase_realtime`,
 * backend v0.2.0). Supabase applique la RLS à chaque abonné : un utilisateur ne
 * reçoit que les lignes qu'il a le droit de lire (quotes.view / contacts.view).
 * Renvoie la fonction de désabonnement.
 */
export function subscribeToLeads(tables: LeadTable[], onChange: (change: LeadChange) => void, onStatus: (live: boolean) => void): () => void {
  if (!tables.length) {
    onStatus(false);
    return () => undefined;
  }
  const channel: RealtimeChannel = supabase.channel(`upcom-admin-leads-${Math.random().toString(36).slice(2)}`);
  for (const table of tables) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
      const record = (payload.new && Object.keys(payload.new).length ? payload.new : null) as LeadChange["record"];
      onChange({ table, event: payload.eventType, record });
    });
  }
  channel.subscribe((status) => onStatus(status === "SUBSCRIBED"));
  return () => {
    onStatus(false);
    void supabase.removeChannel(channel);
  };
}
