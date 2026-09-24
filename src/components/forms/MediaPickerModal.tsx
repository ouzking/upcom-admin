import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Folder, FolderOpen, Home } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { SearchInput } from "@/components/data/SearchInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/queryKeys";
import { BUCKET_RULES, publicUrl } from "@/lib/storage";
import { mediaRepository } from "@/repositories/media.repository";
import type { StorageBucket } from "@/types";

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  bucket: StorageBucket;
  onSelect: (path: string) => void;
}

/** Sélection d'une image existante dans un bucket de la médiathèque. */
export function MediaPickerModal({ open, onClose, bucket, onSelect }: MediaPickerModalProps) {
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const query = useQuery({
    queryKey: queryKeys.media(bucket, folder, search),
    queryFn: () => mediaRepository.list(bucket, folder, search),
    enabled: open,
  });

  const crumbs = folder ? folder.split("/") : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Choisir dans la médiathèque"
      description={`Dossier « ${BUCKET_RULES[bucket].label} »`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onSelect(selected);
              onClose();
            }}
          >
            Utiliser cette image
          </Button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Dossier courant">
          <button type="button" onClick={() => setFolder("")} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-brand hover:bg-brand-50">
            <Home className="size-4" aria-hidden />
            Racine
          </button>
          {crumbs.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="inline-flex items-center gap-1">
              <ChevronRight className="size-3.5 text-subtle" aria-hidden />
              <button
                type="button"
                onClick={() => setFolder(crumbs.slice(0, index + 1).join("/"))}
                className="max-w-40 truncate rounded-md px-1.5 py-1 font-semibold text-ink-soft hover:bg-mist"
              >
                {crumb}
              </button>
            </span>
          ))}
        </nav>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher dans ce dossier" />
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon={FolderOpen} title="Dossier vide" description="Aucune image dans ce dossier." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {query.data.map((entry) =>
            entry.kind === "folder" ? (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => setFolder(entry.path)}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist p-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-bright hover:text-brand"
                >
                  <Folder className="size-8 text-brand/70" aria-hidden />
                  <span className="w-full truncate text-center">{entry.name}</span>
                </button>
              </li>
            ) : (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => setSelected(entry.path)}
                  onDoubleClick={() => {
                    onSelect(entry.path);
                    onClose();
                  }}
                  aria-pressed={selected === entry.path}
                  className={cn(
                    "group relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-mist transition-all",
                    selected === entry.path ? "border-brand-bright ring-4 ring-brand-bright/15" : "border-transparent hover:border-line-strong",
                  )}
                >
                  <img src={publicUrl(bucket, entry.path) ?? ""} alt={entry.name} loading="lazy" className="size-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pt-6 pb-1.5 text-left text-[11px] font-medium text-white">
                    {entry.name}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </Modal>
  );
}
