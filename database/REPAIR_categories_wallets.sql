-- ============================================================
--  LIFE OS — OPRAVNÝ SQL SKRIPT
--  Spusť v Supabase → SQL Editor
--  Nejdřív KROK 1 (zjisti kategorie), pak KROK 2 (oprav)
-- ============================================================

-- ── KROK 1: Zjisti jaké kategorie máš v transakcích ──────────
-- Zkopíruj výsledek, zkontroluj že jsou tam všechny tvoje kategorie

SELECT DISTINCT category, COUNT(*) as pocet
FROM ft_expenses
WHERE user_id = auth.uid()
GROUP BY category
ORDER BY pocet DESC;

-- ── KROK 2: Obnov exp_cats dle skutečných klíčů v transakcích ─
-- Upravuj jen ikony/barvy — KLÍČE musí přesně odpovídat výsledku KROKU 1!
-- Přidej/odeber kategorie podle skutečného výsledku výše.

UPDATE ft_settings
SET exp_cats = jsonb_build_object(
  'bydleni',      jsonb_build_object('icon', '🏠', 'color', '#8b5cf6'),
  'obleceni',     jsonb_build_object('icon', '👕', 'color', '#f59e0b'),
  'jidlo',        jsonb_build_object('icon', '🍽️', 'color', '#f97316'),
  'vzdelajvani',  jsonb_build_object('icon', '📚', 'color', '#06b6d4'),
  'zabava',       jsonb_build_object('icon', '🎮', 'color', '#ec4899'),
  'predplatne',   jsonb_build_object('icon', '📱', 'color', '#a855f7'),
  'Alkohol',      jsonb_build_object('icon', '🍺', 'color', '#ef4444'),
  'Nikotin',      jsonb_build_object('icon', '🚬', 'color', '#6b7280'),
  'sport',        jsonb_build_object('icon', '💪', 'color', '#10b981'),
  'zdravi',       jsonb_build_object('icon', '💊', 'color', '#22c55e'),
  'doprava',      jsonb_build_object('icon', '🚗', 'color', '#3b82f6'),
  'nakupy',       jsonb_build_object('icon', '🛒', 'color', '#f59e0b')
  -- Pokud KROK 1 ukázal další kategorie, přidej je sem ve stejném formátu
)
WHERE user_id = auth.uid();

-- Ověření — mělo by vrátit tvoje kategorie:
SELECT jsonb_object_keys(exp_cats) as kategorie FROM ft_settings WHERE user_id = auth.uid();


-- ── KROK 3: Obnov peneženky ────────────────────────────────────
-- ⚠️  Peneženky nad rámec Banka+Hotovost byly ztraceny.
-- Doplň je ručně — každou peneženku jako objekt v poli níže.
-- Zachovej id formát 'w1', 'w2', 'w3'... nebo použij unikátní string.
-- BALANCE = skutečný zůstatek v Kč ke dnešku.

UPDATE ft_settings
SET wallets = '[
  {"id": "w1", "name": "Banka",    "icon": "🏦", "color": "#3b82f6", "balance": 0, "type": "bank"},
  {"id": "w2", "name": "Hotovost", "icon": "💵", "color": "#22c55e", "balance": 0, "type": "cash"}
  -- Sem přidej své ostatní peneženky:
  -- ,{"id": "w3", "name": "Spořicí", "icon": "💰", "color": "#f59e0b", "balance": 0, "type": "savings"}
]'::jsonb
WHERE user_id = auth.uid();

-- ── HOTOVO ────────────────────────────────────────────────────
-- Po spuštění reloadni aplikaci (F5) — kategorie v grafu by měly sedět.
