import { Fragment, type ReactNode } from "react";
import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Aperçu du contenu riche, fidèle au rendu du site public
 * (upcom-frontend/src/components/media/RichText.tsx) :
 * Markdown léger — paragraphes, `##` / `###`, listes `-` / `1.`, citations `>`,
 * **gras**, *italique*, [liens](https://…) et URL YouTube / Vimeo seules sur leur ligne.
 * Aucun HTML brut n'est interprété.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|mailto:|tel:|\/)[^)\s]+\))/g;
const VIDEO = /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/|(?:player\.)?vimeo\.com\/)\S+$/i;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href = ""] = link;
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

const withLineBreaks = (text: string): ReactNode[] =>
  text.split("\n").flatMap((line, index) => (index === 0 ? renderInline(line) : [<br key={`br-${index}`} />, ...renderInline(line)]));

export function RichTextPreview({ content, className }: { content: string | null | undefined; className?: string }) {
  if (!content?.trim()) return <p className="text-sm text-subtle italic">Aucun contenu pour le moment.</p>;
  const blocks = content.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

  return (
    <div className={cn("prose-upcom", className)}>
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        const lines = trimmed.split("\n");

        if (lines.length === 1 && VIDEO.test(trimmed))
          return (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-line bg-mist p-4 text-sm">
              <PlayCircle className="size-6 shrink-0 text-brand" aria-hidden />
              <span className="truncate">Vidéo intégrée : {trimmed}</span>
            </div>
          );
        if (trimmed.startsWith("### ")) return <h3 key={index}>{renderInline(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) return <h2 key={index}>{renderInline(trimmed.replace(/^#{1,2} /, ""))}</h2>;
        if (lines.every((line) => /^\s*[-*•] /.test(line)))
          return (
            <ul key={index}>
              {lines.map((line, item) => (
                <li key={item}>{renderInline(line.replace(/^\s*[-*•] /, ""))}</li>
              ))}
            </ul>
          );
        if (lines.every((line) => /^\s*\d+[.)] /.test(line)))
          return (
            <ol key={index}>
              {lines.map((line, item) => (
                <li key={item}>{renderInline(line.replace(/^\s*\d+[.)] /, ""))}</li>
              ))}
            </ol>
          );
        if (lines.every((line) => line.startsWith(">")))
          return <blockquote key={index}>{withLineBreaks(lines.map((line) => line.replace(/^>\s?/, "")).join("\n"))}</blockquote>;
        return <p key={index}>{withLineBreaks(trimmed)}</p>;
      })}
    </div>
  );
}
