-- ============================================================
--  LIFE OS — DATABÁZOVÉ SCHÉMA
--  Automaticky generováno z TypeScript interfaců
--  Aktualizuj při každé změně tabulek!
--  Poslední aktualizace: 2026-04-02
-- ============================================================
-- PRAVIDLO: Před každou změnou kódu která sahá na DB:
--   1. Zkontroluj tento soubor
--   2. Nepřepisuj existující data — NIKDY upsert na settings tabulky
--   3. Nové sloupce: ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── TODO ──────────────────────────────────────────────────────

-- tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'done'
  priority    INT  NOT NULL DEFAULT 2,           -- 1=low 2=medium 3=high
  due_date    DATE,
  category    TEXT,
  client_id   UUID REFERENCES clients(id),
  done_at     TIMESTAMPTZ,
  note        TEXT,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- routines (opakované úkoly)
CREATE TABLE IF NOT EXISTS routines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  frequency   TEXT NOT NULL DEFAULT 'daily',    -- 'daily' | 'weekly' | 'monthly'
  category    TEXT,
  priority    INT  DEFAULT 2,
  last_done   DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- todo_settings (kategorie, nastavení)
-- ⚠️ NIKDY nepřepisuj celý řádek — UPDATE jen konkrétní sloupce
CREATE TABLE IF NOT EXISTS todo_settings (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  categories  JSONB DEFAULT '[]',               -- AppCategory[]
  dashboard_note TEXT                           -- privátní poznámka na dashboardu
);

-- ── KALENDÁŘ ──────────────────────────────────────────────────

-- calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime   TIMESTAMPTZ,
  is_all_day     BOOLEAN DEFAULT false,
  emoji          TEXT,
  category       TEXT,
  client_id      UUID REFERENCES clients(id),
  description    TEXT,
  color          TEXT,
  is_recurring   BOOLEAN DEFAULT false,
  recur_freq     TEXT,                          -- 'daily'|'weekly'|'monthly'|'yearly'
  recur_interval INT DEFAULT 1,
  recur_end_date DATE,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- cal_completed_events (splněné opakující se události)
CREATE TABLE IF NOT EXISTS cal_completed_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  date       DATE NOT NULL
);

-- ── FINANCE ───────────────────────────────────────────────────
-- ⚠️ ft_settings: NIKDY upsert — používej INSERT (nový user) nebo UPDATE (existující)
-- Pokud vidíš `upsert` v kódu → nahraď za INSERT nebo UPDATE!

-- ft_expenses
CREATE TABLE IF NOT EXISTS ft_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  category    TEXT NOT NULL,                    -- klíč do ft_settings.exp_cats
  date        DATE NOT NULL,
  wallet_id   TEXT,                             -- id z ft_settings.wallets[]
  recur_id    UUID REFERENCES ft_recurring(id),
  note        TEXT DEFAULT '',
  tags        TEXT[] DEFAULT '{}'
);

-- ft_incomes
CREATE TABLE IF NOT EXISTS ft_incomes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  category    TEXT NOT NULL,
  date        DATE NOT NULL,
  note        TEXT DEFAULT ''
);

-- ft_commitments (pravidelné závazky — nájem, předplatné...)
CREATE TABLE IF NOT EXISTS ft_commitments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  category    TEXT NOT NULL,
  frequency   TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly'|'quarterly'|'biannual'|'annual'
  start_date  DATE,
  end_date    DATE
);

-- ft_recurring (automatické opakované výdaje)
CREATE TABLE IF NOT EXISTS ft_recurring (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  category    TEXT NOT NULL,
  last_added  DATE
);

-- ft_settings (kategorie + peneženky — JEDEN ŘÁDEK NA UŽIVATELE)
-- ⚠️ wallets jsou pole objektů uložené jako JSONB — NE samostatná tabulka
-- ⚠️ exp_cats jsou JSONB objekt {klíč: {icon, color}} — klíče MUSÍ odpovídat category v ft_expenses
CREATE TABLE IF NOT EXISTS ft_settings (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exp_cats    JSONB NOT NULL DEFAULT '{}',      -- CatMap: Record<string, {icon, color}>
  wallets     JSONB NOT NULL DEFAULT '[]',      -- Wallet[]: [{id,name,icon,color,balance,type}]
  budgets     JSONB NOT NULL DEFAULT '{}',      -- Record<category, limitKc>
  debts       JSONB DEFAULT '[]'               -- Debt[]: [{id,person,amount,note,date_from,date_to,type}]
);

-- ── I.CA / PRÁCE ──────────────────────────────────────────────

-- clients
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  icon                  TEXT DEFAULT '🏢',
  color                 TEXT DEFAULT '#3b82f6',
  status                TEXT DEFAULT 'Aktivní',   -- 'Potenciální'|'Aktivní'|'Pozastavený'|'Ukončený'
  subject_type          TEXT,                      -- typ subjektu (FO, s.r.o., ...)
  ico                   TEXT,
  kraj                  TEXT,
  note                  TEXT,
  first_meeting_status  TEXT DEFAULT 'none',      -- 'none'|'scheduled'|'done'
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- client_contacts
CREATE TABLE IF NOT EXISTS client_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  phone      TEXT
);

-- client_activities (log aktivit u klienta)
CREATE TABLE IF NOT EXISTS client_activities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  type       TEXT NOT NULL,                     -- 'call'|'email'|'meeting'|'note'
  note       TEXT,
  date       TIMESTAMPTZ DEFAULT now()
);

-- client_orders
CREATE TABLE IF NOT EXISTS client_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  amount      NUMERIC,
  status      TEXT DEFAULT 'draft',
  issued_date DATE,
  due_date    DATE,
  note        TEXT
);

-- deals (obchodní příležitosti)
CREATE TABLE IF NOT EXISTS deals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  value       NUMERIC,
  stage       TEXT DEFAULT 'lead',
  probability INT DEFAULT 50,
  close_date  DATE,
  note        TEXT
);

-- ── POZNÁMKY ──────────────────────────────────────────────────

-- notes
CREATE TABLE IF NOT EXISTS notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Nová poznámka',
  content     TEXT DEFAULT '',
  icon        TEXT DEFAULT '📝',
  color       TEXT,
  parent_id   UUID REFERENCES notes(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id),
  is_pinned   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── SPORT & TĚLO ──────────────────────────────────────────────

-- workouts
CREATE TABLE IF NOT EXISTS workouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  type        TEXT NOT NULL,
  duration    INT,                              -- minuty
  note        TEXT,
  exercises   JSONB DEFAULT '[]'               -- WorkoutExercise[]
);

-- meal_logs
CREATE TABLE IF NOT EXISTS meal_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  meal_type   TEXT NOT NULL,                   -- 'breakfast'|'lunch'|'dinner'|'snack'
  description TEXT NOT NULL,
  calories    INT,
  protein     INT
);

-- supplements
CREATE TABLE IF NOT EXISTS supplements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  dose        TEXT,
  timing      TEXT,
  active      BOOLEAN DEFAULT true
);

-- habits + habit_logs
CREATE TABLE IF NOT EXISTS habits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  icon        TEXT DEFAULT '🎯',
  color       TEXT DEFAULT '#3b82f6',
  frequency   TEXT DEFAULT 'daily',
  target_days INT DEFAULT 7,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id   UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  date       DATE NOT NULL,
  done       BOOLEAN DEFAULT true,
  UNIQUE(habit_id, date)
);

-- mind_logs (nálada, stres, energie)
CREATE TABLE IF NOT EXISTS mind_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  mood       INT,                              -- 1-5
  energy     INT,                             -- 1-5
  stress     INT,                             -- 1-5
  note       TEXT,
  UNIQUE(user_id, date)
);

-- ── BYT / DOMÁCNOST ───────────────────────────────────────────

-- byt_rooms
CREATE TABLE IF NOT EXISTS byt_rooms (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  icon     TEXT DEFAULT '🏠'
);

-- byt_room_todos
CREATE TABLE IF NOT EXISTS byt_room_todos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID NOT NULL REFERENCES byt_rooms(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL,
  title     TEXT NOT NULL,
  done      BOOLEAN DEFAULT false,
  priority  INT DEFAULT 2
);

-- byt_contracts (smlouvy — nájem, energie...)
CREATE TABLE IF NOT EXISTS byt_contracts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  provider     TEXT,
  amount       NUMERIC,
  frequency    TEXT,
  start_date   DATE,
  end_date     DATE,
  note         TEXT,
  document_url TEXT
);

-- home_tasks + home_shopping
CREATE TABLE IF NOT EXISTS home_tasks (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  done     BOOLEAN DEFAULT false,
  due_date DATE,
  priority INT DEFAULT 2
);

CREATE TABLE IF NOT EXISTS home_shopping (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  qty       TEXT,
  done      BOOLEAN DEFAULT false,
  category  TEXT
);

-- ── LEARNING ──────────────────────────────────────────────────

-- learning_areas + learning_items + knowledge_items
CREATE TABLE IF NOT EXISTS learning_areas (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  icon     TEXT DEFAULT '📚',
  color    TEXT DEFAULT '#3b82f6'
);

CREATE TABLE IF NOT EXISTS learning_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES learning_areas(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  type        TEXT DEFAULT 'article',          -- 'article'|'book'|'video'|'course'
  url         TEXT,
  status      TEXT DEFAULT 'planned',          -- 'planned'|'in_progress'|'done'
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT,
  tags        TEXT[] DEFAULT '{}',
  source_id   UUID REFERENCES learning_items(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ZÁŽITKY / MÍSTA ───────────────────────────────────────────

-- places
CREATE TABLE IF NOT EXISTS places (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  country     TEXT,
  city        TEXT,
  rating      INT,
  visited     BOOLEAN DEFAULT false,
  visited_at  DATE,
  note        TEXT,
  lat         NUMERIC,
  lng         NUMERIC
);

-- trips + trip_items
CREATE TABLE IF NOT EXISTS trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  destination TEXT,
  start_date  DATE,
  end_date    DATE,
  budget      NUMERIC,
  note        TEXT
);

CREATE TABLE IF NOT EXISTS trip_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id   UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL,
  title     TEXT NOT NULL,
  type      TEXT,                              -- 'transport'|'accommodation'|'activity'|'other'
  date      DATE,
  amount    NUMERIC,
  done      BOOLEAN DEFAULT false,
  note      TEXT
);

-- ── BUCKET LIST ───────────────────────────────────────────────

-- bucket_items
CREATE TABLE IF NOT EXISTS bucket_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT,
  priority    INT DEFAULT 2,
  done        BOOLEAN DEFAULT false,
  done_at     DATE,
  target_date DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── EMAILY ────────────────────────────────────────────────────

-- imported_emails
CREATE TABLE IF NOT EXISTS imported_emails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     TEXT,
  sender      TEXT,
  received_at TIMESTAMPTZ,
  body        TEXT,
  summary     TEXT,
  category    TEXT,
  action_needed BOOLEAN DEFAULT false,
  processed   BOOLEAN DEFAULT false
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  RLS POLICIES (vzor — každá tabulka musí mít)
-- ============================================================
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users see own data" ON tasks
--   FOR ALL USING (user_id = auth.uid());
-- (Opakuj pro každou tabulku výše)

-- ============================================================
--  INDEXY (výkon)
-- ============================================================
-- CREATE INDEX IF NOT EXISTS idx_tasks_user       ON tasks(user_id);
-- CREATE INDEX IF NOT EXISTS idx_ft_expenses_user ON ft_expenses(user_id, date DESC);
-- CREATE INDEX IF NOT EXISTS idx_cal_events_user  ON calendar_events(user_id, start_datetime);
-- CREATE INDEX IF NOT EXISTS idx_notes_user       ON notes(user_id, updated_at DESC);
