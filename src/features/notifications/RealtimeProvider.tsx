import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { queryKeys } from "@/lib/queryKeys";
import { subscribeToLeads, type LeadTable } from "@/repositories/realtime.repository";
import { RealtimeContext } from "./realtime-context";

/**
 * Temps réel des demandes (backend v0.2.0) : à chaque création ou modification
 * d'un devis / message, les vues concernées sont rafraîchies immédiatement. Les
 * alertes (toasts, badges, titre de l'onglet) restent produites par
 * NotificationWatcher, qu'on soit en direct ou en mode de secours (sondage).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { can, profile } = useAuth();
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);
  const canQuotes = can("quotes.view");
  const canMessages = can("contacts.view");
  const userId = profile?.id;

  useEffect(() => {
    if (!userId) return;
    const tables: LeadTable[] = [...(canQuotes ? ["quote_requests" as const] : []), ...(canMessages ? ["contact_messages" as const] : [])];
    return subscribeToLeads(
      tables,
      (change) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        void queryClient.invalidateQueries({ queryKey: change.table === "quote_requests" ? queryKeys.quotes : queryKeys.messages });
      },
      setLive,
    );
  }, [userId, canQuotes, canMessages, queryClient]);

  return <RealtimeContext.Provider value={live}>{children}</RealtimeContext.Provider>;
}
