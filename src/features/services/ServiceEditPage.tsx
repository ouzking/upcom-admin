import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { Field } from "@/components/forms/Field";
import { IconPicker } from "@/components/forms/IconPicker";
import { ImageField } from "@/components/forms/ImageField";
import { MarkdownEditor } from "@/components/forms/MarkdownEditor";
import { SlugInput } from "@/components/forms/SlugInput";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { CONTENT_RESOURCES } from "@/config/resources";
import { servicesRepository, type ServiceInput } from "@/repositories/services.repository";
import type { ServiceRow } from "@/types";
import { EditorLayout, EditorStatus, FormSection } from "../content/EditorLayout";
import { useContentEditor, type ContentEditor } from "../content/useContentEditor";
import { useEditorSubmit } from "../content/useEditorSubmit";
import { useSlugSync } from "../content/useSlugSync";
import { emptyService, serviceSchema, serviceToInput, serviceToValues, type ServiceFormValues } from "./service-form";
import { useServiceCategories } from "./useServiceCategories";

const resource = CONTENT_RESOURCES.services;

export default function ServiceEditPage() {
  const { id } = useParams();
  const editor = useContentEditor(resource, servicesRepository, id);
  if (!editor.isNew && !editor.item.data) {
    return <EditorStatus isLoading={editor.item.isLoading} error={editor.item.error} onRetry={() => void editor.item.refetch()} />;
  }
  return <ServiceForm key={editor.recordId} editor={editor} initial={editor.item.data} />;
}

function ServiceForm({ editor, initial }: { editor: ContentEditor<ServiceRow, ServiceInput>; initial?: ServiceRow }) {
  const categories = useServiceCategories();
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: initial ? serviceToValues(initial) : emptyService,
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const [title, shortDescription] = useWatch({ control, name: ["title", "short_description"] });
  const { submit, currentStatus, isSaving, isDirty } = useEditorSubmit(editor, form, serviceToInput, serviceToValues);
  const slug = useSlugSync(form, "title", "slug", editor.isNew);

  return (
    <EditorLayout
      resource={resource}
      repository={servicesRepository}
      isNew={editor.isNew}
      recordId={editor.recordId}
      title={editor.isNew ? "Nouveau service" : title}
      status={currentStatus}
      updatedAt={initial?.updated_at}
      canManage={editor.canManage}
      isSaving={isSaving}
      isDirty={isDirty}
      onSubmit={submit}
      main={
        <>
          <FormSection title="Informations principales">
            <Field label="Titre" required error={errors.title?.message}>
              <Input {...register("title")} placeholder="Ex. Stratégie de communication" maxLength={160} />
            </Field>
            <Field label="Slug (URL)" error={errors.slug?.message} hint="Laissez vide pour le générer automatiquement à partir du titre.">
              <SlugInput prefix="/services/…/" {...register("slug", { onChange: slug.onManualEdit })} />
            </Field>
            <Field label="Description courte" error={errors.short_description?.message} counter={{ value: shortDescription.length, max: 500 }} hint="Affichée dans les listes et cartes de services.">
              <Textarea rows={3} {...register("short_description")} />
            </Field>
          </FormSection>
          <FormSection title="Description complète" description="Titres, listes, liens et vidéos sont pris en charge.">
            <Controller
              control={control}
              name="description"
              render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} placeholder="Présentez le service en détail…" />}
            />
          </FormSection>
        </>
      }
      aside={
        <>
          <FormSection title="Classement">
            <Field label="Catégorie" required error={errors.category_id?.message}>
              <Select {...register("category_id")}>
                <option value="">— Choisir un pôle —</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ordre d'affichage" error={errors.display_order?.message} hint="Les plus petits nombres apparaissent en premier.">
              <Input type="number" step={1} {...register("display_order", { valueAsNumber: true })} />
            </Field>
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} label="Mettre en avant" description="Mis en valeur sur la page d'accueil." disabled={!editor.canManage} />
              )}
            />
          </FormSection>
          <FormSection title="Image">
            <Controller
              control={control}
              name="image_path"
              render={({ field }) => (
                <ImageField bucket={resource.bucket} folder={editor.uploadFolder} value={field.value} onChange={field.onChange} disabled={!editor.canManage} label="Image du service" />
              )}
            />
          </FormSection>
          <FormSection title="Icône" description="Pictogramme affiché avec le service sur le site.">
            <Controller control={control} name="icon" render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} disabled={!editor.canManage} />} />
          </FormSection>
        </>
      }
    />
  );
}
