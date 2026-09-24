import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Archive, ArchiveRestore, Eye, EyeOff, FilterX, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { EmptyState } from "@/components/feedback/States";
import { DataTable, type Column } from "@/components/data/DataTable";
import { Pagination } from "@/components/data/Pagination";
import { SearchInput } from "@/components/data/SearchInput";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ContentResource } from "@/config/resources";
import { useAuth } from "@/features/auth/auth-context";
import { useListState } from "@/hooks/useListState";
import { cn } from "@/lib/cn";
import { CONTENT_STATUS_LABELS, CONTENT_STATUSES } from "@/lib/labels";
import type { ContentRepository } from "@/repositories/content";
import type { ContentStatus } from "@/types";
import { ReadOnlyNotice } from "./ReadOnlyNotice";
import { useContentActions, useContentList } from "./useContent";

interface BaseRow {
  id: string;
  status: ContentStatus;
}

interface ContentListPageProps<TRow, TItem extends BaseRow, TInput> {
  resource: ContentResource;
  repository: ContentRepository<TRow, TItem, TInput>;
  description: string;
  columns: Column<TItem>[];
  itemTitle: (item: TItem) => string;
  searchPlaceholder: string;
  newLabel: string;
  categories?: { id: string; name: string }[];
  featuredFilter?: boolean;
  emptyDescription?: ReactNode;
}

const FILTER_KEYS = ["status", "category", "featured"] as const;

/**
 * Liste générique d'une rubrique éditoriale : recherche, filtres (statut,
 * catégorie, mise en avant), pagination, actions de cycle de vie.
 */
export function ContentListPage<TRow, TItem extends BaseRow, TInput>({
  resource,
  repository,
  description,
  columns,
  itemTitle,
  searchPlaceholder,
  newLabel,
  categories,
  featuredFilter = false,
  emptyDescription,
}: ContentListPageProps<TRow, TItem, TInput>) {
  const { can } = useAuth();
  const canManage = can(resource.permission);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const list = useListState(FILTER_KEYS);
  const status = CONTENT_STATUSES.find((value) => value === list.filters.status);

  const query = useContentList(resource, repository, {
    page: list.page,
    pageSize: list.pageSize,
    search: list.search,
    filters: {
      status,
      categoryId: list.filters.category || undefined,
      featured: list.filters.featured === "1" || undefined,
    },
  });
  const { setStatus, remove } = useContentActions(resource, repository);

  const changeStatus = async (item: TItem, next: ContentStatus) => {
    if (next === "archived") {
      const ok = await confirm({
        title: "Archiver ce contenu ?",
        description: (
          <>
            <strong>{itemTitle(item)}</strong> ne sera plus visible sur le site. Vous pourrez le restaurer à tout moment.
          </>
        ),
        confirmLabel: "Archiver",
      });
      if (!ok) return;
    }
    if (next === "draft" && item.status === "published") {
      const ok = await confirm({
        title: "Dépublier ce contenu ?",
        description: (
          <>
            <strong>{itemTitle(item)}</strong> sera retiré du site public et repassera en brouillon.
          </>
        ),
        confirmLabel: "Dépublier",
      });
      if (!ok) return;
    }
    setStatus.mutate({ id: item.id, status: next });
  };

  const deleteItem = async (item: TItem) => {
    const ok = await confirm({
      tone: "danger",
      title: "Supprimer définitivement ?",
      description: (
        <>
          <strong>{itemTitle(item)}</strong> sera supprimé de manière irréversible. Les fichiers de la médiathèque ne sont pas supprimés.
        </>
      ),
      confirmLabel: "Supprimer",
    });
    if (ok) remove.mutate(item.id);
  };

  const actionsFor = (item: TItem): (DropdownItem | "separator")[] => {
    const items: (DropdownItem | "separator")[] = [
      { label: canManage ? "Modifier" : "Consulter", icon: Pencil, onSelect: () => navigate(`${resource.path}/${item.id}`) },
    ];
    if (!canManage) return items;
    if (item.status === "draft") items.push({ label: "Publier", icon: Eye, onSelect: () => void changeStatus(item, "published") });
    if (item.status === "published") items.push({ label: "Dépublier", icon: EyeOff, onSelect: () => void changeStatus(item, "draft") });
    if (item.status !== "archived") items.push({ label: "Archiver", icon: Archive, onSelect: () => void changeStatus(item, "archived") });
    if (item.status === "archived") {
      items.push({ label: "Restaurer en brouillon", icon: ArchiveRestore, onSelect: () => void changeStatus(item, "draft") });
      items.push("separator", { label: "Supprimer définitivement", icon: Trash2, tone: "danger", onSelect: () => void deleteItem(item) });
    }
    return items;
  };

  const actionColumn: Column<TItem> = {
    key: "actions",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    className: "w-14",
    cell: (item) => (
      <Dropdown
        trigger={(props) => <IconButton icon={MoreHorizontal} label={`Actions pour ${itemTitle(item)}`} size="sm" {...props} />}
        items={actionsFor(item)}
      />
    ),
  };

  const tabs: { value: ContentStatus | ""; label: string }[] = [{ value: "", label: "Tous" }, ...CONTENT_STATUSES.map((value) => ({ value, label: `${CONTENT_STATUS_LABELS[value]}s` }))];

  return (
    <>
      <PageHeader
        title={resource.label}
        description={description}
        actions={
          canManage ? (
            <ButtonLink to={`${resource.path}/nouveau`} icon={Plus}>
              {newLabel}
            </ButtonLink>
          ) : null
        }
      />
      {!canManage ? <ReadOnlyNotice /> : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1" role="tablist" aria-label="Filtrer par statut">
            {tabs.map((tab) => {
              const active = (status ?? "") === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => list.setFilter("status", tab.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                    active ? "bg-brand text-white" : "text-muted hover:bg-mist hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {categories ? (
              <Select
                aria-label="Filtrer par catégorie"
                value={list.filters.category}
                onChange={(event) => list.setFilter("category", event.target.value)}
                className="sm:w-56"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {featuredFilter ? (
              <Button
                variant={list.filters.featured === "1" ? "primary" : "secondary"}
                icon={Star}
                aria-pressed={list.filters.featured === "1"}
                onClick={() => list.setFilter("featured", list.filters.featured === "1" ? "" : "1")}
              >
                Mis en avant
              </Button>
            ) : null}
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={searchPlaceholder} />
          </div>
        </div>

        <DataTable
          caption={resource.label}
          rows={query.data?.items}
          columns={[...columns, actionColumn]}
          rowKey={(item) => item.id}
          rowHref={(item) => `${resource.path}/${item.id}`}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={
            list.hasActiveFilters ? (
              <EmptyState
                icon={FilterX}
                title="Aucun résultat"
                description="Aucun élément ne correspond à votre recherche ou à vos filtres."
                action={
                  <Button variant="secondary" onClick={list.reset}>
                    Réinitialiser les filtres
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={resource.icon}
                title={`Aucun contenu dans « ${resource.label} »`}
                description={emptyDescription}
                action={
                  canManage ? (
                    <ButtonLink to={`${resource.path}/nouveau`} icon={Plus}>
                      {newLabel}
                    </ButtonLink>
                  ) : null
                }
              />
            )
          }
        />
        {query.data ? <Pagination page={list.page} pageSize={list.pageSize} total={query.data.total} onPageChange={list.setPage} /> : null}
      </Card>
    </>
  );
}
