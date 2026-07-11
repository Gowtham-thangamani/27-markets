import { api } from './api'

export interface Testimonial {
  id: string
  name: string
  initials: string
  quote: string
  enabled: boolean
  sortOrder: number
}

export interface DfmSymbol {
  id: string
  symbol: string
  name: string
  enabled: boolean
  sortOrder: number
}

export interface SaveTestimonialInput {
  name: string
  initials: string
  quote: string
  sortOrder?: number
  enabled?: boolean
}

export interface SaveDfmSymbolInput {
  symbol: string
  name: string
  sortOrder?: number
  enabled?: boolean
}

export const siteContentApi = {
  // Public
  testimonials: () => api.get<Testimonial[]>('/content/testimonials'),
  dfmSymbols: () => api.get<DfmSymbol[]>('/content/dfm-symbols'),

  // Admin — testimonials
  adminTestimonials: () => api.get<Testimonial[]>('/admin/content/testimonials'),
  createTestimonial: (input: SaveTestimonialInput) =>
    api.post<Testimonial>('/admin/content/testimonials', input),
  updateTestimonial: (id: string, input: Partial<SaveTestimonialInput>) =>
    api.patch<Testimonial>(`/admin/content/testimonials/${id}`, input),
  removeTestimonial: (id: string) => api.del<{ id: string }>(`/admin/content/testimonials/${id}`),

  // Admin — DFM symbols
  adminDfmSymbols: () => api.get<DfmSymbol[]>('/admin/content/dfm-symbols'),
  createDfmSymbol: (input: SaveDfmSymbolInput) =>
    api.post<DfmSymbol>('/admin/content/dfm-symbols', input),
  updateDfmSymbol: (id: string, input: Partial<SaveDfmSymbolInput>) =>
    api.patch<DfmSymbol>(`/admin/content/dfm-symbols/${id}`, input),
  removeDfmSymbol: (id: string) => api.del<{ id: string }>(`/admin/content/dfm-symbols/${id}`),
}
