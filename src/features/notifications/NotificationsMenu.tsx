import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CalendarClock, CheckCheck, FilePen, FileText, Mail } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { CONTENT_RESOURCES } from "@/config/resources";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ContentTable } from "@/repositories/content";
import { notificationCount, useNotifications, type NotificationsData } from "./useNotifications";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const count = notificationCount(data);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => !rootRef.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={count ? `Notifications (${count} en attente)` : "Notifications"}
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand"
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 ? (
          <span className="absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-white ring-2 ring-paper">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-3 top-16 z-40 overflow-hidden rounded-2xl border border-line bg-paper shadow-pop sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-bold text-ink">Notifications</p>
              {count ? <span className="text-xs font-semibold text-accent-deep">{count} en attente</span> : null}
            </div>
            <div className="scrollbar-thin max-h-[70vh] overflow-y-auto" onClick={(event) => (event.target as HTMLElement).closest("a") && setOpen(false)}>
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="text-brand" />
                </div>
              ) : (
                <NotificationList data={data} />
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function NotificationList({ data, compact = false }: { data: NotificationsData | undefined; compact?: boolean }) {
  if (!data) return null;
  const draftEntries = Object.entries(data.drafts) as [ContentTable, number][];
  const empty = !data.newQuotes.length && !data.newMessages.length && !data.scheduledArticles.length && !draftEntries.length;

  if (empty) {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <CheckCheck className="mb-2 size-7 text-success" aria-hidden />
        <p className="text-sm font-semibold text-ink">Tout est à jour</p>
        <p className="text-[13px] text-muted">Aucune action en attente.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {data.newQuotes.map((quote) => (
        <Item
          key={quote.id}
          to={`/devis/${quote.id}`}
          icon={<FileText className="size-4" />}
          tone="accent"
          title={`Nouvelle demande de devis · ${quote.name}`}
          subtitle={quote.service ?? quote.company ?? "Demande de devis"}
          time={formatRelative(quote.createdAt)}
        />
      ))}
      {data.newMessages.map((message) => (
        <Item
          key={message.id}
          to={`/messages?id=${message.id}`}
          icon={<Mail className="size-4" />}
          tone="accent"
          title={`Nouveau message · ${message.name}`}
          subtitle={message.subject ?? "Sans objet"}
          time={formatRelative(message.createdAt)}
        />
      ))}
      {!compact &&
        data.scheduledArticles.map((article) => (
          <Item
            key={article.id}
            to={`/actualites/${article.id}`}
            icon={<CalendarClock className="size-4" />}
            tone="brand"
            title={`Publication programmée · ${article.title}`}
            subtitle={formatDateTime(article.publishedAt)}
          />
        ))}
      {!compact &&
        draftEntries.map(([table, total]) => (
          <Item
            key={table}
            to={`${CONTENT_RESOURCES[table].path}?status=draft`}
            icon={<FilePen className="size-4" />}
            tone="neutral"
            title={`${total} brouillon${total > 1 ? "s" : ""} · ${CONTENT_RESOURCES[table].label}`}
            subtitle="Contenu à relire avant publication"
          />
        ))}
    </ul>
  );
}

const TONES = { accent: "bg-accent-50 text-accent-deep", brand: "bg-brand-50 text-brand", neutral: "bg-mist text-muted" } as const;

function Item({ to, icon, tone, title, subtitle, time }: { to: string; icon: ReactNode; tone: keyof typeof TONES; title: string; subtitle: string; time?: string }) {
  return (
    <li>
      <Link to={to} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-mist">
        <span className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{title}</span>
          <span className="block truncate text-[13px] text-muted">{subtitle}</span>
        </span>
        {time ? <span className="shrink-0 text-xs text-subtle">{time}</span> : null}
      </Link>
    </li>
  );
}
