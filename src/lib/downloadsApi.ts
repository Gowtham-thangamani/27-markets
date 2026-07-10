import { api } from './api'

export type DownloadIcon = 'desktop' | 'web' | 'doc' | 'mobile'

export interface DownloadItem {
  id: string
  name: string
  platform: string
  description: string
  size: string
  version: string
  icon: DownloadIcon
  url: string | null
  sortOrder: number
  enabled: boolean
}

export interface SaveDownloadInput {
  name: string
  platform: string
  description: string
  size?: string
  version?: string
  icon?: DownloadIcon
  url?: string
  sortOrder?: number
  enabled?: boolean
}

export const downloadsApi = {
  // Public — enabled items for the client Download Center.
  list: () => api.get<DownloadItem[]>('/downloads'),

  // Admin CRUD.
  adminList: () => api.get<DownloadItem[]>('/admin/downloads'),
  create: (input: SaveDownloadInput) => api.post<DownloadItem>('/admin/downloads', input),
  update: (id: string, input: Partial<SaveDownloadInput>) =>
    api.patch<DownloadItem>(`/admin/downloads/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/admin/downloads/${id}`),
}
