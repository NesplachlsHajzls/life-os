const variants = {
  waiting: 'bg-[var(--surface-raised)] text-gray-500',
  active:  'bg-orange-100 text-orange-700',
  done:    'bg-green-100 text-green-700',
  today:   'bg-red-100 text-red-600',
}

interface BadgeProps {
  variant: keyof typeof variants
  children: React.ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${variants[variant]}`}>
      {children}
    </span>
  )
}
