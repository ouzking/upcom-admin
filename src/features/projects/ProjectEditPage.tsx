import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, type RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { Field } from "@/components/forms/Field";
import { GalleryField } from "@/components/forms/GalleryField";
import { ImageField } from "@/components/forms/ImageField";
import { MarkdownEditor } from "@/components/forms/MarkdownEditor";
import { SlugInput } from "@/components/forms/SlugInput";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { CONTENT_RESOURCES } from "@/config/resources";
import { queryKeys } from "@/lib/queryKeys";
import { listProjectImages, projectsRepository, syncProjectGallery, type GalleryItem, type ProjectInput } from "@/repositories/projects.repository";
import type { ProjectImageRow, ProjectRow } from "@/types";
import { EditorLayout, EditorStatus, FormSection } from "../content/EditorLayout";
import { useContentEditor, type ContentEditor } from "../content/useContentEditor";
import { useEditorSubmit } from "../content/useEditorSubmit";
import { useSlugSync } from "../content/useSlugSync";
import { useServiceCategories } from "../services/useServiceCategories";
import { emptyProject, projectSchema, projectToInput, projectToValues, type ProjectFormValues } from "./project-form";

const resource = CONTENT_RESOURCES.projects;

export default function ProjectEditPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  // La galerie (table project_images) est enregistrée juste après la réalisation (clé étrangère).
  const galleryRef = useRef<GalleryItem[]>([]);
  const savedImagesRef = useRef<ProjectImageRow[]>([]);
  const editor = useContentEditor(resource, projectsRepository, id, {
    afterSave: async (row) => {
      savedImagesRef.current = await syncProjectGallery(row.id, galleryRef.current);
      queryClient.setQueryData(queryKeys.projectImages(row.id), savedImagesRef.current);
    },
  });
  const images = useQuery({
    queryKey: queryKeys.projectImages(id ?? "new"),
    queryFn: () => listProjectImages(id as string),
    enabled: Boolean(id),
  });

  if (!editor.isNew && (!editor.item.data || !images.data)) {
    return (
      <EditorStatus
        isLoading={editor.item.isLoading || images.isLoading}
        error={editor.item.error ?? images.error}
        onRetry={() => {
          void editor.item.refetch();
          void images.refetch();
        }}
      />
    );
  }

  return (
    <ProjectForm
      key={editor.recordId}
      editor={editor}
      initial={editor.item.data}
      initialImages={images.data ?? []}
      galleryRef={galleryRef}
      savedImagesRef={savedImagesRef}
    />
  );
}

interface ProjectFormProps {
  editor: ContentEditor<ProjectRow, ProjectInput>;
  initial?: ProjectRow;
  initialImages: ProjectImageRow[];
  galleryRef: RefObject<GalleryItem[]>;
  savedImagesRef: RefObject<ProjectImageRow[]>;
}

function ProjectForm({ editor, initial, initialImages, galleryRef, savedImagesRef }: ProjectFormProps) {
  const categories = useServiceCategories();
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: initial ? projectToValues(initial, initialImages) : emptyProject,
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const [title, excerpt] = useWatch({ control, name: ["title", "excerpt"] });

  const toInput = (values: ProjectFormValues) => {
    galleryRef.current = values.gallery;
    return projectToInput(values);
  };
  // Galerie relue après synchronisation : les nouvelles images ont désormais un identifiant.
  const toValues = (row: ProjectRow) => projectToValues(row, savedImagesRef.current);
  const { submit, currentStatus, isSaving, isDirty } = useEditorSubmit(editor, form, toInput, toValues);
  const slug = useSlugSync(form, "title", "slug", editor.isNew);

  return (
    <EditorLayout
      resource={resource}
      repository={projectsRepository}
      isNew={editor.isNew}
      recordId={editor.recordId}
      title={editor.isNew ? "Nouvelle réalisation" : title}
      status={currentStatus}
      updatedAt={initial?.updated_at}
      canManage={editor.canManage}
      isSaving={isSaving}
      isDirty={isDirty}
      onSubmit={submit}
      main={
        <>
          <FormSection title="Projet">
            <Field label="Titre" required error={errors.title?.message}>
              <Input {...register("title")} maxLength={160} placeholder="Ex. Lancement de la marque …" />
            </Field>
            <Field label="Slug (URL)" error={errors.slug?.message} hint="Laissez vide pour le générer automatiquement.">
              <SlugInput prefix="/realisations/" {...register("slug", { onChange: slug.onManualEdit })} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Client" error={errors.client_name?.message}>
                <Input {...register("client_name")} maxLength={160} />
              </Field>
              <Field label="Année" error={errors.year?.message}>
                <Input inputMode="numeric" maxLength={4} {...register("year")} />
              </Field>
            </div>
            <Field label="Résumé" error={errors.excerpt?.message} counter={{ value: excerpt.length, max: 500 }} hint="Accroche affichée dans la grille du portfolio.">
              <Textarea rows={3} {...register("excerpt")} />
            </Field>
          </FormSection>
          <FormSection title="Description" description="Contexte, dispositif, résultats…">
            <Controller control={control} name="description" render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} />} />
          </FormSection>
          <FormSection title="Galerie" description="Glissez les images pour les réordonner. Renseignez un texte alternatif pour l'accessibilité.">
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => (
                <GalleryField bucket={resource.bucket} folder={`${editor.uploadFolder}/galerie`} value={field.value} onChange={field.onChange} disabled={!editor.canManage} />
              )}
            />
          </FormSection>
        </>
      }
      aside={
        <>
          <FormSection title="Classement">
            <Field label="Catégorie" error={errors.category_id?.message}>
              <Select {...register("category_id")}>
                <option value="">— Aucune —</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ordre d'affichage" error={errors.display_order?.message}>
              <Input type="number" step={1} {...register("display_order", { valueAsNumber: true })} />
            </Field>
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} label="Mettre en avant" description="Projet phare, affiché en priorité." disabled={!editor.canManage} />
              )}
            />
          </FormSection>
          <FormSection title="Image principale">
            <Controller
              control={control}
              name="cover_image_path"
              render={({ field }) => (
                <ImageField bucket={resource.bucket} folder={editor.uploadFolder} value={field.value} onChange={field.onChange} disabled={!editor.canManage} label="Image principale" />
              )}
            />
          </FormSection>
        </>
      }
    />
  );
}
