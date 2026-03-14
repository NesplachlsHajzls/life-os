'use client'

import { useState } from 'react'

interface ChipsProps {
  items: string[]
  defaultActive?: number
  onChange?: (index: number) => void
}

export function Chips({ items, defaultActive = 0, onChange }: ChipsProps) {
  const [active, setActive] = useState(defaultActive)

  return (
    <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-200 overflow-x-auto hide-scrollbar flex-shrink-0">
      {items.map((item, i) => (
        <button
          key={item}
          onClick={() => { setActive(i); onChange?.(i) }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            active === i
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
