import Link from 'next/link'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

interface HeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  action?: React.ReactNode
  hideNotifications?: boolean
}

export function Header({ title, subtitle, backHref, backLabel, action, hideNotifications }: HeaderProps) {
  return (
    <div className="bg-[var(--color-primary)] px-5 pt-3 pb-5 text-white flex-shrink-0">
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center gap-2 text-white/80 text-sm mb-2 hover:text-white transition-colors"
        >
          <span className="text-lg">‹</span>
          <span>{backLabel ?? 'Zpět'}</span>
        </Link>
      )}
      <div className="relative flex items-center justify-between min-h-[36px]">
        {/* Titulek absolutně vycentrovaný */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-[22px] font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-[13px] text-white/75">{subtitle}</p>}
        </div>
        {/* Levá strana — prázdný placeholder pro symetrii */}
        <div className="w-8 flex-shrink-0" />
        {/* Pravá strana — akce + notifikace */}
        <div className="flex items-center gap-2 relative z-10">
          {action && <div>{action}</div>}
          {!hideNotifications && !backHref && <NotificationCenter />}
        </div>
      </div>
    </div>
  )
}
