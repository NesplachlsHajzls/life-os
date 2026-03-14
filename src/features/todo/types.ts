export type Priority = 1 | 2 | 3

export type TaskStatus = 'open' | 'done'

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  priority: Priority
  deadline?: string       // ISO date string
  status: TaskStatus
  category?: string
  created_at: string
}
