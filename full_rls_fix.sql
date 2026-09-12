-- 1. Fix Coordinator Access Level for Incharge
CREATE OR REPLACE FUNCTION public.coordinator_access_level(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today date := current_date;
    v_role text;
    v_on_duty boolean := false;
    v_grace boolean := false;
BEGIN
    select role into v_role from public.profiles where id = p_user_id;
    if v_role = 'admin' then return 'edit';
    elsif v_role = 'incharge' then return 'edit';
    end if;
    select exists (select 1 from public.coordinator_assignments where user_id = p_user_id and duty_start_date <= v_today and duty_end_date >= v_today) into v_on_duty;
    if v_on_duty then return 'edit'; end if;
    select exists (select 1 from public.coordinator_assignments where user_id = p_user_id and duty_end_date < v_today and v_today <= (duty_end_date + integer '15')) into v_grace;
    if v_grace then return 'grace'; end if;
    return 'view';
END;
$$;

-- 2. Drop old conflicting policies on stock_transactions
DROP POLICY IF EXISTS "Allow all inserts on transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Allow public insert stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Allow public read stock_transactions" ON public.stock_transactions;
DROP POLICY IF EXISTS "Allow read stock_transactions" ON public.stock_transactions;

-- 3. Create fresh policies for stock_transactions
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read stock_transactions" ON public.stock_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert stock_transactions" ON public.stock_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update stock_transactions" ON public.stock_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete stock_transactions" ON public.stock_transactions FOR DELETE USING (true);

-- 4. Drop old conflicting policies on ingredients
DROP POLICY IF EXISTS "Allow all updates on ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow public update ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow public read ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow read ingredients" ON public.ingredients;

-- 5. Create fresh policies for ingredients
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read ingredients" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public update ingredients" ON public.ingredients FOR ALL USING (true);
