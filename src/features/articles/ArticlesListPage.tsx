import { useState } from "react";
import { Star, Tags } from "lucide-react";
import type { Column } from "@/components/data/DataTable";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { Button } from "@/components/ui/Button";
import { CONTENT_RESOURCES } from "@/config/resources";
import { useAuth } from "@/features/auth/auth-context";
import { formatDate, formatDateTime } from "@/lib/format";
import { articlesRepository, type ArticleListItem } from "@/repositories/articles.repository";
import { ContentListPage } from "../content/ContentListPage";
import { isScheduled } from "./article-form";
import { ArticleCategoriesModal } from "./ArticleCategoriesModal";
import { useArticleCategories } from "./useArticleCategories";

const resource = CONTENT_RESOURCES.articles;

const columns: Column<ArticleListItem>[] = [
  {
    key: "title",
    header: "Article",
    cell: (article) => (
      <div className="flex items-center gap-3">
        <Thumbnail bucket="articles" path={article.cover_image_path} className="h-11 w-16" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
            {article.title}
            {article.is_featured ? <Star className="size-3.5 shrink-0 fill-accent text-accent" aria-label="À la une" /> : null}
          </p>
          <p className="truncate text-xs text-muted">{article.author_name ?? "Auteur non renseigné"}</p>
        </div>
      </div>
    ),
  },
  { key: "category", header: "Catégorie", hideBelow: "md", cell: (article) => <span className="text-ink-soft">{article.category?.name ?? "—"}</span> },
  {
    key: "published",
    header: "Publication",
    hideBelow: "lg",
    cell: (article) => (
      <span className="text-muted" title={formatDateTime(article.published_at)}>
        {formatDate(article.published_at)}
      </span>
    ),
  },
  { key: "status", header: "Statut", cell: (article) => <ContentStatusBadge status={article.status} scheduled={isScheduled(article)} /> },
];

export default function ArticlesListPage() {
  const categories = useArticleCategories();
  const { can } = useAuth();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <>
      <ContentListPage
        resource={resource}
        repository={articlesRepository}
        description="Actualités et articles du blog UPCOM. Une date de publication future programme la mise en ligne."
        columns={columns}
        itemTitle={(article) => article.title}
        searchPlaceholder="Titre, auteur…"
        newLabel="Nouvel article"
        categories={categories.data}
        featuredFilter
        emptyDescription="Rédigez votre premier article pour animer le site."
      />
      {can("articles.manage") ? (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" icon={Tags} onClick={() => setCategoriesOpen(true)}>
            Gérer les catégories
          </Button>
        </div>
      ) : null}
      <ArticleCategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </>
  );
}
