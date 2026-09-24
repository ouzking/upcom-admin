import { z } from "zod";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import type { ArticleInput } from "@/repositories/articles.repository";
import type { ArticleRow } from "@/types";
import { nullable, optionalText, requiredText, slugField } from "../content/schemas";

export const articleSchema = z.object({
  title: requiredText("Le titre", 2, 200),
  slug: slugField,
  excerpt: optionalText(500),
  content: z.string(),
  cover_image_path: z.string().nullable(),
  category_id: z.string(),
  author_name: optionalText(120),
  published_at: z.string().refine((value) => value === "" || fromDateTimeLocal(value) !== null, "Date invalide."),
  is_featured: z.boolean(),
});

export type ArticleFormValues = z.infer<typeof articleSchema>;

export const emptyArticle: ArticleFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_path: null,
  category_id: "",
  author_name: "Équipe UPCOM",
  published_at: "",
  is_featured: false,
};

export const articleToValues = (row: ArticleRow): ArticleFormValues => ({
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt ?? "",
  content: row.content ?? "",
  cover_image_path: row.cover_image_path,
  category_id: row.category_id ?? "",
  author_name: row.author_name ?? "",
  published_at: toDateTimeLocal(row.published_at),
  is_featured: row.is_featured,
});

/**
 * `published_at` vide : la base le renseigne à la publication (trigger).
 * Une date future programme la publication (invisible publiquement d'ici là).
 */
export const articleToInput = (values: ArticleFormValues): ArticleInput => ({
  title: values.title.trim(),
  slug: values.slug.trim(),
  excerpt: nullable(values.excerpt),
  content: nullable(values.content),
  cover_image_path: values.cover_image_path,
  category_id: values.category_id || null,
  author_name: nullable(values.author_name),
  published_at: fromDateTimeLocal(values.published_at),
  is_featured: values.is_featured,
});

export const isScheduled = (row: Pick<ArticleRow, "status" | "published_at">, now: Date = new Date()): boolean =>
  row.status === "published" && Boolean(row.published_at) && new Date(row.published_at as string) > now;
