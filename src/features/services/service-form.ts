import { z } from "zod";
import type { ServiceInput } from "@/repositories/services.repository";
import type { ServiceRow } from "@/types";
import { nullable, optionalText, orderField, requiredText, slugField } from "../content/schemas";

export const serviceSchema = z.object({
  title: requiredText("Le titre", 2, 160),
  slug: slugField,
  category_id: z.string().min(1, "Choisissez une catégorie."),
  short_description: optionalText(500),
  description: z.string(),
  image_path: z.string().nullable(),
  icon: z.string().nullable(),
  display_order: orderField,
  is_featured: z.boolean(),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const emptyService: ServiceFormValues = {
  title: "",
  slug: "",
  category_id: "",
  short_description: "",
  description: "",
  image_path: null,
  icon: null,
  display_order: 0,
  is_featured: false,
};

export const serviceToValues = (row: ServiceRow): ServiceFormValues => ({
  title: row.title,
  slug: row.slug,
  category_id: row.category_id,
  short_description: row.short_description ?? "",
  description: row.description ?? "",
  image_path: row.image_path,
  icon: row.icon,
  display_order: row.display_order,
  is_featured: row.is_featured,
});

export const serviceToInput = (values: ServiceFormValues): ServiceInput => ({
  title: values.title.trim(),
  // Vide : la base génère un slug unique à partir du titre.
  slug: values.slug.trim(),
  category_id: values.category_id,
  short_description: nullable(values.short_description),
  description: nullable(values.description),
  image_path: values.image_path,
  icon: values.icon,
  display_order: values.display_order,
  is_featured: values.is_featured,
});
