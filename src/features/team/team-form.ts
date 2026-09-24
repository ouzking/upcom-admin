import { z } from "zod";
import type { TeamMemberInput } from "@/repositories/team.repository";
import type { TeamMemberRow } from "@/types";
import { emailField, nullable, optionalText, orderField, phoneField, requiredText } from "../content/schemas";

export const teamSchema = z.object({
  name: requiredText("Le nom", 2, 120),
  position: requiredText("La fonction", 2, 120),
  biography: optionalText(3000),
  photo_path: z.string().nullable(),
  email: emailField,
  phone: phoneField,
  linkedin_url: z
    .string()
    .trim()
    .refine((value) => value === "" || /^https:\/\/([a-z0-9-]+\.)?linkedin\.com\//i.test(value), "Adresse LinkedIn attendue (https://www.linkedin.com/in/…)."),
  display_order: orderField,
});

export type TeamFormValues = z.infer<typeof teamSchema>;

export const emptyTeamMember: TeamFormValues = {
  name: "",
  position: "",
  biography: "",
  photo_path: null,
  email: "",
  phone: "",
  linkedin_url: "",
  display_order: 0,
};

export const teamToValues = (row: TeamMemberRow): TeamFormValues => ({
  name: row.name,
  position: row.position,
  biography: row.biography ?? "",
  photo_path: row.photo_path,
  email: row.email ?? "",
  phone: row.phone ?? "",
  linkedin_url: row.linkedin_url ?? "",
  display_order: row.display_order,
});

export const teamToInput = (values: TeamFormValues): TeamMemberInput => ({
  name: values.name.trim(),
  position: values.position.trim(),
  biography: nullable(values.biography),
  photo_path: values.photo_path,
  email: nullable(values.email),
  phone: nullable(values.phone),
  linkedin_url: nullable(values.linkedin_url),
  display_order: values.display_order,
});
