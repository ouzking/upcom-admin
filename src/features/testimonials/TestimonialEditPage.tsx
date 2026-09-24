import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { Field } from "@/components/forms/Field";
import { ImageField } from "@/components/forms/ImageField";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { CONTENT_RESOURCES } from "@/config/resources";
import { testimonialsRepository, type TestimonialInput } from "@/repositories/testimonials.repository";
import type { TestimonialRow } from "@/types";
import { EditorLayout, EditorStatus, FormSection } from "../content/EditorLayout";
import { useContentEditor, type ContentEditor } from "../content/useContentEditor";
import { useEditorSubmit } from "../content/useEditorSubmit";
import { emptyTestimonial, testimonialSchema, testimonialToInput, testimonialToValues, type TestimonialFormValues } from "./testimonial-form";

const resource = CONTENT_RESOURCES.testimonials;

export default function TestimonialEditPage() {
  const { id } = useParams();
  const editor = useContentEditor(resource, testimonialsRepository, id);
  if (!editor.isNew && !editor.item.data) {
    return <EditorStatus isLoading={editor.item.isLoading} error={editor.item.error} onRetry={() => void editor.item.refetch()} />;
  }
  return <TestimonialForm key={editor.recordId} editor={editor} initial={editor.item.data} />;
}

function TestimonialForm({ editor, initial }: { editor: ContentEditor<TestimonialRow, TestimonialInput>; initial?: TestimonialRow }) {
  const form = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: initial ? testimonialToValues(initial) : emptyTestimonial,
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const [name, content] = useWatch({ control, name: ["name", "content"] });
  const { submit, currentStatus, isSaving, isDirty } = useEditorSubmit(editor, form, testimonialToInput, testimonialToValues);

  return (
    <EditorLayout
      resource={resource}
      repository={testimonialsRepository}
      isNew={editor.isNew}
      recordId={editor.recordId}
      title={editor.isNew ? "Nouveau témoignage" : name}
      status={currentStatus}
      updatedAt={initial?.updated_at}
      canManage={editor.canManage}
      isSaving={isSaving}
      isDirty={isDirty}
      onSubmit={submit}
      main={
        <FormSection title="Témoignage">
          <Field label="Témoignage" required error={errors.content?.message} counter={{ value: content.length, max: 2000 }}>
            <Textarea rows={7} {...register("content")} placeholder="Citation exacte, validée par son auteur." />
          </Field>
          <Field label="Nom" required error={errors.name?.message}>
            <Input {...register("name")} maxLength={120} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Fonction" error={errors.role?.message}>
              <Input {...register("role")} maxLength={120} placeholder="Ex. Directrice marketing" />
            </Field>
            <Field label="Entreprise" error={errors.company?.message}>
              <Input {...register("company")} maxLength={160} />
            </Field>
          </div>
        </FormSection>
      }
      aside={
        <>
          <FormSection title="Affichage">
            <Field label="Ordre d'affichage" error={errors.display_order?.message}>
              <Input type="number" step={1} {...register("display_order", { valueAsNumber: true })} />
            </Field>
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Mettre en avant" disabled={!editor.canManage} />}
            />
          </FormSection>
          <FormSection title="Photo">
            <Controller
              control={control}
              name="photo_path"
              render={({ field }) => (
                <ImageField bucket={resource.bucket} folder={editor.uploadFolder} value={field.value} onChange={field.onChange} disabled={!editor.canManage} aspect="square" label="Photo" />
              )}
            />
          </FormSection>
        </>
      }
    />
  );
}
