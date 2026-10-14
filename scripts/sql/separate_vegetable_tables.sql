-- 1. Create a dedicated Vegetable Table
CREATE TABLE public.vegetable_inventory (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    name_telugu text,
    unit text not null default 'kg',
    tracks_usage boolean default true,
    active boolean default true,
    current_stock numeric(12, 2) not null default 0.00,
    current_price numeric(12, 2) not null default 0.00,
    created_at timestamptz default now()
);

-- 2. Create Vegetable Transactions (Purchases, Usages)
CREATE TABLE public.vegetable_transactions (
    id uuid primary key default gen_random_uuid(),
    vegetable_id uuid references public.vegetable_inventory(id) on delete cascade,
    type text not null check (type in ('purchase', 'usage', 'adjustment')),
    quantity numeric(12, 2) not null,
    cost_per_unit numeric(12, 2) default 0.00,
    total_cost numeric(12, 2) default 0.00,
    transaction_date date not null,
    meal_type text,
    remarks text,
    created_at timestamptz default now(),
    created_by text
);

-- 3. Row Level Security
ALTER TABLE public.vegetable_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vegetable_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read vegetable_inventory" ON public.vegetable_inventory FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon all vegetable_inventory" ON public.vegetable_inventory FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon all vegetable_transactions" ON public.vegetable_transactions FOR ALL TO anon USING (true);
