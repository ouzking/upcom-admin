#!/usr/bin/env node
/**
 * UPCOM — cache long des images déjà en ligne.
 *
 *   npm run media:cache:prod            → aperçu (rien n'est modifié)
 *   npm run media:cache:prod -- --apply → applique
 *
 * Les chemins d'images sont uniques et jamais réutilisés pour un autre contenu
 * (`<bucket>/<id>/<horodatage>-<nom>.webp`) : un cache navigateur / CDN d'un an
 * est donc sans risque. Les fichiers envoyés avant la v0.2.0 de l'admin (scripts)
 * ont un cache d'une heure ; ce script les ré-enregistre À L'IDENTIQUE (même
 * contenu, même chemin, même type) avec `Cache-Control: max-age=31536000`.
 *
 * Connexion avec votre compte super_admin (identifiants demandés dans le terminal) :
 * la RLS s'applique, aucune clé secrète n'est utilisée.
 */
import { stdin, stdout } from "node:process";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const ONE_YEAR = "31536000";
const BUCKETS = ["site-assets", "services", "projects", "team", "articles", "events", "testimonials"];

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) die("VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont requis.");
if (key.startsWith("sb_secret_")) die("Clé secrète refusée : utilisez la clé publishable.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
    if (hidden) rl._writeToOutput = (text) => text.includes(question) && stdout.write(question);
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

/** Parcourt un bucket (dossiers virtuels compris). */
async function listAll(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix} : ${error.message}`);
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.name === ".emptyFolderPlaceholder") continue;
      if (!item.id) files.push(...(await listAll(bucket, path)));
      else files.push({ path, cacheControl: item.metadata?.cacheControl ?? "", mimetype: item.metadata?.mimetype ?? "application/octet-stream" });
    }
    if ((data ?? []).length < 1000) break;
  }
  return files;
}

const email = process.env.SEED_EMAIL ?? (await ask("E-mail du compte super_admin : "));
const password = process.env.SEED_PASSWORD ?? (await ask("Mot de passe (masqué) : ", true));
const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
if (loginError) die(`Connexion refusée : ${loginError.message}`);
const { data: access } = await supabase.rpc("get_my_access").maybeSingle();
if (access?.role !== "super_admin") die("Un compte super_admin est requis.");

console.log(`\nCache des images — ${APPLY ? "APPLICATION" : "APERÇU (ajoutez --apply)"}\n`);
let toFix = 0;
let fixed = 0;
const failures = [];
for (const bucket of BUCKETS) {
  const files = await listAll(bucket);
  const stale = files.filter((file) => !file.cacheControl.includes(ONE_YEAR));
  toFix += stale.length;
  console.log(`  ${bucket.padEnd(14)} ${files.length} fichier(s), ${stale.length} à passer en cache long`);
  if (!APPLY) continue;
  for (const file of stale) {
    const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(file.path);
    if (downloadError || !blob) {
      failures.push(`${bucket}/${file.path} : téléchargement impossible`);
      continue;
    }
    const { error } = await supabase.storage.from(bucket).upload(file.path, blob, { contentType: file.mimetype, cacheControl: ONE_YEAR, upsert: true });
    if (error) failures.push(`${bucket}/${file.path} : ${error.message}`);
    else fixed += 1;
  }
}
await supabase.auth.signOut();

if (!APPLY) console.log(`\n${toFix} fichier(s) à mettre à jour. Relancez avec --apply pour appliquer.\n`);
else {
  console.log(`\n✓ ${fixed}/${toFix} fichier(s) passés en cache d'un an.`);
  for (const failure of failures) console.log(`  ✖ ${failure}`);
  console.log("");
  process.exitCode = failures.length ? 1 : 0;
}
