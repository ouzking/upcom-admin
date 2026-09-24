import { MapPin, Star } from "lucide-react";
import type { Column } from "@/components/data/DataTable";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { Badge } from "@/components/ui/Badge";
import { CONTENT_RESOURCES } from "@/config/resources";
import { formatDateTime } from "@/lib/format";
import { eventsRepository } from "@/repositories/events.repository";
import type { EventRow } from "@/types";
import { ContentListPage } from "../content/ContentListPage";

const resource = CONTENT_RESOURCES.events;

const isPast = (event: EventRow) => new Date(event.end_date ?? event.event_date) < new Date();

const columns: Column<EventRow>[] = [
  {
    key: "title",
    header: "Événement",
    cell: (event) => (
      <div className="flex items-center gap-3">
        <Thumbnail bucket="events" path={event.cover_image_path} className="h-11 w-16" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
            {event.title}
            {event.is_featured ? <Star className="size-3.5 shrink-0 fill-accent text-accent" aria-label="Mis en avant" /> : null}
          </p>
          {event.location ? (
            <p className="flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="size-3" aria-hidden />
              {event.location}
            </p>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    key: "date",
    header: "Date",
    hideBelow: "md",
    cell: (event) => (
      <div className="flex flex-col items-start gap-1">
        <span className="text-ink-soft">{formatDateTime(event.event_date)}</span>
        {isPast(event) ? <Badge tone="neutral">Passé</Badge> : <Badge tone="brand">À venir</Badge>}
      </div>
    ),
  },
  { key: "status", header: "Statut", cell: (event) => <ContentStatusBadge status={event.status} /> },
];

export default function EventsListPage() {
  return (
    <ContentListPage
      resource={resource}
      repository={eventsRepository}
      description="Agenda des événements organisés ou accompagnés par UPCOM."
      columns={columns}
      itemTitle={(event) => event.title}
      searchPlaceholder="Titre, lieu…"
      newLabel="Nouvel événement"
      featuredFilter
      emptyDescription="Annoncez votre prochain événement."
    />
  );
}
