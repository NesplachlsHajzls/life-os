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
      className="px-5 pt-4 pb-4 flex-shrink-0 relative"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm mb-3 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="text-base leading-none">‹</span>
          <span className="text-[12px] tracking-wide uppercase font-medium">{backLabel ?? 'Zpět'}</span>
        </Link>
      )}
      <div className="relative flex items-center justify-between min-h-[36px]">
        {/* Titulek absolutně vycentrovaný */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1
            className="leading-tight tracking-tight"
            style={{
              fontFamily: "'Space Grotesk', 'DM Sans', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-primary)',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] mt-0.5 tracking-wider uppercase" style={{ color: 'var(--text-tertiary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {/* Levý placeholder pro symetrii */}
        <div className="w-8 flex-shrink-0" />
        {/* Pravá strana */}
        <div className="flex items-center gap-2 relative z-10">
          {action && <div>{action}</div>}
          {!hideNotifications && !backHref && <NotificationCenter />}
        </div>
      </div>
      {/* Oranžová linka dole */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-mid) 40%, transparent 100%)' }}
      />
    </div>
  )
}
