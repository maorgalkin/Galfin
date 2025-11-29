-- Migration 021: Drop Legacy Budget Tables
-- These tables have been replaced by the new category system
-- - budget_configs -> replaced by personal_budgets + global settings
-- - budget_categories -> replaced by categories table
--
-- Run this AFTER verifying your categories table has all needed data
-- and you've cleaned up duplicate budget_configs

-- Drop budget_categories first (has FK to budget_configs)
DROP TABLE IF EXISTS public.budget_categories CASCADE;

-- Drop budget_configs
DROP TABLE IF EXISTS public.budget_configs CASCADE;

-- Also drop the old budgets table if it exists and is unused
-- (replaced by monthly_budgets)
DROP TABLE IF EXISTS public.budgets CASCADE;

-- Clean up any orphaned indexes (should be handled by CASCADE but just in case)
DROP INDEX IF EXISTS idx_budget_categories_config_id;
DROP INDEX IF EXISTS idx_budget_categories_active;

COMMENT ON SCHEMA public IS 'Cleaned up legacy budget tables on 2025-11-28. Using categories + personal_budgets + monthly_budgets now.';
