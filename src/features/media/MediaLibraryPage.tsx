import { useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { CheckSquare, ChevronRight, Folder, FolderOpen, FolderPlus, Home, Lock, Square, Trash2, UploadCloud, X } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { SearchInput } from "@/components/data/SearchInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/features/auth/auth-context";
import { useUpload } from "@/hooks/useUpload";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/errors";
import { formatFileSize } from "@/lib/format";
import { canWriteBucket } from "@/lib/permissions";
import { queryKeys } from "@/lib/queryKeys";
import { acceptAttribute, BUCKET_RULES, BUCKETS, formatMimeList, publicUrl } from "@/lib/storage";
import { mediaRepository, type MediaFile } from "@/repositories/media.repository";
import type { StorageBucket } from "@/types";
import { MediaPreviewModal } from "./MediaPreviewModal";

const isBucket = (value: string | null): value is StorageBucket => BUCKETS.includes(value as StorageBucket);

/**
 * Médiathèque : navigation dans les 7 buckets Storage du backend.
 * Consultation pour tout le back-office ; envoi / suppression selon la
 * permission du bucket (policies storage.objects).
 */
export default function MediaLibraryPage() {
  const { access } = useAuth();
  const [params, setParams] = useSearchParams();
  const bucketParam = params.get("bucket");
  const bucket: StorageBucket = isBucket(bucketParam) ? bucketParam : "services";
  const folder = params.get("folder") ?? "";
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [folderModal, setFolderModal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canWrite = canWriteBucket(access, bucket);
  const confirm = useConfirm();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { upload, uploading, pending } = useUpload(bucket);

  const query = useQuery({ queryKey: queryKeys.media(bucket, folder, search), queryFn: () => mediaRepository.list(bucket, folder, search) });

  const navigate = (next: { bucket?: StorageBucket; folder?: string }) => {
    setSelection(new Set());
    setSearch("");
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next.bucket) updated.set("bucket", next.bucket);
      const nextFolder = next.folder ?? (next.bucket ? "" : folder);
      if (nextFolder) updated.set("folder", nextFolder);
      else updated.delete("folder");
      return updated;
    });
  };

  const remove = useMutation({
    mutationFn: (paths: string[]) => mediaRepository.remove(bucket, paths),
    onSuccess: async (_, paths) => {
      toast.success(paths.length > 1 ? `${paths.length} fichiers supprimés.` : "Fichier supprimé.");
      setSelection(new Set());
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ["media", bucket] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const confirmDelete = async (paths: string[]) => {
    const ok = await confirm({
      tone: "danger",
      title: paths.length > 1 ? `Supprimer ${paths.length} fichiers ?` : "Supprimer ce fichier ?",
      description: "Les contenus qui utilisent ces images afficheront une image manquante. Cette action est irréversible.",
      confirmLabel: "Supprimer",
    });
    if (ok) remove.mutate(paths);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || !canWrite) return;
    const uploaded = await upload(Array.from(files), folder);
    if (uploaded.length) toast.success(uploaded.length > 1 ? `${uploaded.length} fichiers téléversés.` : "Fichier téléversé.");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void onFiles(event.dataTransfer.files);
  };

  const toggle = (path: string) =>
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const crumbs = folder ? folder.split("/") : [];
  const files = (query.data ?? []).filter((entry): entry is MediaFile => entry.kind === "file");
  const rules = BUCKET_RULES[bucket];

  return (
    <>
      <PageHeader
        title="Médiathèque"
        description="Images du site, rangées par rubrique. Elles sont publiques : n'y déposez jamais de document confidentiel."
        actions={
          canWrite ? (
            <>
              <Button variant="secondary" icon={FolderPlus} onClick={() => setFolderModal(true)}>
                Nouveau dossier
              </Button>
              <Button icon={UploadCloud} loading={uploading} onClick={() => inputRef.current?.click()}>
                Téléverser
              </Button>
            </>
          ) : null
        }
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttribute(bucket)}
        className="sr-only"
        tabIndex={-1}
        aria-label="Téléverser des fichiers"
        data-testid="media-file-input"
        onChange={(event) => {
          void onFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="scrollbar-thin -mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Rubriques">
        {BUCKETS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={value === bucket}
            onClick={() => navigate({ bucket: value })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors",
              value === bucket ? "border-brand bg-brand text-white" : "border-line bg-paper text-ink-soft hover:border-line-strong",
            )}
          >
            {BUCKET_RULES[value].label}
            {!canWriteBucket(access, value) ? <Lock className="size-3 opacity-60" aria-label="Lecture seule" /> : null}
          </button>
        ))}
      </div>

      <Card
        onDragOver={(event) => {
          if (!canWrite) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("relative", dragging && "ring-4 ring-brand-bright/30")}
      >
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Dossier courant">
            <button type="button" onClick={() => navigate({ folder: "" })} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-brand hover:bg-brand-50">
              <Home className="size-4" aria-hidden />
              {rules.label}
            </button>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`} className="inline-flex items-center gap-1">
                <ChevronRight className="size-3.5 text-subtle" aria-hidden />
                <button
                  type="button"
                  onClick={() => navigate({ folder: crumbs.slice(0, index + 1).join("/") })}
                  className="max-w-48 truncate rounded-md px-1.5 py-1 font-semibold text-ink-soft hover:bg-mist"
                >
                  {crumb}
                </button>
              </span>
            ))}
          </nav>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {selection.size ? (
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">{selection.size} sélectionné(s)</span>
                <Button size="sm" variant="ghost" icon={X} onClick={() => setSelection(new Set())}>
                  Annuler
                </Button>
                <Button size="sm" variant="danger" icon={Trash2} loading={remove.isPending} onClick={() => void confirmDelete([...selection])}>
                  Supprimer
                </Button>
              </div>
            ) : null}
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher dans ce dossier" />
          </div>
        </div>

        {uploading ? (
          <p className="flex items-center gap-2 border-b border-line bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand" role="status">
            <Spinner className="size-4" /> Envoi de {pending} fichier{pending > 1 ? "s" : ""}…
          </p>
        ) : null}

        <div className="p-4">
          {query.isLoading ? (
            <LoadingState />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : !query.data?.length ? (
            <EmptyState
              icon={FolderOpen}
              title={search ? "Aucun résultat" : "Dossier vide"}
              description={
                canWrite
                  ? `Glissez des images ici ou utilisez « Téléverser ». ${formatMimeList(rules.mimeTypes)} · ${Math.round(rules.maxBytes / (1024 * 1024))} Mo max.`
                  : "Aucun fichier dans ce dossier."
              }
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {query.data.map((entry) =>
                entry.kind === "folder" ? (
                  <li key={entry.path}>
                    <button
                      type="button"
                      onClick={() => navigate({ folder: entry.path })}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-line bg-mist p-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand-bright hover:text-brand"
                    >
                      <Folder className="size-9 fill-brand/10 text-brand/70" aria-hidden />
                      <span className="w-full truncate text-center">{entry.name}</span>
                    </button>
                  </li>
                ) : (
                  <li key={entry.path} className="group relative">
                    <button
                      type="button"
                      onClick={() => setPreview(entry)}
                      className={cn(
                        "block aspect-square w-full overflow-hidden rounded-xl border-2 bg-mist transition-all",
                        selection.has(entry.path) ? "border-brand-bright ring-4 ring-brand-bright/15" : "border-transparent hover:border-line-strong",
                      )}
                    >
                      <img src={publicUrl(bucket, entry.path) ?? ""} alt={entry.name} loading="lazy" className="size-full object-cover" />
                    </button>
                    <p className="mt-1.5 truncate text-xs font-medium text-ink-soft" title={entry.name}>
                      {entry.name}
                    </p>
                    <p className="text-[11px] text-subtle">{formatFileSize(entry.size)}</p>
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => toggle(entry.path)}
                        aria-pressed={selection.has(entry.path)}
                        aria-label={`Sélectionner ${entry.name}`}
                        className={cn(
                          "absolute top-2 left-2 rounded-md bg-paper/90 p-1 text-brand shadow-sm transition-opacity",
                          selection.size || selection.has(entry.path) ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                        )}
                      >
                        {selection.has(entry.path) ? <CheckSquare className="size-4" aria-hidden /> : <Square className="size-4" aria-hidden />}
                      </button>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          )}
          {files.length >= 200 ? <p className="mt-4 text-center text-[13px] text-muted">Seuls les 200 premiers éléments sont affichés : affinez avec la recherche.</p> : null}
        </div>
      </Card>

      <MediaPreviewModal
        file={preview}
        bucket={bucket}
        canDelete={canWrite}
        deleting={remove.isPending}
        onClose={() => setPreview(null)}
        onDelete={(file) => void confirmDelete([file.path])}
      />
      <NewFolderModal
        open={folderModal}
        onClose={() => setFolderModal(false)}
        onCreate={(name) => {
          navigate({ folder: folder ? `${folder}/${name}` : name });
          toast.info("Dossier prêt", "Il sera enregistré dès que vous y téléverserez un fichier.");
        }}
      />
    </>
  );
}

function NewFolderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const submit = () => {
    if (!clean) return;
    onCreate(clean);
    setName("");
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Nouveau dossier"
      description="Les dossiers Storage existent dès qu'ils contiennent un fichier."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!clean}>
            Créer et ouvrir
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="ex. campagne-2026" aria-label="Nom du dossier" data-autofocus />
        {clean && clean !== name ? <p className="mt-2 text-[13px] text-muted">Nom utilisé : <span className="font-mono">{clean}</span></p> : null}
      </form>
    </Modal>
  );
}
