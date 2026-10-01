import { CalendarDays, ExternalLink, MapPin, Quote } from "lucide-react";
import { RichTextPreview } from "@/components/forms/RichTextPreview";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { publicUrl } from "@/lib/storage";
import type { StorageBucket } from "@/types";

export interface PreviewData {
  /** Petit libellé au-dessus du titre (catégorie, fonction…). */
  eyebrow?: string | null;
  title: string;
  excerpt?: string | null;
  body?: string | null;
  imagePath?: string | null;
  bucket: StorageBucket;
  /** Informations pratiques (date, lieu, client…). */
  meta?: { icon: "date" | "place"; text: string }[];
  layout?: "article" | "person" | "quote";
}

/** Aperçu avant publication : rendu proche du site public, rien n'est enregistré. */
export function ContentPreviewModal({ open, onClose, data, siteUrl }: { open: boolean; onClose: () => void; data: PreviewData; siteUrl?: string | null }) {
  const image = publicUrl(data.bucket, data.imagePath);
  const layout = data.layout ?? "article";

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Aperçu"
      description="Rendu indicatif du contenu sur le site. Rien n'est publié tant que vous ne cliquez pas sur « Publier »."
    >
      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        {layout === "quote" ? (
          <figure className="bg-gradient-brand p-8 text-white sm:p-10">
            <Quote className="mb-4 size-8 text-accent" aria-hidden />
            <blockquote className="font-display text-xl leading-relaxed sm:text-2xl">{data.body || "Le témoignage apparaîtra ici."}</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              {image ? <img src={image} alt="" className="size-12 rounded-full object-cover ring-2 ring-white/40" /> : null}
              <span>
                <span className="block font-semibold">{data.title || "Nom"}</span>
                {data.eyebrow ? <span className="block text-sm text-white/75">{data.eyebrow}</span> : null}
              </span>
            </figcaption>
          </figure>
        ) : layout === "person" ? (
          <div className="grid gap-6 p-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-8">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-mist">{image ? <img src={image} alt="" className="size-full object-cover" /> : null}</div>
            <div>
              <h3 className="text-2xl font-semibold text-ink">{data.title || "Nom"}</h3>
              {data.eyebrow ? <p className="mt-1 font-semibold text-accent-deep">{data.eyebrow}</p> : null}
              <RichTextPreview content={data.body} className="mt-4" />
            </div>
          </div>
        ) : (
          <article>
            <div className={cn("relative aspect-[21/9] bg-gradient-brand", !image && "flex items-center justify-center")}>
              {image ? <img src={image} alt="" className="size-full object-cover" /> : <span className="text-sm font-semibold text-white/70">Aucune image</span>}
            </div>
            <div className="mx-auto max-w-3xl p-6 sm:p-10">
              {data.eyebrow ? <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">{data.eyebrow}</p> : null}
              <h3 className="mt-2 text-3xl leading-tight font-semibold text-ink">{data.title || "Titre"}</h3>
              {data.meta?.length ? (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                  {data.meta.map((item) => (
                    <span key={item.text} className="inline-flex items-center gap-1.5">
                      {item.icon === "date" ? <CalendarDays className="size-4" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
                      {item.text}
                    </span>
                  ))}
                </div>
              ) : null}
              {data.excerpt ? <p className="mt-5 text-lg leading-relaxed text-ink-soft">{data.excerpt}</p> : null}
              <RichTextPreview content={data.body} className="mt-6" />
            </div>
          </article>
        )}
      </div>
      {siteUrl ? (
        <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted">
          <ExternalLink className="size-3.5" aria-hidden />
          Après publication, le contenu sera visible sur {siteUrl.replace(/^https?:\/\//, "")}.
        </p>
      ) : null}
    </Modal>
  );
}
