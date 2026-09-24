import { z } from "zod";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import type { EventInput } from "@/repositories/events.repository";
import type { EventRow } from "@/types";
import { nullable, optionalText, requiredText, slugField } from "../content/schemas";

export const eventSchema = z
  .object({
    title: requiredText("Le titre", 2, 200),
    slug: slugField,
    excerpt: optionalText(500),
    description: z.string(),
    location: optionalText(250),
    event_date: z.string().min(1, "La date de l'événement est requise.").refine((value) => fromDateTimeLocal(value) !== null, "Date invalide."),
    end_date: z.string().refine((value) => value === "" || fromDateTimeLocal(value) !== null, "Date invalide."),
    cover_image_path: z.string().nullable(),
    is_featured: z.boolean(),
  })
  // Miroir de la contrainte events_end_after_start.
  .refine((values) => !values.end_date || !values.event_date || new Date(values.end_date) >= new Date(values.event_date), {
    path: ["end_date"],
    message: "La date de fin doit être postérieure à la date de début.",
  });

export type EventFormValues = z.infer<typeof eventSchema>;

export const emptyEvent: EventFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  description: "",
  location: "",
  event_date: "",
  end_date: "",
  cover_image_path: null,
  is_featured: false,
};

export const eventToValues = (row: EventRow): EventFormValues => ({
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt ?? "",
  description: row.description ?? "",
  location: row.location ?? "",
  event_date: toDateTimeLocal(row.event_date),
  end_date: toDateTimeLocal(row.end_date),
  cover_image_path: row.cover_image_path,
  is_featured: row.is_featured,
});

export const eventToInput = (values: EventFormValues): EventInput => ({
  title: values.title.trim(),
  slug: values.slug.trim(),
  excerpt: nullable(values.excerpt),
  description: nullable(values.description),
  location: nullable(values.location),
  event_date: fromDateTimeLocal(values.event_date) as string,
  end_date: fromDateTimeLocal(values.end_date),
  cover_image_path: values.cover_image_path,
  is_featured: values.is_featured,
});
