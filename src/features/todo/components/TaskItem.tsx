'use client'

import { Task, TodoCategory } from '../api'
import { PRIORITY_DOTS, formatDueDate, isDueSoon } from '../utils'

interface TaskItemProps {
  task: Task
  categories: TodoCategory[]
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
  onEdit?: (task: Task) => void
  clientsMap?: Record<string, string>   // clientId → clientName
}

export function TaskItem({ task, categories, onToggle, onDelete, onEdit, clientsMap }: TaskItemProps) {
  const done = task.status === 'done'
  const priority = PRIORITY_DOTS[task.priority as 1|2|3] ?? PRIORITY_DOTS[2]
  // Match by name (exact), name (case-insensitive), or id — handles legacy 'prace' vs 'Práce'
  const cat = categories.find(c =>
    c.name === task.category ||
    c.name.toLowerCase() === task.category?.toLowerCase() ||
    c.id === task.category?.toLowerCase()
  )
  const overdue = task.due_date && !done && isDueSoon(task.due_date) && task.due_date < new Date().toISOString().slice(0, 10)
  const clientName = task.client_id && clientsMap ? clientsMap[task.client_id] : null

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-opacity ${done ? 'opacity-50' : ''}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="mt-0.5 flex-shrink-0 w-[22px] h-[22px] rounded-[6px] border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: done ? '#22c55e' : '#d1d5db',
          background: done ? '#22c55e' : 'transparent',
        }}
      >
        {done && <span className="text-white text-[12px] leading-none">✓</span>}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={() => onEdit?.(task)}>
        {/* Date + category + client row */}
        {(task.due_date || cat || clientName) && (
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            {task.due_date && (
              <span
                className="text-[10px] font-bold"
                style={{ color: overdue ? '#ef4444' : '#94a3b8' }}
              >
                {overdue && '⚠️ '}{formatDueDate(task.due_date)}
              </span>
            )}
            {cat && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: cat.color + '22', color: cat.color }}
              >
                {cat.icon} {cat.name}
              </span>
            )}
            {clientName && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500">
                💼 {clientName}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <div
          className="text-[14px] font-semibold leading-snug"
          style={{
            color: done ? '#9ca3af' : '#111827',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </div>

        {/* Note */}
        {task.note && (
          <div className="text-[12px] text-gray-400 mt-0.5 line-clamp-1">{task.note}</div>
        )}

        {/* URL */}
        {task.url && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium mt-0.5 inline-block truncate max-w-full"
            style={{ color: 'var(--color-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            🔗 {task.url.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
      </div>

      {/* Priority dots + actions */}
      <div className="flex-shrink-0 flex items-center gap-1 mt-1">
        <span
          className="text-[10px] font-bold leading-none mr-0.5"
          style={{ color: priority.color }}
          title={priority.title}
        >
          {priority.label}
        </span>
        {onEdit && (
          <button
            onClick={() => onEdit(task)}
            className="w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-blue-400 hover:bg-blue-50 text-[11px] transition-colors"
            title="Upravit úkol"
          >
            ✏️
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 text-[12px] transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}
