# Claude — Kontext projektu Life OS

> Tento soubor slouží jako "paměť" pro Claude. Pokud se ztratí kontext, přečti tento soubor a pokračuj v práci.
> Vlastník: Martin (ojejgamingcz@gmail.com)
> Poslední aktualizace: 24. března 2026

---

## Co je Life OS

Osobní life management aplikace — Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + RLS). Nasazená na Vercel. Primárně mobilní (PWA), responsive.

Účel: Martin ji používá pro správu financí, CRM (práce), úkolů, poznámek, učení, sportu, míst, domácnosti a bucket listu. Appku také prezentuje kolegům v práci — proto existence privacy mode.

---

## Oblasti aplikace (stránky)

| Route | Název | Popis |
|-------|-------|-------|
| `/` | Dashboard | Přehled dne, finance tile, quick access |
| `/finance` | Finance | Výdaje, příjmy, peněženky, závazky, pohledávky, opakované platby |
| `/prace` | Práce (CRM) | Klienti, dealy, aktivity, pipeline |
| `/prace/[id]` | Detail klienta | Kontakty, dealy, aktivity, objednávky, tasky, poznámky, emaily |
| `/prace/pipeline` | Pipeline | Kanban view dealů (drag-n-drop po sloupcích fází) |
| `/prace/import` | Import klientů | Wizard pro import z Outlooku (upload → mapování → preview → import) |
| `/todo` | Úkoly | Tasky (priority 1–3), rutiny (daily/weekly/monthly) |
| `/kalendar` | Kalendář | Události s kategoriemi a vazbou na klienty |
| `/poznamky` | Poznámky | Hierarchické rich-text poznámky (TipTap), schůzky |
| `/poznamky/[id]` | Detail poznámky | Rich text editor, sub-poznámky, autosave (800 ms), vazba na klienta |
| `/learning` | Učení | Oblasti znalostí + knihy |
| `/sport` | Sport | Tréninky, jídlo, suplementy |
| `/places` | Místa | Chci navštívit / navštíveno |
| `/places/[id]` | Detail místa | Info o místě, poznámky |
| `/byt` | Byt | Domácnost — místnosti, úkoly, nákupy |
| `/bucket-list` | Bucket list | Velké a malé životní sny |
| `/emaily` | Emaily | Šablony a drafty |
| `/nastaveni` | Nastavení | Kategorie, peněženky, soukromí |

---

## Důležité technické rozhodnutí a implementace

### Privacy Mode (skrývání částek)
Implementováno v březnu 2026. Přepínač v `/nastaveni` — iOS-style toggle.

**Soubor:** `src/contexts/PrivacyContext.tsx`
- localStorage klíč: `'privacy_hide_amounts'`
- Exportuje: `PrivacyProvider`, `usePrivacy()`, `masked(value, hide)`
- `layout.tsx`: `PrivacyProvider` obaluje `AuthWrapper`

Konzumováno v: `page.tsx` (dashboard), `finance/page.tsx`, `finance/transakce`, `finance/penezenky`, `finance/opakovane`, `finance/zavazky`, `finance/pohledavky`, `nastaveni/page.tsx`

Pattern použití:
```tsx
const { hideAmounts } = usePrivacy()
const h = (n: number) => hideAmounts ? '••••' : `${fmt(n)} Kč`
```

### Learning redesign
Redesignováno v březnu 2026. Původní struktura (kurzy/témata/podcasty) nahrazena:

- **Oblasti** (`LearningArea`) — domény znalostí (př. "Digitalizace zdravotnictví", "Komunikace s klienty")
- **Znalostní záznamy** (`KnowledgeItem`) — konkrétní věci k naučení v dané oblasti
- **Status:** `to_learn | learned | uncertain`
- **Knihy** (`LearningItem` s `type='book'`) — zachovány, záložka Knihy

Nové DB tabulky:
```sql
CREATE TABLE learning_areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL, icon text DEFAULT '🧠', color text DEFAULT '#6366f1',
  description text, sort_order integer DEFAULT 0, created_at timestamptz DEFAULT now()
);
ALTER TABLE learning_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_areas_policy" ON learning_areas FOR ALL USING (auth.uid() = user_id);

CREATE TABLE knowledge_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  area_id uuid REFERENCES learning_areas(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL, notes text, status text DEFAULT 'to_learn',
  source_title text, source_url text, created_at timestamptz DEFAULT now(), learned_at timestamptz
);
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_items_policy" ON knowledge_items FOR ALL USING (auth.uid() = user_id);
```

### Vercel NormalizeError fix (commit e500da4)
Problém: git trackoval `src/app/places/[id]/page.tsx` I `"src/app/places/\\[id\\]/page.tsx"` zároveň.
Fix: `git rm --cached "src/app/places/\\[id\\]/page.tsx"` + commit.

### Git commity (provedené v březnu 2026)
- `e500da4` — fix Vercel NormalizeError (places escaped path)
- `cbb801f` — privacy mode (PrivacyContext + Nastavení toggle)
- learning page rewrite — lokální commit (Martin musí pushovat ručně, sandbox blokuje git push)

---

## Nedokončené věci (TODO)

### 1. Learning — detail oblasti (`/learning/[id]/page.tsx`)
Soubor NEEXISTUJE, potřeba vytvořit. Má obsahovat:
- Header s ikonou, názvem oblasti, barvou, progress barem
- Filter pills: Vše | ✅ Naučil jsem se | 📋 Chci se naučit | ❓ Nejsem si jistý
- Seznam `KnowledgeItem` s quick status toggle
- Quick-add input pro novou položku
- Back button na `/learning`

### 2. SQL migrace v Supabase
Martin musí spustit SQL výše (learning_areas + knowledge_items) v Supabase SQL Editoru, pokud ještě neproběhlo.

### 3. Git push
Martin pushuje ručně ze svého počítače (sandbox blokuje `git push`).

---

## Supabase tabulky — kompletní přehled

### Finance (prefix `ft_`)
`ft_expenses`, `ft_incomes`, `ft_settings` (JSON: wallets, exp_cats, budgets, debts), `ft_recurring`, `ft_commitments`

### CRM
`clients`, `deals`, `client_activities`, `client_contacts`, `client_orders`

### Úkoly & Kalendář
`tasks`, `routines`, `todo_settings`, `calendar_events`, `cal_completed_events`

### Poznámky
`notes` (hierarchické, parent_id, is_meeting, rich-text content)

### Učení
`learning_items` (knihy), `learning_areas`, `knowledge_items`

### Sport
`workouts`, `workout_exercises`, `meal_logs`, `supplements`

### Ostatní
`places`, `byt_rooms`, `byt_todos`, `bucket_items`, `email_templates`, `notifications`

**RLS pravidlo pro všechny tabulky:**
```sql
ALTER TABLE <tabulka> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<tabulka>_policy" ON <tabulka> FOR ALL USING (auth.uid() = user_id);
```

---

## Klíčové soubory

| Soubor | Co dělá |
|--------|---------|
| `src/app/layout.tsx` | Root layout — PrivacyProvider > AuthWrapper > children |
| `src/contexts/PrivacyContext.tsx` | Privacy toggle (hideAmounts) |
| `src/contexts/TabsContext.tsx` | Sdílený stav tabů |
| `src/lib/supabase.ts` | Supabase client |
| `src/lib/authCache.ts` | Modul-level auth cache — rychlé načítání bez waterfallů |
| `src/lib/utils.ts` | Utility funkce: `cn()`, `formatCurrency()`, `formatDate()` |
| `src/hooks/useUser.ts` | Auth session hook |
| `src/hooks/useCategories.ts` | Hook pro načítání AppCategory |
| `src/hooks/useScrollRestoration.ts` | Ukládání a obnovení scroll pozice `<main>` |
| `src/features/finance/hooks/useFinance.ts` | Hlavní finance hook |
| `src/features/prace/api.ts` | CRM typy a CRUD (klienti, dealy, aktivity, kontakty, objednávky) |
| `src/features/prace/hooks/usePrace.ts` | Hlavní prace hook |
| `src/features/categories/api.ts` | Sdílené AppCategory (kalendář, poznámky, todo) |
| `src/features/notifications/api.ts` | Notifikace generované z kalendářních událostí |
| `src/features/learning/api.ts` | Learning typy a CRUD (přepsáno) |
| `src/app/learning/page.tsx` | Learning stránka (přepsána — Témata + Knihy) |
| `src/app/nastaveni/page.tsx` | Nastavení vč. privacy toggle |

---

## ⚠️ PRAVIDLA PRÁCE S KÓDEM A DATABÁZÍ (nikdy nevynechat)

### Ochrana dat a funkčního kódu

- **Nikdy nemazat existující data** — žádné DROP TABLE, TRUNCATE, DELETE bez explicitní žádosti Martina
- **Nikdy nepřepisovat funkční soubor** bez jeho předchozího přečtení — vždy Read tool nejdřív
- **Schema změny jen přes `ADD COLUMN IF NOT EXISTS`** — nikdy ALTER TABLE DROP COLUMN
- **SQL vždy ověřit název tabulky** v kódu (`grep .from(`) před napsáním dotazu — nikdy hádat
- **Nové tabulky vytvářet odděleně od zabezpečení** — nejdřív CREATE TABLE IF NOT EXISTS, pak RLS
- **Kód upravovat chirurgicky** — měnit jen co je potřeba, zbytek nechat beze změny

### ⚠️ BEZPEČNOST — POVINNÉ PRAVIDLO (nikdy nevynechat)

**Každá nová tabulka v Supabase MUSÍ mít okamžitě po vytvoření:**

```sql
ALTER TABLE <tabulka> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<tabulka>_policy" ON <tabulka> FOR ALL USING (auth.uid() = user_id);
```

Toto platí VŽDY — bez výjimky, pro každou tabulku, v každém chatu, bez ohledu na to jestli je tabulka "dočasná" nebo "testovací". Supabase posílalo bezpečnostní upozornění kvůli tabulkám bez RLS (březen 2026). Nesmí se opakovat.

Pokud tabulka nemá přímý `user_id` (např. `workout_exercises` má jen `workout_id`), použij nepřímou politiku:
```sql
CREATE POLICY "<tabulka>_policy" ON <tabulka> FOR ALL
  USING (EXISTS (SELECT 1 FROM <parent_table> p WHERE p.id = parent_id AND p.user_id = auth.uid()));
```

---

## Coding styl a konvence

- Tailwind CSS — mobile-first, žádné externí UI knihovny
- Bottom sheets pro add/edit formuláře (slide-up)
- FAB (`src/components/ui/FAB.tsx`) pro přidávání
- Barvy přes CSS custom properties: `var(--color-primary)`
- Supabase dotazy vždy s `.eq('user_id', userId)` (nebo RLS to zajistí)
- Každá feature má vlastní `api.ts` — žádná business logika ve stránkách
- Složité stránky delegují do custom hooku (`useFinance`, `useTodo`, `usePrace`)
- Czech UI — veškeré texty v češtině
- `fmt(n)` pro formátování čísel, `Kč` za číslem
- Demo mode: `DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'`

---

> Poslední aktualizace kontextu: 2026-03-29


---

## Plán sekcí — rozhodnutí z 29. března 2026

### Sekce k dobudování (plán odsouhlasený s Martinem)

#### Zážitky (sloučení Places + Bucket List)
Záložky: Chci navštívit / Byl jsem / Bucket list
Detail místa:
- Datum od–do
- Google Maps odkaz (ne embedded, jen odkaz)
- Checklist věcí sebou
- Útrata — propojené s Finance (výdaje s kategorií výlet přiřazené k místu)
Bucket list položka: název, kategorie, splněno/nesplněno, datum splnění

#### Návyky (nová sekce — zatím neexistuje)
- Denní checkbox splněno/nesplněno
- Streak (počet dní v řadě)
- Progress bar k cílovému počtu dní
- Týdenní přehled (vizualizace posledních 7 dní)
- TODO: kategorie návyků — dodělat později

#### Tělo & Mysl (přejmenování + rozšíření Sport)
Záložky:
- Pohyb — typ, datum, délka, vzdálenost (u kardio), poznámka. Statistiky za měsíc.
- Jídlo — propojené s Finance. Při zadání výdaje (kategorie jídlo) přidat název jídla. Zobrazuje co jsi jedl po dnech. Bez kalorií, bez makra, bez restaurace.
- Mysl — denní check-in: nálada 1–5, energie 1–5, krátká poznámka
- Suplementy — název, dávka, čas užití

#### Learning (dobudovat detail oblasti)
Záložky: Oblasti / Knihy / Cíle
Detail oblasti:
- Progress bar (z počtu splněných položek)
- Položky se statusem: chci se naučit / učím se / naučil jsem se
- Filter: vše / chci se naučit / učím se / naučil jsem se
- Quick toggle statusu přímo v seznamu
- Poznámky — volný text, osobní wiki k oblasti
Chybí: /learning/[id]/page.tsx — nutno vytvořit

#### Domácnost (přejmenování Byt)
Záložky:
- Místnosti — seznam místností, každá má své úkoly
- Nákupní seznam — rychlý seznam, zaškrtnout při nákupu
- Úkoly domu — věci nevázané na místnost
Smlouvy — odstraněny

### Propojení mezi sekcemi
- Finance ↔ Zážitky: výdaje s kategorií výlet přiřaditelné k místu
- Finance ↔ Tělo & Mysl: výdaje s kategorií jídlo zobrazené v záložce Jídlo
- Návyky ↔ Začni Žít: přirozené propojení (30denní program)

### Vize Life OS jako veřejného produktu
- Samostatný produkt — funguje nezávisle na Začni Žít
- Diferenciace od Notionu: vše předpřipravené, uživatel nemusí nic stavět sám
- Registrace pro cizí uživatele — řeší se později
- AI integrace (Claude API) — řeší se později
