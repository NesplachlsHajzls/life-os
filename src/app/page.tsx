'use client'

import Link from 'next/link'

// ── Pomocné typy pro dlaždice ─────────────────────────────────
interface TileTask { dot: 'high' | 'mid' | 'low'; text: string; date: string }

function PriorityDot({ level }: { level: 'high' | 'mid' | 'low' }) {
  const colors = { high: 'bg-red-500', mid: 'bg-orange-500', low: 'bg-green-500' }
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[level]}`} />
}

function TileTaskRow({ task }: { task: TileTask }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <PriorityDot level={task.dot} />
      <span className="flex-1 truncate">{task.text}</span>
      <span className="text-[11px] text-gray-400 flex-shrink-0">{task.date}</span>
    </div>
  )
}

// ── Dlaždice ──────────────────────────────────────────────────
function Tile({
  href, title, icon, children, actions
}: {
  href: string
  title: string
  icon: string
  children: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <Link href={href} className="bg-white rounded-[14px] p-4 shadow-card flex flex-col gap-2.5 active:scale-[0.97] transition-transform">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{title}</span>
        <span className="text-[18px]">{icon}</span>
      </div>
      {children}
      {actions && <div className="flex justify-end mt-1">{actions}</div>}
    </Link>
  )
}

function AddBtn({ color = 'bg-[var(--color-primary)]', label = '+' }: { color?: string; label?: string }) {
  return (
    <button className={`${color} text-white rounded-lg px-3 py-1 text-[13px] font-semibold`} onClick={e => e.preventDefault()}>
      {label}
    </button>
  )
}

// ── Stránka Dashboard ─────────────────────────────────────────
export default function DashboardPage() {
  return (
    <>
      {/* Status bar */}
      <div className="bg-[var(--color-primary)] px-5 py-3 flex justify-between text-white text-[12px] font-semibold">
        <span>9:41</span><span>⚡ 87%</span>
      </div>

      {/* Greeting */}
      <div className="bg-[var(--color-primary)] px-5 pt-0 pb-5 text-white">
        <h2 className="text-[20px] font-bold">Dobré ráno, Martine 👋</h2>
        <p className="text-[13px] text-white/75 mt-0.5">Úterý, 10. března 2026</p>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Horní 2×2 dlaždice */}
        <div className="grid grid-cols-2 gap-3">

          {/* TODO */}
          <Tile href="/todo" title="Todo" icon="✅"
            actions={<AddBtn />}>
            <div className="flex flex-col gap-1.5">
              <TileTaskRow task={{ dot: 'high', text: 'Volat Novák', date: 'dnes' }} />
              <TileTaskRow task={{ dot: 'mid',  text: 'Faktura ABC', date: 'zít.' }} />
              <TileTaskRow task={{ dot: 'low',  text: 'Report Q1',   date: '14.3' }} />
            </div>
          </Tile>

          {/* KALENDÁŘ */}
          <Tile href="/kalendar" title="Kalendář" icon="📅"
            actions={<AddBtn />}>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-[11px] font-bold text-[var(--color-primary-mid)]">10:00</span>
                <span className="truncate">Schůzka Novák</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="text-[11px] font-bold text-green-600">14:00</span>
                <span className="truncate">Gym – Chest</span>
              </div>
            </div>
          </Tile>

          {/* FINANCE */}
          <Tile href="/finance" title="Finance" icon="💰">
            <div className="text-[22px] font-bold">47 200 Kč</div>
            <div className="text-[12px] text-gray-400">utraceno 4 200 / 12 000 Kč</div>
            <div className="flex gap-2 mt-1">
              <button className="flex-1 bg-green-600 text-white rounded-lg py-1 text-[13px] font-semibold" onClick={e => e.preventDefault()}>+ Příjem</button>
              <button className="flex-1 bg-red-500 text-white rounded-lg py-1 text-[13px] font-semibold" onClick={e => e.preventDefault()}>− Výdaj</button>
            </div>
          </Tile>

          {/* PRÁCE */}
          <Tile href="/prace" title="Práce" icon="💼"
            actions={<AddBtn />}>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px]"><span className="truncate">Novák s.r.o.</span><span className="text-gray-400 text-[11px]">4 úkoly</span></div>
              <div className="flex justify-between text-[13px]"><span className="truncate">TechStart</span><span className="text-gray-400 text-[11px]">1 úkol</span></div>
              <div className="flex justify-between text-[13px]"><span className="truncate">ABC Corp</span><span className="text-gray-400 text-[11px]">2 úkoly</span></div>
            </div>
          </Tile>

        </div>

        {/* Nudle — Sport a Poznámky */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/sport" className="bg-white rounded-[14px] px-4 py-3 shadow-card flex items-center justify-between active:scale-[0.97] transition-transform">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">🏋️</span>
              <div>
                <div className="text-[13px] font-bold">Sport</div>
                <div className="text-[11px] text-gray-400">Dnes: Chest day</div>
              </div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>

          <Link href="/poznamky" className="bg-white rounded-[14px] px-4 py-3 shadow-card flex items-center justify-between active:scale-[0.97] transition-transform">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">💡</span>
              <div>
                <div className="text-[13px] font-bold">Poznámky</div>
                <div className="text-[11px] text-gray-400">3 nápady</div>
              </div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        </div>
      </div>
    </>
  )
}
