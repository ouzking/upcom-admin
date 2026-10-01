import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical, Save } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { ContentStatusBadge } from "@/components/data/StatusBadge";
import { Thumbnail } from "@/components/data/Thumbnail";
import { Button, IconButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ContentResource } from "@/config/resources";
import { errorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { listForOrdering, saveOrder, type OrderableItem, type OrderableTable } from "@/repositories/content";

interface ReorderModalProps {
  open: boolean;
  onClose: () => void;
  resource: ContentResource;
}

/**
 * Ordre d'affichage sur le site (display_order) : glisser-déposer, ou flèches au
 * clavier / sur mobile. Enregistre 10, 20, 30… dans l'ordre choisi.
 */
export function ReorderModal({ open, onClose, resource }: ReorderModalProps) {
  const table = resource.table as OrderableTable;
  const query = useQuery({ queryKey: [...queryKeys.content(table), "ordering"], queryFn: () => listForOrdering(table), enabled: open });
  const [items, setItems] = useState<OrderableItem[] | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<OrderableItem[] | undefined>(undefined);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Réinitialise la liste locale à chaque chargement des données.
  if (query.data !== loadedFrom) {
    setLoadedFrom(query.data);
    setItems(query.data ?? null);
  }

  const dirty = Boolean(items && query.data && items.some((item, index) => item.id !== query.data[index]?.id));

  const save = useMutation({
    mutationFn: () => saveOrder(table, (items ?? []).map((item) => item.id)),
    onSuccess: async () => {
      toast.success("Ordre d'affichage enregistré.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.content(table) });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const move = (index: number, delta: number) =>
    setItems((current) => {
      if (!current) return current;
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (item) next.splice(target, 0, item);
      return next;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!save.isPending}
      size="lg"
      title={`Réorganiser — ${resource.label}`}
      description="Faites glisser les éléments (ou utilisez les flèches) : le premier de la liste apparaît en premier sur le site."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Annuler
          </Button>
          <Button icon={Save} loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
            Enregistrer l'ordre
          </Button>
        </>
      }
    >
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !items?.length ? (
        <p className="py-8 text-center text-sm text-muted">Aucun élément à réorganiser.</p>
      ) : (
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2" aria-label={`Ordre des ${resource.label.toLowerCase()}`}>
          {items.map((item, index) => (
            <Row key={item.id} item={item} index={index} count={items.length} resource={resource} onMove={(delta) => move(index, delta)} />
          ))}
        </Reorder.Group>
      )}
    </Modal>
  );
}

function Row({ item, index, count, resource, onMove }: { item: OrderableItem; index: number; count: number; resource: ContentResource; onMove: (delta: number) => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} className="flex items-center gap-3 rounded-xl border border-line bg-paper p-2.5 shadow-card">
      <button
        type="button"
        onPointerDown={(event) => controls.start(event)}
        className="cursor-grab touch-none rounded-md p-1.5 text-subtle hover:bg-mist hover:text-ink active:cursor-grabbing"
        aria-label={`Glisser pour déplacer ${item.label}`}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="w-6 text-center text-xs font-bold text-subtle tabular-nums">{index + 1}</span>
      <Thumbnail bucket={resource.bucket} path={item.imagePath} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
        {item.detail ? <p className="truncate text-xs text-muted">{item.detail}</p> : null}
      </div>
      <span className="hidden sm:block">
        <ContentStatusBadge status={item.status} />
      </span>
      <IconButton icon={ArrowUp} label={`Monter ${item.label}`} size="sm" disabled={index === 0} onClick={() => onMove(-1)} />
      <IconButton icon={ArrowDown} label={`Descendre ${item.label}`} size="sm" disabled={index === count - 1} onClick={() => onMove(1)} />
    </Reorder.Item>
  );
}
