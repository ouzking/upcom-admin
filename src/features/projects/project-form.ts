import { z } from "zod";
import type { GalleryItem, ProjectInput } from "@/repositories/projects.repository";
import type { ProjectImageRow, ProjectRow } from "@/types";
import { nullable, optionalText, orderField, requiredText, slugField } from "../content/schemas";

const currentYear = new Date().getFullYear();

export const projectSchema = z.object({
  title: requiredText("Le titre", 2, 160),
  slug: slugField,
  client_name: optionalText(160),
  category_id: z.string(),
  year: z
    .string()
    .trim()
    .refine((value) => value === "" || (/^\d{4}$/.test(value) && Number(value) >= 1990 && Number(value) <= 2100), "Année entre 1990 et 2100."),
  excerpt: optionalText(500),
  description: z.string(),
  cover_image_path: z.string().nullable(),
  gallery: z.array(
    z.object({
      id: z.string().optional(),
      image_path: z.string(),
      alt_text: z.string().max(250, "250 caractères maximum.").nullable(),
      caption: z.string().max(500, "500 caractères maximum.").nullable(),
    }),
  ),
  display_order: orderField,
  is_featured: z.boolean(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

export const emptyProject: ProjectFormValues = {
  title: "",
  slug: "",
  client_name: "",
  category_id: "",
  year: String(currentYear),
  excerpt: "",
  description: "",
  cover_image_path: null,
  gallery: [],
  display_order: 0,
  is_featured: false,
};

export const toGalleryItems = (images: ProjectImageRow[]): GalleryItem[] =>
  images.map((image) => ({ id: image.id, image_path: image.image_path, alt_text: image.alt_text, caption: image.caption }));

export const projectToValues = (row: ProjectRow, images: ProjectImageRow[] = []): ProjectFormValues => ({
  title: row.title,
  slug: row.slug,
  client_name: row.client_name ?? "",
  category_id: row.category_id ?? "",
  year: row.year ? String(row.year) : "",
  excerpt: row.excerpt ?? "",
  description: row.description ?? "",
  cover_image_path: row.cover_image_path,
  gallery: toGalleryItems(images),
  display_order: row.display_order,
  is_featured: row.is_featured,
});

/** La galerie n'est pas une colonne : elle est synchronisée séparément (project_images). */
export const projectToInput = (values: ProjectFormValues): ProjectInput => ({
  title: values.title.trim(),
  slug: values.slug.trim(),
  client_name: nullable(values.client_name),
  category_id: values.category_id || null,
  year: values.year ? Number(values.year) : null,
  excerpt: nullable(values.excerpt),
  description: nullable(values.description),
  cover_image_path: values.cover_image_path,
  display_order: values.display_order,
  is_featured: values.is_featured,
});
