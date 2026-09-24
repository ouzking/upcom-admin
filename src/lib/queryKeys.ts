/** Clés React Query centralisées (invalidation cohérente après chaque mutation). */
export const queryKeys = {
  content: (resource: string) => ["content", resource] as const,
  contentList: (resource: string, params: unknown) => ["content", resource, "list", params] as const,
  contentItem: (resource: string, id: string) => ["content", resource, "item", id] as const,
  projectImages: (projectId: string) => ["content", "projects", "images", projectId] as const,
  serviceCategories: ["service-categories"] as const,
  articleCategories: ["article-categories"] as const,

  quotes: ["quotes"] as const,
  quotesList: (params: unknown) => ["quotes", "list", params] as const,
  quote: (id: string) => ["quotes", "item", id] as const,
  quoteCounts: ["quotes", "counts"] as const,

  messages: ["messages"] as const,
  messagesList: (params: unknown) => ["messages", "list", params] as const,
  message: (id: string) => ["messages", "item", id] as const,

  dashboard: ["dashboard"] as const,
  notifications: ["notifications"] as const,

  settings: ["settings"] as const,
  socialLinks: ["social-links"] as const,
  users: ["users"] as const,
  staff: ["users", "staff"] as const,
  media: (bucket: string, folder: string, search: string) => ["media", bucket, folder, search] as const,
};
