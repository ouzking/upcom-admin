import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BellRing, Building2, CalendarDays, Check, Copy, Mail, Phone, Save, Trash2, Wallet } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { QuoteStatusBadge } from "@/components/data/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Select, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { QUOTE_STATUS_LABELS, QUOTE_STATUSES } from "@/lib/labels";
import type { QuoteListItem } from "@/repositories/quotes.repository";
import type { QuoteStatus } from "@/types";
import { displayName, useAuth } from "../auth/auth-context";
import { useQuote, useQuoteMutations, useStaff } from "./useQuotes";

export default function QuoteDetailPage() {
  const { id = "" } = useParams();
  const query = useQuote(id);

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  return <QuoteDetail key={query.data.updated_at} quote={query.data} />;
}

function QuoteDetail({ quote }: { quote: QuoteListItem }) {
  const { can } = useAuth();
  const canManage = can("quotes.manage");
  const staff = useStaff();
  const { update, remove, resend } = useQuoteMutations();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const toast = useToast();

  const [assignedTo, setAssignedTo] = useState(quote.assigned_to ?? "");
  const [notes, setNotes] = useState(quote.internal_notes ?? "");
  const followUpDirty = assignedTo !== (quote.assigned_to ?? "") || notes !== (quote.internal_notes ?? "");

  const setStatus = (status: QuoteStatus) => {
    if (status !== quote.status) update.mutate({ id: quote.id, changes: { status } });
  };

  const saveFollowUp = () =>
    update.mutate({ id: quote.id, changes: { assigned_to: assignedTo || null, internal_notes: notes.trim() || null } });

  const destroy = async () => {
    const ok = await confirm({
      tone: "danger",
      title: "Supprimer cette demande ?",
      description: "Les données du prospect seront définitivement effacées. Préférez le statut « Clôturée » pour conserver l'historique.",
      confirmLabel: "Supprimer",
    });
    if (ok) remove.mutate(quote.id, { onSuccess: () => navigate("/devis", { replace: true }) });
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié.`);
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const mailSubject = encodeURIComponent(`Votre demande de devis${quote.service ? ` — ${quote.service.title}` : ""}`);

  return (
    <>
      <PageHeader
        back={{ to: "/devis", label: "Demandes de devis" }}
        title={quote.name}
        meta={<QuoteStatusBadge status={quote.status} />}
        description={`Reçue ${formatRelative(quote.created_at)} · ${formatDateTime(quote.created_at)}`}
        actions={
          <>
            <a
              href={`mailto:${quote.email}?subject=${mailSubject}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-deep"
            >
              <Mail className="size-4" aria-hidden />
              Répondre par e-mail
            </a>
            {quote.phone ? (
              <a
                href={`tel:${quote.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-paper px-4 text-sm font-semibold text-ink shadow-sm hover:bg-mist"
              >
                <Phone className="size-4" aria-hidden />
                Appeler
              </a>
            ) : null}
          </>
        }
      />

      <Card className="mb-6">
        <CardBody className="py-4">
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">Avancement</p>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Statut de la demande">
            {QUOTE_STATUSES.map((status, index) => {
              const active = quote.status === status;
              const reached = QUOTE_STATUSES.indexOf(quote.status) >= index && quote.status !== "closed";
              return (
                <li key={status}>
                  <button
                    type="button"
                    disabled={!canManage || update.isPending}
                    onClick={() => setStatus(status)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors disabled:cursor-default",
                      active
                        ? "border-brand bg-brand text-white"
                        : reached
                          ? "border-brand-100 bg-brand-50 text-brand"
                          : "border-line bg-paper text-muted enabled:hover:border-line-strong enabled:hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                        active ? "bg-white text-brand" : reached ? "bg-brand text-white" : "bg-mist text-subtle ring-1 ring-line",
                      )}
                    >
                      {reached && !active ? <Check className="size-3" aria-hidden /> : index + 1}
                    </span>
                    {QUOTE_STATUS_LABELS[status]}
                  </button>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Demande" />
            <CardBody className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Info icon={Building2} label="Service souhaité" value={quote.service?.title ?? "Non précisé"} />
                <Info icon={Wallet} label="Budget" value={quote.budget ?? "Non précisé"} />
                <Info icon={CalendarDays} label="Délai souhaité" value={quote.deadline ? formatDate(quote.deadline) : "Non précisé"} />
              </dl>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Message</p>
                <blockquote className="rounded-xl border-l-4 border-accent bg-mist px-5 py-4 text-[15px] leading-relaxed whitespace-pre-line text-ink-soft">
                  {quote.message}
                </blockquote>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Suivi commercial" description="Informations internes, jamais visibles par le prospect." />
            <CardBody className="space-y-5">
              <Field label="Responsable du suivi">
                <Select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} disabled={!canManage}>
                  <option value="">— Non assignée —</option>
                  {staff.data?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {displayName(member)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Notes internes" counter={{ value: notes.length, max: 10000 }}>
                <Textarea rows={6} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={10000} disabled={!canManage} placeholder="Échanges, besoins identifiés, prochaines étapes…" />
              </Field>
              {canManage ? (
                <div className="flex justify-end">
                  <Button icon={Save} onClick={saveFollowUp} loading={update.isPending} disabled={!followUpDirty}>
                    Enregistrer le suivi
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={quote.name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{quote.name}</p>
                  <p className="truncate text-[13px] text-muted">{quote.company ?? "Particulier / entreprise non précisée"}</p>
                </div>
              </div>
              <ContactLine icon={Mail} href={`mailto:${quote.email}`} value={quote.email} onCopy={() => void copy(quote.email, "E-mail")} />
              {quote.phone ? <ContactLine icon={Phone} href={`tel:${quote.phone.replace(/[^\d+]/g, "")}`} value={quote.phone} onCopy={() => void copy(quote.phone ?? "", "Téléphone")} /> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Informations" />
            <CardBody className="space-y-3 text-[13px]">
              <Meta label="Reçue le" value={formatDateTime(quote.created_at)} />
              <Meta label="Dernière mise à jour" value={formatDateTime(quote.updated_at)} />
              <Meta label="Notification e-mail" value={quote.notified_at ? `Envoyée le ${formatDateTime(quote.notified_at)}` : "Non envoyée"} />
              <Button variant="secondary" size="sm" icon={BellRing} loading={resend.isPending} onClick={() => resend.mutate(quote.id)} className="mt-2 w-full">
                Renvoyer la notification à l'équipe
              </Button>
            </CardBody>
          </Card>

          {canManage ? (
            <Card className="border-danger/20">
              <CardBody>
                <Button variant="ghost" icon={Trash2} onClick={() => void destroy()} className="w-full text-danger hover:bg-danger-50 hover:text-danger">
                  Supprimer la demande
                </Button>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-mist/50 p-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function ContactLine({ icon: Icon, href, value, onCopy }: { icon: typeof Mail; href: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
      <Icon className="size-4 shrink-0 text-subtle" aria-hidden />
      <a href={href} className="min-w-0 flex-1 truncate text-sm font-medium text-brand-bright hover:underline">
        {value}
      </a>
      <button type="button" onClick={onCopy} className="rounded-md p-1.5 text-subtle hover:bg-mist hover:text-ink" aria-label={`Copier ${value}`}>
        <Copy className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink-soft">{value}</span>
    </div>
  );
}
