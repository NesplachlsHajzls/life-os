-- Kniha jízd — tabulky pro evidenci jízd, tankování a nastavení vozidla
-- Spusť v Supabase SQL Editoru

-- Nastavení vozidla (počáteční stav odometru)
CREATE TABLE IF NOT EXISTS drive_settings (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_odometer  NUMERIC NOT NULL DEFAULT 0,
  vehicle_name      TEXT DEFAULT '',
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drive_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drive settings"
  ON drive_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Jízdy
CREATE TABLE IF NOT EXISTS drive_trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,           -- YYYY-MM-DD
  from_place  TEXT NOT NULL DEFAULT '',
  to_place    TEXT NOT NULL DEFAULT '',
  km          NUMERIC NOT NULL,
  type        TEXT NOT NULL DEFAULT 'private',  -- 'business' | 'private'
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drive_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drive trips"
  ON drive_trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_drive_trips_user_date ON drive_trips(user_id, date DESC);

-- Tankování
CREATE TABLE IF NOT EXISTS drive_refuels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             TEXT NOT NULL,      -- YYYY-MM-DD
  liters           NUMERIC NOT NULL,
  price_per_liter  NUMERIC NOT NULL,
  note             TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE drive_refuels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drive refuels"
  ON drive_refuels FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_drive_refuels_user_date ON drive_refuels(user_id, date DESC);
