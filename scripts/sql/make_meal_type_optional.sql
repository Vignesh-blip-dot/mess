-- ====================================================================
-- MAKE MEAL TYPE COMPLETELY OPTIONAL FOR ALL INGREDIENTS
-- Run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dribchwasdoxumbvhoaf/sql
-- ====================================================================

-- STEP 1: Find and DROP any trigger on stock_transactions requiring meal_type
DO $$
DECLARE
    r RECORD;
    found_count integer := 0;
BEGIN
    FOR r IN (
        SELECT t.tgname, p.proname, p.prosrc
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgrelid = 'public.stock_transactions'::regclass
          AND (
            p.prosrc ILIKE '%required for provisions usage%' 
            OR p.prosrc ILIKE '%breakfast/lunch/dinner%'
            OR (p.prosrc ILIKE '%meal_type%' AND p.prosrc ILIKE '%RAISE EXCEPTION%')
          )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.stock_transactions;', r.tgname);
        RAISE NOTICE 'Successfully dropped trigger: % (calling %)', r.tgname, r.proname;
        found_count := found_count + 1;
    END LOOP;

    IF found_count = 0 THEN
        RAISE NOTICE 'No triggers enforcing meal_type found, checking constraints...';
    END IF;
END $$;

-- STEP 2: Ensure meal_type column allows NULL and optional values
ALTER TABLE public.stock_transactions ALTER COLUMN meal_type DROP NOT NULL;

-- STEP 3: Ensure check constraint on meal_type allows NULL and 'general'
ALTER TABLE public.stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_meal_type_check;

ALTER TABLE public.stock_transactions
ADD CONSTRAINT stock_transactions_meal_type_check 
CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks', 'general') OR meal_type IS NULL);

-- STEP 4: Verification test - insert a provisional item with NULL meal_type
DO $$
DECLARE
    v_test_ing uuid;
    v_test_user uuid;
    v_inserted_id uuid;
BEGIN
    SELECT id INTO v_test_ing FROM public.ingredients WHERE category = 'provisions' LIMIT 1;
    SELECT id INTO v_test_user FROM public.profiles LIMIT 1;

    IF v_test_ing IS NOT NULL AND v_test_user IS NOT NULL THEN
        INSERT INTO public.stock_transactions (
            ingredient_id,
            txn_type,
            quantity,
            total_cost,
            usage_date,
            meal_type,
            created_by
        ) VALUES (
            v_test_ing,
            'usage',
            -0.01,
            0.00,
            CURRENT_DATE,
            NULL,
            v_test_user
        ) RETURNING id INTO v_inserted_id;

        -- Clean up test row
        DELETE FROM public.stock_transactions WHERE id = v_inserted_id;
        RAISE NOTICE 'VERIFICATION PASSED: Meal type is now completely optional for provisions and all ingredients!';
    END IF;
END $$;
