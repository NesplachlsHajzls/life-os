'use client'

import { Task, TodoCategory } from '../api'

interface TaskItemProps {
  task: Task
  categories: TodoCategory[]
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
  onEdit?: (task: Task) => void
  clientsMap?: Record<string, string>
  showCategory?: boolean   // pass false when viewing a single-category filter
}

const PRIORITY_COLORS: Record<number, string> = {
  3: '#ef4444',
  2: '#f59e0b',
  1: '#3b82f6',
}

function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  const now = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const todayStr = now.toISOString().slice(0, 10)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  if (d === todayStr) return 'Dnes'
  if (d === tomorrowStr) return 'Zítra'
  return dt.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
}

export function TaskItem({
  task, categories, onToggle, onDelete, onEdit, clientsMap, showCategory = true
}: TaskItemProps) {
  const done    = task.status === 'done'
  const today   = new Date().toISOString().slice(0, 10)
  const overdue = !done && !!task.due_date && task.due_date < today
  const cat     = categories.find(c =>
    c.name === task.category ||
    c.name.toLowerCase() === task.category?.toLowerCase()
  )
  const clientName = task.client_id && clientsMap ? clientsMap[task.client_id] : null
  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#6b7280'

  const hasMeta = task.due_date || (showCategory && cat) || clientName || task.note || task.url

  return (
    <div
      className={`group relative flex items-start gap-3 px-4 py-3 transition-colors ${done ? 'opacity-40' : ''}`}
    >
      {/* Priority left accent bar */}
      {!done && (
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ background: priorityColor + '60' }}
        />
      )}

      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(task) }}
        className="mt-[3px] flex-shrink-0 w-[20px] h-[20px] rounded-[5px] border-2 flex items-center justify-center transition-all active:scale-90"
        style={{
          borderColor: done ? '#22c55e' : 'var(--border-strong)',
          background:  done ? '#22c55e' : 'transparent',
        }}
      >
        {done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content — clicking opens edit */}
      <div className="flex-1 min-w-0" onClick={() => onEdit?.(task)}>
        <div
          className="text-[14px] leading-snug"
          style={{
            fontWeight:     done ? 400 : 500,
            color:          done ? 'var(--text-tertiary)' : 'var(--text-primary)',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </div>

        {hasMeta && (
          <div className="flex items-center gap-1.5 mt-[5px] flex-wrap">
            {task.due_date && (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-medium"
                style={{ color: overdue ? '#ef4444' : 'var(--text-tertiary)' }}
              >
                {overdue && '⚠ '}{fmtDate(task.due_date)}
              </span>
            )}
            {showCategory && cat && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-[2px] rounded-[5px]"
                style={{ background: cat.color + '1a', color: cat.color }}
              >
                {cat.icon} {cat.name}
              </span>
            )}
            {clientName && (
              <span
                className="inline-flex items-center text-[11px] font-medium px-1.5 py-[2px] rounded-[5px]"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}
              >
                💼 {clientName}
              </span>
            )}
            {task.note && !task.url && (
              <span className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[140px]">
                {task.note}
              </span>
            )}
            {task.url && (
              <a
                href={task.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[11px] font-medium truncate max-w-[120px]"
                style={{ color: 'var(--color-primary)' }}
              >
                🔗 {task.url.replace(/^https?:\/\//, '').slice(0, 28)}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Delete action — subtle, always visible on mobile */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(task.id) }}
        className="flex-shrink-0 w-7 h-7 rounded-[7px] flex items-center justify-center transition-colors mt-[0px]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
