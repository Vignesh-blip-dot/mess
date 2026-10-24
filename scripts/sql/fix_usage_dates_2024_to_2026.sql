-- ====================================================================
-- MESS PROVISIONS REGISTER - RECTIFY USAGE YEAR FROM 2024 TO 2026
-- Target Project: dribchwasdoxumbvhoaf
-- Supabase SQL Editor: https://supabase.com/dashboard/project/dribchwasdoxumbvhoaf/sql
-- ====================================================================

-- STEP 1: Verify the 163 affected usage transactions in 2024
SELECT 
    usage_date, 
    COUNT(*) AS total_items, 
    ROUND(SUM(total_cost)::numeric, 2) AS total_expenditure_inr
FROM public.stock_transactions
WHERE txn_type = 'usage'
  AND usage_date >= '2024-01-01'
  AND usage_date <= '2024-12-31'
GROUP BY usage_date
ORDER BY usage_date ASC;

-- STEP 2: Update all 2024 usage dates to 2026
-- Replaces '2024-' prefix with '2026-', keeping the exact month and day
UPDATE public.stock_transactions
SET usage_date = replace(usage_date::text, '2024-', '2026-')::date
WHERE txn_type = 'usage'
  AND usage_date >= '2024-01-01'
  AND usage_date <= '2024-12-31';

-- STEP 3: Confirm no 2024 usage records remain
SELECT COUNT(*) AS remaining_2024_usages
FROM public.stock_transactions
WHERE txn_type = 'usage'
  AND usage_date >= '2024-01-01'
  AND usage_date <= '2024-12-31';

-- STEP 4: Review consolidated October 2026 expenditure summaries
SELECT 
    usage_date, 
    ROUND(total_expenditure::numeric, 2) AS daily_expenditure_inr,
    student_count,
    cost_per_head
FROM public.daily_expenditure_summary
WHERE usage_date >= '2026-10-01'
  AND usage_date <= '2026-10-31'
ORDER BY usage_date ASC;
