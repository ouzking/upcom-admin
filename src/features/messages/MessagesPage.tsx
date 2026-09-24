import { Inbox, FilterX } from "lucide-react";
import { useSearchParams } from "react-router";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/feedback/States";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useListState } from "@/hooks/useListState";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import type { MessageFilters, MessageItem } from "@/repositories/messages.repository";
import type { ContactStatus } from "@/types";
import { MessageReader } from "./MessageReader";
import { useMessagesList } from "./useMessages";

const FILTER_KEYS = ["box", "id"] as const;

const BOXES: { value: string; label: string; filters: Partial<MessageFilters> }[] = [
  { value: "", label: "Boîte de réception", filters: { inbox: true } },
  { value: "new", label: "Non lus", filters: { status: "new" } },
  { value: "replied", label: "Répondus", filters: { status: "replied" } },
  { value: "archived", label: "Archivés", filters: { status: "archived" } },
];

export default function MessagesPage() {
  const list = useListState(FILTER_KEYS, 25);
  const [, setParams] = useSearchParams();
  const box = BOXES.find((entry) => entry.value === list.filters.box) ?? BOXES[0]!;
  const selectedId = list.filters.id || null;

  const query = useMessagesList({ page: list.page, pageSize: list.pageSize, search: list.search, filters: box.filters });

  const select = (id: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("id", id);
        else next.delete("id");
        return next;
      },
      { replace: false },
    );

  return (
    <>
      <PageHeader title="Messages" description="Messages envoyés depuis le formulaire de contact du site." />
      <Card className="overflow-hidden">
        <div className="grid min-h-[70vh] lg:grid-cols-[400px_minmax(0,1fr)]">
          {/* Liste */}
          <div className={cn("flex min-w-0 flex-col border-line lg:border-r", selectedId && "hidden lg:flex")}>
            <div className="space-y-3 border-b border-line p-4">
              <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Dossiers">
                {BOXES.map((entry) => (
                  <button
                    key={entry.value || "inbox"}
                    type="button"
                    role="tab"
                    aria-selected={entry.value === box.value}
                    onClick={() => list.setFilter("box", entry.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                      entry.value === box.value ? "bg-brand text-white" : "text-muted hover:bg-mist hover:text-ink",
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Rechercher un message" className="relative w-full" />
            </div>

            <div className="flex-1 overflow-y-auto">
              {query.isLoading ? (
                <TableSkeleton rows={6} columns={1} />
              ) : query.error ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} />
              ) : !query.data?.items.length ? (
                list.search ? (
                  <EmptyState icon={FilterX} title="Aucun résultat" description="Aucun message ne correspond à votre recherche." />
                ) : (
                  <EmptyState icon={Inbox} title="Aucun message" description="Ce dossier est vide." />
                )
              ) : (
                <ul className="divide-y divide-line" aria-label="Messages">
                  {query.data.items.map((message) => (
                    <MessageRow key={message.id} message={message} active={message.id === selectedId} onSelect={() => select(message.id)} />
                  ))}
                </ul>
              )}
            </div>
            {query.data ? <Pagination page={list.page} pageSize={list.pageSize} total={query.data.total} onPageChange={list.setPage} /> : null}
          </div>

          {/* Lecture */}
          <div className={cn("min-w-0", !selectedId && "hidden lg:block")}>
            {selectedId ? (
              <MessageReader key={selectedId} id={selectedId} onClose={() => select(null)} />
            ) : (
              <EmptyState icon={Inbox} title="Sélectionnez un message" description="Choisissez un message dans la liste pour le lire." className="h-full" />
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

const UNREAD: ContactStatus = "new";

function MessageRow({ message, active, onSelect }: { message: MessageItem; active: boolean; onSelect: () => void }) {
  const unread = message.status === UNREAD;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active || undefined}
        className={cn("relative block w-full px-4 py-3.5 text-left transition-colors", active ? "bg-brand-50" : "hover:bg-mist")}
      >
        {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" aria-hidden /> : null}
        <span className="flex items-center gap-2">
          {unread ? <span className="size-2 shrink-0 rounded-full bg-accent" aria-label="Non lu" /> : null}
          <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-bold text-ink" : "font-semibold text-ink-soft")}>{message.name}</span>
          <span className="shrink-0 text-xs text-subtle">{formatRelative(message.created_at)}</span>
        </span>
        <span className={cn("mt-0.5 block truncate text-[13px]", unread ? "font-semibold text-ink" : "text-ink-soft")}>{message.subject || "Sans objet"}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{message.message}</span>
      </button>
    </li>
  );
}
