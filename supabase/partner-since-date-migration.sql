-- =========================================================
-- Zama: farmers.partner_since now stores a full date instead of a year.
--
-- Change the column from an integer year (e.g. 2025) to a text
-- ISO date (e.g. "2025-03-14"). Existing year-only values are
-- preserved as text (e.g. 2025 -> "2025") and stay valid.
--
-- Run this manually in the Supabase SQL Editor.
-- =========================================================

ALTER TABLE farmers
  ALTER COLUMN partner_since TYPE text USING CAST(partner_since AS text);
