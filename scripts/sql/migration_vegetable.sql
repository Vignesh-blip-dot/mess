ALTER TABLE public.ingredients DROP CONSTRAINT ingredients_category_check;
ALTER TABLE public.ingredients ADD CONSTRAINT ingredients_category_check CHECK (category IN ('provisions', 'perishable', 'vegetable'));
