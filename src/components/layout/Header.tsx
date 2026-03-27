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
    <div
      className="px-5 pt-3 pb-4 flex-shrink-0"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center gap-2 text-sm mb-2 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="text-lg">‹</span>
          <span>{backLabel ?? 'Zpět'}</span>
        </Link>
      )}
      <div className="relative flex items-center justify-between min-h-[36px]">
        {/* Titulek absolutně vycentrovaný */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1
            className="text-[22px] font-bold leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {/* Levý placeholder pro symetrii */}
        <div className="w-8 flex-shrink-0" />
        {/* Pravá strana — akce + notifikace */}
        <div className="flex items-center gap-2 relative z-10">
          {action && <div>{action}</div>}
          {!hideNotifications && !backHref && <NotificationCenter />}
        </div>
      </div>
      {/* Oranžová linka dole jako akcent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, transparent 100%)', opacity: 0.6 }}
      />
    </div>
  )
}
