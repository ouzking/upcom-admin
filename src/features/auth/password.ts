import { z } from "zod";

/** Politique alignée sur la configuration Auth du backend (≥ 12 caractères, minuscules, majuscules, chiffres). */
export const passwordSchema = z
  .string()
  .min(12, "Au moins 12 caractères.")
  .regex(/[a-z]/, "Au moins une lettre minuscule.")
  .regex(/[A-Z]/, "Au moins une lettre majuscule.")
  .regex(/[0-9]/, "Au moins un chiffre.");

export const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: "12 caractères minimum", test: (value) => value.length >= 12 },
  { label: "Une minuscule", test: (value) => /[a-z]/.test(value) },
  { label: "Une majuscule", test: (value) => /[A-Z]/.test(value) },
  { label: "Un chiffre", test: (value) => /[0-9]/.test(value) },
];
