import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Mail, Plus, type LucideIcon } from "lucide-react";
import { ErrorState } from "@/components/feedback/States";
import { ContentStatusBadge, QuoteStatusBadge } from "@/components/data/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CONTENT_RESOURCES } from "@/config/resources";
import { firstName, useAuth } from "@/features/auth/auth-context";
import { NotificationList } from "@/features/notifications/NotificationsMenu";
import { useNotifications } from "@/features/notifications/useNotifications";
import { cn } from "@/lib/cn";
import { formatLongDate, formatNumber, formatRelative } from "@/lib/format";
import { useDashboardStats, useRecentContent, useRecentMessages, useRecentQuotes } from "./useDashboard";
import { ActivityFeed } from "./ActivityFeed";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (index: number) => ({ opacity: 1, y: 0, transition: { delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function DashboardPage() {
  const { profile, can } = useAuth();
  const stats = useDashboardStats();
  const notifications = useNotifications();
  const canQuotes = can("quotes.view");

  const hour = new Date().getHours();
  const greeting = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";

  const quickActions = [
    { permission: "articles.manage", to: "/actualites/nouveau", label: "Nouvel article" },
    { permission: "projects.manage", to: "/realisations/nouveau", label: "Nouvelle réalisation" },
    { permission: "services.manage", to: "/services/nouveau", label: "Nouveau service" },
    { permission: "events.manage", to: "/evenements/nouveau", label: "Nouvel événement" },
  ] as const;
  const allowedActions = quickActions.filter((action) => can(action.permission)).slice(0, 3);

  const kpis: { key: string; label: string; icon: LucideIcon; to: string; value?: number; sub?: string; highlight?: number }[] = [
    ...(["services", "projects", "articles", "events"] as const).map((table) => {
      const stat = stats.data?.[table];
      const resource = CONTENT_RESOURCES[table];
      return {
        key: table,
        label: table === "services" ? "Services publiés" : resource.label,
        icon: resource.icon,
        to: resource.path,
        value: stat?.published,
        sub: stat ? `${formatNumber(stat.total)} au total · ${formatNumber(stat.total - stat.published)} non publié(s)` : undefined,
      };
    }),
  ];
  if (stats.data?.quotes) {
    kpis.push({ key: "quotes", label: "Demandes de devis", icon: FileText, to: "/devis", value: stats.data.quotes.total, highlight: stats.data.quotes.fresh, sub: "nouvelle(s) à traiter" });
  }
  if (stats.data?.messages) {
    kpis.push({ key: "messages", label: "Messages", icon: Mail, to: "/messages", value: stats.data.messages.total, highlight: stats.data.messages.fresh, sub: "non lu(s)" });
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial="hidden"
        animate="show"
        custom={0}
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl bg-gradient-brand px-6 py-7 text-white shadow-card sm:px-8"
      >
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/5" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 right-40 size-56 rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/70 first-letter:uppercase">{formatLongDate(new Date())}</p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-[34px]">
              {greeting}, {firstName(profile) || "bienvenue"}
            </h1>
            <p className="mt-2 max-w-xl text-white/75">Voici l'essentiel de l'activité du site UPCOM aujourd'hui.</p>
          </div>
          {allowedActions.length ? (
            <div className="flex flex-wrap gap-2">
              {allowedActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/20"
                >
                  <Plus className="size-4" aria-hidden />
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </motion.section>

      {stats.error ? (
        <Card>
          <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
        </Card>
      ) : (
        <section aria-label="Indicateurs" className={cn("grid gap-4 sm:grid-cols-2", kpis.length > 4 ? "xl:grid-cols-3 2xl:grid-cols-6" : "xl:grid-cols-4")}>
          {kpis.map((kpi, index) => (
            <motion.div key={kpi.key} initial="hidden" animate="show" custom={index + 1} variants={fadeUp}>
              <KpiCard {...kpi} loading={stats.isLoading} />
            </motion.div>
          ))}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {canQuotes ? (
          <div className="xl:col-span-2">
            <RecentQuotesCard />
          </div>
        ) : null}
        <div className={canQuotes ? "" : "xl:col-span-3"}>
          <Card className="h-full">
            <CardHeader title="Notifications" description="Actions en attente" />
            {notifications.isLoading ? <ListSkeleton /> : <NotificationList data={notifications.data} />}
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentContentCard />
        <ActivityCard />
      </div>
    </div>
  );
}

function KpiCard({ label, icon: Icon, to, value, sub, highlight, loading }: { label: string; icon: LucideIcon; to: string; value?: number; sub?: string; highlight?: number; loading: boolean }) {
  return (
    <Link to={to} className="group block h-full rounded-2xl border border-line bg-paper p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-pop">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      {loading || value === undefined ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">{formatNumber(value)}</p>
      )}
      {highlight !== undefined ? (
        <p className={cn("mt-1 text-[13px] font-semibold", highlight > 0 ? "text-accent-deep" : "text-muted")}>
          {formatNumber(highlight)} {sub}
        </p>
      ) : sub ? (
        <p className="mt-1 text-[13px] text-muted">{sub}</p>
      ) : null}
    </Link>
  );
}

function RecentQuotesCard() {
  const query = useRecentQuotes();
  return (
    <Card className="h-full">
      <CardHeader
        title="Dernières demandes de devis"
        actions={
          <ButtonLink to="/devis" variant="ghost" size="sm">
            Tout voir <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        }
      />
      {query.isLoading ? (
        <ListSkeleton />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyLine>Aucune demande reçue pour le moment.</EmptyLine>
      ) : (
        <ul className="divide-y divide-line">
          {query.data.map((quote) => (
            <li key={quote.id}>
              <Link to={`/devis/${quote.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-mist">
                <Avatar name={quote.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm text-ink", quote.status === "new" ? "font-bold" : "font-semibold")}>
                    {quote.name}
                    {quote.company ? <span className="font-normal text-muted"> · {quote.company}</span> : null}
                  </p>
                  <p className="truncate text-[13px] text-muted">{quote.service ?? "Service non précisé"}</p>
                </div>
                <span className="hidden shrink-0 text-xs text-subtle sm:block">{formatRelative(quote.createdAt)}</span>
                <QuoteStatusBadge status={quote.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentContentCard() {
  const query = useRecentContent();
  return (
    <Card>
      <CardHeader title="Derniers contenus modifiés" />
      {query.isLoading ? (
        <ListSkeleton />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyLine>Aucun contenu pour le moment.</EmptyLine>
      ) : (
        <ul className="divide-y divide-line">
          {query.data.map((item) => {
            const resource = CONTENT_RESOURCES[item.table];
            return (
              <li key={`${item.table}-${item.id}`}>
                <Link to={`${resource.path}/${item.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-mist">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-mist text-muted">
                    <resource.icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                    <p className="text-[13px] text-muted">
                      {resource.label} · {formatRelative(item.updatedAt)}
                    </p>
                  </div>
                  <ContentStatusBadge status={item.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ActivityCard() {
  const content = useRecentContent();
  const quotes = useRecentQuotes();
  const messages = useRecentMessages();
  return (
    <Card>
      <CardHeader title="Activité récente" />
      {content.isLoading ? <ListSkeleton /> : <ActivityFeed content={content.data ?? []} quotes={quotes.data ?? []} messages={messages.data ?? []} />}
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 p-5" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-muted">{children}</p>;
}
