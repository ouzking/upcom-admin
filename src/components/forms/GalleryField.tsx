import { useRef, useState, type DragEvent } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, FolderSearch, GripVertical, ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useUpload } from "@/hooks/useUpload";
import { cn } from "@/lib/cn";
import { acceptAttribute, BUCKET_RULES, formatMimeList, publicUrl } from "@/lib/storage";
import type { GalleryItem } from "@/repositories/projects.repository";
import type { StorageBucket } from "@/types";
import { MediaPickerModal } from "./MediaPickerModal";

interface GalleryFieldProps {
  bucket: StorageBucket;
  folder: string;
  value: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  disabled?: boolean;
}

/** Clé stable d'un élément (id en base, sinon chemin pour une image non enregistrée). */
const keyOf = (item: GalleryItem) => item.id ?? item.image_path;

/**
 * Galerie d'images : upload multiple (clic ou glisser-déposer), ajout depuis la
 * médiathèque, réorganisation (glisser ou flèches), texte alternatif et légende.
 * Les modifications sont appliquées à l'enregistrement du formulaire.
 */
export function GalleryField({ bucket, folder, value, onChange, disabled }: GalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { upload, uploading, pending } = useUpload(bucket);
  const rules = BUCKET_RULES[bucket];

  const append = (paths: string[]) => {
    const existing = new Set(value.map((item) => item.image_path));
    const added = paths.filter((path) => !existing.has(path)).map((path) => ({ image_path: path, alt_text: null, caption: null }));
    if (added.length) onChange([...value, ...added]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    append(await upload(Array.from(files), folder));
  };

  const update = (key: string, patch: Partial<GalleryItem>) =>
    onChange(value.map((item) => (keyOf(item) === key ? { ...item, ...patch } : item)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    onChange(next);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void handleFiles(event.dataTransfer.files);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptAttribute(bucket)}
        className="sr-only"
        tabIndex={-1}
        aria-label="Ajouter des images à la galerie"
        data-testid="gallery-file-input"
        disabled={disabled}
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {!disabled ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-brand-bright bg-brand-50" : "border-line-strong bg-mist",
          )}
        >
          {uploading ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-brand" role="status">
              <Spinner /> Envoi de {pending} image{pending > 1 ? "s" : ""}…
            </p>
          ) : (
            <>
              <UploadCloud className="size-7 text-brand/70" aria-hidden />
              <p className="text-sm font-semibold text-ink-soft">Glissez plusieurs images ici</p>
              <p className="text-xs text-muted">
                {formatMimeList(rules.mimeTypes)} · {Math.round(rules.maxBytes / (1024 * 1024))} Mo max. par image
              </p>
            </>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" icon={ImagePlus} onClick={() => inputRef.current?.click()} disabled={uploading}>
              Ajouter des images
            </Button>
            <Button size="sm" variant="ghost" icon={FolderSearch} onClick={() => setPickerOpen(true)} disabled={uploading}>
              Médiathèque
            </Button>
          </div>
        </div>
      ) : null}

      {value.length ? (
        <Reorder.Group axis="y" values={value} onReorder={onChange} className="mt-4 space-y-2" aria-label="Images de la galerie">
          {value.map((item, index) => (
            <GalleryRow
              key={keyOf(item)}
              item={item}
              index={index}
              count={value.length}
              bucket={bucket}
              disabled={disabled}
              onChange={(patch) => update(keyOf(item), patch)}
              onMove={(delta) => move(index, delta)}
              onRemove={() => onChange(value.filter((entry) => keyOf(entry) !== keyOf(item)))}
            />
          ))}
        </Reorder.Group>
      ) : (
        <p className="mt-3 text-sm text-muted">Aucune image dans la galerie.</p>
      )}

      <MediaPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} bucket={bucket} onSelect={(path) => append([path])} />
    </div>
  );
}

interface GalleryRowProps {
  item: GalleryItem;
  index: number;
  count: number;
  bucket: StorageBucket;
  disabled?: boolean;
  onChange: (patch: Partial<GalleryItem>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}

function GalleryRow({ item, index, count, bucket, disabled, onChange, onMove, onRemove }: GalleryRowProps) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="flex items-start gap-3 rounded-xl border border-line bg-paper p-2.5 shadow-card"
    >
      {!disabled ? (
        <button
          type="button"
          onPointerDown={(event) => controls.start(event)}
          className="mt-6 hidden cursor-grab touch-none rounded-md p-1 text-subtle hover:bg-mist hover:text-ink active:cursor-grabbing sm:block"
          aria-label="Glisser pour réordonner"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : null}
      <div className="relative shrink-0">
        <img src={publicUrl(bucket, item.image_path) ?? ""} alt={item.alt_text ?? ""} className="size-20 rounded-lg object-cover ring-1 ring-line" />
        {index === 0 ? <span className="absolute top-1 left-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">1re</span> : null}
        {!item.id ? <span className="absolute right-1 bottom-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">Nouveau</span> : null}
      </div>
      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
        <Input
          aria-label={`Texte alternatif de l'image ${index + 1}`}
          placeholder="Texte alternatif (accessibilité, SEO)"
          value={item.alt_text ?? ""}
          maxLength={250}
          disabled={disabled}
          onChange={(event) => onChange({ alt_text: event.target.value || null })}
        />
        <Input
          aria-label={`Légende de l'image ${index + 1}`}
          placeholder="Légende (facultatif)"
          value={item.caption ?? ""}
          maxLength={500}
          disabled={disabled}
          onChange={(event) => onChange({ caption: event.target.value || null })}
        />
      </div>
      {!disabled ? (
        <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
          <IconButton icon={ArrowUp} label="Monter" size="sm" disabled={index === 0} onClick={() => onMove(-1)} />
          <IconButton icon={ArrowDown} label="Descendre" size="sm" disabled={index === count - 1} onClick={() => onMove(1)} />
          <IconButton icon={Trash2} label="Retirer de la galerie" size="sm" variant="danger" onClick={onRemove} />
        </div>
      ) : null}
    </Reorder.Item>
  );
}
