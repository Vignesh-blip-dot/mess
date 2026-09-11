export type UserRole = 'admin' | 'incharge' | 'coordinator';

export type CoordinatorAccessLevel = 'edit' | 'grace' | 'view' | 'none' | 'n/a';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  active?: boolean;
}

export type IngredientCategory = 'provisions' | 'perishable';

export interface Ingredient {
  ingredient_id: string;
  name: string;
  name_telugu?: string | null;
  category: IngredientCategory;
  unit: string;
  tracks_usage: boolean;
  active: boolean;
  current_stock: number;
  current_price: number;
  created_at?: string;
  created_by?: string;
}

export type TransactionType = 'purchase' | 'usage' | 'adjustment';
export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface StockTransaction {
  id: string;
  ingredient_id: string;
  txn_type: TransactionType;
  quantity: number; // positive for purchase, negative for usage, signed for adjustment
  total_cost: number;
  usage_date: string; // YYYY-MM-DD
  meal_type?: MealType | null;
  vendor?: string | null;
  reason?: string | null;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  ingredients?: {
    name: string;
    category: IngredientCategory;
    unit: string;
  };
}

export interface DailyExpenditureSummary {
  usage_date: string;
  total_expenditure: number;
  student_count: number | null;
  guest_count: number | null;
  total_people: number | null;
  cost_per_head: number | null;
}

export interface MonthlyFinalization {
  month_start: string; // YYYY-MM-01
  finalized_at: string;
  finalized_by: string;
  profiles?: {
    name: string;
  };
}

export interface AuditLogEntry {
  id: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_name: string;
  highlight_reason?: 'adjustment' | 'grace_edit' | null;
  reason?: string | null;
  profiles?: {
    name: string;
  };
}

export interface CoordinatorAssignment {
  id: string;
  user_id: string;
  duty_start_date: string;
  duty_end_date: string;
  created_at?: string;
  created_by?: string;
}

export type PageId =
  | 'dashboard'
  | 'ingredients'
  | 'log-purchase'
  | 'log-usage'
  | 'adjustment'
  | 'add-ingredient'
  | 'daily-usage'
  | 'headcount'
  | 'report'
  | 'audit-log'
  | 'coordinators'
  | 'create-account';
