-- ====================================================================
-- MESS PROVISIONS REGISTER & ACCOUNTING SYSTEM
-- COMPLETE SUPABASE POSTGRESQL MASTER MIGRATION SCRIPT
--
-- Instructions:
-- 1. Open your Supabase Project Dashboard
-- 2. Go to "SQL Editor" on the left menu
-- 3. Click "New query", paste this entire file, and click "Run"
-- ====================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. USER PROFILES TABLE (Linked with Supabase Auth)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    role text not null check (role in ('admin', 'incharge', 'coordinator')) default 'coordinator',
    email text,
    active boolean default true,
    created_at timestamptz default now()
);

-- 3. INGREDIENTS MASTER TABLE
create table if not exists public.ingredients (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    name_telugu text,
    category text not null check (category in ('provisions', 'perishable')),
    unit text not null default 'kg', -- 'kg', 'litre', 'piece', etc.
    tracks_usage boolean default true,
    active boolean default true,
    current_stock numeric(12, 2) not null default 0.00,
    current_price numeric(12, 2) not null default 0.00, -- Weighted average unit cost
    created_at timestamptz default now()
);

-- 4. STOCK TRANSACTIONS (PURCHASES, MEAL USAGE, AUDIT ADJUSTMENTS)
create table if not exists public.stock_transactions (
    id uuid primary key default gen_random_uuid(),
    ingredient_id uuid references public.ingredients(id) on delete cascade not null,
    txn_type text not null check (txn_type in ('purchase', 'usage', 'adjustment')),
    quantity numeric(12, 2) not null, -- Positive for purchase, negative for usage
    total_cost numeric(12, 2) not null default 0.00,
    usage_date date not null default current_date,
    meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks', null)),
    vendor text,
    reason text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

-- 5. COORDINATOR TENURE ASSIGNMENTS
create table if not exists public.coordinator_assignments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    duty_start_date date not null,
    duty_end_date date not null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now()
);

-- 6. DAILY HEADCOUNT & EXPENDITURE SUMMARIES
create table if not exists public.daily_summaries (
    usage_date date primary key default current_date,
    total_expenditure numeric(12, 2) not null default 0.00,
    student_count integer,
    guest_count integer default 0,
    total_people integer,
    cost_per_head numeric(10, 2),
    updated_at timestamptz default now()
);

-- 7. IMMUTABLE AUDIT LOG TABLE
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    user_name text,
    action text not null, -- 'LOG_PURCHASE', 'LOG_USAGE', 'ADJUSTMENT', 'HEADCOUNT_UPDATE', etc.
    entity_name text,
    highlight_reason text,
    reason text,
    created_at timestamptz default now()
);

-- 8. COMPATIBILITY VIEWS
create or replace view public.ingredient_current_stock
with (security_invoker = true) as
select
    id as ingredient_id,
    name,
    name_telugu,
    category,
    unit,
    tracks_usage,
    active,
    current_stock,
    current_price,
    created_at
from public.ingredients;

create or replace view public.daily_expenditure_summary
with (security_invoker = true) as
select
    usage_date,
    total_expenditure,
    student_count,
    guest_count,
    total_people,
    cost_per_head
from public.daily_summaries;

-- 9. STORED PROCEDURE: COORDINATOR ACCESS LEVEL & 15-DAY GRACE PERIOD
create or replace function public.coordinator_access_level(
    p_user_id uuid,
    p_as_of date default current_date
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_role text;
    v_on_duty boolean := false;
    v_grace boolean := false;
begin
    -- 1. Check user role
    select role into v_role from public.profiles where id = p_user_id;

    if v_role = 'admin' then
        return 'edit';
    elsif v_role = 'incharge' then
        return 'view';
    end if;

    -- 2. Check if actively on duty
    select exists (
        select 1 from public.coordinator_assignments
        where user_id = p_user_id
          and p_as_of between duty_start_date and duty_end_date
    ) into v_on_duty;

    if v_on_duty then
        return 'edit';
    end if;

    -- 3. Check 15-day post-tenure grace period
    select exists (
        select 1 from public.coordinator_assignments
        where user_id = p_user_id
          and p_as_of > duty_end_date
          and p_as_of <= (duty_end_date + integer '15')
    ) into v_grace;

    if v_grace then
        return 'grace';
    end if;

    return 'view';
end;
$$;

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.coordinator_assignments enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: Allow read and registration/updates
drop policy if exists "Allow public read profiles" on public.profiles;
drop policy if exists "Allow public all profiles" on public.profiles;
create policy "Allow public read profiles" on public.profiles for select using (true);
create policy "Allow public all profiles" on public.profiles for all using (true) with check (true);

-- Ingredients: Allow read and stock updates
drop policy if exists "Allow public read ingredients" on public.ingredients;
drop policy if exists "Allow public update ingredients" on public.ingredients;
create policy "Allow public read ingredients" on public.ingredients for select using (true);
create policy "Allow public update ingredients" on public.ingredients for all using (true) with check (true);

-- Stock Transactions: Allow read and logging entries
drop policy if exists "Allow public read stock_transactions" on public.stock_transactions;
drop policy if exists "Allow public insert stock_transactions" on public.stock_transactions;
drop policy if exists "Allow public update stock_transactions" on public.stock_transactions;
drop policy if exists "Allow public delete stock_transactions" on public.stock_transactions;
create policy "Allow public read stock_transactions" on public.stock_transactions for select using (true);
create policy "Allow public insert stock_transactions" on public.stock_transactions for insert with check (true);
create policy "Allow public update stock_transactions" on public.stock_transactions for update using (true);
create policy "Allow public delete stock_transactions" on public.stock_transactions for delete using (true);

-- Coordinator Assignments: Allow read and management
drop policy if exists "Allow public read coordinator_assignments" on public.coordinator_assignments;
drop policy if exists "Allow public all coordinator_assignments" on public.coordinator_assignments;
create policy "Allow public read coordinator_assignments" on public.coordinator_assignments for select using (true);
create policy "Allow public all coordinator_assignments" on public.coordinator_assignments for all using (true) with check (true);

-- Daily Summaries: Allow read and headcount updates
drop policy if exists "Allow public read daily_summaries" on public.daily_summaries;
drop policy if exists "Allow public all daily_summaries" on public.daily_summaries;
create policy "Allow public read daily_summaries" on public.daily_summaries for select using (true);
create policy "Allow public all daily_summaries" on public.daily_summaries for all using (true) with check (true);

-- Audit Logs: Allow read and insertion
drop policy if exists "Allow public read audit_logs" on public.audit_logs;
drop policy if exists "Allow public insert audit_logs" on public.audit_logs;
create policy "Allow public read audit_logs" on public.audit_logs for select using (true);
create policy "Allow public insert audit_logs" on public.audit_logs for insert with check (true);

-- 11. INITIAL SEED INGREDIENTS
insert into public.ingredients (name, name_telugu, category, unit, tracks_usage, active, current_stock, current_price)
values
    ('Sona Masoori Rice', 'సోనా మసూరి బియ్యం', 'provisions', 'kg', true, true, 420.50, 54.00),
    ('Toor Dal (Pappu)', 'కందిపప్పు', 'provisions', 'kg', true, true, 85.00, 148.00),
    ('Refined Sunflower Oil', 'సన్ ఫ్లవర్ నూనె', 'provisions', 'litre', true, true, 64.00, 135.00),
    ('Chakki Fresh Atta', 'గోధుమ పిండి', 'provisions', 'kg', true, true, 110.00, 42.00),
    ('Moong Dal', 'పెసరపప్పు', 'provisions', 'kg', true, true, 35.00, 125.00),
    ('Refined Iodised Salt', 'ఉప్పు', 'provisions', 'kg', false, true, 40.00, 22.00),
    ('Sugar (M-Grade)', 'చక్కెర', 'provisions', 'kg', false, true, 50.00, 44.00),
    ('Tea Powder (Red Label)', 'టీ పొడి', 'provisions', 'kg', true, true, 14.50, 360.00),
    ('Fresh Toned Milk', 'పాలు', 'perishable', 'litre', true, true, 45.00, 58.00),
    ('Country Farm Eggs', 'గుడ్లు', 'perishable', 'piece', true, true, 240.00, 6.50),
    ('Fresh Tomatoes', 'టమాటాలు', 'perishable', 'kg', true, true, 28.00, 32.00),
    ('Nasik Red Onions', 'ఉల్లిపాయలు', 'perishable', 'kg', true, true, 55.00, 38.00),
    ('Fresh Potatoes (Aloo)', 'బంగాళాదుంపలు', 'perishable', 'kg', true, true, 40.00, 28.00),
    ('Malai Paneer Block', 'పన్నీర్', 'perishable', 'kg', true, true, 12.00, 340.00)
on conflict (name) do update
set
    name_telugu = excluded.name_telugu,
    category = excluded.category,
    unit = excluded.unit,
    current_price = excluded.current_price;
