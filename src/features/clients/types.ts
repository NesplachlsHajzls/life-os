export type ClientTaskStatus = 'waiting' | 'in_progress' | 'done'

export interface Client {
  id: string
  user_id: string
  name: string
  contact?: string
  notes?: string
  color?: string
  created_at: string
}

export interface ClientTask {
  id: string
  client_id: string
  user_id: string
  title: string
  description?: string
  priority: 1 | 2 | 3
  deadline?: string
  status: ClientTaskStatus
  created_at: string
}
