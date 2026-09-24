import { Star } from "lucide-react";
import type { Column } from "@/components/data/DataTable";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { CONTENT_RESOURCES } from "@/config/resources";
import { formatDate } from "@/lib/format";
import { servicesRepository, type ServiceListItem } from "@/repositories/services.repository";
import { ContentListPage } from "../content/ContentListPage";
import { useServiceCategories } from "./useServiceCategories";

const resource = CONTENT_RESOURCES.services;

const columns: Column<ServiceListItem>[] = [
  {
    key: "title",
    header: "Service",
    cell: (service) => (
      <div className="flex items-center gap-3">
        <Thumbnail bucket="services" path={service.image_path} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
            {service.title}
            {service.is_featured ? <Star className="size-3.5 shrink-0 fill-accent text-accent" aria-label="Mis en avant" /> : null}
          </p>
          <p className="truncate font-mono text-xs text-subtle">/{service.slug}</p>
        </div>
      </div>
    ),
  },
  { key: "category", header: "Catégorie", hideBelow: "md", cell: (service) => <span className="text-ink-soft">{service.category?.name ?? "—"}</span> },
  { key: "order", header: "Ordre", hideBelow: "lg", cell: (service) => <span className="tabular-nums text-muted">{service.display_order}</span> },
  { key: "status", header: "Statut", cell: (service) => <ContentStatusBadge status={service.status} /> },
  { key: "updated", header: "Modifié le", hideBelow: "xl", cell: (service) => <span className="text-muted">{formatDate(service.updated_at)}</span> },
];

export default function ServicesListPage() {
  const categories = useServiceCategories();
  return (
    <ContentListPage
      resource={resource}
      repository={servicesRepository}
      description="Catalogue des prestations présentées sur le site, classées par pôle d'activité."
      columns={columns}
      itemTitle={(service) => service.title}
      searchPlaceholder="Rechercher un service"
      newLabel="Nouveau service"
      categories={categories.data}
      featuredFilter
      emptyDescription="Ajoutez votre premier service pour le présenter sur le site."
    />
  );
}
