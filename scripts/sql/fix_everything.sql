-- 1. Drop ALL versions of coordinator_access_level to clean up the duplicates
DROP FUNCTION IF EXISTS public.coordinator_access_level(uuid);
DROP FUNCTION IF EXISTS public.coordinator_access_level(text);
DROP FUNCTION IF EXISTS public.coordinator_access_level(uuid, date);

-- 2. Recreate the correct version from Phase 1 rev 2, returning 'view' for incharge (as requested earlier)
CREATE OR REPLACE FUNCTION public.coordinator_access_level(
  p_user_id uuid,
  p_as_of date default current_date
) RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select case
    when exists (
      select 1 from public.coordinator_assignments ca
      where ca.user_id = p_user_id
        and p_as_of between ca.duty_start_date and ca.duty_end_date
    ) then 'edit'
    when exists (
      select 1 from public.coordinator_assignments ca
      where ca.user_id = p_user_id
        and p_as_of > ca.duty_end_date
        and p_as_of <= (ca.duty_end_date + 15)
    ) then 'grace'
    when exists (
      select 1 from public.coordinator_assignments ca
      where ca.user_id = p_user_id
        and p_as_of >= (
              (date_trunc('month', ca.duty_start_date) - interval '1 month')
              + interval '24 days'
            )::date
        and p_as_of < ca.duty_start_date
    ) then 'view'
    when exists (
      select 1 from public.coordinator_assignments ca
      where ca.user_id = p_user_id
        and p_as_of > (ca.duty_end_date + 15)
    ) then 'view'
    else 'none'
  end;
$$;

-- 3. Fix the insert policy on stock_transactions to ALLOW the Incharge to approve requests
DROP POLICY IF EXISTS "stock_txn_insert_coordinator_or_admin" ON public.stock_transactions;

CREATE POLICY "stock_txn_insert_coordinator_or_admin"
  ON public.stock_transactions FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    and (
      public.current_role() = 'admin'
      or public.current_role() = 'incharge'
      or (public.current_role() = 'coordinator'
          and public.coordinator_can_edit_transaction_date(auth.uid(), usage_date))
    )
  );

-- 4. Just to be safe, make sure Incharge can also insert audit logs (if they couldn't already)
-- Actually audit logs are inserted by security definer trigger, so we don't need policy changes.

