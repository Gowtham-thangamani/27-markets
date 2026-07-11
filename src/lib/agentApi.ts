import { api } from './api'

export interface AgentSummary {
  leads: {
    total: number
    new: number
    contacted: number
    qualified: number
    converted: number
    lost: number
  }
  tickets: { open: number; total: number }
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'

export interface AgentLead {
  id: string
  name: string
  email: string
  phone: string | null
  country: string | null
  source: string
  status: LeadStatus
  createdAt: string
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface AgentTicket {
  id: string
  subject: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  updatedAt: string
  client: string
}

export const agentApi = {
  summary: () => api.get<AgentSummary>('/agent/summary'),
  leads: () => api.get<AgentLead[]>('/agent/leads'),
  tickets: () => api.get<AgentTicket[]>('/agent/tickets'),
}
