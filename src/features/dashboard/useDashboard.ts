import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import { queryKeys } from "@/lib/queryKeys";
import { dashboardRepository } from "@/repositories/dashboard.repository";

/** Indicateurs du tableau de bord (chaque bloc n'est demandé qu'avec la permission correspondante). */
export function useDashboardStats() {
  const { can } = useAuth();
  const canQuotes = can("quotes.view");
  const canMessages = can("contacts.view");

  return useQuery({
    queryKey: [...queryKeys.dashboard, "stats", canQuotes, canMessages],
    queryFn: async () => {
      const [services, projects, articles, events, quotesTotal, quotesNew, messagesTotal, messagesNew] = await Promise.all([
        dashboardRepository.contentStat("services"),
        dashboardRepository.contentStat("projects"),
        dashboardRepository.contentStat("articles"),
        dashboardRepository.contentStat("events"),
        canQuotes ? dashboardRepository.countQuotes() : Promise.resolve(null),
        canQuotes ? dashboardRepository.countQuotes("new") : Promise.resolve(null),
        canMessages ? dashboardRepository.countMessages() : Promise.resolve(null),
        canMessages ? dashboardRepository.countMessages("new") : Promise.resolve(null),
      ]);
      return {
        services,
        projects,
        articles,
        events,
        quotes: quotesTotal === null ? null : { total: quotesTotal, fresh: quotesNew ?? 0 },
        messages: messagesTotal === null ? null : { total: messagesTotal, fresh: messagesNew ?? 0 },
      };
    },
  });
}

export function useRecentQuotes() {
  const { can } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.dashboard, "recent-quotes"],
    queryFn: () => dashboardRepository.recentQuotes(6),
    enabled: can("quotes.view"),
  });
}

export function useRecentMessages() {
  const { can } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.dashboard, "recent-messages"],
    queryFn: () => dashboardRepository.recentMessages(5),
    enabled: can("contacts.view"),
  });
}

export function useRecentContent() {
  return useQuery({ queryKey: [...queryKeys.dashboard, "recent-content"], queryFn: () => dashboardRepository.recentContent(8) });
}
