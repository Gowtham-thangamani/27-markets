import { api } from './api'

export type PostStatus = 'DRAFT' | 'PUBLISHED'

export interface BlogCard {
  id: string
  slug: string
  title: string
  excerpt: string | null
  featuredImage: string | null
  publishedAt: string | null
}

export interface BlogList {
  items: BlogCard[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  contentHtml: string
  featuredImage: string | null
  seoTitle: string | null
  seoDescription: string | null
  ogImage: string | null
  status: PostStatus
  publishedAt: string | null
  author?: { firstName: string; lastName: string }
  createdAt?: string
  updatedAt?: string
}

export interface AdminBlogRow {
  id: string
  slug: string
  title: string
  status: PostStatus
  publishedAt: string | null
  updatedAt: string
}

export interface SavePostInput {
  title: string
  contentHtml: string
  excerpt?: string
  slug?: string
  featuredImage?: string
  seoTitle?: string
  seoDescription?: string
  ogImage?: string
  status?: PostStatus
}

/** Blog API — public reads + admin CRUD. Thin wrapper over the shared `api` client. */
export const blogApi = {
  // Public
  list: (page = 1, limit = 12) => api.get<BlogList>(`/blog?page=${page}&limit=${limit}`),
  bySlug: (slug: string) => api.get<BlogPost>(`/blog/${encodeURIComponent(slug)}`),
  // Admin (ADMIN role)
  adminList: () => api.get<AdminBlogRow[]>('/admin/blog'),
  adminGet: (id: string) => api.get<BlogPost>(`/admin/blog/${id}`),
  create: (input: SavePostInput) => api.post<BlogPost>('/admin/blog', input),
  update: (id: string, input: Partial<SavePostInput>) => api.patch<BlogPost>(`/admin/blog/${id}`, input),
  remove: (id: string) => api.del<{ ok: boolean }>(`/admin/blog/${id}`),
}
