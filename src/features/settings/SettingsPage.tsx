import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Mail, MapPin, MessageCircle, Phone, Save } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/feedback/States";
import { useToast } from "@/components/feedback/toast-context";
import { Field } from "@/components/forms/Field";
import { ImageField } from "@/components/forms/ImageField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/auth-context";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { settingsRepository } from "@/repositories/settings.repository";
import type { SiteSettingsRow } from "@/types";
import { FormSection } from "../content/EditorLayout";
import { ReadOnlyNotice } from "../content/ReadOnlyNotice";
import { settingsSchema, settingsToInput, settingsToValues, type SettingsFormValues } from "./settings-form";
import { SocialLinksCard } from "./SocialLinksCard";

export default function SettingsPage() {
  const query = useQuery({ queryKey: queryKeys.settings, queryFn: settingsRepository.get });
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  return <SettingsForm key={query.data.updated_at} settings={query.data} />;
}

function SettingsForm({ settings }: { settings: SiteSettingsRow }) {
  const { can } = useAuth();
  const canManage = can("settings.manage");
  const toast = useToast();
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: settingsToValues(settings) });
  const { register, control, handleSubmit, reset, formState } = form;
  const { errors, isDirty } = formState;
  const [description] = useWatch({ control, name: ["description"] });

  const save = useMutation({
    mutationFn: (values: SettingsFormValues) => settingsRepository.update(settingsToInput(values)),
    onSuccess: (row) => {
      toast.success("Modification enregistrée.");
      reset(settingsToValues(row));
      queryClient.setQueryData(queryKeys.settings, row);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  useUnsavedChangesGuard(isDirty && !save.isPending);

  const onSubmit = handleSubmit((values) => save.mutate(values));

  return (
    <>
      <PageHeader
        title="Paramètres"
        description={`Informations générales affichées sur le site public. Dernière modification : ${formatDateTime(settings.updated_at)}.`}
        actions={
          canManage ? (
            <Button icon={Save} loading={save.isPending} disabled={!isDirty} onClick={() => void onSubmit()}>
              Enregistrer
            </Button>
          ) : null
        }
      />
      {!canManage ? <ReadOnlyNotice text="Consultation seule : la modification des paramètres est réservée aux rôles habilités." /> : null}

      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <fieldset disabled={!canManage} className="min-w-0 space-y-6">
          <FormSection title="Identité">
            <Field label="Nom de l'entreprise" required error={errors.company_name?.message}>
              <Input {...register("company_name")} maxLength={160} />
            </Field>
            <Field label="Slogan" error={errors.tagline?.message}>
              <Input {...register("tagline")} maxLength={250} />
            </Field>
            <Field label="Présentation" error={errors.description?.message} counter={{ value: description.length, max: 2000 }}>
              <Textarea rows={4} {...register("description")} />
            </Field>
          </FormSection>

          <FormSection title="Coordonnées" description="Utilisées dans l'en-tête, le pied de page et la page Contact. Ne renseignez que des informations officielles.">
            <Field label="Adresse" error={errors.address?.message}>
              <Input icon={MapPin} {...register("address")} maxLength={300} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Téléphone principal" error={errors.phone_primary?.message}>
                <Input type="tel" icon={Phone} {...register("phone_primary")} />
              </Field>
              <Field label="Téléphone secondaire" error={errors.phone_secondary?.message}>
                <Input type="tel" icon={Phone} {...register("phone_secondary")} />
              </Field>
              <Field label="E-mail de contact" error={errors.email?.message} hint="Laisser vide tant qu'aucune adresse officielle n'est communiquée.">
                <Input type="email" icon={Mail} {...register("email")} />
              </Field>
              <Field label="Numéro WhatsApp" error={errors.whatsapp_number?.message}>
                <Input type="tel" icon={MessageCircle} {...register("whatsapp_number")} />
              </Field>
            </div>
            <Field label="Lien Google Maps" error={errors.map_url?.message} hint="Adresse https:// de la carte ou de l'itinéraire.">
              <Input type="url" {...register("map_url")} placeholder="https://maps.google.com/…" />
            </Field>
            <Field label="Horaires d'ouverture" error={errors.opening_hours?.message}>
              <Textarea rows={3} {...register("opening_hours")} placeholder={"Ex. Lundi – vendredi : 9 h – 18 h"} />
            </Field>
          </FormSection>
        </fieldset>

        <div className="min-w-0 space-y-6">
          <fieldset disabled={!canManage} className="space-y-6">
            <FormSection title="Logo">
              <Controller
                control={control}
                name="logo_path"
                render={({ field }) => <ImageField bucket="site-assets" folder="branding" value={field.value} onChange={field.onChange} disabled={!canManage} aspect="video" label="Logo" />}
              />
            </FormSection>
            <FormSection title="Favicon" description="Icône de l'onglet du navigateur (PNG, SVG ou ICO).">
              <Controller
                control={control}
                name="favicon_path"
                render={({ field }) => <ImageField bucket="site-assets" folder="branding" value={field.value} onChange={field.onChange} disabled={!canManage} aspect="square" label="Favicon" />}
              />
            </FormSection>
          </fieldset>
          <SocialLinksCard canManage={canManage} />
          <p className="flex items-center gap-2 px-1 text-xs text-subtle">
            <Clock className="size-3.5" aria-hidden />
            Les modifications sont visibles sur le site dès l'enregistrement.
          </p>
        </div>
      </form>
    </>
  );
}
