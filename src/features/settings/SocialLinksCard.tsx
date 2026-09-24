import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/feedback/confirm-context";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { errorMessage } from "@/lib/errors";
import { SOCIAL_PLATFORM_LABELS } from "@/lib/labels";
import { queryKeys } from "@/lib/queryKeys";
import { socialLinksRepository, type SocialLinkInput } from "@/repositories/settings.repository";
import type { SocialLinkRow, SocialPlatform } from "@/types";

const PLATFORMS = Object.keys(SOCIAL_PLATFORM_LABELS) as SocialPlatform[];

/** Réseaux sociaux du site (table social_links). Aucun lien n'est pré-rempli : à saisir par UPCOM. */
export function SocialLinksCard({ canManage }: { canManage: boolean }) {
  const query = useQuery({ queryKey: queryKeys.socialLinks, queryFn: socialLinksRepository.list });
  const [editing, setEditing] = useState<SocialLinkRow | "new" | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.socialLinks });
  const onError = (error: unknown) => toast.error(errorMessage(error));

  const toggle = useMutation({
    mutationFn: (link: SocialLinkRow) => socialLinksRepository.update(link.id, { is_active: !link.is_active }),
    onSuccess: async () => {
      toast.success("Modification enregistrée.");
      await refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: socialLinksRepository.remove,
    onSuccess: async () => {
      toast.success("Lien supprimé.");
      await refresh();
    },
    onError,
  });

  return (
    <Card>
      <CardHeader
        title="Réseaux sociaux"
        description="Liens affichés dans le pied de page du site."
        actions={canManage ? <IconButton icon={Plus} label="Ajouter un réseau" variant="secondary" size="sm" onClick={() => setEditing("new")} /> : null}
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon={Share2} title="Aucun réseau social" description="Ajoutez les comptes officiels d'UPCOM lorsqu'ils sont disponibles." className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {query.data.map((link) => (
            <li key={link.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {link.label || SOCIAL_PLATFORM_LABELS[link.platform]}
                  {!link.is_active ? <Badge>Masqué</Badge> : null}
                </p>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-brand-bright hover:underline">
                  <span className="truncate">{link.url}</span>
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              </div>
              {canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={link.is_active}
                    aria-label={link.is_active ? "Masquer sur le site" : "Afficher sur le site"}
                    onClick={() => toggle.mutate(link)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${link.is_active ? "bg-brand" : "bg-line-strong"}`}
                  >
                    <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${link.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </button>
                  <IconButton icon={Pencil} label="Modifier" size="sm" onClick={() => setEditing(link)} />
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (await confirm({ tone: "danger", title: "Supprimer ce lien ?", confirmLabel: "Supprimer" })) remove.mutate(link.id);
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <SocialLinkModal link={editing} onClose={() => setEditing(null)} onSaved={refresh} nextOrder={(query.data?.length ?? 0) * 10} />
    </Card>
  );
}

function SocialLinkModal({ link, onClose, onSaved, nextOrder }: { link: SocialLinkRow | "new" | null; onClose: () => void; onSaved: () => Promise<void>; nextOrder: number }) {
  const existing = link && link !== "new" ? link : null;
  const [platform, setPlatform] = useState<SocialPlatform>(existing?.platform ?? "facebook");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [active, setActive] = useState(existing?.is_active ?? true);
  const [previous, setPrevious] = useState(link);
  const toast = useToast();

  // Réinitialise les champs à chaque ouverture.
  if (previous !== link) {
    setPrevious(link);
    setPlatform(existing?.platform ?? "facebook");
    setLabel(existing?.label ?? "");
    setUrl(existing?.url ?? "");
    setActive(existing?.is_active ?? true);
  }

  const urlError = url && !/^https:\/\//i.test(url.trim()) ? "L'adresse doit commencer par https://." : undefined;

  const save = useMutation({
    mutationFn: async () => {
      const input: SocialLinkInput = { platform, label: label.trim() || null, url: url.trim(), is_active: active, display_order: existing?.display_order ?? nextOrder };
      if (existing) await socialLinksRepository.update(existing.id, input);
      else await socialLinksRepository.create(input);
    },
    onSuccess: async () => {
      toast.success(existing ? "Modification enregistrée." : "Lien ajouté avec succès.");
      await onSaved();
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={link !== null}
      onClose={onClose}
      title={existing ? "Modifier le lien" : "Ajouter un réseau social"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={save.isPending} disabled={!url.trim() || Boolean(urlError)} onClick={() => save.mutate()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Plateforme" required>
          <Select value={platform} onChange={(event) => setPlatform(event.target.value as SocialPlatform)}>
            {PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {SOCIAL_PLATFORM_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Adresse" required error={urlError}>
          <Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
        </Field>
        <Field label="Libellé" hint="Facultatif (par défaut : nom de la plateforme).">
          <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={80} />
        </Field>
        <Switch checked={active} onChange={setActive} label="Afficher sur le site" />
      </div>
    </Modal>
  );
}
