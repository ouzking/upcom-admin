import { Star } from "lucide-react";
import type { Column } from "@/components/data/DataTable";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { CONTENT_RESOURCES } from "@/config/resources";
import { testimonialsRepository } from "@/repositories/testimonials.repository";
import type { TestimonialRow } from "@/types";
import { ContentListPage } from "../content/ContentListPage";

const resource = CONTENT_RESOURCES.testimonials;

const columns: Column<TestimonialRow>[] = [
  {
    key: "name",
    header: "Auteur",
    cell: (testimonial) => (
      <div className="flex items-center gap-3">
        <Thumbnail bucket="testimonials" path={testimonial.photo_path} rounded="rounded-full" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
            {testimonial.name}
            {testimonial.is_featured ? <Star className="size-3.5 shrink-0 fill-accent text-accent" aria-label="Mis en avant" /> : null}
          </p>
          <p className="truncate text-xs text-muted">{[testimonial.role, testimonial.company].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      </div>
    ),
  },
  {
    key: "content",
    header: "Témoignage",
    hideBelow: "lg",
    className: "max-w-md",
    cell: (testimonial) => <p className="line-clamp-2 text-[13px] text-ink-soft italic">« {testimonial.content} »</p>,
  },
  { key: "status", header: "Statut", cell: (testimonial) => <ContentStatusBadge status={testimonial.status} /> },
];

export default function TestimonialsListPage() {
  return (
    <ContentListPage
      resource={resource}
      repository={testimonialsRepository}
      description="Retours de clients affichés sur le site. Publiez uniquement des témoignages authentiques et autorisés."
      columns={columns}
      itemTitle={(testimonial) => testimonial.name}
      searchPlaceholder="Nom, entreprise, contenu…"
      newLabel="Nouveau témoignage"
      featuredFilter
      emptyDescription="Ajoutez les retours de vos clients satisfaits."
    />
  );
}
