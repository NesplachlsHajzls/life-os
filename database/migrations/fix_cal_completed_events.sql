-- Oprava tabulky cal_completed_events
-- Původní schéma mělo event_id UUID + date — kód očekává TEXT + PRIMARY KEY (user_id, event_id)
-- Spusť v Supabase SQL Editoru

DROP TABLE IF EXISTS cal_completed_events;

CREATE TABLE cal_completed_events (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id   TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE cal_completed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own completed events"
  ON cal_completed_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
