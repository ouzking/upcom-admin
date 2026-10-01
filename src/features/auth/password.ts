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

/**
 * Score 0 → 4. Les 4 règles obligatoires (alignées sur Supabase Auth) donnent au
 * mieux « Bon » ; la longueur (≥ 16) et un caractère spécial mènent à « Excellent ».
 */
export function passwordScore(value: string): number {
  if (!value) return 0;
  const rules = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  if (rules < 4) return rules <= 1 ? 1 : 2;
  const bonus = Number(value.length >= 16) + Number(/[^A-Za-z0-9]/.test(value));
  return bonus >= 1 ? 4 : 3;
}
