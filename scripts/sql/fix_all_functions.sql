-- Drop the bad ones we created
DROP FUNCTION IF EXISTS public.coordinator_access_level(uuid);
DROP FUNCTION IF EXISTS public.coordinator_access_level(text);

-- Drop the original one just to be perfectly clean
DROP FUNCTION IF EXISTS public.coordinator_access_level(uuid, date);

-- Recreate the correct Phase 1 schema (rev 2) version:
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
