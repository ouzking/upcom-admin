import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/feedback/toast-context";
import { queryKeys } from "@/lib/queryKeys";
import { notificationCount, useNotifications } from "./useNotifications";

/**
 * Monté une seule fois dans le layout : signale par un toast les demandes et
 * messages arrivés depuis le dernier rafraîchissement, rafraîchit les listes
 * concernées et affiche le nombre d'éléments en attente dans l'onglet.
 */
export function NotificationWatcher() {
  const { data } = useNotifications();
  const toast = useToast();
  const queryClient = useQueryClient();
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) return;
    const ids = new Set([...data.newQuotes.map((quote) => `q:${quote.id}`), ...data.newMessages.map((message) => `m:${message.id}`)]);
    const previous = known.current;
    known.current = ids;
    if (!previous) return; // premier chargement : pas d'alerte

    const freshQuotes = data.newQuotes.filter((quote) => !previous.has(`q:${quote.id}`));
    const freshMessages = data.newMessages.filter((message) => !previous.has(`m:${message.id}`));
    for (const quote of freshQuotes) toast.info("Nouvelle demande de devis", `${quote.name}${quote.company ? ` · ${quote.company}` : ""}`);
    for (const message of freshMessages) toast.info("Nouveau message", `${message.name}${message.subject ? ` · ${message.subject}` : ""}`);
    if (freshQuotes.length) void queryClient.invalidateQueries({ queryKey: queryKeys.quotes });
    if (freshMessages.length) void queryClient.invalidateQueries({ queryKey: queryKeys.messages });
    if (freshQuotes.length || freshMessages.length) void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  }, [data, toast, queryClient]);

  const count = notificationCount(data);
  useEffect(() => {
    document.title = count > 0 ? `(${count}) UPCOM ADMIN` : "UPCOM ADMIN";
  }, [count]);

  return null;
}
