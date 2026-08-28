import type { IsoDateTime } from './common'

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed'

export interface TicketMessage {
  id: string
  senderId: string
  senderName: string
  senderType: 'customer' | 'agent' | 'system'
  body: string
  sentAt: IsoDateTime
}

export interface Ticket {
  id: string
  subject: string
  entityId: string
  entityName: string
  entityType: 'rider' | 'driver' | 'corporate'
  category: string
  reasonCode: string
  priority: TicketPriority
  status: TicketStatus
  ownerId: string | null
  ownerName: string | null
  createdAt: IsoDateTime
  slaDueAt: IsoDateTime | null
  slaBreached: boolean
  callGuideScript?: {
    scenario: string
    say: string
    do: string
    policyRef: string
  }
  messages: TicketMessage[]
}
