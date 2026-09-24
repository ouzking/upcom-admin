import { FileText, FilterX } from "lucide-react";
import type { Column } from "@/components/data/DataTable";
import { DataTable } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { QuoteStatusBadge } from "@/components/data/StatusBadge";
import { EmptyState } from "@/components/feedback/States";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useListState } from "@/hooks/useListState";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/lib/labels";
import type { QuoteListItem } from "@/repositories/quotes.repository";
import { displayName } from "../auth/auth-context";
import { useQuoteCounts, useQuotesList, useStaff } from "./useQuotes";

const FILTER_KEYS = ["status", "assignee"] as const;

const columns: Column<QuoteListItem>[] = [
  {
    key: "prospect",
    header: "Prospect",
    cell: (quote) => (
      <div className="flex items-center gap-3">
        <Avatar name={quote.name} size="sm" />
        <div className="min-w-0">
          <p className={cn("truncate text-ink", quote.status === "new" ? "font-bold" : "font-semibold")}>{quote.name}</p>
          <p className="truncate text-xs text-muted">{quote.company ?? quote.email}</p>
        </div>
      </div>
    ),
  },
  { key: "service", header: "Service", hideBelow: "md", cell: (quote) => <span className="text-ink-soft">{quote.service?.title ?? "Non précisé"}</span> },
  {
    key: "budget",
    header: "Budget / délai",
    hideBelow: "xl",
    cell: (quote) => (
      <div className="text-[13px]">
        <p className="text-ink-soft">{quote.budget ?? "—"}</p>
        <p className="text-muted">{quote.deadline ? `Pour le ${formatDate(quote.deadline)}` : "Délai non précisé"}</p>
      </div>
    ),
  },
  {
    key: "assignee",
    header: "Suivi par",
    hideBelow: "lg",
    cell: (quote) => <span className="text-ink-soft">{quote.assignee ? displayName(quote.assignee) : <span className="text-subtle">Non assignée</span>}</span>,
  },
  {
    key: "date",
    header: "Reçue",
    hideBelow: "sm",
    cell: (quote) => (
      <span className="whitespace-nowrap text-muted" title={formatDate(quote.created_at)}>
        {formatRelative(quote.created_at)}
      </span>
    ),
  },
  { key: "status", header: "Statut", cell: (quote) => <QuoteStatusBadge status={quote.status} /> },
];

export default function QuotesListPage() {
  const list = useListState(FILTER_KEYS);
  const status = QUOTE_STATUSES.find((value) => value === list.filters.status);
  const counts = useQuoteCounts();
  const staff = useStaff();
  const query = useQuotesList({
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    filters: { status, assignedTo: list.filters.assignee || undefined },
  });

  const total = counts.data ? Object.values(counts.data).reduce((sum, value) => sum + value, 0) : undefined;

  return (
    <>
      <PageHeader title="Demandes de devis" description="Demandes reçues via le formulaire « Démarrer un projet » du site. Suivez chaque opportunité jusqu'à sa conversion." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatusTile label="Toutes" count={total} active={!status} onClick={() => list.setFilter("status", "")} />
        {QUOTE_STATUSES.map((value) => (
          <StatusTile
            key={value}
            label={QUOTE_STATUS_LABELS[value]}
            count={counts.data?.[value]}
            active={status === value}
            highlight={value === "new" && (counts.data?.new ?? 0) > 0}
            onClick={() => list.setFilter("status", value)}
          />
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={list.search} onChange={list.setSearch} placeholder="Nom, entreprise, e-mail…" />
          <Select aria-label="Filtrer par responsable" value={list.filters.assignee} onChange={(event) => list.setFilter("assignee", event.target.value)} className="sm:w-60">
            <option value="">Tous les responsables</option>
            {staff.data?.map((member) => (
              <option key={member.id} value={member.id}>
                {displayName(member)}
              </option>
            ))}
          </Select>
        </div>
        <DataTable
          caption="Demandes de devis"
          rows={query.data?.items}
          columns={columns}
          rowKey={(quote) => quote.id}
          rowHref={(quote) => `/devis/${quote.id}`}
          rowClassName={(quote) => (quote.status === "new" ? "bg-accent-50/40" : undefined)}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={
            list.hasActiveFilters ? (
              <EmptyState
                icon={FilterX}
                title="Aucun résultat"
                description="Aucune demande ne correspond à ces critères."
                action={
                  <Button variant="secondary" onClick={list.reset}>
                    Réinitialiser les filtres
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={FileText} title="Aucune demande de devis" description="Les demandes envoyées depuis le site apparaîtront ici." />
            )
          }
        />
        {query.data ? <Pagination page={list.page} pageSize={list.pageSize} total={query.data.total} onPageChange={list.setPage} /> : null}
      </Card>
    </>
  );
}

function StatusTile({ label, count, active, highlight, onClick }: { label: string; count?: number; active: boolean; highlight?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border px-4 py-3 text-left transition-all",
        active ? "border-brand bg-brand text-white shadow-sm" : "border-line bg-paper hover:border-line-strong hover:shadow-card",
      )}
    >
      <p className={cn("text-xs font-semibold", active ? "text-white/80" : "text-muted")}>{label}</p>
      <p className={cn("mt-0.5 font-display text-2xl font-semibold tabular-nums", active ? "text-white" : highlight ? "text-accent-deep" : "text-ink")}>
        {count ?? "–"}
      </p>
    </button>
  );
}
