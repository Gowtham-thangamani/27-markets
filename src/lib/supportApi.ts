import { api } from './api'

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export interface TicketListItem {
  id: string
  subject: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

export interface TicketMessage {
  id: string
  body: string
  internal: boolean
  createdAt: string
  author: { firstName: string; lastName: string; role: string }
}

export interface TicketDetail extends TicketListItem {
  messages: TicketMessage[]
}

export interface CreateTicketInput {
  subject: string
  category: string
  priority: TicketPriority
  message: string
}

export const supportApi = {
  list: () => api.get<TicketListItem[]>('/support/tickets'),
  get: (id: string) => api.get<TicketDetail>(`/support/tickets/${id}`),
  create: (input: CreateTicketInput) => api.post<TicketListItem>('/support/tickets', input),
  reply: (id: string, body: string) =>
    api.post<TicketMessage>(`/support/tickets/${id}/messages`, { body }),
}

// ── Display label / tone maps (shared by portal + admin) ──

export const ticketStatusLabel: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}
export const ticketPriorityLabel: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
export const ticketStatusTone: Record<TicketStatus, Tone> = {
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
}
export const ticketPriorityTone: Record<TicketPriority, Tone> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
}
