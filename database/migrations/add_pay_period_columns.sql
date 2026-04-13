-- Přidá sloupce pro výplatní období do ft_settings
-- Spusť v Supabase SQL Editoru: https://supabase.com/dashboard → SQL Editor

ALTER TABLE ft_settings
  ADD COLUMN IF NOT EXISTS pay_period_start  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS period_history    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS recurring_v2      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS monthly_income_budget NUMERIC DEFAULT 0;
