import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/format";

/**
 * Règles de validation alignées sur les contraintes CHECK du schéma PostgreSQL
 * (longueurs, formats). La base reste l'autorité : ces règles donnent seulement
 * un retour immédiat et lisible.
 */
export const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requis.`)
    .min(min, `${label} doit contenir au moins ${min} caractères.`)
    .max(max, `${max} caractères maximum.`);

export const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, "200 caractères maximum.")
  .refine((value) => value === "" || SLUG_PATTERN.test(value), "Lettres minuscules, chiffres et tirets uniquement (ex. mon-contenu).");

export const orderField = z
  .number({ error: "Indiquez un nombre." })
  .int("Nombre entier attendu.")
  .min(-9999, "Valeur trop petite.")
  .max(9999, "Valeur trop grande.");

export const emailField = z
  .string()
  .trim()
  .max(254, "254 caractères maximum.")
  .refine((value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), "Adresse e-mail invalide.");

export const phoneField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\+?[0-9 ().-]{6,30}$/.test(value), "Numéro invalide (chiffres, espaces, +, - ou parenthèses).");

export const httpsUrlField = z
  .string()
  .trim()
  .max(500, "500 caractères maximum.")
  .refine((value) => value === "" || /^https:\/\//i.test(value), "L'adresse doit commencer par https://.");

/** "" → null pour les colonnes facultatives. */
export const nullable = (value: string): string | null => (value.trim() ? value.trim() : null);
