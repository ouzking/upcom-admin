import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { Link2, Mail, Phone, ShieldAlert } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { ImageField } from "@/components/forms/ImageField";
import { Input, Textarea } from "@/components/ui/Input";
import { CONTENT_RESOURCES } from "@/config/resources";
import { teamRepository, type TeamMemberInput } from "@/repositories/team.repository";
import type { TeamMemberRow } from "@/types";
import { EditorLayout, EditorStatus, FormSection } from "../content/EditorLayout";
import { useContentEditor, type ContentEditor } from "../content/useContentEditor";
import { useEditorSubmit } from "../content/useEditorSubmit";
import { emptyTeamMember, teamSchema, teamToInput, teamToValues, type TeamFormValues } from "./team-form";

const resource = CONTENT_RESOURCES.team_members;

export default function TeamMemberEditPage() {
  const { id } = useParams();
  const editor = useContentEditor(resource, teamRepository, id);
  if (!editor.isNew && !editor.item.data) {
    return <EditorStatus isLoading={editor.item.isLoading} error={editor.item.error} onRetry={() => void editor.item.refetch()} />;
  }
  return <TeamMemberForm key={editor.recordId} editor={editor} initial={editor.item.data} />;
}

function TeamMemberForm({ editor, initial }: { editor: ContentEditor<TeamMemberRow, TeamMemberInput>; initial?: TeamMemberRow }) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: initial ? teamToValues(initial) : emptyTeamMember,
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const [name, biography] = useWatch({ control, name: ["name", "biography"] });
  const { submit, currentStatus, isSaving, isDirty } = useEditorSubmit(editor, form, teamToInput, teamToValues);

  return (
    <EditorLayout
      resource={resource}
      repository={teamRepository}
      isNew={editor.isNew}
      recordId={editor.recordId}
      title={editor.isNew ? "Nouveau membre" : name}
      status={currentStatus}
      updatedAt={initial?.updated_at}
      canManage={editor.canManage}
      isSaving={isSaving}
      isDirty={isDirty}
      onSubmit={submit}
      main={
        <>
          <FormSection title="Identité">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nom" required error={errors.name?.message}>
                <Input {...register("name")} maxLength={120} autoComplete="off" />
              </Field>
              <Field label="Fonction" required error={errors.position?.message}>
                <Input {...register("position")} maxLength={120} />
              </Field>
            </div>
            <Field label="Biographie" error={errors.biography?.message} counter={{ value: biography.length, max: 3000 }}>
              <Textarea rows={7} {...register("biography")} />
            </Field>
          </FormSection>
          <FormSection title="Coordonnées et réseaux" description="Informations visibles publiquement si le membre est publié.">
            <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-50 px-4 py-3 text-[13px] text-ink-soft">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <p>
                N'indiquez que des coordonnées <strong>professionnelles</strong> fournies et validées par UPCOM. Aucune coordonnée personnelle ne doit être
                publiée.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="E-mail professionnel" error={errors.email?.message}>
                <Input type="email" icon={Mail} {...register("email")} autoComplete="off" />
              </Field>
              <Field label="Téléphone professionnel" error={errors.phone?.message}>
                <Input type="tel" icon={Phone} {...register("phone")} autoComplete="off" />
              </Field>
            </div>
            <Field label="LinkedIn" error={errors.linkedin_url?.message}>
              <Input type="url" icon={Link2} placeholder="https://www.linkedin.com/in/…" {...register("linkedin_url")} />
            </Field>
          </FormSection>
        </>
      }
      aside={
        <>
          <FormSection title="Photo">
            <Controller
              control={control}
              name="photo_path"
              render={({ field }) => (
                <ImageField bucket={resource.bucket} folder={editor.uploadFolder} value={field.value} onChange={field.onChange} disabled={!editor.canManage} aspect="portrait" label="Photo" />
              )}
            />
          </FormSection>
          <FormSection title="Affichage">
            <Field label="Ordre d'affichage" error={errors.display_order?.message} hint="Les plus petits nombres apparaissent en premier.">
              <Input type="number" step={1} {...register("display_order", { valueAsNumber: true })} />
            </Field>
          </FormSection>
        </>
      }
    />
  );
}
