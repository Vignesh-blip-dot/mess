DROP FUNCTION IF EXISTS public.coordinator_access_level(uuid);
DROP FUNCTION IF EXISTS public.coordinator_access_level(text);

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
