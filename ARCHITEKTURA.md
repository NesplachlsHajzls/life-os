# Life OS — Architektura aplikace

> Aktualizováno: březen 2026

---

## Tech stack

| Vrstva | Technologie |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| State management | React hooks + Context API |
| Rich text | TipTap (RichTextEditor) |

---

## Struktura projektu

```
src/
├── app/                    # Next.js App Router stránky
│   ├── page.tsx            # Dashboard (/)
│   ├── layout.tsx          # Root layout — AuthWrapper, PrivacyProvider
│   ├── login/page.tsx      # Přihlášení
│   ├── nastaveni/page.tsx  # Nastavení
│   ├── todo/page.tsx       # Úkoly & Rutiny
│   ├── kalendar/page.tsx   # Kalendář
│   ├── poznamky/
│   │   ├── page.tsx        # Seznam poznámek
│   │   └── [id]/page.tsx   # Detail poznámky (editor)
│   ├── prace/
│   │   ├── page.tsx        # CRM — seznam klientů
│   │   ├── [id]/page.tsx   # Detail klienta (aktivity, dealy, úkoly)
│   │   ├── pipeline/page.tsx # Pipeline view dealů
│   │   └── import/page.tsx # CSV import klientů
│   ├── finance/
│   │   ├── page.tsx        # Přehled — hero karta, quick-add, kategorie
│   │   ├── transakce/page.tsx  # Plný seznam transakcí s filtrem
│   │   ├── penezenky/page.tsx  # Peněženky / účty
│   │   ├── opakovane/page.tsx  # Opakované platby
│   │   ├── zavazky/page.tsx    # Závazky (dluhy)
│   │   └── pohledavky/page.tsx # Pohledávky
│   ├── learning/
│   │   ├── page.tsx        # Témata + Knihy (2 taby)
│   │   └── [id]/page.tsx   # Detail oblasti — seznam položek (TODO)
│   ├── sport/page.tsx      # Tréninky, jídlo, suplementy
│   ├── places/
│   │   ├── page.tsx        # Místa — chci navštívit / navštíveno
│   │   └── [id]/page.tsx   # Detail místa
│   ├── byt/page.tsx        # Správa domácnosti — místnosti, úkoly, nákupy
│   ├── bucket-list/page.tsx # Bucket list (velké & malé sny)
│   └── emaily/page.tsx     # Email šablony & drafty
│
├── features/               # Business logika rozdělená po doménách
│   ├── finance/
│   │   ├── api.ts          # CRUD pro expenses, incomes, wallets, debts, recurring
│   │   ├── types.ts        # Typy
│   │   ├── utils.ts        # fmt(), mLabel(), kategorie
│   │   ├── hooks/useFinance.ts  # Hlavní hook — state, výpočty, akce
│   │   └── components/
│   │       ├── AddTransactionSheet.tsx
│   │       ├── FinanceTabs.tsx
│   │       └── Sheet.tsx
│   ├── prace/
│   │   ├── api.ts          # CRUD pro clients, deals, activities, tasks
│   │   ├── hooks/usePrace.ts
│   │   └── ...
│   ├── todo/
│   │   ├── api.ts          # CRUD pro tasks, routines, settings
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── hooks/useTodo.ts
│   │   └── components/
│   │       ├── AddTaskSheet.tsx
│   │       └── TaskItem.tsx
│   ├── learning/
│   │   └── api.ts          # CRUD pro learning_items, learning_areas, knowledge_items
│   ├── notes/api.ts        # CRUD pro notes (hierarchické, rich-text)
│   ├── calendar/
│   │   ├── api.ts
│   │   └── types.ts
│   ├── categories/api.ts   # Sdílené AppCategory (todo + calendar + notes)
│   ├── clients/types.ts    # Sdílené typy klientů
│   ├── sport/api.ts        # CRUD pro workouts, exercises, meals, supplements
│   ├── places/api.ts       # CRUD pro places
│   ├── byt/api.ts          # CRUD pro byt_rooms, byt_todos, byt_shopping
│   ├── bucket/api.ts       # CRUD pro bucket_items
│   ├── emails/api.ts       # CRUD pro email šablony
│   └── notifications/api.ts
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Horní lišta s názvem stránky
│   │   ├── BottomNav.tsx       # Spodní navigace (5 hlavních sekcí)
│   │   ├── Sidebar.tsx         # Boční menu pro tablet/desktop
│   │   ├── AppDrawer.tsx       # Slide-out drawer pro přístup ke všem sekcím
│   │   ├── AuthWrapper.tsx     # Obalovač ověření uživatele
│   │   ├── TabBar.tsx          # Horizontální taby (reusable)
│   │   ├── FloatingNoteButton.tsx  # Plovoucí tlačítko pro rychlou poznámku
│   │   └── ThemeProvider.tsx   # CSS custom properties (--color-primary atd.)
│   ├── ui/
│   │   ├── FAB.tsx             # Floating Action Button (+ tlačítko)
│   │   ├── Badge.tsx           # Status odznaky
│   │   ├── Chips.tsx           # Filter chipsy
│   │   └── RichTextEditor.tsx  # TipTap wrapper
│   └── notifications/
│       └── NotificationCenter.tsx
│
├── contexts/
│   ├── PrivacyContext.tsx   # Globální skrytí částek (hideAmounts)
│   └── TabsContext.tsx      # Sdílený stav tabů napříč stránkami
│
├── hooks/
│   ├── useUser.ts               # Supabase Auth (session, user)
│   ├── useCategories.ts         # Sdílené AppCategory
│   └── useScrollRestoration.ts  # Obnova scroll pozice při návratu
│
└── lib/
    ├── supabase.ts     # Supabase client
    ├── authCache.ts    # Cache uživatelské session
    └── utils.ts        # Sdílené utility
```

---

## Databázové tabulky (Supabase / PostgreSQL)

Všechny tabulky mají `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE` a zapnuté Row Level Security (RLS) s politikou `auth.uid() = user_id`.

### Finance

| Tabulka | Popis |
|---------|-------|
| `expenses` | Výdaje — amount, category, date, wallet_id, recur_id, tags |
| `incomes` | Příjmy — amount, category, date |
| `finance_settings` | Nastavení — exp_cats (JSON), wallets (JSON), budgets (JSON), debts (JSON) |
| `recurring_payments` | Opakované platby — amount, category, last_added |
| `commitments` | Závazky — amount, category, frequency (monthly/quarterly/biannual/annual) |

### Práce (CRM)

| Tabulka | Popis |
|---------|-------|
| `clients` | Klienti — name, status, subject_type, icon, color, contact info |
| `client_deals` | Dealy — client_id, stage, value, title |
| `client_activities` | Aktivity — client_id, type (call/email/meeting/note), date, note |
| `client_contacts` | Kontaktní osoby klienta |

### Úkoly & Kalendář

| Tabulka | Popis |
|---------|-------|
| `tasks` | Úkoly — title, priority (1–3), category, client_id, due_date, status |
| `routines` | Rutiny — title, frequency (daily/weekly/monthly) |
| `todo_settings` | Nastavení kategorií |
| `calendar_events` | Události — title, date, time, category, client_id |
| `app_categories` | Sdílené kategorie (todo + calendar + notes) |

### Poznámky

| Tabulka | Popis |
|---------|-------|
| `notes` | Hierarchické poznámky — title, content (HTML), parent_id, client_id, is_meeting, icon |

### Učení

| Tabulka | Popis |
|---------|-------|
| `learning_items` | Knihy — type='book', title, author, status, progress, total_pages, current_page, cover_emoji |
| `learning_areas` | Oblasti znalostí — name, icon, color, description, sort_order |
| `knowledge_items` | Znalostní záznamy — area_id, title, notes, status (to_learn/learned/uncertain), learned_at |

### Sport

| Tabulka | Popis |
|---------|-------|
| `workouts` | Tréninky — type, title, date, duration_min, distance_km, calories |
| `workout_exercises` | Cvičení v tréninku — name, sets, reps, weight_kg |
| `meal_logs` | Jídlo — date, meal_type, description, calories |
| `supplements` | Suplementy — name, dose, timing, active |

### Ostatní

| Tabulka | Popis |
|---------|-------|
| `places` | Místa — name, type, city, country, status (want/visited), rating, tags |
| `byt_rooms` | Místnosti — name, icon, order_index |
| `byt_todos` | Úkoly místnosti — room_id, title, done, type (todo/buy), price |
| `bucket_items` | Bucket list — title, category, size (big/small), status (todo/done) |
| `email_templates` | Email šablony |
| `notifications` | Notifikace |

---

## Kontexty (React Context API)

### PrivacyContext (`src/contexts/PrivacyContext.tsx`)

Globální přepínač pro skrytí finančních částek. Persistuje v `localStorage`.

```typescript
interface PrivacyCtx {
  hideAmounts: boolean
  toggleHideAmounts: () => void
}
```

Konzumován v: `nastaveni/page.tsx`, `page.tsx` (dashboard), `finance/page.tsx`, `finance/transakce`, `finance/penezenky`, `finance/opakovane`, `finance/zavazky`, `finance/pohledavky`.

### TabsContext (`src/contexts/TabsContext.tsx`)

Sdílený stav aktivního tabu napříč stránkami (finance, learning, sport atd.) — zachovává vybraný tab při návratu zpět.

---

## Klíčové hooks

### `useUser` (`src/hooks/useUser.ts`)

Supabase Auth wrapper. Vrací `{ user, session, loading }`. Využívá `authCache` pro minimalizaci opakovaných dotazů.

### `useFinance` (`src/features/finance/hooks/useFinance.ts`)

Hlavní hook finance sekce. Načítá vše (výdaje, příjmy, peněženky, nastavení) a poskytuje:

- Vypočítané hodnoty: `totalInc`, `totalExp`, `totalCom`, `volne`
- Filtrování po měsíci: `filtExpenses`, `filtIncomes`, `catSums`
- Akce: `addExpenseText`, `addExpenseManual`, `addIncomeText`, `addIncomeManual`, `editExpenseWithWallet`, `editIncome`, `removeExpense`, `removeIncome`
- Správa peněženek: walletů při každé transakci automaticky přepočítává zůstatek
- Opakované platby: `dueRecurring`, `confirmRecurring`

### `useTodo` (`src/features/todo/hooks/useTodo.ts`)

Správa úkolů — načítání, přidávání, editace, mazání, filtrování dle priority/kategorie/klienta.

### `usePrace` (`src/features/prace/hooks/usePrace.ts`)

CRM hook — klienti, dealy, aktivity, pipeline statistiky.

### `useCategories` (`src/hooks/useCategories.ts`)

Sdílené AppCategory pro todo, kalendář a poznámky. Načítá z `app_categories` tabulky nebo vrací výchozí.

---

## Klíčové datové typy

### Finance

```typescript
interface Expense { id, user_id, description, amount, category, date, wallet_id, recur_id, note, tags }
interface Income  { id, user_id, description, amount, category, date, note }
interface Wallet  { id, name, icon, color, balance, type }
interface Debt    { id, person, amount, note, date_from, date_to?, type: 'liability' | 'receivable' }
interface Recurring { id, user_id, description, amount, category, last_added? }
interface Commitment { id, user_id, description, amount, category, frequency }
```

### CRM (Práce)

```typescript
type ClientStatus = 'Potenciální' | 'Aktivní' | 'Pozastavený' | 'Ukončený'
type SubjectType  = 'Komerční' | 'Zdravotnictví soukromé' | 'Zdravotnictví veřejné' | 'Obec' | 'Veřejná správa'
type DealStage    = 'Nový lead' | 'Kontaktován' | 'Nabídka' | 'Vyjednávání' | 'Uzavřen' | 'Ztracen'
type ActivityType = 'call' | 'email' | 'meeting' | 'note'
```

### Učení

```typescript
type KnowledgeStatus = 'to_learn' | 'learned' | 'uncertain'
interface LearningArea  { id, user_id, name, icon, color, description, sort_order }
interface KnowledgeItem { id, user_id, area_id, title, notes, status, source_title, source_url, learned_at }
interface LearningItem  { id, user_id, type: 'book', title, author, status, progress, total_pages, current_page, cover_emoji }
```

### Sport

```typescript
type WorkoutType = 'run' | 'swim' | 'gym' | 'bike' | 'yoga' | 'other'
interface Workout   { id, user_id, type, title, date, duration_min, distance_km, notes, calories }
interface MealLog   { id, user_id, date, meal_type, description, calories }
interface Supplement { id, user_id, name, dose, timing, notes, active }
```

### Ostatní

```typescript
type BucketCategory = 'travel' | 'experience' | 'career' | 'personal' | 'health' | 'finance' | 'family' | 'other'
type PlaceType      = 'restaurant' | 'cafe' | 'hotel' | 'bar' | 'attraction' | 'other'
interface Note      { id, user_id, title, content, parent_id, client_id, is_meeting, meeting_date, icon, category }
interface Task      { id, user_id, title, priority: 1|2|3, category, client_id, due_date, status: 'open'|'done' }
```

---

## Navigace & layout

Aplikace je navržena jako **mobile-first PWA** s responsive layoutem.

- **BottomNav** — 5 hlavních sekcí (Dashboard, Finance, Práce, Úkoly, Více)
- **AppDrawer** — slide-out menu se všemi sekcemi
- **Header** — horní lišta s názvem stránky, back tlačítkem a akcemi
- **FAB** — plovoucí `+` tlačítko pro přidání v aktuálním kontextu
- **Sheet** — bottom sheet pro add/edit formuláře (slide-up modal)
- **TabBar** — horizontální taby uvnitř sekcí (Finance, Learning, Sport)

---

## Autentizace

Supabase Auth (email + heslo). `AuthWrapper` kontroluje session při startu — pokud není přihlášen, přesměruje na `/login`. Demo mode: `DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'` pro stránky bez povinného přihlášení.

---

## Architektonické vzory

**Feature-first struktura** — každá doména (`finance`, `prace`, `todo`...) má vlastní složku v `features/` s `api.ts`, volitelně `types.ts`, `utils.ts`, `hooks/` a `components/`.

**Hooks jako controller** — složité stránky delegují veškerý state a business logiku do custom hooku (`useFinance`, `useTodo`, `usePrace`). Stránka (`page.tsx`) je čistě prezentační vrstva.

**Supabase RLS** — bezpečnost na úrovni databáze. Každý řádek je chráněn politikou `auth.uid() = user_id`. Aplikace nikdy explicitně nefiltruje cizí data — to zajišťuje databáze.

**Context pro globální UI state** — `PrivacyContext` a `TabsContext` jsou v root layoutu, aby stav přežil navigaci mezi stránkami bez zbytečného re-fetch.

**Optimistické UI** — akce jako přidání transakce nebo dokončení úkolu okamžitě aktualizují lokální stav, Supabase zápis probíhá na pozadí.
