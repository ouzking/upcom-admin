import { Images, Star } from "lucide-react";
import type { Column } from "@/components/data/DataTable";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { CONTENT_RESOURCES } from "@/config/resources";
import { projectsRepository, type ProjectListItem } from "@/repositories/projects.repository";
import { ContentListPage } from "../content/ContentListPage";
import { useServiceCategories } from "../services/useServiceCategories";

const resource = CONTENT_RESOURCES.projects;

const columns: Column<ProjectListItem>[] = [
  {
    key: "title",
    header: "Réalisation",
    cell: (project) => (
      <div className="flex items-center gap-3">
        <Thumbnail bucket="projects" path={project.cover_image_path} className="h-11 w-16" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
            {project.title}
            {project.is_featured ? <Star className="size-3.5 shrink-0 fill-accent text-accent" aria-label="Mise en avant" /> : null}
          </p>
          <p className="truncate text-xs text-muted">{project.client_name ?? "Client non renseigné"}</p>
        </div>
      </div>
    ),
  },
  { key: "category", header: "Catégorie", hideBelow: "md", cell: (project) => <span className="text-ink-soft">{project.category?.name ?? "—"}</span> },
  { key: "year", header: "Année", hideBelow: "lg", cell: (project) => <span className="tabular-nums text-muted">{project.year ?? "—"}</span> },
  {
    key: "gallery",
    header: "Galerie",
    hideBelow: "xl",
    cell: (project) => (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Images className="size-4" aria-hidden />
        {project.images[0]?.count ?? 0}
      </span>
    ),
  },
  { key: "status", header: "Statut", cell: (project) => <ContentStatusBadge status={project.status} /> },
];

export default function ProjectsListPage() {
  const categories = useServiceCategories();
  return (
    <ContentListPage
      resource={resource}
      repository={projectsRepository}
      description="Portfolio des projets réalisés pour les clients d'UPCOM."
      columns={columns}
      itemTitle={(project) => project.title}
      searchPlaceholder="Titre, client…"
      newLabel="Nouvelle réalisation"
      categories={categories.data}
      featuredFilter
      emptyDescription="Valorisez vos projets en créant votre première réalisation."
    />
  );
}
