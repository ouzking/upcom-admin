import { useRef, useState, type DragEvent } from "react";
import { FolderSearch, ImagePlus, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useUpload } from "@/hooks/useUpload";
import { cn } from "@/lib/cn";
import { acceptAttribute, BUCKET_RULES, formatMimeList, publicUrl } from "@/lib/storage";
import type { StorageBucket } from "@/types";
import { MediaPickerModal } from "./MediaPickerModal";

interface ImageFieldProps {
  bucket: StorageBucket;
  /** Dossier d'upload dans le bucket (ex. « services/<id> »). */
  folder: string;
  value: string | null;
  onChange: (path: string | null) => void;
  disabled?: boolean;
  aspect?: "video" | "square" | "portrait";
  label?: string;
  id?: string;
}

const ASPECTS = { video: "aspect-video", square: "aspect-square", portrait: "aspect-[4/5]" } as const;

/** Image unique stockée par chemin dans Storage : upload (clic / glisser-déposer), médiathèque, aperçu. */
export function ImageField({ bucket, folder, value, onChange, disabled, aspect = "video", label = "Image", id }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { upload, uploading } = useUpload(bucket);
  const rules = BUCKET_RULES[bucket];
  const src = publicUrl(bucket, value);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const [path] = await upload([file], folder);
    if (path) onChange(path);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void handleFiles(event.dataTransfer.files);
  };

  return (
    <div id={id}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(bucket)}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Téléverser : ${label}`}
        data-testid={`file-input-${bucket}`}
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
        disabled={disabled}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          ASPECTS[aspect],
          dragging ? "border-brand-bright bg-brand-50" : src ? "border-transparent" : "border-line-strong bg-mist",
        )}
      >
        {src ? (
          <img src={src} alt={`Aperçu : ${label}`} className="size-full object-cover" />
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center disabled:cursor-not-allowed"
          >
            <UploadCloud className="size-8 text-brand/70" aria-hidden />
            <span className="text-sm font-semibold text-ink-soft">{disabled ? "Aucune image" : "Glissez une image ou cliquez"}</span>
            {!disabled ? (
              <span className="text-xs text-muted">
                {formatMimeList(rules.mimeTypes)} · {Math.round(rules.maxBytes / (1024 * 1024))} Mo max.
              </span>
            ) : null}
          </button>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-paper/80 text-sm font-semibold text-brand" role="status">
            <Spinner /> Envoi en cours…
          </div>
        ) : null}
      </div>

      {!disabled ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={src ? RefreshCw : ImagePlus} onClick={() => inputRef.current?.click()} disabled={uploading}>
            {src ? "Remplacer" : "Téléverser"}
          </Button>
          <Button size="sm" variant="ghost" icon={FolderSearch} onClick={() => setPickerOpen(true)} disabled={uploading}>
            Médiathèque
          </Button>
          {src ? (
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onChange(null)} className="text-danger hover:bg-danger-50 hover:text-danger">
              Retirer
            </Button>
          ) : null}
        </div>
      ) : null}

      <MediaPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} bucket={bucket} onSelect={onChange} />
    </div>
  );
}
