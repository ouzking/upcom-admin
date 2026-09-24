import { z } from "zod";
import type { SiteSettingsRow, SiteSettingsUpdate } from "@/types";
import { emailField, httpsUrlField, nullable, optionalText, phoneField, requiredText } from "../content/schemas";

export const settingsSchema = z.object({
  company_name: requiredText("Le nom", 2, 160),
  tagline: optionalText(250),
  description: optionalText(2000),
  address: optionalText(300),
  phone_primary: phoneField,
  phone_secondary: phoneField,
  email: emailField,
  whatsapp_number: phoneField,
  map_url: httpsUrlField,
  opening_hours: optionalText(500),
  logo_path: z.string().nullable(),
  favicon_path: z.string().nullable(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const settingsToValues = (row: SiteSettingsRow): SettingsFormValues => ({
  company_name: row.company_name,
  tagline: row.tagline ?? "",
  description: row.description ?? "",
  address: row.address ?? "",
  phone_primary: row.phone_primary ?? "",
  phone_secondary: row.phone_secondary ?? "",
  email: row.email ?? "",
  whatsapp_number: row.whatsapp_number ?? "",
  map_url: row.map_url ?? "",
  opening_hours: row.opening_hours ?? "",
  logo_path: row.logo_path,
  favicon_path: row.favicon_path,
});

export const settingsToInput = (values: SettingsFormValues): Omit<SiteSettingsUpdate, "id" | "created_at" | "updated_at"> => ({
  company_name: values.company_name.trim(),
  tagline: nullable(values.tagline),
  description: nullable(values.description),
  address: nullable(values.address),
  phone_primary: nullable(values.phone_primary),
  phone_secondary: nullable(values.phone_secondary),
  email: nullable(values.email),
  whatsapp_number: nullable(values.whatsapp_number),
  map_url: nullable(values.map_url),
  opening_hours: nullable(values.opening_hours),
  logo_path: values.logo_path,
  favicon_path: values.favicon_path,
});
