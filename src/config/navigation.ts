import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  Mail,
  MessageSquareQuote,
  Newspaper,
  Settings,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { AppPermission } from "@/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  /** Au moins une de ces permissions est requise pour voir l'entrée (lecture du domaine). */
  anyOf?: AppPermission[];
  /** Compteur affiché (alimenté par les notifications). */
  badge?: "quotes" | "messages";
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * Menu du back-office. Les rubriques de contenu sont lisibles par tout membre
 * actif (brouillons compris, cf. RLS) : l'édition dépend ensuite de la
 * permission `*.manage` du domaine. Devis, messages et utilisateurs ne sont
 * visibles qu'avec la permission de lecture correspondante.
 */
export const NAVIGATION: NavSection[] = [
  { items: [{ label: "Tableau de bord", to: "/", icon: LayoutDashboard, end: true }] },
  {
    title: "Contenu",
    items: [
      { label: "Services", to: "/services", icon: BriefcaseBusiness },
      { label: "Réalisations", to: "/realisations", icon: FolderKanban },
      { label: "Actualités", to: "/actualites", icon: Newspaper },
      { label: "Événements", to: "/evenements", icon: CalendarDays },
      { label: "Équipe", to: "/equipe", icon: UsersRound },
      { label: "Témoignages", to: "/temoignages", icon: MessageSquareQuote },
    ],
  },
  {
    title: "Commercial",
    items: [
      { label: "Demandes de devis", to: "/devis", icon: FileText, anyOf: ["quotes.view"], badge: "quotes" },
      { label: "Messages", to: "/messages", icon: Mail, anyOf: ["contacts.view"], badge: "messages" },
    ],
  },
  { title: "Médias", items: [{ label: "Médiathèque", to: "/medias", icon: Images }] },
  {
    title: "Administration",
    items: [
      { label: "Paramètres", to: "/parametres", icon: Settings },
      { label: "Utilisateurs", to: "/utilisateurs", icon: UserCog, anyOf: ["users.manage"] },
    ],
  },
];

export function visibleNavigation(can: (permission: AppPermission) => boolean): NavSection[] {
  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.anyOf || item.anyOf.some(can)),
  })).filter((section) => section.items.length > 0);
}
