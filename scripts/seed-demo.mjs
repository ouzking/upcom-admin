#!/usr/bin/env node
/**
 * UPCOM ADMIN — contenu d'exemple pour présenter le site au client.
 *
 *   npm run seed:demo            → base LOCALE   (.env.local)
 *   npm run seed:demo:prod       → base EN LIGNE (.env.production.local)
 *   … -- --remove                → supprime le contenu d'exemple créé par ce script
 *
 * Règles :
 *  - Connexion avec VOTRE compte super_admin (e-mail + mot de passe demandés dans le terminal).
 *    Aucune clé service_role / sb_secret : la RLS s'applique comme dans le back-office.
 *  - Tout est clairement marqué comme exemple (« Contenu d'exemple — à remplacer »,
 *    « Client exemple », « Membre de l'équipe ») : aucune fausse information présentée comme réelle.
 *  - Slugs générés par la base ; images = illustrations générées aux couleurs UPCOM,
 *    stockées par CHEMIN via buildStoragePath().
 *  - Réseaux sociaux : rien n'est créé.
 */
import { randomUUID } from "node:crypto";
import { stdin, stdout } from "node:process";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { buildStoragePath } from "@upcom/supabase";
import sharp from "sharp";

const MARKER = "Contenu d'exemple — à remplacer";
const CLIENT = "Client exemple";
const MEMBER = "Membre de l'équipe";
const REMOVE = process.argv.includes("--remove");

const url = process.env.SEED_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SEED_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) fail("VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY sont requis (fichier .env.local ou .env.production.local).");
if (/^sb_secret_/.test(key) || /service_role/.test(decodeJwtRole(key))) fail("Clé secrète refusée : utilisez la clé publishable / anon.");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const problems = [];
const created = {};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function decodeJwtRole(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()).role ?? "";
  } catch {
    return "";
  }
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (text) => {
        if (text.includes(question)) stdout.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

function count(domain) {
  created[domain] = (created[domain] ?? 0) + 1;
}

async function step(label, fn) {
  try {
    return await fn();
  } catch (error) {
    const message = error?.message ?? String(error);
    problems.push(`${label} : ${message}`);
    console.log(`   ✖ ${label} — ${message}`);
    return null;
  }
}

function check({ data, error }, label) {
  if (error) throw new Error(`${label} (${error.code ?? error.statusCode ?? "erreur"}) ${error.message}`);
  return data;
}

const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Illustration abstraite aux couleurs UPCOM (bleu #013592 → #0172E7, accents orange). */
async function illustration({ width, height, title, seed, kind = "cover" }) {
  const rand = mulberry32(seed);
  const circles = Array.from({ length: 5 }, () => {
    const r = (0.08 + rand() * 0.25) * Math.min(width, height);
    const cx = rand() * width;
    const cy = rand() * height;
    const orange = rand() > 0.55;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${orange ? "url(#o)" : "#ffffff"}" fill-opacity="${orange ? 0.85 : 0.07}"/>`;
  }).join("");
  const avatar =
    kind === "avatar"
      ? `<circle cx="${width / 2}" cy="${height * 0.4}" r="${width * 0.17}" fill="#ffffff" fill-opacity="0.9"/>
         <path d="M ${width * 0.2} ${height} Q ${width / 2} ${height * 0.45} ${width * 0.8} ${height} Z" fill="#ffffff" fill-opacity="0.9"/>`
      : "";
  const label =
    kind === "avatar"
      ? ""
      : `<text x="${width * 0.06}" y="${height * 0.86}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(height * 0.055)}" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
         <text x="${width * 0.06}" y="${height * 0.93}" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(height * 0.032)}" fill="#ffffff" fill-opacity="0.75">Visuel d'exemple — à remplacer</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#013592"/><stop offset="1" stop-color="#0172E7"/></linearGradient>
      <linearGradient id="o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EB4602"/><stop offset="1" stop-color="#FD8E03"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#b)"/>${circles}${avatar}${label}
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let imageSeed = 1;
/** Génère puis téléverse une image ; renvoie son CHEMIN dans le bucket. */
async function uploadImage(bucket, folder, name, options) {
  const buffer = await illustration({ seed: imageSeed++, ...options });
  const path = buildStoragePath(folder, `${name}.webp`);
  check(await supabase.storage.from(bucket).upload(path, buffer, { contentType: "image/webp", upsert: false }), `upload ${bucket}/${path}`);
  count("images");
  return path;
}

const inDays = (days, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

// ---------------------------------------------------------------------------
// Contenus d'exemple (génériques, sans nom de client ni chiffre)
// ---------------------------------------------------------------------------
const SERVICES = {
  "communication-strategique": [
    { title: "Audit et stratégie de communication", icon: "compass", short: "Analyse de votre communication actuelle et définition d'une stratégie adaptée à vos objectifs.", featured: true },
    { title: "Plan de communication annuel", icon: "target", short: "Un calendrier d'actions cohérent pour faire vivre votre marque tout au long de l'année." },
  ],
  "communication-digitale": [
    { title: "Gestion des réseaux sociaux", icon: "megaphone", short: "Animation de vos communautés, création de publications et suivi des performances.", featured: true },
    { title: "Campagnes publicitaires en ligne", icon: "monitor-smartphone", short: "Conception et pilotage de campagnes sponsorisées pour gagner en visibilité." },
  ],
  "identite-visuelle-creation-graphique": [
    { title: "Création de logo et charte graphique", icon: "palette", short: "Une identité visuelle forte et cohérente, déclinable sur tous vos supports.", featured: true },
    { title: "Supports imprimés et signalétique", icon: "pen-tool", short: "Brochures, affiches, kakémonos et signalétique conçus à votre image." },
  ],
  "production-audiovisuelle": [
    { title: "Film institutionnel", icon: "clapperboard", short: "Un film pour présenter votre structure, vos équipes et votre savoir-faire.", featured: true },
    { title: "Photographie professionnelle", icon: "layers", short: "Reportages photo, portraits et visuels produits pour vos supports de communication." },
  ],
  evenementiel: [
    { title: "Organisation d'événements d'entreprise", icon: "calendar-range", short: "De la conception à la logistique, des événements qui marquent vos publics." },
    { title: "Conférences et lancements de produits", icon: "sparkles", short: "Scénographie, animation et couverture de vos temps forts." },
  ],
  "services-aux-entreprises": [
    { title: "Accompagnement et conseil", icon: "handshake", short: "Un accompagnement sur mesure pour structurer et développer votre communication." },
    { title: "Rédaction de contenus professionnels", icon: "briefcase-business", short: "Textes de site, présentations, communiqués : des contenus clairs et efficaces." },
  ],
};

const serviceDescription = (title) => `## ${title}

*${MARKER}.* Ce texte présente la structure attendue d'une fiche service ; il sera remplacé par la description validée par UPCOM.

### Ce que comprend la prestation
- Un premier échange pour comprendre vos besoins
- Une proposition adaptée à vos objectifs
- La mise en œuvre et le suivi

### Pour qui ?
Entreprises, institutions et organisations qui souhaitent professionnaliser leur communication.`;

const PROJECTS = [
  { title: "Lancement d'une nouvelle marque", category: "identite-visuelle-creation-graphique", year: 2026 },
  { title: "Campagne digitale de notoriété", category: "communication-digitale", year: 2026 },
  { title: "Film de présentation d'entreprise", category: "production-audiovisuelle", year: 2025 },
  { title: "Organisation d'un forum professionnel", category: "evenementiel", year: 2025 },
  { title: "Refonte d'identité visuelle", category: "identite-visuelle-creation-graphique", year: 2025 },
  { title: "Stratégie de communication annuelle", category: "communication-strategique", year: 2024 },
];

const ARTICLES = [
  {
    title: "Bienvenue sur le site d'UPCOM",
    category: "Actualités",
    excerpt: `${MARKER}. Découvrez nos pôles d'activité, nos réalisations et nos actualités.`,
    content: `*${MARKER}.*\n\n## Un site pour mieux vous accompagner\n\nCet article d'exemple montre la mise en forme d'une actualité : titres, paragraphes et listes.\n\n- Nos pôles d'activité\n- Nos réalisations\n- Nos événements`,
    featured: true,
  },
  {
    title: "5 conseils pour une identité visuelle cohérente",
    category: "Conseils",
    excerpt: `${MARKER}. Quelques principes simples pour garder une image de marque homogène.`,
    content: `*${MARKER}.*\n\n## Pourquoi la cohérence compte\n\nUne identité visuelle cohérente rend votre marque plus facile à reconnaître.\n\n1. Définir une charte graphique\n2. Limiter la palette de couleurs\n3. Choisir des typographies lisibles\n4. Décliner les modèles de documents\n5. Former les équipes à la charte`,
  },
  {
    title: "Pourquoi une stratégie de contenu est essentielle",
    category: "Conseils",
    excerpt: `${MARKER}. Publier régulièrement des contenus utiles renforce la confiance de vos publics.`,
    content: `*${MARKER}.*\n\n## Planifier plutôt qu'improviser\n\nUne stratégie de contenu permet de publier au bon moment, sur les bons canaux.\n\n> Un contenu utile vaut mieux que dix publications improvisées.`,
  },
];

const EVENTS = [
  { title: "Atelier : communication digitale pour les PME", days: 30 },
  { title: "Rencontre professionnelle UPCOM", days: 60 },
  { title: "Soirée de présentation des services", days: -45 },
];

const TEAM = ["CEO", "Responsable commercial", "Chargé de communication", "Community manager", "Graphiste", "Photographe / vidéaste", "Responsable événementiel"];

const TESTIMONIALS = [
  "Une équipe à l'écoute, réactive et force de proposition tout au long du projet.",
  "Un accompagnement clair et professionnel, du premier rendez-vous jusqu'à la livraison.",
  "Des propositions créatives qui ont su traduire notre vision et nos valeurs.",
];

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------
async function seed() {
  const { count: existing, error } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .ilike("short_description", `%${MARKER}%`);
  if (error) fail(`Lecture impossible : ${error.message}`);
  if (existing) fail(`Le contenu d'exemple existe déjà (${existing} services). Lancez d'abord la commande avec --remove pour le recréer.`);

  const categories = check(await supabase.from("service_categories").select("id, slug, name").order("display_order"), "catégories");
  const bySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));
  console.log(`   ${categories.length} catégories de services trouvées.`);

  console.log("\n▸ Services");
  let order = 10;
  for (const [slug, services] of Object.entries(SERVICES)) {
    const category = bySlug[slug];
    if (!category) {
      problems.push(`Catégorie « ${slug} » introuvable : services ignorés.`);
      continue;
    }
    for (const service of services) {
      await step(`Service « ${service.title} »`, async () => {
        const id = randomUUID();
        const image_path = await uploadImage("services", `services/${id}`, "visuel", { width: 1600, height: 1000, title: service.title });
        check(
          await supabase.from("services").insert({
            id,
            category_id: category.id,
            title: service.title,
            short_description: `${service.short} ${MARKER}.`,
            description: serviceDescription(service.title),
            image_path,
            icon: service.icon,
            display_order: order,
            is_featured: Boolean(service.featured),
            status: "published",
          }),
          "insertion",
        );
        order += 10;
        count("services");
        console.log(`   ✓ ${service.title}`);
      });
    }
  }

  console.log("\n▸ Réalisations");
  for (const [index, project] of PROJECTS.entries()) {
    await step(`Réalisation « ${project.title} »`, async () => {
      const id = randomUUID();
      const cover_image_path = await uploadImage("projects", `projects/${id}`, "couverture", { width: 1600, height: 1000, title: project.title });
      check(
        await supabase.from("projects").insert({
          id,
          category_id: bySlug[project.category]?.id ?? null,
          title: project.title,
          client_name: CLIENT,
          year: project.year,
          excerpt: `${MARKER}. Présentation type d'une réalisation du portfolio.`,
          description: `*${MARKER}.*\n\n## Le contexte\nPrésentation du besoin du client et des enjeux du projet.\n\n## Notre réponse\nLes actions menées et les supports réalisés.\n\n## Le résultat\nLes bénéfices obtenus, décrits sans chiffre tant qu'ils ne sont pas validés.`,
          cover_image_path,
          display_order: (index + 1) * 10,
          is_featured: index < 3,
          status: "published",
        }),
        "insertion",
      );
      const gallery = [];
      for (let n = 1; n <= 3; n += 1) {
        gallery.push({
          project_id: id,
          image_path: await uploadImage("projects", `projects/${id}/galerie`, `image-${n}`, { width: 1400, height: 933, title: `${project.title} — ${n}` }),
          alt_text: `${project.title} — visuel d'exemple ${n}`,
          display_order: n - 1,
        });
      }
      check(await supabase.from("project_images").insert(gallery), "galerie");
      count("projects");
      created.project_images = (created.project_images ?? 0) + gallery.length;
      console.log(`   ✓ ${project.title} (+3 images)`);
    });
  }

  console.log("\n▸ Actualités");
  const articleCategories = {};
  for (const name of ["Actualités", "Conseils"]) {
    await step(`Catégorie d'articles « ${name} »`, async () => {
      const existingCategory = check(await supabase.from("article_categories").select("id").eq("name", name).maybeSingle(), "lecture");
      articleCategories[name] =
        existingCategory?.id ?? check(await supabase.from("article_categories").insert({ name }).select("id").single(), "insertion").id;
      if (!existingCategory) count("article_categories");
    });
  }
  for (const article of ARTICLES) {
    await step(`Article « ${article.title} »`, async () => {
      const id = randomUUID();
      const cover_image_path = await uploadImage("articles", `articles/${id}`, "couverture", { width: 1600, height: 900, title: article.title });
      // published_at est renseigné automatiquement par la base à la publication.
      check(
        await supabase.from("articles").insert({
          id,
          category_id: articleCategories[article.category] ?? null,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          cover_image_path,
          author_name: "Équipe UPCOM",
          is_featured: Boolean(article.featured),
          status: "published",
        }),
        "insertion",
      );
      count("articles");
      console.log(`   ✓ ${article.title}`);
    });
  }

  console.log("\n▸ Événements");
  for (const event of EVENTS) {
    await step(`Événement « ${event.title} »`, async () => {
      const id = randomUUID();
      const cover_image_path = await uploadImage("events", `events/${id}`, "visuel", { width: 1600, height: 900, title: event.title });
      check(
        await supabase.from("events").insert({
          id,
          title: event.title,
          excerpt: `${MARKER}. ${event.days > 0 ? "Événement à venir" : "Événement passé"} présenté à titre d'illustration.`,
          description: `*${MARKER}.*\n\n## Au programme\n- Accueil des participants\n- Présentations et échanges\n- Temps de networking\n\nLe programme définitif sera communiqué par UPCOM.`,
          location: "Dakar",
          event_date: inDays(event.days, 10),
          end_date: inDays(event.days, 17),
          cover_image_path,
          is_featured: event.days > 0,
          status: "published",
        }),
        "insertion",
      );
      count("events");
      console.log(`   ✓ ${event.title} (${event.days > 0 ? "à venir" : "passé"})`);
    });
  }

  console.log("\n▸ Équipe");
  for (const [index, position] of TEAM.entries()) {
    await step(`Membre « ${position} »`, async () => {
      const id = randomUUID();
      const photo_path = await uploadImage("team", `team/${id}`, "photo", { width: 800, height: 1000, title: position, kind: "avatar" });
      check(
        await supabase.from("team_members").insert({
          id,
          name: MEMBER,
          position,
          biography: `${MARKER}. La présentation de la personne occupant ce poste sera ajoutée par UPCOM.`,
          photo_path,
          display_order: (index + 1) * 10,
          status: "published",
        }),
        "insertion",
      );
      count("team_members");
      console.log(`   ✓ ${position}`);
    });
  }

  console.log("\n▸ Témoignages");
  for (const [index, content] of TESTIMONIALS.entries()) {
    await step(`Témoignage ${index + 1}`, async () => {
      check(
        await supabase.from("testimonials").insert({
          name: CLIENT,
          company: "Entreprise exemple",
          role: MARKER,
          content,
          display_order: (index + 1) * 10,
          is_featured: true,
          status: "published",
        }),
        "insertion",
      );
      count("testimonials");
      console.log(`   ✓ Témoignage ${index + 1}`);
    });
  }
}

// ---------------------------------------------------------------------------
// Suppression du contenu d'exemple (et de ses images)
// ---------------------------------------------------------------------------
async function remove() {
  const targets = [
    { table: "services", bucket: "services", column: "image_path", filter: (q) => q.ilike("short_description", `%${MARKER}%`) },
    { table: "projects", bucket: "projects", column: "cover_image_path", filter: (q) => q.eq("client_name", CLIENT) },
    { table: "articles", bucket: "articles", column: "cover_image_path", filter: (q) => q.ilike("excerpt", `%${MARKER}%`) },
    { table: "events", bucket: "events", column: "cover_image_path", filter: (q) => q.ilike("excerpt", `%${MARKER}%`) },
    { table: "team_members", bucket: "team", column: "photo_path", filter: (q) => q.eq("name", MEMBER) },
    { table: "testimonials", bucket: "testimonials", column: "photo_path", filter: (q) => q.eq("name", CLIENT) },
  ];
  for (const target of targets) {
    await step(`Suppression ${target.table}`, async () => {
      const rows = check(await target.filter(supabase.from(target.table).select(`id, ${target.column}`)), "lecture");
      if (!rows.length) return;
      const ids = rows.map((row) => row.id);
      const paths = rows.map((row) => row[target.column]).filter(Boolean);
      if (target.table === "projects") {
        const images = check(await supabase.from("project_images").select("image_path").in("project_id", ids), "galerie");
        paths.push(...images.map((image) => image.image_path));
      }
      check(await supabase.from(target.table).delete().in("id", ids), "suppression");
      if (paths.length) check(await supabase.storage.from(target.bucket).remove(paths), "images");
      created[target.table] = ids.length;
      console.log(`   ✓ ${target.table} : ${ids.length} supprimé(s), ${paths.length} image(s)`);
    });
  }
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nUPCOM — contenu d'exemple ${REMOVE ? "(SUPPRESSION)" : "(création)"}`);
  console.log(`Projet : ${url}\n`);

  const email = process.env.SEED_EMAIL ?? (await ask("E-mail du compte super_admin : "));
  const password = process.env.SEED_PASSWORD ?? (await ask("Mot de passe (masqué) : ", { hidden: true }));
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) fail(`Connexion refusée : ${loginError.message}`);

  const { data: access, error: accessError } = await supabase.rpc("get_my_access").maybeSingle();
  if (accessError || !access) fail("Ce compte n'a pas de rôle actif dans le back-office.");
  if (access.role !== "super_admin") fail(`Rôle « ${access.role} » : un compte super_admin est requis (accès à toutes les rubriques).`);
  console.log(`✓ Connecté en super_admin (${email})`);

  if (REMOVE) await remove();
  else await seed();

  await supabase.auth.signOut();

  console.log("\n──────── Bilan ────────");
  for (const [domain, total] of Object.entries(created)) console.log(`  ${domain.padEnd(20)} ${total}`);
  if (problems.length) {
    console.log(`\n⚠ ${problems.length} problème(s) :`);
    for (const problem of problems) console.log(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log("\n✓ Terminé sans erreur.");
  }
}

main().catch((error) => fail(error?.message ?? String(error)));
