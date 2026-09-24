import { useRef, useState, type KeyboardEvent } from "react";
import { Bold, Eye, Heading2, Heading3, Italic, Link2, List, ListOrdered, PenLine, Quote, SquarePlay, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { controlClass } from "@/components/ui/control";
import { RichTextPreview } from "./RichTextPreview";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  "aria-describedby"?: string;
}

type Action = { label: string; shortcut?: string; icon: LucideIcon; apply: (text: string, start: number, end: number) => Edit };
type Edit = { text: string; start: number; end: number };

/** Entoure la sélection (ou insère un gabarit sélectionné). */
const wrap = (before: string, after: string, placeholder: string) => (text: string, start: number, end: number): Edit => {
  const selected = text.slice(start, end) || placeholder;
  return {
    text: text.slice(0, start) + before + selected + after + text.slice(end),
    start: start + before.length,
    end: start + before.length + selected.length,
  };
};

/** Préfixe chaque ligne de la sélection et isole le bloc par des lignes vides. */
const prefixLines = (prefix: (index: number) => string, placeholder: string) => (text: string, start: number, end: number): Edit => {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEndIndex = text.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const block = text.slice(lineStart, lineEnd) || placeholder;
  const replaced = block
    .split("\n")
    .map((line, index) => prefix(index) + line.replace(/^(#{1,3} |[-*•] |\d+[.)] |> ?)/, ""))
    .join("\n");
  const before = text.slice(0, lineStart);
  const after = text.slice(lineEnd);
  const padBefore = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
  const padAfter = after && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : "";
  const newStart = before.length + padBefore.length;
  return { text: before + padBefore + replaced + padAfter + after, start: newStart, end: newStart + replaced.length };
};

const ACTIONS: Action[] = [
  { label: "Titre de section", icon: Heading2, apply: prefixLines(() => "## ", "Titre de section") },
  { label: "Sous-titre", icon: Heading3, apply: prefixLines(() => "### ", "Sous-titre") },
  { label: "Gras", shortcut: "Ctrl+B", icon: Bold, apply: wrap("**", "**", "texte en gras") },
  { label: "Italique", shortcut: "Ctrl+I", icon: Italic, apply: wrap("*", "*", "texte en italique") },
  { label: "Liste à puces", icon: List, apply: prefixLines(() => "- ", "Élément") },
  { label: "Liste numérotée", icon: ListOrdered, apply: prefixLines((index) => `${index + 1}. `, "Élément") },
  { label: "Citation", icon: Quote, apply: prefixLines(() => "> ", "Citation") },
  { label: "Lien", shortcut: "Ctrl+K", icon: Link2, apply: wrap("[", "](https://)", "texte du lien") },
  { label: "Vidéo YouTube / Vimeo", icon: SquarePlay, apply: prefixLines(() => "", "https://www.youtube.com/watch?v=") },
];

/**
 * Éditeur de contenu riche produisant le Markdown léger interprété par le
 * site public (rendu sûr, sans HTML). Barre d'outils, raccourcis clavier,
 * aperçu fidèle et compteur de mots.
 */
export function MarkdownEditor({ value, onChange, id, invalid, disabled, placeholder, rows = 14, ...aria }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");

  const run = (action: Action) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const edit = action.apply(value, textarea.selectionStart, textarea.selectionEnd);
    onChange(edit.text);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(edit.start, edit.end);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const action = key === "b" ? ACTIONS[2] : key === "i" ? ACTIONS[3] : key === "k" ? ACTIONS[7] : undefined;
    if (action) {
      event.preventDefault();
      run(action);
    }
  };

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-paper", invalid ? "border-danger" : "border-line-strong")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-mist/70 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
          {ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => run(action)}
              disabled={disabled || mode === "preview"}
              title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              aria-label={action.label}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-paper hover:text-brand disabled:opacity-40"
            >
              <action.icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
        <div className="flex rounded-lg bg-paper p-0.5 ring-1 ring-line" role="tablist" aria-label="Mode d'édition">
          {(["write", "preview"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={mode === entry}
              onClick={() => setMode(entry)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                mode === entry ? "bg-brand text-white" : "text-muted hover:text-ink",
              )}
            >
              {entry === "write" ? <PenLine className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
              {entry === "write" ? "Écrire" : "Aperçu"}
            </button>
          ))}
        </div>
      </div>

      {mode === "write" ? (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={invalid || undefined}
          className={cn(controlClass(false), "block min-h-60 resize-y rounded-none border-0 py-3 font-mono text-[13.5px] leading-relaxed focus:ring-0")}
          {...aria}
        />
      ) : (
        <div className="min-h-60 px-4 py-4">
          <RichTextPreview content={value} />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line px-3 py-1.5 text-xs text-subtle">
        <span>Séparez les paragraphes par une ligne vide.</span>
        <span className="tabular-nums">
          {words} mot{words > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
