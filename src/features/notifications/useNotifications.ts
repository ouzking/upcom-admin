import { useQuery } from "@tanstack/react-query";
import { CONTENT_RESOURCES, CONTENT_TABLES } from "@/config/resources";
import { useAuth } from "@/features/auth/auth-context";
import { queryKeys } from "@/lib/queryKeys";
import type { ContentTable } from "@/repositories/content";
import { dashboardRepository, type RecentMessage, type RecentQuote, type ScheduledArticle } from "@/repositories/dashboard.repository";

export const NOTIFICATIONS_REFRESH_MS = 60_000;

export interface NotificationsData {
  newQuotes: RecentQuote[];
  newQuotesCount: number;
  newMessages: RecentMessage[];
  newMessagesCount: number;
  scheduledArticles: ScheduledArticle[];
  drafts: Partial<Record<ContentTable, number>>;
}

/**
 * Notifications dérivées des données (le backend n'a pas de table dédiée) :
 * - nouvelles demandes de devis  (status = new, si quotes.view)
 * - nouveaux messages            (status = new, si contacts.view)
 * - contenus à publier           (brouillons des rubriques gérées, articles programmés)
 * Rafraîchies périodiquement ; aucune donnée n'est demandée sans la permission correspondante.
 */
export function useNotifications() {
  const { access, can, profile } = useAuth();
  const canQuotes = can("quotes.view");
  const canMessages = can("contacts.view");
  const canArticles = can("articles.manage");
  const managedTables = CONTENT_TABLES.filter((table) => can(CONTENT_RESOURCES[table].permission));

  return useQuery<NotificationsData>({
    queryKey: [...queryKeys.notifications, profile?.id, access?.role],
    enabled: Boolean(access),
    refetchInterval: NOTIFICATIONS_REFRESH_MS,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    queryFn: async () => {
      const [newQuotes, newQuotesCount, newMessages, newMessagesCount, scheduledArticles, drafts] = await Promise.all([
        canQuotes ? dashboardRepository.recentQuotes(5, "new") : Promise.resolve([]),
        canQuotes ? dashboardRepository.countQuotes("new") : Promise.resolve(0),
        canMessages ? dashboardRepository.recentMessages(5, "new") : Promise.resolve([]),
        canMessages ? dashboardRepository.countMessages("new") : Promise.resolve(0),
        canArticles ? dashboardRepository.scheduledArticles() : Promise.resolve([]),
        managedTables.length ? dashboardRepository.draftCounts(managedTables) : Promise.resolve({}),
      ]);
      return { newQuotes, newQuotesCount, newMessages, newMessagesCount, scheduledArticles, drafts };
    },
  });
}

export function notificationCount(data: NotificationsData | undefined): number {
  return (data?.newQuotesCount ?? 0) + (data?.newMessagesCount ?? 0);
}
