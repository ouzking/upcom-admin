# UPCOM ADMIN

Back-office d'**UPCOM AGENCY & SERVICES** : gestion des contenus du site public, des demandes
commerciales, de la médiathèque, des paramètres et des utilisateurs.

| Dépôt | Rôle |
|---|---|
| `upcom-frontend` | Site public |
| **`upcom-admin`** | **Ce dépôt** — back-office (React, aucune logique serveur) |
| `upcom-backend` | Schéma PostgreSQL, RLS, Storage, Edge Functions, types partagés |

Les trois dépôts utilisent **le même projet Supabase**. Ce dépôt ne crée ni table, ni policy, ni
fonction : il consomme le backend existant avec la session de l'utilisateur (JWT), et **toutes les
règles d'accès sont appliquées par la base (RLS)**.

---

## Sommaire

1. [Stack](#1-stack)
2. [Installation](#2-installation)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Audit du backend utilisé](#4-audit-du-backend-utilisé)
5. [Rôles et permissions](#5-rôles-et-permissions)
6. [Fonctionnalités](#6-fonctionnalités)
7. [Architecture](#7-architecture)
8. [Sécurité](#8-sécurité)
9. [Tests et qualité](#9-tests-et-qualité)
10. [Déploiement](#10-déploiement)
11. [Limites connues et évolutions backend proposées](#11-limites-connues-et-évolutions-backend-proposées)

---

## 1. Stack

React 19 · TypeScript (strict, `noUncheckedIndexedAccess`, aucun `any`) · Vite · Tailwind CSS 4 ·
Framer Motion · Lucide React · Supabase JS · React Router (data router) · TanStack Query ·
React Hook Form + Zod · Vitest + Testing Library.

Les types de données viennent du package **`@upcom/supabase`** (dépôt `upcom-backend`, tag Git),
généré depuis le schéma : aucun modèle n'est redéfini à la main.

## 2. Installation

Prérequis : Node.js ≥ 20, accès en lecture au dépôt `upcom-backend` (installation du package de types).

```bash
git clone https://github.com/ouzking/upcom-admin.git
cd upcom-admin
npm install
cp .env.example .env.local        # renseigner l'URL et la clé publishable du projet Supabase
npm run dev                       # http://localhost:5174
```

**Backend local** (optionnel) : dans `upcom-backend`, `npm run db:start` puis utiliser
`VITE_SUPABASE_URL=http://127.0.0.1:54321` et la clé *publishable/anon* affichée. Le port **5174** est
celui attendu par la configuration Auth du backend (`site_url`, redirections, `ADMIN_APP_URL`).

**Premier accès** : créer le premier `super_admin` comme décrit dans le README de `upcom-backend`
(§7). Les membres suivants sont invités depuis **Utilisateurs → Inviter un membre**.

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement (port 5174) |
| `npm run build` | vérification des types + build de production (`dist/`) |
| `npm run preview` | prévisualisation du build (port 4174) |
| `npm run typecheck` | TypeScript (application + tests) |
| `npm run lint` | ESLint (règles React Hooks / React Compiler, `no-explicit-any`) |
| `npm test` | tests Vitest |
| `npm run seed:demo` / `seed:demo:prod` | contenu d'exemple (base locale / en ligne) — voir ci-dessous |

**Contenu d'exemple** (présentation au client) : `scripts/seed-demo.mjs` crée 12 services, 6 réalisations
(+ 3 images chacune), 3 actualités, 3 événements, 7 postes d'équipe et 3 témoignages, tous marqués
« Contenu d'exemple — à remplacer » / « Client exemple » / « Membre de l'équipe », avec des illustrations
générées aux couleurs UPCOM. Il se connecte avec **votre compte super_admin** (e-mail et mot de passe
demandés dans le terminal) : aucune clé secrète, la RLS s'applique. Aucun réseau social n'est créé.

```bash
npm run seed:demo:prod                 # base en ligne (lit .env.production.local)
npm run seed:demo:prod -- --remove     # supprime uniquement ce contenu d'exemple et ses images
```

**Mise à jour du schéma** : après une migration backend, publier un nouveau tag de `upcom-backend`
puis mettre à jour la dépendance `@upcom/supabase` (`github:ouzking/upcom-backend#vX.Y.Z`) et relancer
`npm run typecheck`.

## 3. Variables d'environnement

Uniquement des valeurs **publiques** (tout ce qui commence par `VITE_` est visible dans le navigateur).

| Variable | Obligatoire | Description |
|---|:-:|---|
| `VITE_SUPABASE_URL` | ✅ | URL du projet Supabase partagé |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | clé *publishable* (ou `VITE_SUPABASE_ANON_KEY`, ancienne clé anon) |
| `VITE_PUBLIC_SITE_URL` | | URL du site public (lien « Voir le site ») |

> ⛔ La `service_role` / clé secrète ne doit **jamais** figurer dans ce dépôt ni dans une variable
> `VITE_*`. Les opérations qui l'exigent (invitations) passent par les Edge Functions du backend.

Sans configuration, l'application affiche un écran explicite au lieu de planter.

## 4. Audit du backend utilisé

Audit réalisé sur `upcom-backend` (tag `v0.1.0`, migrations `20260924120000` → `20260924120900`).

**Tables consommées**

| Table | Usage dans l'admin |
|---|---|
| `profiles`, `role_permissions` | session, rôle, écran Utilisateurs, matrice des droits |
| `service_categories` | 6 pôles officiels (données de référence, lecture seule dans l'UI) |
| `services` | CRUD Services |
| `projects`, `project_images` | CRUD Réalisations + galerie |
| `article_categories`, `articles` | CRUD Actualités, gestion des catégories, publication programmée |
| `events` | CRUD Événements |
| `team_members` | CRUD Équipe |
| `testimonials` | CRUD Témoignages |
| `quote_requests` | Demandes de devis (suivi : `status`, `assigned_to`, `internal_notes`) |
| `contact_messages` | Messages (suivi : `status`, `internal_notes`) |
| `site_settings` (singleton `id = 1`), `social_links` | Paramètres |

**RPC** : `get_my_access()` → rôle et permissions de l'utilisateur connecté (source unique des droits
affichés).

**Storage** : 7 buckets publics en lecture — `site-assets`, `services`, `projects`, `team`, `articles`,
`events`, `testimonials` ; listing réservé aux membres, écriture selon la permission du bucket,
tailles et types MIME contrôlés côté serveur. Les tables stockent le **chemin** (`<bucket>/<id>/<fichier>`),
jamais l'URL.

**Edge Functions appelées** : `admin-invite-user` (invitation + rôle), `send-quote-notification` et
`send-contact-notification` (renvoi manuel de l'e-mail d'alerte, `force: true`).

**Contraintes respectées dans l'UI** : slugs générés par la base si vides (aperçu identique à
`private.slugify`), longueurs et formats des contraintes `CHECK`, `published_at` renseigné par trigger,
contenu des demandes immuable (seules les colonnes de suivi sont modifiables), dernier `super_admin`
protégé, format de contenu riche = Markdown léger rendu par le site public (aucun HTML).

## 5. Rôles et permissions

Matrice lue en base (`role_permissions`) et consultable dans **Utilisateurs → Rôles et permissions** :

| Permission | super_admin | editor | communication_manager | commercial |
|---|:-:|:-:|:-:|:-:|
| Services | ✅ | ✅ | | |
| Réalisations, Actualités, Événements, Témoignages | ✅ | ✅ | ✅ | |
| Équipe | ✅ | ✅ | | |
| Demandes de devis (voir / traiter) | ✅ | | | ✅ |
| Messages (voir / traiter) | ✅ | | ✅ | ✅ |
| Paramètres | ✅ | | ✅ | |
| Utilisateurs | ✅ | | | |

Comportement de l'interface :

- Tout membre actif **consulte** les contenus (brouillons compris) et la médiathèque ; sans la
  permission `*.manage` du domaine, l'écran passe en **lecture seule**.
- Devis, Messages et Utilisateurs n'apparaissent qu'avec la permission de lecture correspondante.
- Un compte **sans rôle ou désactivé** voit l'écran « Accès en attente » (la RLS le traite comme un visiteur).
- Seul un `super_admin` peut attribuer `super_admin` ; personne ne modifie son propre rôle depuis l'UI.

## 6. Fonctionnalités

| Écran | Contenu |
|---|---|
| **Connexion** | e-mail / mot de passe, mot de passe oublié, activation d'invitation (`/auth/accept-invite`), réinitialisation (`/auth/reset-password`), session persistante |
| **Tableau de bord** | « Bonjour, [prénom] », indicateurs (services publiés, réalisations, articles, événements, devis, messages), dernières demandes, notifications, derniers contenus, activité récente, raccourcis de création |
| **Services, Réalisations, Actualités, Événements, Équipe, Témoignages** | liste (recherche, filtres statut / catégorie / mise en avant, pagination, état dans l'URL) ; création, modification, publication, dépublication, archivage, restauration, suppression d'un contenu archivé ; garde « modifications non enregistrées » |
| Réalisations | image principale + **galerie** (upload multiple, glisser-déposer, réordonnancement, texte alternatif, légende) |
| Actualités | **éditeur de contenu** (barre d'outils, raccourcis, aperçu fidèle au site, compteur de mots), catégories, signature, **publication programmée** |
| **Demandes de devis** | compteurs par statut, fiche détaillée, pipeline Nouveau → En cours → Contacté → Converti / Clôturé, assignation, notes internes, réponse e-mail / appel, renvoi de la notification |
| **Messages** | boîte de réception à deux volets, lu / non lu (lecture automatique), répondu, archivage, notes internes |
| **Médiathèque** | navigation par rubrique et dossier, upload multiple, aperçu, lien public, recherche, suppression (unitaire ou multiple) selon permissions |
| **Paramètres** | identité, coordonnées officielles, logo, favicon, réseaux sociaux (ajout, masquage, suppression) |
| **Utilisateurs** | liste, invitation, changement de rôle, activation / désactivation, matrice des droits |
| **Mon compte** | nom, mot de passe, permissions |

**Notifications** : dérivées des données (nouvelles demandes, nouveaux messages, articles programmés,
brouillons des rubriques gérées), rafraîchies toutes les 60 s ; cloche avec compteur, badges dans le
menu, toast à l'arrivée d'une nouvelle demande ou d'un nouveau message, compteur dans l'onglet.

**UX** : états de chargement (squelettes), vides, erreurs (avec « Réessayer »), succès (toasts),
confirmations pour les actions sensibles, validation des formulaires en français alignée sur les
contraintes SQL, responsive desktop / laptop / tablette et utilisable sur mobile (menu tiroir,
volets empilés), accessibilité clavier (focus visible, pièges de focus des fenêtres, libellés ARIA).

## 7. Architecture

```
src/
├── app/            App, providers (Query, Toast, Confirm, Auth), routes (lazy), QueryClient
├── config/         env, navigation (menu + permissions), resources (métadonnées des rubriques)
├── lib/            client Supabase, erreurs FR, permissions, storage, formatage, icônes, requêtes
├── types/          réexport des types générés (@upcom/supabase) + types de pagination
├── repositories/   accès aux données — un fichier par domaine, seule couche qui parle à Supabase
├── hooks/          liste dans l'URL, upload, garde de modifications, anti-rebond
├── components/
│   ├── ui/         Button, Input, Modal, Dropdown, Badge, Card, Switch, Avatar…
│   ├── data/       DataTable, Pagination, SearchInput, badges de statut, vignettes
│   ├── forms/      Field, ImageField, GalleryField, MarkdownEditor, IconPicker, SlugInput, MediaPicker
│   └── feedback/   toasts, confirmations, états vide / erreur / chargement
├── layouts/        AdminLayout (sidebar, barre supérieure), AuthLayout
├── features/       un dossier par domaine : auth, dashboard, content (socle CRUD commun),
│                   services, projects, articles, events, team, testimonials, quotes, messages,
│                   media, settings, users, account, notifications
├── pages/          404, erreur de route
└── test/           setup, faux repositories, rendu avec providers, faux client Supabase
```

Principes :

- **Repositories** : seule couche qui importe le client Supabase ; renvoient des données typées ou
  lèvent une `AppError` au message français (RLS, contrainte, réseau…).
- **Socle CRUD commun** (`features/content`) : liste générique, écran d'édition (actions de
  publication), hooks d'enregistrement ; chaque rubrique ne définit que son schéma, ses colonnes et son
  formulaire.
- **TanStack Query** : cache, invalidation ciblée après chaque mutation (liste, tableau de bord,
  notifications).
- **Formulaires** : React Hook Form + Zod ; mapping explicite formulaire ⇄ base (`*-form.ts`).
- Code splitting par écran, bibliothèques isolées en chunks stables.

## 8. Sécurité

- Client Supabase avec la clé publishable + JWT de l'utilisateur : **toutes les requêtes passent par la RLS**.
- Aucune clé secrète dans le code ni dans l'environnement du front ; invitations via Edge Function.
- Les droits affichés viennent de `get_my_access` (base), jamais des métadonnées utilisateur.
- Masquer un bouton n'est jamais une mesure de sécurité : un appel non autorisé est refusé par la
  base, et l'erreur est affichée proprement.
- Recherche : caractères réservés de la syntaxe PostgREST neutralisés (pas d'injection de filtre).
- Redirection après connexion limitée aux chemins internes (pas de redirection ouverte).
- Contenu riche en Markdown, rendu sans HTML brut (pas de XSS) — identique au site public.
- Médiathèque : buckets **publics** ; ne jamais y déposer de document confidentiel.
- `noindex, nofollow` sur l'application.

## 9. Tests et qualité

```bash
npm test            # 75 tests
npm run typecheck
npm run lint
```

| Fichier | Couverture |
|---|---|
| `features/auth/auth.test.tsx` | connexion (validation, erreur, succès + retour à la page demandée), session persistée, compte sans rôle, route protégée, permission refusée, menu filtré, déconnexion |
| `lib/permissions.test.ts` | matrice des rôles, écriture Storage, rôles attribuables, menu par rôle |
| `features/services/services.test.tsx` | création, validation, modification, publication, enregistrement, publication et archivage depuis la liste, filtres, lecture seule |
| `components/forms/upload.test.tsx` | upload d'image (chemin, aperçu), refus de format, échec Storage/RLS, galerie multiple, réordonnancement, retrait |
| `repositories/projects.repository.test.ts` | synchronisation de la galerie (suppression / ordre / insertion), erreur RLS |
| `features/projects/projects.test.tsx` | création avec galerie, publication, validation de l'année |
| `features/articles/articles.test.tsx` | règles, éditeur Markdown, publication programmée, aperçu |
| `features/events/events.test.tsx` | dates obligatoires / cohérentes, création publiée |
| `features/quotes/quotes.test.tsx` | liste et compteurs, fiche, statut, assignation + notes, lecture seule |
| `features/messages/messages.test.tsx` | boîte de réception, lecture automatique, archivage, répondu, lecture seule |
| `lib/lib.test.ts` | slug, recherche sécurisée, erreurs, formats, validation et URL Storage |
| `features/smoke.test.tsx` | rendu du tableau de bord, de la médiathèque, des paramètres, des utilisateurs et du compte |

Les tests exécutent les vrais composants, providers et routeur ; seule la couche repositories est
simulée. Les **policies RLS elles-mêmes** sont testées dans `upcom-backend` (pgTAP).
La CI (`.github/workflows/ci.yml`) exécute types, lint, tests et build à chaque push / PR
(secret `UPCOM_BACKEND_TOKEN` requis si `upcom-backend` est privé).

## 10. Déploiement

Déployé sur **Netlify** : https://upcom-admin.netlify.app (projet Supabase `gopjiglltfohtzeqijsq`).
`netlify.toml` définit le build, les variables **publiques** (URL + clé publishable), la réécriture SPA et
les en-têtes de sécurité : chaque push sur `main` redéploie. Pour changer de projet Supabase, modifier ces
variables (jamais de clé secrète dans ce fichier).
1. Supabase → *Authentication → URL Configuration* : **Site URL** = URL du back-office ; **Redirect
   URLs** incluant `https://admin.<domaine>/**` (pages `/auth/accept-invite` et `/auth/reset-password`).
2. Secrets des Edge Functions (backend) : `ADMIN_APP_URL=https://admin.<domaine>`,
   `ADMIN_INVITE_REDIRECT_URL=https://admin.<domaine>/auth/accept-invite`, et l'origine du back-office dans
   `ALLOWED_ORIGINS`.

## 11. Limites connues et évolutions backend proposées

Aucune de ces évolutions n'a été réalisée ici (ce dépôt ne modifie pas le backend) :

- **Notifications en temps réel** : les tables ne sont pas dans la publication `supabase_realtime` ;
  l'admin interroge donc la base toutes les 60 s. Une migration `alter publication supabase_realtime add
  table quote_requests, contact_messages;` permettrait des alertes instantanées.
- **Historique « lu / non lu » des notifications par utilisateur** : nécessiterait une table dédiée.
- **Suppression définitive d'un compte** : exige l'Admin API (service_role) — à faire depuis le
  dashboard Supabase ou via une future Edge Function. La désactivation retire tout accès.
- **Réseaux sociaux de l'équipe** : le schéma ne prévoit que LinkedIn (`team_members.linkedin_url`).
- **Fichiers orphelins** : remplacer une image ne supprime pas l'ancienne (elle peut être utilisée
  ailleurs) ; le nettoyage se fait depuis la Médiathèque.
- **Icônes des services** : registre partagé avec le site public (`src/lib/icons.ts`) — toute nouvelle
  icône doit être ajoutée dans les deux dépôts.

---

**UPCOM AGENCY & SERVICES** — Ouest Foire, Cité Air Afrique, Lot 13 — 77 402 74 94 · 77 835 92 94
