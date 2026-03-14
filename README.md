# Life OS

Tvůj osobní operační systém.

## Spuštění

```bash
npm install
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000)

## Nastavení Supabase

1. Zkopíruj `.env.local` a vyplň hodnoty z [dashboard.supabase.com](https://dashboard.supabase.com) → Settings → API
2. `NEXT_PUBLIC_SUPABASE_URL` — URL tvého projektu
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public klíč

## Struktura projektu

```
src/
├── app/              # Stránky (Next.js App Router)
│   ├── page.tsx      # Dashboard
│   ├── todo/
│   ├── finance/
│   ├── prace/
│   ├── kalendar/
│   ├── sport/
│   ├── poznamky/
│   └── nastaveni/
├── components/
│   ├── layout/       # BottomNav, Header
│   └── ui/           # FAB, Badge, Chips
├── features/         # Datové typy a API pro každý modul
│   ├── todo/
│   ├── finance/
│   ├── clients/
│   └── calendar/
└── lib/
    ├── supabase.ts   # Supabase client
    └── utils.ts      # Pomocné funkce
```

## Barevná témata

Témata se přepínají třídou na `<html>` elementu v `layout.tsx`:
- `theme-ocean` (výchozí)
- `theme-forest`
- `theme-sunset`
- `theme-chocolate`
- `theme-lavender`
- `theme-charcoal`
- `theme-coral`
- `theme-midnight`
- `theme-olive`
