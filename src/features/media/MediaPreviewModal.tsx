import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { useToast } from "@/components/feedback/toast-context";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { publicUrl } from "@/lib/storage";
import type { MediaFile } from "@/repositories/media.repository";
import type { StorageBucket } from "@/types";

interface MediaPreviewModalProps {
  file: MediaFile | null;
  bucket: StorageBucket;
  canDelete: boolean;
  deleting: boolean;
  onClose: () => void;
  onDelete: (file: MediaFile) => void;
}

export function MediaPreviewModal({ file, bucket, canDelete, deleting, onClose, onDelete }: MediaPreviewModalProps) {
  const toast = useToast();
  const url = file ? publicUrl(bucket, file.path) : null;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié.`);
    } catch {
      toast.error("Copie impossible.");
    }
  };

  return (
    <Modal
      open={file !== null}
      onClose={onClose}
      size="lg"
      title={<span className="block truncate">{file?.name}</span>}
      footer={
        file ? (
          <>
            {canDelete ? (
              <Button variant="ghost" icon={Trash2} loading={deleting} onClick={() => onDelete(file)} className="text-danger hover:bg-danger-50 hover:text-danger sm:mr-auto">
                Supprimer
              </Button>
            ) : null}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line-strong bg-paper px-4 text-sm font-semibold text-ink shadow-sm hover:bg-mist"
              >
                <ExternalLink className="size-4" aria-hidden />
                Ouvrir
              </a>
            ) : null}
            {url ? (
              <Button icon={Copy} onClick={() => void copy(url, "Lien")}>
                Copier le lien
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {file && url ? (
        <div className="space-y-4">
          <div className="flex max-h-[55vh] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f5f7fb_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
            <img src={url} alt={file.name} className="max-h-[55vh] w-auto object-contain" />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            <Meta label="Taille" value={formatFileSize(file.size)} />
            <Meta label="Format" value={file.mimeType?.replace("image/", "").toUpperCase() ?? "—"} />
            <Meta label="Ajouté le" value={formatDateTime(file.createdAt)} />
            <Meta label="Chemin" value={file.path} mono onCopy={() => void copy(file.path, "Chemin")} />
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}

function Meta({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
  return (
    <div className="min-w-0 rounded-lg bg-mist px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={mono ? "flex items-center gap-1 font-mono text-xs text-ink-soft" : "font-semibold text-ink"}>
        <span className="truncate" title={value}>
          {value}
        </span>
        {onCopy ? (
          <button type="button" onClick={onCopy} className="shrink-0 rounded p-0.5 text-subtle hover:text-ink" aria-label="Copier le chemin">
            <Copy className="size-3" aria-hidden />
          </button>
        ) : null}
      </dd>
    </div>
  );
}
