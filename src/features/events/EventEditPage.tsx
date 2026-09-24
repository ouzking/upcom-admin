import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { MapPin } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { ImageField } from "@/components/forms/ImageField";
import { MarkdownEditor } from "@/components/forms/MarkdownEditor";
import { SlugInput } from "@/components/forms/SlugInput";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { CONTENT_RESOURCES } from "@/config/resources";
import { eventsRepository, type EventInput } from "@/repositories/events.repository";
import type { EventRow } from "@/types";
import { EditorLayout, EditorStatus, FormSection } from "../content/EditorLayout";
import { useContentEditor, type ContentEditor } from "../content/useContentEditor";
import { useEditorSubmit } from "../content/useEditorSubmit";
import { useSlugSync } from "../content/useSlugSync";
import { emptyEvent, eventSchema, eventToInput, eventToValues, type EventFormValues } from "./event-form";

const resource = CONTENT_RESOURCES.events;

export default function EventEditPage() {
  const { id } = useParams();
  const editor = useContentEditor(resource, eventsRepository, id);
  if (!editor.isNew && !editor.item.data) {
    return <EditorStatus isLoading={editor.item.isLoading} error={editor.item.error} onRetry={() => void editor.item.refetch()} />;
  }
  return <EventForm key={editor.recordId} editor={editor} initial={editor.item.data} />;
}

function EventForm({ editor, initial }: { editor: ContentEditor<EventRow, EventInput>; initial?: EventRow }) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: initial ? eventToValues(initial) : emptyEvent,
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const [title, excerpt] = useWatch({ control, name: ["title", "excerpt"] });
  const { submit, currentStatus, isSaving, isDirty } = useEditorSubmit(editor, form, eventToInput, eventToValues);
  const slug = useSlugSync(form, "title", "slug", editor.isNew);

  return (
    <EditorLayout
      resource={resource}
      repository={eventsRepository}
      isNew={editor.isNew}
      recordId={editor.recordId}
      title={editor.isNew ? "Nouvel événement" : title}
      status={currentStatus}
      updatedAt={initial?.updated_at}
      canManage={editor.canManage}
      isSaving={isSaving}
      isDirty={isDirty}
      onSubmit={submit}
      main={
        <>
          <FormSection title="Événement">
            <Field label="Titre" required error={errors.title?.message}>
              <Input {...register("title")} maxLength={200} />
            </Field>
            <Field label="Slug (URL)" error={errors.slug?.message} hint="Laissez vide pour le générer automatiquement.">
              <SlugInput prefix="/evenements/" {...register("slug", { onChange: slug.onManualEdit })} />
            </Field>
            <Field label="Résumé" error={errors.excerpt?.message} counter={{ value: excerpt.length, max: 500 }}>
              <Textarea rows={3} {...register("excerpt")} />
            </Field>
          </FormSection>
          <FormSection title="Description">
            <Controller control={control} name="description" render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} />} />
          </FormSection>
        </>
      }
      aside={
        <>
          <FormSection title="Date et lieu">
            <Field label="Début" required error={errors.event_date?.message}>
              <Input type="datetime-local" {...register("event_date")} />
            </Field>
            <Field label="Fin" error={errors.end_date?.message} hint="Facultatif.">
              <Input type="datetime-local" {...register("end_date")} />
            </Field>
            <Field label="Lieu" error={errors.location?.message}>
              <Input icon={MapPin} {...register("location")} maxLength={250} placeholder="Ville, salle…" />
            </Field>
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Mettre en avant" disabled={!editor.canManage} />}
            />
          </FormSection>
          <FormSection title="Image">
            <Controller
              control={control}
              name="cover_image_path"
              render={({ field }) => (
                <ImageField bucket={resource.bucket} folder={editor.uploadFolder} value={field.value} onChange={field.onChange} disabled={!editor.canManage} label="Visuel de l'événement" />
              )}
            />
          </FormSection>
        </>
      }
    />
  );
}
