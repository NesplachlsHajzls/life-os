'use client'

import { useEffect } from 'react'

interface SheetProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Sheet({ title, onClose, children }: SheetProps) {
  // Lock body scroll without losing scroll position (fixes iOS jump on close)
  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className="relative w-full max-w-[390px] bg-[var(--surface)] rounded-t-[24px] shadow-2xl animate-slide-up"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Title */}
        <div className="px-5 pt-2 pb-4 flex items-center justify-between border-b border-[var(--border)]">
          <h2 className="text-[16px] font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-raised)] text-gray-500 text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Content — extra pb so buttons never hide behind safe area */}
        <div className="px-5 py-4 pb-8">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
      `}</style>
    </div>
  )
}
