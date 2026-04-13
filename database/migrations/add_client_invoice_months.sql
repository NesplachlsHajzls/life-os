-- Měsíční záznamy fakturace per klient
-- Spusť v Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS client_invoice_months (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month      TEXT NOT NULL,          -- formát YYYY-MM, např. "2025-03"
  amount     NUMERIC NOT NULL,       -- fakturovaná částka v CZK
  note       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, month)          -- jeden záznam na měsíc na klienta
);

ALTER TABLE client_invoice_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoice months"
  ON client_invoice_months FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_client_invoice_months_client ON client_invoice_months(client_id);
CREATE INDEX idx_client_invoice_months_month  ON client_invoice_months(client_id, month DESC);
