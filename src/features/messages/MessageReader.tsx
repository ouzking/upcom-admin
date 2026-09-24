import { useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, CheckCheck, Mail, MailOpen, Phone, Reply, Save, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { ContactStatusBadge } from "@/components/data/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/format";
import type { MessageItem } from "@/repositories/messages.repository";
import { useAuth } from "../auth/auth-context";
import { useMessage, useMessageMutations } from "./useMessages";

export function MessageReader({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useMessage(id);
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Reader message={query.data} onClose={onClose} />;
}

function Reader({ message, onClose }: { message: MessageItem; onClose: () => void }) {
  const { can } = useAuth();
  const canManage = can("contacts.manage");
  const { update, remove } = useMessageMutations();
  const confirm = useConfirm();
  const [notes, setNotes] = useState(message.internal_notes ?? "");
  const markedRef = useRef(false);

  // Ouvrir un message non lu le marque comme lu (si l'utilisateur peut traiter les messages).
  useEffect(() => {
    if (canManage && message.status === "new" && !markedRef.current) {
      markedRef.current = true;
      update.mutate({ id: message.id, changes: { status: "read" }, silent: true });
    }
  }, [canManage, message.id, message.status, update]);

  const status = message.status;
  const reply = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject ?? "Votre message à UPCOM"}`)}`;

  const destroy = async () => {
    const ok = await confirm({ tone: "danger", title: "Supprimer ce message ?", description: "Cette action est irréversible. Préférez l'archivage pour conserver l'historique.", confirmLabel: "Supprimer" });
    if (ok) remove.mutate(message.id, { onSuccess: onClose });
  };

  return (
    <article className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-6">
        <IconButton icon={ArrowLeft} label="Retour à la liste" onClick={onClose} className="lg:hidden" />
        <ContactStatusBadge status={status} />
        <div className="flex-1" />
        {canManage ? (
          <div className="flex flex-wrap items-center gap-1">
            {status !== "new" ? (
              <IconButton icon={Mail} label="Marquer comme non lu" onClick={() => update.mutate({ id: message.id, changes: { status: "new" }, message: "Message marqué comme non lu." })} />
            ) : (
              <IconButton icon={MailOpen} label="Marquer comme lu" onClick={() => update.mutate({ id: message.id, changes: { status: "read" }, message: "Message marqué comme lu." })} />
            )}
            {status !== "replied" ? (
              <IconButton icon={CheckCheck} label="Marquer comme répondu" onClick={() => update.mutate({ id: message.id, changes: { status: "replied" }, message: "Message marqué comme répondu." })} />
            ) : null}
            {status !== "archived" ? (
              <IconButton icon={Archive} label="Archiver" onClick={() => update.mutate({ id: message.id, changes: { status: "archived" }, message: "Message archivé." })} />
            ) : (
              <IconButton icon={ArchiveRestore} label="Désarchiver" onClick={() => update.mutate({ id: message.id, changes: { status: "read" }, message: "Message replacé dans la boîte de réception." })} />
            )}
            <IconButton icon={Trash2} label="Supprimer" variant="danger" onClick={() => void destroy()} />
          </div>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <h2 className="text-xl font-semibold text-ink">{message.subject || "Sans objet"}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Avatar name={message.name} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{message.name}</p>
            <p className="flex flex-wrap gap-x-3 text-[13px] text-muted">
              <a href={`mailto:${message.email}`} className="text-brand-bright hover:underline">
                {message.email}
              </a>
              {message.phone ? (
                <a href={`tel:${message.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 hover:text-brand">
                  <Phone className="size-3" aria-hidden />
                  {message.phone}
                </a>
              ) : null}
            </p>
          </div>
          <time dateTime={message.created_at} className="text-[13px] text-muted">
            {formatDateTime(message.created_at)}
          </time>
        </div>

        <div className="mt-6 rounded-xl bg-mist px-5 py-4 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">{message.message}</div>

        <div className="mt-5">
          <a href={reply} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep">
            <Reply className="size-4" aria-hidden />
            Répondre
          </a>
        </div>

        <section className="mt-8 border-t border-line pt-6" aria-labelledby="notes-title">
          <h3 id="notes-title" className="font-sans text-sm font-bold tracking-normal text-ink">
            Notes internes
          </h3>
          <p className="mb-3 text-[13px] text-muted">Visibles uniquement par l'équipe.</p>
          <Textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canManage} maxLength={10000} aria-labelledby="notes-title" />
          {canManage ? (
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                icon={Save}
                loading={update.isPending}
                disabled={notes === (message.internal_notes ?? "")}
                onClick={() => update.mutate({ id: message.id, changes: { internal_notes: notes.trim() || null } })}
              >
                Enregistrer la note
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}
