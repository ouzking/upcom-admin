import { Link } from "react-router";
import { FilePen, FileText, Mail, type LucideIcon } from "lucide-react";
import { CONTENT_RESOURCES } from "@/config/resources";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { CONTENT_STATUS_LABELS } from "@/lib/labels";
import type { RecentContentItem, RecentMessage, RecentQuote } from "@/repositories/dashboard.repository";

interface ActivityEntry {
  key: string;
  at: string;
  icon: LucideIcon;
  tone: string;
  text: string;
  detail: string;
  to: string;
}

/** Fil d'activité fusionné : demandes reçues, messages reçus, contenus modifiés. */
export function ActivityFeed({ content, quotes, messages }: { content: RecentContentItem[]; quotes: RecentQuote[]; messages: RecentMessage[] }) {
  const entries: ActivityEntry[] = [
    ...quotes.map((quote) => ({
      key: `q-${quote.id}`,
      at: quote.createdAt,
      icon: FileText,
      tone: "bg-accent-50 text-accent-deep",
      text: `Demande de devis de ${quote.name}`,
      detail: quote.service ?? "Service non précisé",
      to: `/devis/${quote.id}`,
    })),
    ...messages.map((message) => ({
      key: `m-${message.id}`,
      at: message.createdAt,
      icon: Mail,
      tone: "bg-brand-50 text-brand",
      text: `Message de ${message.name}`,
      detail: message.subject ?? "Sans objet",
      to: `/messages?id=${message.id}`,
    })),
    ...content.map((item) => ({
      key: `c-${item.table}-${item.id}`,
      at: item.updatedAt,
      icon: FilePen,
      tone: "bg-mist text-muted",
      text: `${CONTENT_RESOURCES[item.table].label} · ${item.title}`,
      detail: `Modifié · ${CONTENT_STATUS_LABELS[item.status]}`,
      to: `${CONTENT_RESOURCES[item.table].path}/${item.id}`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  if (!entries.length) return <p className="px-5 py-10 text-center text-sm text-muted">Aucune activité récente.</p>;

  return (
    <ol className="relative px-5 py-4">
      <span className="absolute top-6 bottom-6 left-[35px] w-px bg-line" aria-hidden />
      {entries.map((entry) => (
        <li key={entry.key} className="relative">
          <Link to={entry.to} className="flex items-start gap-3 rounded-xl py-2.5 pr-2 transition-colors hover:bg-mist">
            <span className={cn("relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-paper", entry.tone)}>
              <entry.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block truncate text-sm font-semibold text-ink">{entry.text}</span>
              <span className="block truncate text-[13px] text-muted">{entry.detail}</span>
            </span>
            <time dateTime={entry.at} className="shrink-0 pt-1 text-xs text-subtle">
              {formatRelative(entry.at)}
            </time>
          </Link>
        </li>
      ))}
    </ol>
  );
}
