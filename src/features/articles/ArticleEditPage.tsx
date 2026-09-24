import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { CalendarClock, Tags } from "lucide-react";
import { Field } from "@/components/forms/Field";
import { ImageField } from "@/components/forms/ImageField";
import { MarkdownEditor } from "@/components/forms/MarkdownEditor";
import { SlugInput } from "@/components/forms/SlugInput";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { CONTENT_RESOURCES } from "@/config/resources";
import { formatDateTime, fromDateTimeLocal } from "@/lib/format";
import { articlesRepository, type ArticleInput } from "@/repositories/articles.repository";
import type { ArticleRow } from "@/types";
import { EditorLayout, EditorStatus, FormSection } from "../content/EditorLayout";
import { useContentEditor, type ContentEditor } from "../content/useContentEditor";
import { useEditorSubmit } from "../content/useEditorSubmit";
import { useSlugSync } from "../content/useSlugSync";
import { articleSchema, articleToInput, articleToValues, emptyArticle, isScheduled, type ArticleFormValues } from "./article-form";
import { ArticleCategoriesModal } from "./ArticleCategoriesModal";
import { useArticleCategories } from "./useArticleCategories";

const resource = CONTENT_RESOURCES.articles;

export default function ArticleEditPage() {
  const { id } = useParams();
  const editor = useContentEditor(resource, articlesRepository, id);
  if (!editor.isNew && !editor.item.data) {
    return <EditorStatus isLoading={editor.item.isLoading} error={editor.item.error} onRetry={() => void editor.item.refetch()} />;
  }
  return <ArticleForm key={editor.recordId} editor={editor} initial={editor.item.data} />;
}

function ArticleForm({ editor, initial }: { editor: ContentEditor<ArticleRow, ArticleInput>; initial?: ArticleRow }) {
  const categories = useArticleCategories();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: initial ? articleToValues(initial) : emptyArticle,
  });
  const { register, control, formState } = form;
  const { errors } = formState;
  const [title, excerpt, publishedAtInput] = useWatch({ control, name: ["title", "excerpt", "published_at"] });
  const { submit, currentStatus, isSaving, isDirty } = useEditorSubmit(editor, form, articleToInput, articleToValues);
  const slug = useSlugSync(form, "title", "slug", editor.isNew);

  const publishedAt = fromDateTimeLocal(publishedAtInput);
  const future = publishedAt !== null && new Date(publishedAt) > new Date();

  return (
    <>
      <EditorLayout
        resource={resource}
        repository={articlesRepository}
        isNew={editor.isNew}
        recordId={editor.recordId}
        title={editor.isNew ? "Nouvel article" : title}
        status={currentStatus}
        scheduled={initial ? isScheduled(initial) : false}
        updatedAt={initial?.updated_at}
        canManage={editor.canManage}
        isSaving={isSaving}
        isDirty={isDirty}
        onSubmit={submit}
        main={
          <>
            <FormSection title="Article">
              <Field label="Titre" required error={errors.title?.message}>
                <Input {...register("title")} maxLength={200} className="text-base font-semibold" />
              </Field>
              <Field label="Slug (URL)" error={errors.slug?.message} hint="Laissez vide pour le générer automatiquement.">
                <SlugInput prefix="/actualites/" {...register("slug", { onChange: slug.onManualEdit })} />
              </Field>
              <Field label="Résumé" error={errors.excerpt?.message} counter={{ value: excerpt.length, max: 500 }} hint="Chapô affiché dans la liste des actualités et pour le référencement.">
                <Textarea rows={3} {...register("excerpt")} />
              </Field>
            </FormSection>
            <FormSection title="Contenu">
              <Controller
                control={control}
                name="content"
                render={({ field }) => <MarkdownEditor value={field.value} onChange={field.onChange} rows={20} placeholder="Rédigez votre article…" />}
              />
            </FormSection>
          </>
        }
        aside={
          <>
            <FormSection title="Publication">
              <Field
                label="Date de publication"
                error={errors.published_at?.message}
                hint={
                  future
                    ? "Date future : l'article sera visible sur le site à cette date une fois publié."
                    : "Vide : renseignée automatiquement lors de la publication."
                }
              >
                <Input type="datetime-local" {...register("published_at")} />
              </Field>
              {currentStatus === "published" && future && publishedAt ? (
                <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[13px] font-medium text-brand">
                  <CalendarClock className="size-4 shrink-0" aria-hidden />
                  Programmé pour le {formatDateTime(publishedAt)}
                </p>
              ) : null}
              <Field label="Signature" error={errors.author_name?.message} hint="Nom affiché publiquement (ex. « Équipe UPCOM »).">
                <Input {...register("author_name")} maxLength={120} />
              </Field>
              <Controller
                control={control}
                name="is_featured"
                render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="À la une" description="Mis en avant sur le site." disabled={!editor.canManage} />}
              />
            </FormSection>
            <FormSection
              title="Catégorie"
              actions={
                editor.canManage ? (
                  <button type="button" onClick={() => setCategoriesOpen(true)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-bright hover:underline">
                    <Tags className="size-3.5" aria-hidden /> Gérer
                  </button>
                ) : null
              }
            >
              <Field label="Catégorie" error={errors.category_id?.message}>
                <Select {...register("category_id")}>
                  <option value="">— Sans catégorie —</option>
                  {categories.data?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormSection>
            <FormSection title="Image de couverture">
              <Controller
                control={control}
                name="cover_image_path"
                render={({ field }) => (
                  <ImageField bucket={resource.bucket} folder={editor.uploadFolder} value={field.value} onChange={field.onChange} disabled={!editor.canManage} label="Image de couverture" />
                )}
              />
            </FormSection>
          </>
        }
      />
      <ArticleCategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </>
  );
}
