/**
 * Types du back-office. Les modèles de données sont GÉNÉRÉS depuis le schéma
 * PostgreSQL (package @upcom/supabase, dépôt upcom-backend) : ne jamais les
 * redéfinir à la main ici, seulement les composer.
 */
export type {
  AppPermission,
  AppRole,
  ArticleCategoryRow,
  ArticleInsert,
  ArticleRow,
  ContactMessageRow,
  ContactMessageUpdate,
  ContactStatus,
  ContentStatus,
  Database,
  EventInsert,
  EventRow,
  MyAccess,
  ProfileRow,
  ProjectImageRow,
  ProjectInsert,
  ProjectRow,
  QuoteRequestRow,
  QuoteRequestUpdate,
  QuoteStatus,
  ServiceCategoryRow,
  ServiceInsert,
  ServiceRow,
  SiteSettingsRow,
  SiteSettingsUpdate,
  SocialLinkInsert,
  SocialLinkRow,
  SocialPlatform,
  StorageBucket,
  TeamMemberInsert,
  TeamMemberRow,
  TestimonialInsert,
  TestimonialRow,
  AdminInviteUserPayload,
  AdminInviteUserResult,
  ApiResponse,
  SendNotificationResult,
} from "@upcom/supabase";

/** Paramètres communs des listes paginées. */
export interface ListParams<TFilters = Record<string, never>> {
  page: number;
  pageSize: number;
  search?: string;
  filters?: Partial<TFilters>;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortDirection = "asc" | "desc";
