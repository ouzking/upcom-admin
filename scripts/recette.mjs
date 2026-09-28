#!/usr/bin/env node
/**
 * UPCOM ADMIN — recette automatisée des parcours du back-office.
 *
 *   npm run recette              → base LOCALE   (.env.local)
 *   npm run recette:prod         → base EN LIGNE (.env.production.local)
 *   … -- --invite adresse@…      → teste aussi l'invitation (envoie un VRAI e-mail en production)
 *
 * Rejoue les mêmes appels que l'interface, avec VOTRE session super_admin
 * (e-mail + mot de passe demandés dans le terminal, jamais stockés) : la RLS
 * s'applique. Tout ce qui est créé porte le préfixe [RECETTE] et est supprimé
 * à la fin, même en cas d'échec.
 *
 * Parcours : connexion / droits (get_my_access) / services, réalisation + galerie,
 * actualité, événement (créer, modifier, publier, supprimer) / upload dans le bon
 * bucket / demande de devis et message envoyés comme le site public (Edge Functions),
 * puis statut, attribution, note interne / invitation (option) / déconnexion.
 */
import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { buildStoragePath } from "@upcom/supabase";
import sharp from "sharp";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const siteOrigin = (process.env.RECETTE_ORIGIN ?? process.env.VITE_PUBLIC_SITE_URL ?? "https://www.upcomagency.com").replace(/\/+$/, "");
const inviteIndex = process.argv.indexOf("--invite");
const inviteEmail = inviteIndex > 0 ? process.argv[inviteIndex + 1] : null;
const PREFIX = "[RECETTE]";

if (!url || !key) die("VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont requis.");
if (key.startsWith("sb_secret_")) die("Clé secrète refusée : utilisez la clé publishable.");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const results = [];
const cleanup = [];

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

const ok = ({ data, error }, label) => {
  if (error) throw new Error(`${label} : ${error.code ?? error.statusCode ?? ""} ${error.message}`.trim());
  return data;
};
/** UPDATE / DELETE : la RLS filtre sans erreur → on exige une ligne affectée. */
const affected = (result, label) => {
  const data = ok(result, label);
  if (!data?.length) throw new Error(`${label} : aucune ligne modifiée (RLS ou élément absent)`);
  return data;
};

async function check(label, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ label, ok: true });
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""} (${Date.now() - started} ms)`);
  } catch (error) {
    results.push({ label, ok: false, error: error.message });
    console.log(`  ✖ ${label} — ${error.message}`);
  }
}

const image = (label) =>
  sharp({ create: { width: 1200, height: 800, channels: 3, background: "#013592" } })
    .composite([{ input: Buffer.from(`<svg width="1200" height="800"><circle cx="900" cy="250" r="180" fill="#FD8E03"/><text x="60" y="720" font-size="54" font-family="Arial" fill="#fff">${label}</text></svg>`) }])
    .webp({ quality: 80 })
    .toBuffer();

async function upload(bucket, folder, label) {
  const path = buildStoragePath(folder, "recette.webp");
  ok(await supabase.storage.from(bucket).upload(path, await image(label), { contentType: "image/webp" }), `upload ${bucket}`);
  cleanup.push(async () => supabase.storage.from(bucket).remove([path]));
  // Lisible publiquement (bucket public) ?
  const response = await fetch(`${url}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`);
  if (!response.ok) throw new Error(`image non accessible publiquement (${response.status})`);
  return path;
}

/** Cycle complet d'un contenu : créer (brouillon) → modifier → publier → visible publiquement → supprimer. */
async function contentCycle({ table, bucket, imageColumn, insert, update, titleColumn = "title" }) {
  const id = randomUUID();
  const path = await upload(bucket, `${bucket}/${id}`, `${PREFIX} ${table}`);
  cleanup.push(async () => supabase.from(table).delete().eq("id", id));
  const row = ok(await supabase.from(table).insert({ id, ...insert, [imageColumn]: path, status: "draft" }).select("*").single(), "création");
  if (table !== "team_members" && table !== "testimonials" && !row.slug) throw new Error("slug non généré");
  affected(await supabase.from(table).update(update).eq("id", id).select("id"), "modification");
  const hidden = ok(await anon.from(table).select("id").eq("id", id), "lecture visiteur (brouillon)");
  if (hidden.length) throw new Error("un brouillon est visible par les visiteurs");
  affected(await supabase.from(table).update({ status: "published" }).eq("id", id).select("id"), "publication");
  const visible = ok(await anon.from(table).select(`id, ${titleColumn}`).eq("id", id), "lecture visiteur (publié)");
  if (table !== "articles" && !visible.length) throw new Error("contenu publié invisible pour les visiteurs");
  affected(await supabase.from(table).update({ status: "archived" }).eq("id", id).select("id"), "archivage");
  affected(await supabase.from(table).delete().eq("id", id).select("id"), "suppression");
  return `slug « ${row.slug ?? "—"} », image ${bucket}/…`;
}

async function callFunction(name, body, { asUser = false } = {}) {
  const headers = { "Content-Type": "application/json", apikey: key, Origin: siteOrigin };
  if (asUser) headers.Authorization = `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`;
  const response = await fetch(`${url}/functions/v1/${name}`, { method: "POST", headers, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(`${name} → HTTP ${response.status} ${payload.error?.code ?? ""} ${payload.error?.message ?? ""}`.trim());
  return payload.data;
}

async function main() {
  console.log(`\nRecette UPCOM ADMIN — ${url}\nOrigine simulée du site public : ${siteOrigin}\n`);
  const email = process.env.RECETTE_EMAIL ?? (await ask("E-mail super_admin : "));
  const password = process.env.RECETTE_PASSWORD ?? (await ask("Mot de passe (masqué) : ", true));

  console.log("Authentification et droits");
  await check("Connexion e-mail / mot de passe", async () => {
    ok(await supabase.auth.signInWithPassword({ email, password }), "connexion");
  });
  if (!results.at(-1).ok) return;
  let me = null;
  await check("get_my_access (rôle et permissions)", async () => {
    const access = ok(await supabase.rpc("get_my_access").maybeSingle(), "get_my_access");
    if (!access) throw new Error("compte sans rôle actif");
    if (access.role !== "super_admin") throw new Error(`rôle ${access.role} : super_admin requis pour la recette complète`);
    me = (await supabase.auth.getUser()).data.user;
    return `${access.role}, ${access.permissions.length} permissions`;
  });
  await check("Refus RLS attendu pour un visiteur (devis illisibles)", async () => {
    const { data, error } = await anon.from("quote_requests").select("id").limit(1);
    if (!error && data?.length) throw new Error("des devis sont lisibles sans connexion !");
    return error ? `refusé (${error.code})` : "aucune ligne visible";
  });

  const categories = ok(await supabase.from("service_categories").select("id").limit(1), "catégories");

  console.log("\nContenus (créer, modifier, publier, archiver, supprimer) + upload");
  await check("Service", () =>
    contentCycle({
      table: "services",
      bucket: "services",
      imageColumn: "image_path",
      insert: { title: `${PREFIX} Service`, category_id: categories[0].id, short_description: "Recette automatique." },
      update: { short_description: "Recette automatique — modifié." },
    }),
  );
  await check("Réalisation + galerie (3 images)", async () => {
    const id = randomUUID();
    cleanup.push(async () => supabase.from("projects").delete().eq("id", id));
    ok(await supabase.from("projects").insert({ id, title: `${PREFIX} Réalisation`, client_name: "Client exemple", status: "draft" }), "création");
    const gallery = [];
    for (let n = 0; n < 3; n += 1) gallery.push({ project_id: id, image_path: await upload("projects", `projects/${id}/galerie`, `${PREFIX} ${n + 1}`), alt_text: `Image ${n + 1}`, display_order: n });
    ok(await supabase.from("project_images").insert(gallery), "galerie");
    affected(await supabase.from("project_images").update({ display_order: 9 }).eq("project_id", id).eq("display_order", 0).select("id"), "réordonnancement");
    affected(await supabase.from("projects").update({ status: "published" }).eq("id", id).select("id"), "publication");
    const publicImages = ok(await anon.from("project_images").select("id").eq("project_id", id), "galerie visiteur");
    if (publicImages.length !== 3) throw new Error(`galerie publique incomplète (${publicImages.length}/3)`);
    affected(await supabase.from("projects").delete().eq("id", id).select("id"), "suppression (galerie en cascade)");
    return "3 images, visibles une fois publiée";
  });
  await check("Actualité (publication datée automatiquement)", async () => {
    const detail = await contentCycle({
      table: "articles",
      bucket: "articles",
      imageColumn: "cover_image_path",
      insert: { title: `${PREFIX} Actualité`, excerpt: "Recette.", content: "## Test\n\nContenu." },
      update: { excerpt: "Recette — modifié." },
    });
    return detail;
  });
  await check("Événement", () =>
    contentCycle({
      table: "events",
      bucket: "events",
      imageColumn: "cover_image_path",
      insert: { title: `${PREFIX} Événement`, location: "Dakar", event_date: new Date(Date.now() + 7 * 864e5).toISOString() },
      update: { location: "Dakar — modifié" },
    }),
  );

  console.log("\nDemandes reçues depuis le site public (Edge Functions)");
  await check("Demande de devis → statut, attribution, note interne", async () => {
    const { id } = await callFunction("submit-quote-request", {
      name: `${PREFIX} Prospect`,
      email: "recette@example.com",
      message: "Demande envoyée par la recette automatique du back-office.",
      website: "",
    });
    cleanup.push(async () => supabase.from("quote_requests").delete().eq("id", id));
    const row = ok(await supabase.from("quote_requests").select("status").eq("id", id).single(), "lecture");
    if (row.status !== "new") throw new Error(`statut initial ${row.status}`);
    affected(await supabase.from("quote_requests").update({ status: "contacted", assigned_to: me.id, internal_notes: "Note de recette." }).eq("id", id).select("id"), "suivi");
    const denied = await supabase.from("quote_requests").update({ message: "altération" }).eq("id", id).select("id");
    if (!denied.error) throw new Error("le message du prospect a pu être modifié (devrait être immuable)");
    affected(await supabase.from("quote_requests").delete().eq("id", id).select("id"), "suppression");
    return "reçue, suivie ; contenu du prospect bien immuable";
  });
  await check("Message de contact → lu, note interne, archivage", async () => {
    const { id } = await callFunction("submit-contact-message", {
      name: `${PREFIX} Visiteur`,
      email: "recette@example.com",
      subject: "Recette",
      message: "Message envoyé par la recette automatique du back-office.",
      website: "",
    });
    cleanup.push(async () => supabase.from("contact_messages").delete().eq("id", id));
    affected(await supabase.from("contact_messages").update({ status: "read", internal_notes: "Note de recette." }).eq("id", id).select("id"), "lu + note");
    affected(await supabase.from("contact_messages").update({ status: "archived" }).eq("id", id).select("id"), "archivage");
    affected(await supabase.from("contact_messages").delete().eq("id", id).select("id"), "suppression");
    return "reçu et traité";
  });

  if (inviteEmail) {
    console.log("\nInvitation");
    await check(`Invitation de ${inviteEmail} (rôle editor)`, async () => {
      const data = await callFunction("admin-invite-user", { email: inviteEmail, full_name: `${PREFIX} Invité`, role: "editor" }, { asUser: true });
      return `compte créé (${data.user_id.slice(0, 8)}…) — vérifiez la réception de l'e-mail`;
    });
  } else {
    console.log("\nInvitation : non testée (ajoutez --invite adresse@… pour l'inclure).");
  }
}

try {
  await main();
} finally {
  // Nettoyage systématique, dans l'ordre inverse.
  for (const task of cleanup.reverse()) await task().catch(() => undefined);
  await supabase.auth.signOut().catch(() => undefined);
  const failed = results.filter((result) => !result.ok);
  console.log(`\n──────── ${results.length - failed.length}/${results.length} parcours réussis ────────`);
  for (const result of failed) console.log(`  ✖ ${result.label} : ${result.error}`);
  console.log("Déconnexion effectuée, éléments [RECETTE] supprimés.\n");
  process.exitCode = failed.length ? 1 : 0;
}
