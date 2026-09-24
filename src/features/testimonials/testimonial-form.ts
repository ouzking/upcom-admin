import { z } from "zod";
import type { TestimonialInput } from "@/repositories/testimonials.repository";
import type { TestimonialRow } from "@/types";
import { nullable, optionalText, orderField, requiredText } from "../content/schemas";

export const testimonialSchema = z.object({
  name: requiredText("Le nom", 2, 120),
  company: optionalText(160),
  role: optionalText(120),
  content: requiredText("Le témoignage", 10, 2000),
  photo_path: z.string().nullable(),
  display_order: orderField,
  is_featured: z.boolean(),
});

export type TestimonialFormValues = z.infer<typeof testimonialSchema>;

export const emptyTestimonial: TestimonialFormValues = {
  name: "",
  company: "",
  role: "",
  content: "",
  photo_path: null,
  display_order: 0,
  is_featured: false,
};

export const testimonialToValues = (row: TestimonialRow): TestimonialFormValues => ({
  name: row.name,
  company: row.company ?? "",
  role: row.role ?? "",
  content: row.content,
  photo_path: row.photo_path,
  display_order: row.display_order,
  is_featured: row.is_featured,
});

export const testimonialToInput = (values: TestimonialFormValues): TestimonialInput => ({
  name: values.name.trim(),
  company: nullable(values.company),
  role: nullable(values.role),
  content: values.content.trim(),
  photo_path: values.photo_path,
  display_order: values.display_order,
  is_featured: values.is_featured,
});
