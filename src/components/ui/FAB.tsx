'use client'

interface FABProps {
  onClick?: () => void
  icon?: string
}

export function FAB({ onClick, icon = '＋' }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[84px] right-[calc(50%-195px+16px)] w-[52px] h-[52px] bg-[var(--color-primary)] text-white rounded-2xl shadow-lg text-[26px] flex items-center justify-center z-40 active:scale-95 transition-transform"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
    >
      {icon}
    </button>
  )
}
