import { BriefcaseBusiness, CalendarDays, FolderKanban, MessageSquareQuote, Newspaper, UsersRound, type LucideIcon } from "lucide-react";
import type { ContentTable } from "@/repositories/content";
import type { AppPermission, StorageBucket } from "@/types";

export interface ContentResource {
  table: ContentTable;
  /** Libellé pluriel (menu, titres). */
  label: string;
  /** Libellé singulier avec article (« le service »), pour les messages. */
  singular: string;
  /** Messages de succès à la création (accord en genre). */
  createdMessage: string;
  path: string;
  bucket: StorageBucket;
  permission: AppPermission;
  icon: LucideIcon;
}

/** Métadonnées des rubriques éditoriales : table, route, bucket Storage et permission d'écriture. */
export const CONTENT_RESOURCES: Record<ContentTable, ContentResource> = {
  services: {
    table: "services",
    label: "Services",
    singular: "le service",
    createdMessage: "Service créé avec succès.",
    path: "/services",
    bucket: "services",
    permission: "services.manage",
    icon: BriefcaseBusiness,
  },
  projects: {
    table: "projects",
    label: "Réalisations",
    singular: "la réalisation",
    createdMessage: "Réalisation créée avec succès.",
    path: "/realisations",
    bucket: "projects",
    permission: "projects.manage",
    icon: FolderKanban,
  },
  articles: {
    table: "articles",
    label: "Actualités",
    singular: "l'article",
    createdMessage: "Article créé avec succès.",
    path: "/actualites",
    bucket: "articles",
    permission: "articles.manage",
    icon: Newspaper,
  },
  events: {
    table: "events",
    label: "Événements",
    singular: "l'événement",
    createdMessage: "Événement créé avec succès.",
    path: "/evenements",
    bucket: "events",
    permission: "events.manage",
    icon: CalendarDays,
  },
  team_members: {
    table: "team_members",
    label: "Équipe",
    singular: "le membre",
    createdMessage: "Membre ajouté avec succès.",
    path: "/equipe",
    bucket: "team",
    permission: "team.manage",
    icon: UsersRound,
  },
  testimonials: {
    table: "testimonials",
    label: "Témoignages",
    singular: "le témoignage",
    createdMessage: "Témoignage créé avec succès.",
    path: "/temoignages",
    bucket: "testimonials",
    permission: "testimonials.manage",
    icon: MessageSquareQuote,
  },
};

export const CONTENT_TABLES = Object.keys(CONTENT_RESOURCES) as ContentTable[];
