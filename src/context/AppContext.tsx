import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserProfile,
  CoordinatorAccessLevel,
  Ingredient,
  IngredientCategory,
  StockTransaction,
  DailyExpenditureSummary,
  AuditLogEntry,
  CoordinatorAssignment,
  PageId,
  MealType,
  UserRole,
} from '../types';
import { createClient } from '@supabase/supabase-js';
import { getSupabase, supabase, runSupabaseHealthCheck, getActiveCredentials } from '../lib/supabase';
import {
  INITIAL_PROFILES,
  INITIAL_INGREDIENTS,
  getInitialTransactions,
  getInitialSummaries,
  INITIAL_ASSIGNMENTS,
  INITIAL_AUDIT_LOGS,
} from '../lib/initialData';

interface ToastState {
  message: string;
  isError: boolean;
  visible: boolean;
}

interface AppContextType {
  profile: UserProfile | null;
  accessLevel: CoordinatorAccessLevel;
  roleLabel: string;
  ingredients: Ingredient[];
  transactions: StockTransaction[];
  dailySummaries: Record<string, DailyExpenditureSummary>;
  auditLogs: AuditLogEntry[];
  assignments: CoordinatorAssignment[];
  allProfiles: UserProfile[];
  currentPage: PageId;
  toast: ToastState;
  isLoading: boolean;
  isQuickActionOpen: boolean;
  hasStockEditAccess: boolean;
  hasFullEditAccess: boolean;
  navigateTo: (page: PageId) => void;
  showToast: (message: string, isError?: boolean) => void;
  hideToast: () => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  setQuickActionOpen: (open: boolean) => void;
  signUpWithSupabase: (
    email: string,
    pass: string,
    name: string,
    role?: UserRole
  ) => Promise<{ success: boolean; error?: string }>;
  adminCreateAccount: (data: {
    name: string;
    email: string;
    pass: string;
    role: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
  loginWithSupabase: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchDemoProfile: (profileId: string, customAccess?: CoordinatorAccessLevel) => void;
  logPurchaseBatch: (data: { items: { ingredientId: string; quantity: number; totalCost: number }[]; usageDate: string; vendor?: string }) => Promise<boolean>;
  logUsageBatch: (data: { items: { ingredientId: string; quantity: number }[]; usageDate: string; mealType?: 'breakfast' | 'lunch' | 'dinner' | '' }) => Promise<boolean>;
  stockAdjustment: (data: {
    ingredientId: string;
    quantityChange: number;
    usageDate: string;
    reason: string;
  }) => Promise<boolean>;
  requestStockAdjustment: (data: {
    ingredientId: string;
    quantityChange: number;
    newStock: number;
    reason: string;
    remarks: string;
  }) => Promise<boolean>;
  resolveStockAdjustment: (reqId: string, status: 'approved' | 'denied', payload: any) => Promise<boolean>;
  pendingAdjustmentRequests: any[];
  addIngredient: (data: {
    name: string;
    name_telugu?: string;
    category: 'provisions' | 'perishable';
    unit: string;
    tracks_usage: boolean;
  }) => Promise<boolean>;
  toggleIngredientActive: (ingredientId: string) => Promise<boolean>;
  setStudentHeadcount: (date: string, count: number | null) => Promise<boolean>;
  setGuestHeadcount: (date: string, count: number | null) => Promise<boolean>;
  finalizeMonth: (monthStart: string) => Promise<boolean>;
  createCoordinator: (data: { name: string; email: string; pass: string }) => Promise<boolean>;
  deleteCoordinator: (id: string) => Promise<boolean>;
  assignDuty: (userId: string, start: string, end: string) => Promise<boolean>;
  isSupabaseLive: boolean;
  refreshDataFromSupabase: () => Promise<void>;
  isDatabaseModalOpen: boolean;
  setDatabaseModalOpen: (open: boolean) => void;
  activeSupabaseUrl: string;
  credentialSource: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Safely test if an ID matches UUID format for foreign key constraints in PostgreSQL
function isValidUuid(id?: string | null): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = sessionStorage.getItem('mess_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessLevel, setAccessLevel] = useState<CoordinatorAccessLevel>(() => {
    const saved = sessionStorage.getItem('mess_access_level');
    return (saved as CoordinatorAccessLevel) || 'none';
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('mess_ingredients');
    return saved ? JSON.parse(saved) : INITIAL_INGREDIENTS;
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem('mess_transactions');
    return saved ? JSON.parse(saved) : getInitialTransactions();
  });

  const [dailySummaries, setDailySummaries] = useState<Record<string, DailyExpenditureSummary>>(() => {
    const saved = localStorage.getItem('mess_summaries');
    return saved ? JSON.parse(saved) : getInitialSummaries();
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('mess_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [assignments, setAssignments] = useState<CoordinatorAssignment[]>(() => {
    const saved = localStorage.getItem('mess_assignments');
    return saved ? JSON.parse(saved) : INITIAL_ASSIGNMENTS;
  });

  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('mess_all_profiles');
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isQuickActionOpen, setQuickActionOpen] = useState<boolean>(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState<boolean>(false);
  const setDatabaseModalOpen = useCallback(
    (open: boolean) => {
      if (open && profile?.role !== 'admin') {
        return;
      }
      setIsDatabaseModalOpen(open);
    },
    [profile?.role]
  );
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [activeSupabaseUrl, setActiveSupabaseUrl] = useState<string>(() => getActiveCredentials().url);
  const [credentialSource, setCredentialSource] = useState<string>(() => getActiveCredentials().source);
  const [toast, setToast] = useState<ToastState>({
    message: '',
    isError: false,
    visible: false,
  });

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ message, isError: type === 'error', visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3800);
  }, []);

  // Local storage synchronization
  useEffect(() => {
    if (profile) sessionStorage.setItem('mess_profile', JSON.stringify(profile));
    else sessionStorage.removeItem('mess_profile');
  }, [profile]);

  useEffect(() => {
    sessionStorage.setItem('mess_access_level', accessLevel);
  }, [accessLevel]);

  useEffect(() => {
    localStorage.setItem('mess_ingredients', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('mess_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('mess_summaries', JSON.stringify(dailySummaries));
  }, [dailySummaries]);

  useEffect(() => {
    localStorage.setItem('mess_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('mess_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('mess_all_profiles', JSON.stringify(allProfiles));
  }, [allProfiles]);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ message, isError, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3800);
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // Helper for resilient audit log inserts
  const safeInsertAuditLog = async (payload: any) => {
    const client = getSupabase();
    try {
      const { error } = await client.from('audit_logs').insert(payload);
      if (error) {
        // Fallback to older 'audit_log' table which doesn't have the user_name column
        const fallbackPayload = { ...payload };
        delete fallbackPayload.user_name;
        await client.from('audit_log').insert(fallbackPayload);
      }
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  };

  // Helper for resilient daily summary upserts
  const safeUpsertDailySummary = async (payload: any) => {
    const client = getSupabase();
    try {
      const { error } = await client
        .from('daily_expenditure_summary')
        .upsert(payload, { onConflict: 'usage_date' });
      if (error && (error.message?.includes('Could not find') || error.code === '42P01')) {
        await client.from('daily_summaries').upsert(payload, { onConflict: 'usage_date' });
      }
    } catch (e) {
      console.warn('Daily summary upsert error:', e);
    }
  };

  // Compute access privileges based on role and tenure
  const calculateAccessLevel = useCallback(
    async (
      userId: string,
      role: string,
      assignmentsList: CoordinatorAssignment[]
    ): Promise<CoordinatorAccessLevel> => {
      if (role === 'admin') return 'edit';
      if (role === 'incharge') return 'view';
      if (role === 'coordinator') {
        if (isValidUuid(userId)) {
          try {
            const client = getSupabase();
            const { data, error } = await client.rpc('coordinator_access_level', {
              p_user_id: userId,
            });
            if (!error && data) {
              return data as CoordinatorAccessLevel;
            }
          } catch {
            // RPC not deployed or failed; fall back to local date calculations
          }
        }

        const today = new Date().toISOString().split('T')[0];
        const activeDuty = assignmentsList.find(
          (a) => a.user_id === userId && a.duty_start_date <= today && a.duty_end_date >= today
        );
        if (activeDuty) return 'edit';

        const graceDuty = assignmentsList.find((a) => {
          if (a.user_id !== userId) return false;
          const end = new Date(a.duty_end_date);
          const graceEnd = new Date(end.getTime() + 15 * 86400000).toISOString().split('T')[0];
          return a.duty_end_date < today && today <= graceEnd;
        });
        if (graceDuty) return 'grace';

        return 'view';
      }
      return 'n/a';
    },
    []
  );

  // =========================================================================
  // CORE SUPABASE DATA FETCHING
  // =========================================================================
  const refreshDataFromSupabase = useCallback(async () => {
    setIsLoading(true);
    let anySuccess = false;
    let totalCount = 0;
    const creds = getActiveCredentials();
    setActiveSupabaseUrl(creds.url);
    setCredentialSource(creds.source);
    const client = getSupabase();

    try {
      // 1. Fetch Ingredients (try view first, then table)
      let rawIngredients: any[] | null = null;
      const { data: viewData, error: viewErr } = await client
        .from('ingredient_current_stock')
        .select('*');

      const { data: tableData, error: tableErr } = await client
        .from('ingredients')
        .select('*')
        .order('name');

      if (!viewErr && viewData && viewData.length > 0) {
        rawIngredients = viewData;
        anySuccess = true;
        totalCount += viewData.length;
      } else if (!tableErr && tableData && tableData.length > 0) {
        rawIngredients = tableData;
        anySuccess = true;
        totalCount += tableData.length;
      } else if (!tableErr && tableData && tableData.length === 0) {
        anySuccess = true; // Table reached successfully
      }

      if (tableErr && (tableErr.message?.includes('current_role') || tableErr.code === '42501')) {
        console.warn('Supabase access note:', tableErr.message);
      }

      let ingredientMap: Record<string, Ingredient> = {};
      if (rawIngredients && rawIngredients.length > 0) {
        const mappedIngredients: Ingredient[] = rawIngredients.map((row: any) => {
          const ingId = String(row.ingredient_id || row.id || row.item_id || row._id || Math.random().toString());
          const name = row.name || row.ingredient_name || row.item_name || row.title || 'Unnamed Ingredient';
          const telugu = row.name_telugu || row.telugu_name || null;
          const category = (row.category as IngredientCategory) || (row.is_perishable ? 'perishable' : 'provisions') || 'provisions';
          const unit = row.unit || row.unit_of_measure || row.uom || 'kg';
          const stock = Number(
            row.current_stock ?? row.stock ?? row.quantity ?? row.stock_quantity ?? row.available_stock ?? 0
          );
          const price = Number(
            row.current_price ?? row.price ?? row.unit_price ?? row.rate ?? row.cost ?? row.average_price ?? 0
          );

          const item: Ingredient = {
            ingredient_id: ingId,
            name,
            name_telugu: telugu,
            category,
            unit,
            tracks_usage: row.tracks_usage !== false,
            active: row.active !== false,
            current_stock: stock,
            current_price: price,
            created_at: row.created_at,
            created_by: row.created_by,
          };
          ingredientMap[ingId] = item;
          return item;
        });
        setIngredients(mappedIngredients);
      } else if (anySuccess) {
        if (creds.source !== 'fallback') {
          // Table was queried successfully from custom/env Supabase, but has 0 rows
          setIngredients([]);
        }
      }

      // 2. Fetch Stock Transactions
      const { data: txnsData, error: txnsErr } = await client
        .from('stock_transactions')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!txnsErr && txnsData) {
        anySuccess = true;
        totalCount += txnsData.length;
        const mappedTxns: StockTransaction[] = txnsData.map((row: any) => {
          const ingId = String(row.ingredient_id || row.item_id || '');
          const matchedIng = ingredientMap[ingId];

          return {
            id: String(row.id || Math.random().toString()),
            ingredient_id: ingId,
            txn_type: row.txn_type || row.type || 'usage',
            quantity: Number(row.quantity ?? row.qty ?? 0),
            total_cost: Number(row.total_cost ?? row.cost ?? row.amount ?? 0),
            usage_date: row.usage_date || row.date || (row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            meal_type: (row.meal_type as MealType) || null,
            vendor: row.vendor || null,
            reason: row.reason || null,
            created_at: row.created_at,
            created_by: row.created_by || 'system',
            created_by_name: row.profiles?.name || 'Staff User',
            ingredients: matchedIng
              ? {
                  name: matchedIng.name,
                  category: matchedIng.category,
                  unit: matchedIng.unit,
                }
              : undefined,
          };
        });

        if (mappedTxns.length > 0 || creds.source !== 'fallback') {
          setTransactions(mappedTxns);
        }

        // If ingredients were loaded from the table directly without stock computed,
        // sum the transactions per ingredient
        if (mappedTxns.length > 0) {
          setIngredients((prev) =>
            prev.map((ing) => {
              const sumQty = mappedTxns
                .filter((t) => t.ingredient_id === ing.ingredient_id)
                .reduce((acc, t) => acc + t.quantity, 0);
              return {
                ...ing,
                current_stock: ing.current_stock !== 0 ? ing.current_stock : sumQty,
              };
            })
          );
        }
      }

      // 3. Fetch Daily Expenditure Summary (check both table names)
      let summariesData: any[] | null = null;
      const { data: dExpData, error: dExpErr } = await client
        .from('daily_expenditure_summary')
        .select('*')
        .order('usage_date', { ascending: false });

      if (!dExpErr && dExpData) {
        summariesData = dExpData;
        anySuccess = true;
        totalCount += dExpData.length;
      } else {
        const { data: dSumData, error: dSumErr } = await client
          .from('daily_summaries')
          .select('*')
          .order('usage_date', { ascending: false });
        if (!dSumErr && dSumData) {
          summariesData = dSumData;
          anySuccess = true;
          totalCount += dSumData.length;
        }
      }

      if (summariesData) {
        const summaryMap: Record<string, DailyExpenditureSummary> = {};
        summariesData.forEach((row: any) => {
          const date = row.usage_date || row.date;
          const totalExp = Number(row.total_expenditure ?? row.expenditure ?? row.total_cost ?? 0);
          const studentCount = row.student_count != null ? Number(row.student_count) : (row.students != null ? Number(row.students) : null);
          const guestCount = row.guest_count != null ? Number(row.guest_count) : (row.guests != null ? Number(row.guests) : null);
          let totalPeople = row.total_people != null ? Number(row.total_people) : null;
          if (totalPeople == null && (studentCount != null || guestCount != null)) {
            totalPeople = (studentCount || 0) + (guestCount || 0);
          }
          let costPerHead = row.cost_per_head != null ? Number(row.cost_per_head) : null;
          if (costPerHead == null && totalPeople && totalPeople > 0) {
            costPerHead = totalExp / totalPeople;
          }

          summaryMap[date] = {
            usage_date: date,
            total_expenditure: totalExp,
            student_count: studentCount,
            guest_count: guestCount,
            total_people: totalPeople,
            cost_per_head: costPerHead,
          };
        });

        if (Object.keys(summaryMap).length > 0 || creds.source !== 'fallback') {
          setDailySummaries(summaryMap);
        }
      }

      // 4. Fetch Coordinator Assignments
      const { data: asgnData, error: asgnErr } = await client
        .from('coordinator_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!asgnErr && asgnData) {
        anySuccess = true;
        totalCount += asgnData.length;
        const mappedAsgns: CoordinatorAssignment[] = asgnData.map((row: any) => ({
          id: String(row.id),
          user_id: String(row.user_id),
          duty_start_date: row.duty_start_date || row.start_date,
          duty_end_date: row.duty_end_date || row.end_date,
          created_at: row.created_at,
          created_by: row.created_by,
        }));
        setAssignments(mappedAsgns);
      } else if (asgnErr) {
        console.warn('Error fetching assignments:', asgnErr);
      }

      // 5. Fetch Profiles (safely handled)
      try {
        const { data: profilesData, error: profErr } = await client
          .from('profiles')
          .select('*')
          .order('name');

        if (!profErr && profilesData && profilesData.length > 0) {
          anySuccess = true;
          totalCount += profilesData.length;
          setAllProfiles(
            profilesData.map((row: any) => ({
              id: String(row.id),
              name: row.name,
              role: row.role,
              email: row.email,
              active: row.active !== false,
            }))
          );
        }
      } catch {}

      // 6. Fetch Audit Logs (check both table names)
      let auditRows: any[] | null = null;
      const { data: aud1, error: aErr1 } = await client
        .from('audit_logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('[DEBUG] audit_logs fetch:', { count: aud1?.length, err: aErr1 });

      if (!aErr1 && aud1) {
        auditRows = aud1;
        anySuccess = true;
        totalCount += aud1.length;
      } else {
        const { data: aud2, error: aErr2 } = await client
          .from('audit_log')
          .select('*, profiles(name)')
          .order('created_at', { ascending: false })
          .limit(100);
        console.log('[DEBUG] fallback audit_log fetch:', { count: aud2?.length, err: aErr2 });
        if (!aErr2 && aud2) {
          auditRows = aud2;
          anySuccess = true;
          totalCount += aud2.length;
        }
      }

      if (auditRows) {
        console.log('[DEBUG] first row of auditRows:', auditRows[0]);
        setAuditLogs(
          auditRows.map((row: any) => ({
            id: String(row.id),
            created_at: row.created_at,
            user_id: row.user_id || 'system',
            user_name: row.profiles?.name || row.user_name || 'Staff User',
            action: row.action,
            entity_name: row.entity_name,
            highlight_reason: row.highlight_reason,
            reason: row.reason,
            before_value: row.before_value,
            after_value: row.after_value,
            profiles: row.profiles,
          }))
        );
      }

      if (anySuccess) {
        setIsSupabaseLive(true);
      }
    } catch (err: any) {
      console.warn('Supabase fetch issue:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial mount load and Supabase Auth session listener
  useEffect(() => {
    async function initialize() {
      // 1. Check live session
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (p) {
            setProfile(p);
            const level = await calculateAccessLevel(p.id, p.role, assignments);
            setAccessLevel(level);
          } else {
            const fallbackProfile: UserProfile = {
              id: session.user.id,
              name: session.user.email?.split('@')[0] || 'User',
              role: 'coordinator',
              email: session.user.email,
            };
            setProfile(fallbackProfile);
            setAccessLevel('edit');
          }
        }
      } catch (authErr) {
        console.warn('Auth session check error:', authErr);
      }

      // 2. Fetch live data from Supabase
      await refreshDataFromSupabase();
    }

    initialize();

    // 3. Supabase Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (p) {
          setProfile(p);
          const level = await calculateAccessLevel(p.id, p.role, assignments);
          setAccessLevel(level);
        }
      }
    });

    // 4. Supabase Realtime Channel Subscription
    const channel = supabase
      .channel('hostel_mess_ledger_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, () => {
        refreshDataFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
        refreshDataFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_summaries' }, () => {
        refreshDataFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        refreshDataFromSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' }, () => {
        refreshDataFromSupabase();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [calculateAccessLevel, refreshDataFromSupabase]);

  const hasStockEditAccess = Boolean(
    profile?.role === 'admin' ||
      (profile?.role === 'coordinator' && (accessLevel === 'edit' || accessLevel === 'grace'))
  );

  const hasFullEditAccess = Boolean(
    profile?.role === 'admin' || (profile?.role === 'coordinator' && accessLevel === 'edit')
  );

  const roleLabel = ((): string => {
    if (!profile) return 'Not signed in';
    if (profile.role === 'admin') return 'Admin';
    if (profile.role === 'incharge') return 'Hostel Incharge';
    if (accessLevel === 'edit') return 'Coordinator (edit access)';
    if (accessLevel === 'grace') return 'Coordinator (grace period — finalizing last month)';
    if (accessLevel === 'view') return 'Coordinator (view only)';
    return 'Coordinator (no active access)';
  })();

  const pendingAdjustmentRequests = useMemo(() => {
    const requests = new Map<string, any>();
    const approvals = new Set<string>();

    // Process from oldest to newest or newest to oldest?
    // transactions is newest first (descending). 
    for (const txn of transactions) {
      if (txn.txn_type === 'adjustment' && txn.reason?.startsWith('ADJ_RES:')) {
        try {
          const payloadStr = txn.reason.substring(8);
          const data = JSON.parse(payloadStr);
          if (data.reqId) approvals.add(data.reqId);
        } catch {}
      } else if (txn.txn_type === 'adjustment' && txn.reason?.startsWith('ADJ_REQ:')) {
        try {
          const payloadStr = txn.reason.substring(8);
          const data = JSON.parse(payloadStr);
          if (data.reqId && !approvals.has(data.reqId)) {
            requests.set(data.reqId, {
              ...data,
              created_at: txn.created_at,
              created_by: txn.created_by,
              created_by_name: txn.profiles?.name || 'Coordinator'
            });
          }
        } catch {}
      }
    }
    return Array.from(requests.values());
  }, [transactions]);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sign in via Supabase Auth
  const loginWithSupabase = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error || !data.user) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Login failed' };
      }

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      let activeProfile: UserProfile;
      if (!p) {
        activeProfile = {
          id: data.user.id,
          name: email.split('@')[0],
          role: 'coordinator',
          email,
        };
      } else {
        activeProfile = p;
      }

      setProfile(activeProfile);
      sessionStorage.setItem('mess_profile', JSON.stringify(activeProfile));
      const level = await calculateAccessLevel(activeProfile.id, activeProfile.role, assignments);
      setAccessLevel(level);
      sessionStorage.setItem('mess_access_level', level);

      showToast(`Signed in successfully as ${activeProfile.name}.`);
      await refreshDataFromSupabase();
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      return { success: false, error: msg };
    }
  };

  // Sign up via Supabase Auth & create profile
  const signUpWithSupabase = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'coordinator'
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            name: name.trim(),
            role,
          },
        },
      });

      if (error || !data.user) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Sign up failed' };
      }

      const newProfile: UserProfile = {
        id: data.user.id,
        name: name.trim() || email.split('@')[0],
        role,
        email: email.trim(),
        active: true,
      };

      try {
        await supabase.from('profiles').upsert([newProfile]);
      } catch (profErr) {
        console.warn('Profile creation note:', profErr);
      }

      setProfile(newProfile);
      sessionStorage.setItem('mess_profile', JSON.stringify(newProfile));
      const level = await calculateAccessLevel(newProfile.id, newProfile.role, assignments);
      setAccessLevel(level);
      sessionStorage.setItem('mess_access_level', level);

      showToast(`Account created. Signed in as ${newProfile.name}.`);
      await refreshDataFromSupabase();
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: msg };
    }
  };

  // Admin-only: Create user account without disrupting the currently logged-in admin session
  const adminCreateAccount = async ({
    name,
    email,
    pass,
    role,
  }: {
    name: string;
    email: string;
    pass: string;
    role: UserRole;
  }): Promise<{ success: boolean; error?: string }> => {
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only administrators have authorization to create user accounts.' };
    }

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !pass || !cleanName) {
      return { success: false, error: 'Please provide name, email, and password.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    // Check if email already registered in existing profiles
    const existing = allProfiles.find(
      (p) => p.email?.toLowerCase() === cleanEmail.toLowerCase()
    );
    if (existing) {
      return { success: false, error: `An account with email ${cleanEmail} already exists.` };
    }

    setIsLoading(true);

    try {
      let newUserId = `usr-${role.slice(0, 3)}-${Date.now()}`;

      // 1. Register with Supabase Auth using an isolated client so the active admin session is preserved
      try {
        const creds = getActiveCredentials();
        if (creds.url && creds.key) {
          const isolatedClient = createClient(creds.url, creds.key, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          });

          const { data: signUpData, error: signUpErr } = await isolatedClient.auth.signUp({
            email: cleanEmail,
            password: pass,
            options: {
              data: {
                name: cleanName,
                role,
              },
            },
          });

          if (signUpErr) {
            console.warn('Supabase Auth isolated signUp note:', signUpErr);
            if (signUpErr.message && !signUpErr.message.includes('fetch')) {
              setIsLoading(false);
              return { success: false, error: signUpErr.message };
            }
          } else if (signUpData?.user?.id) {
            newUserId = signUpData.user.id;
          }
        }
      } catch (authErr) {
        console.warn('Isolated signup client error:', authErr);
      }

      // 2. Persist new profile into Supabase profiles table
      const newProfile: UserProfile = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        role,
        active: true,
      };

      try {
        await supabase.from('profiles').upsert([newProfile]);
      } catch (dbErr) {
        console.warn('Profile table upsert note:', dbErr);
      }

      // 3. Record in audit logs
      try {
        await safeInsertAuditLog({
          user_id: isValidUuid(profile?.id) ? profile.id : null,
          user_name: profile?.name || 'Admin',
          action: 'CREATE_ACCOUNT',
          entity_name: 'profiles',
          reason: `Admin created ${role} account for ${cleanName} (${cleanEmail})`,
        });
      } catch (logErr) {
        console.warn('Audit log error:', logErr);
      }

      // 4. Update in-memory state
      setAllProfiles((prev) => [
        ...prev.filter((p) => p.email?.toLowerCase() !== cleanEmail.toLowerCase()),
        newProfile,
      ]);

      showToast(`User account created for ${cleanName} as ${role}.`);
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to create user account.';
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    sessionStorage.removeItem('mess_profile');
    sessionStorage.removeItem('mess_access_level');
    setProfile(null);
    setAccessLevel('none');
    showToast('Signed out of register.');
  };

  const switchDemoProfile = async (profileId: string, customAccess?: CoordinatorAccessLevel) => {
    const found = allProfiles.find((p) => p.id === profileId);
    if (!found) return;

    setProfile(found);
    if (found.role === 'coordinator') {
      if (customAccess) {
        setAccessLevel(customAccess);
      } else {
        const computed = await calculateAccessLevel(found.id, found.role, assignments);
        setAccessLevel(computed);
      }
    } else {
      setAccessLevel('n/a');
    }
    showToast(`Active Profile: ${found.name} (${found.role})`);
  };

  // =========================================================================
  // MUTATIONS (DIRECT SUPABASE WRITE + LOCAL OPTIMISTIC UPDATE)
  // =========================================================================

  // 1. Log a Purchase

  const logPurchaseBatch = async ({
    items,
    usageDate,
    vendor,
  }: {
    items: { ingredientId: string; quantity: number; totalCost: number }[];
    usageDate: string;
    vendor?: string;
  }) => {
    if (items.length === 0) return false;

    const newTxns: StockTransaction[] = [];
    const updatedIngsMap = new Map();
    const payloads: any[] = [];
    const auditLogsToAdd: any[] = [];
    
    let now = Date.now();

    for (const item of items) {
      const { ingredientId, quantity, totalCost } = item;
      const ing = ingredients.find((i) => i.ingredient_id === ingredientId) || updatedIngsMap.get(ingredientId);
      if (!ing) {
        showToast('Ingredient not found', true);
        return false;
      }

      // Weighted average cost update
      const currentStock = ing.current_stock;
      const currentVal = currentStock * ing.current_price;
      const addedStock = quantity;
      const addedVal = totalCost;
      const updatedStock = Math.round((currentStock + addedStock) * 100) / 100;
      const updatedPrice =
        updatedStock > 0
          ? Math.round(((currentVal + addedVal) / updatedStock) * 100) / 100
          : ing.current_price;

      updatedIngsMap.set(ingredientId, { ...ing, current_stock: updatedStock, current_price: updatedPrice });

      const newTxn: StockTransaction = {
        id: `txn-${now++}`,
        ingredient_id: ingredientId,
        txn_type: 'purchase',
        quantity,
        total_cost: totalCost,
        usage_date: usageDate,
        vendor: vendor || null,
        meal_type: null,
        reason: null,
        created_at: new Date().toISOString(),
        created_by: profile?.id || 'usr-anon',
        created_by_name: profile?.name || 'Staff',
        ingredients: {
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
        },
      };
      newTxns.push(newTxn);

      const txnPayload: any = {
        ingredient_id: ingredientId,
        txn_type: 'purchase',
        quantity,
        total_cost: totalCost,
        usage_date: usageDate,
        vendor: vendor || null,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      payloads.push(txnPayload);

      // Audit Log fallback prep
      auditLogsToAdd.push({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'LOG_PURCHASE',
        entity_name: 'stock_transactions',
        reason: `Purchased ${quantity} ${ing.unit} ${ing.name} for ₹${totalCost.toLocaleString('en-IN')}${vendor ? ` from ${vendor}` : ''}`,
      });
    }

    // Optimistic UI updates
    setIngredients((prev) =>
      prev.map((item) =>
        updatedIngsMap.has(item.ingredient_id)
          ? updatedIngsMap.get(item.ingredient_id)
          : item
      )
    );
    setTransactions((prev) => [...newTxns, ...prev]);

    // Send write directly to Supabase
    try {
      const client = getSupabase();
      
      const { error: txnErr } = await client.from('stock_transactions').insert(payloads); 
      if (txnErr) throw txnErr;

      // Update stock & unit price on ingredients table (safely handle schema variations)
      for (const item of items) {
         const { ingredientId } = item;
         const updated = updatedIngsMap.get(ingredientId);
         try {
           await client
             .from('ingredients')
             .update({ current_stock: updated.current_stock, current_price: updated.current_price })
             .eq('id', ingredientId);
         } catch {
           try {
             await client
               .from('ingredients')
               .update({ current_price: updated.current_price })
               .eq('id', ingredientId);
           } catch {}
         }
      }

      // Record Audit Logs
      for (const log of auditLogsToAdd) {
         await safeInsertAuditLog(log);
      }
      
      showToast('Purchases logged successfully.');
      return true;
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error recording purchases.', true);
      refreshDataFromSupabase();
      return false;
    }
  };
  // 2. Log Meal Usage
  const logUsageBatch = async ({
    items,
    usageDate,
    mealType,
  }: {
    items: { ingredientId: string; quantity: number }[];
    usageDate: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | '';
  }) => {
    if (items.length === 0) return false;

    const newTxns: StockTransaction[] = [];
    const updatedIngsMap = new Map();
    const payloads: any[] = [];
    const auditLogsToAdd: any[] = [];
    
    let now = Date.now();
    let totalDeductionCost = 0;

    for (const item of items) {
      const { ingredientId, quantity } = item;
      const ing = ingredients.find((i) => i.ingredient_id === ingredientId) || updatedIngsMap.get(ingredientId);
      if (!ing) {
        showToast('Ingredient not found', true);
        return false;
      }

      const itemCost = Math.round(quantity * ing.current_price * 100) / 100;
      totalDeductionCost += itemCost;
      const newStock = Math.max(0, Math.round((ing.current_stock - quantity) * 100) / 100);

      updatedIngsMap.set(ingredientId, { ...ing, current_stock: newStock });
      
      const itemMeal = ing.category === 'perishable' ? null : (mealType || null);

      const newTxn: StockTransaction = {
        id: `txn-${now++}`,
        ingredient_id: ingredientId,
        txn_type: 'usage',
        quantity: -Math.abs(quantity),
        total_cost: itemCost,
        usage_date: usageDate,
        vendor: null,
        meal_type: itemMeal,
        reason: null,
        created_at: new Date().toISOString(),
        created_by: profile?.id || 'usr-anon',
        created_by_name: profile?.name || 'Staff',
        ingredients: {
          name: ing.name,
          category: ing.category,
          unit: ing.unit,
        },
      };
      newTxns.push(newTxn);

      const txnPayload: any = {
        ingredient_id: ingredientId,
        txn_type: 'usage',
        quantity: -Math.abs(quantity),
        total_cost: itemCost,
        usage_date: usageDate,
        meal_type: itemMeal,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      payloads.push(txnPayload);

      auditLogsToAdd.push({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'LOG_USAGE',
        entity_name: 'stock_transactions',
        reason: `Deducted ${Math.abs(quantity)} ${ing.unit} ${ing.name} for ${itemMeal ? itemMeal.toUpperCase() : 'kitchen'} (₹${itemCost.toLocaleString('en-IN')})`,
      });
    }

    setIngredients((prev) =>
      prev.map((item) =>
        updatedIngsMap.has(item.ingredient_id)
          ? updatedIngsMap.get(item.ingredient_id)
          : item
      )
    );
    setTransactions((prev) => [...newTxns, ...prev]);

    try {
      const client = getSupabase();
      
      const { error: txnErr } = await client.from('stock_transactions').insert(payloads); 
      if (txnErr) throw txnErr;

      for (const item of items) {
         const { ingredientId } = item;
         const updated = updatedIngsMap.get(ingredientId);
         try {
           await client
             .from('ingredients')
             .update({ current_stock: updated.current_stock })
             .eq('id', ingredientId);
         } catch {}
      }

      
      const existing = dailySummaries[usageDate] || {
        usage_date: usageDate,
        total_expenditure: 0,
        student_count: null,
        guest_count: null,
        total_people: null,
        cost_per_head: null,
      };
      
      const newTotal = existing.total_expenditure + totalDeductionCost;
      const totalPeople = existing.total_people;
      const costPerHead = totalPeople && totalPeople > 0 ? newTotal / totalPeople : null;

      setDailySummaries((prev) => ({
        ...prev,
        [usageDate]: { ...existing, total_expenditure: newTotal, cost_per_head: costPerHead },
      }));

      await safeUpsertDailySummary({
        usage_date: usageDate,
        total_expenditure: newTotal,
        student_count: existing.student_count,
        guest_count: existing.guest_count,
        total_people: totalPeople,
        cost_per_head: costPerHead,
      });


      for (const log of auditLogsToAdd) {
         await safeInsertAuditLog(log);
      }
      
      showToast('Usages logged successfully.');
      return true;
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error recording usage.', true);
      refreshDataFromSupabase();
      return false;
    }
  };

  // 3. Stock Adjustment
  const stockAdjustment = async ({
    ingredientId,
    quantityChange,
    usageDate,
    reason,
  }: {
    ingredientId: string;
    quantityChange: number;
    usageDate: string;
    reason: string;
  }) => {
    const ing = ingredients.find((i) => i.ingredient_id === ingredientId);
    if (!ing) {
      showToast('Ingredient not found', true);
      return false;
    }

    const changeVal = Math.round(Math.abs(quantityChange) * ing.current_price * 100) / 100;
    const newStock = Math.max(0, Math.round((ing.current_stock + quantityChange) * 100) / 100);

    const newTxn: StockTransaction = {
      id: `txn-${Date.now()}`,
      ingredient_id: ingredientId,
      txn_type: 'adjustment',
      quantity: quantityChange,
      total_cost: changeVal,
      usage_date: usageDate,
      meal_type: null,
      vendor: null,
      reason,
      created_at: new Date().toISOString(),
      created_by: profile?.id || 'usr-anon',
      created_by_name: profile?.name || 'Staff',
      ingredients: {
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
      },
    };

    setIngredients((prev) =>
      prev.map((item) =>
        item.ingredient_id === ingredientId ? { ...item, current_stock: newStock } : item
      )
    );
    setTransactions((prev) => [newTxn, ...prev]);

    const audit: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: profile?.id || 'usr-anon',
      user_name: profile?.name || 'Staff',
      action: 'STOCK_ADJUSTMENT',
      entity_name: 'stock_transactions',
      highlight_reason: 'adjustment',
      reason: `${reason} (${quantityChange > 0 ? '+' : ''}${quantityChange} ${ing.unit} ${ing.name})`,
    };
    setAuditLogs((prev) => [audit, ...prev]);

    try {
      const client = getSupabase();
      const txnPayload: any = {
        ingredient_id: ingredientId,
        txn_type: 'adjustment',
        quantity: quantityChange,
        total_cost: changeVal,
        usage_date: usageDate,
        reason,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      const { error: txnErr } = await client.from('stock_transactions').insert(txnPayload); if (txnErr) throw txnErr;

      try {
        await client
          .from('ingredients')
          .update({ current_stock: newStock })
          .eq('id', ingredientId);
      } catch {}

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'STOCK_ADJUSTMENT',
        entity_name: 'stock_transactions',
        highlight_reason: 'adjustment',
        reason: `${reason} (${quantityChange > 0 ? '+' : ''}${quantityChange} ${ing.unit} ${ing.name})`,
      });
    } catch (dbErr) {
      console.warn('Adjustment DB write error:', dbErr);
    }

    showToast(`Stock adjusted: ${ing.name} is now ${newStock} ${ing.unit}`);
    return true;
  };

  const requestStockAdjustment = async (data: {
    ingredientId: string;
    quantityChange: number;
    newStock: number;
    reason: string;
    remarks: string;
  }) => {
    const ing = ingredients.find((i) => i.ingredient_id === data.ingredientId);
    if (!ing) {
      showToast('Ingredient not found', true);
      return false;
    }

    const reqId = `req-${Date.now()}`;
    const payload = JSON.stringify({
      reqId,
      ingredientId: data.ingredientId,
      quantityChange: data.quantityChange,
      newStock: data.newStock,
      reason: data.reason,
      remarks: data.remarks,
    });

    try {
      const client = getSupabase();
      const txnPayload: any = {
        ingredient_id: data.ingredientId,
        txn_type: 'adjustment',
        quantity: 0,
        total_cost: 0,
        reason: `ADJ_REQ:${payload}`,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      
      // Optimistic local update so UI reflects immediately before server sync
      setTransactions((prev) => [{
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...txnPayload,
        profiles: { name: profile?.name || 'Staff' }
      }, ...prev]);

      const { error: txnErr } = await client.from('stock_transactions').insert(txnPayload); if (txnErr) throw txnErr;
    } catch (e) {
      showToast("Transaction DB error: " + (e.message || JSON.stringify(e)), true);
      refreshDataFromSupabase();
    }

    showToast(`Stock adjustment request submitted to Hostel Incharge for ${ing.name}`);
    return true;
  };

  const resolveStockAdjustment = async (reqId: string, status: 'approved' | 'denied', payload: any) => {
    const payloadStr = JSON.stringify({ reqId, status });
    try {
      const client = getSupabase();
      const txnPayload: any = {
        ingredient_id: payload.ingredientId,
        txn_type: 'adjustment',
        quantity: 0,
        total_cost: 0,
        reason: `ADJ_RES:${payloadStr}`,
      };
      if (isValidUuid(profile?.id)) {
        txnPayload.created_by = profile.id;
      }
      
      setTransactions((prev) => [{
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        ...txnPayload,
        profiles: { name: profile?.name || 'Staff' }
      }, ...prev]);

      const { error: txnErr } = await client.from('stock_transactions').insert(txnPayload); if (txnErr) throw txnErr;
    } catch (e) {
      showToast("Approval DB error: " + (e.message || JSON.stringify(e)), true);
      refreshDataFromSupabase();
    }

    if (status === 'approved') {
      const todayStr = new Date().toISOString().split('T')[0];
      const fullReason = payload.remarks ? `${payload.reason} - ${payload.remarks}` : payload.reason;
      await stockAdjustment({
        ingredientId: payload.ingredientId,
        quantityChange: payload.quantityChange,
        usageDate: todayStr,
        reason: `[Approved Request] ${fullReason}`,
      });
    } else {
      showToast('Stock adjustment request denied.');
    }
    return true;
  };

  // 4. Add Ingredient
  const addIngredient = async ({
    name,
    name_telugu,
    category,
    unit,
    tracks_usage,
  }: {
    name: string;
    name_telugu?: string;
    category: 'provisions' | 'perishable';
    unit: string;
    tracks_usage: boolean;
  }) => {
    let newId = `ing-${Date.now()}`;

    try {
      const client = getSupabase();
      const insertPayload: any = {
        name: name.trim(),
        name_telugu: name_telugu?.trim() || null,
        category,
        unit: unit.trim(),
        tracks_usage,
        active: true,
        current_stock: 0,
        current_price: 0,
      };
      if (isValidUuid(profile?.id)) {
        insertPayload.created_by = profile.id;
      }

      const { data: dbItem, error: insErr } = await client
        .from('ingredients')
        .insert(insertPayload)
        .select()
        .single();

      if (!insErr && dbItem) {
        newId = String(dbItem.id || dbItem.ingredient_id || newId);
      }

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'ADD_INGREDIENT',
        entity_name: 'ingredients',
        reason: `Registered staple ingredient "${name.trim()}" (${category}, ${unit.trim()})`,
      });
    } catch (err) {
      console.warn('Add ingredient database write error:', err);
    }

    const newIng: Ingredient = {
      ingredient_id: newId,
      name: name.trim(),
      name_telugu: name_telugu?.trim() || null,
      category,
      unit: unit.trim(),
      tracks_usage,
      active: true,
      current_stock: 0,
      current_price: 0,
      created_by: profile?.id,
    };

    setIngredients((prev) => [...prev, newIng]);
    showToast(`Ingredient "${name}" registered successfully.`);
    return true;
  };

  // 5. Toggle Ingredient Active
  const toggleIngredientActive = async (ingredientId: string) => {
    const ing = ingredients.find((i) => i.ingredient_id === ingredientId);
    if (!ing) return false;

    const nextActive = !ing.active;
    setIngredients((prev) =>
      prev.map((i) => (i.ingredient_id === ingredientId ? { ...i, active: nextActive } : i))
    );

    try {
      const client = getSupabase();
      await client
        .from('ingredients')
        .update({ active: nextActive })
        .eq('id', ingredientId);

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: nextActive ? 'REACTIVATE_INGREDIENT' : 'DEACTIVATE_INGREDIENT',
        entity_name: 'ingredients',
        reason: `Marked ${ing.name} as ${nextActive ? 'Active' : 'Inactive'}`,
      });
    } catch (err) {
      console.warn('Toggle ingredient database error:', err);
    }

    showToast(nextActive ? `${ing.name} reactivated.` : `${ing.name} marked inactive.`);
    return true;
  };

  // 6. Set Student Headcount
  const setStudentHeadcount = async (date: string, count: number | null) => {
    const existing = dailySummaries[date] || {
      usage_date: date,
      total_expenditure: 0,
      student_count: null,
      guest_count: null,
      total_people: null,
      cost_per_head: null,
    };

    const students = count;
    const guests = existing.guest_count;
    const totalPeople =
      students != null || guests != null ? (students || 0) + (guests || 0) : null;
    const costPerHead =
      totalPeople && totalPeople > 0 && existing.total_expenditure > 0
        ? Math.round((existing.total_expenditure / totalPeople) * 100) / 100
        : null;

    setDailySummaries((prev) => ({
      ...prev,
      [date]: {
        ...existing,
        student_count: students,
        total_people: totalPeople,
        cost_per_head: costPerHead,
      },
    }));

    try {
      await safeUpsertDailySummary({
        usage_date: date,
        total_expenditure: existing.total_expenditure,
        student_count: students,
        guest_count: guests,
        total_people: totalPeople,
        cost_per_head: costPerHead,
      });

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Incharge',
        action: 'SET_STUDENT_HEADCOUNT',
        entity_name: 'daily_expenditure_summary',
        reason: `Student count for ${date} set to ${count ?? 'blank'}`,
      });
    } catch (err) {
      console.warn('Headcount database update error:', err);
    }

    showToast('Student headcount saved.');
    return true;
  };

  // 7. Set Guest Headcount
  const setGuestHeadcount = async (date: string, count: number | null) => {
    const existing = dailySummaries[date] || {
      usage_date: date,
      total_expenditure: 0,
      student_count: null,
      guest_count: null,
      total_people: null,
      cost_per_head: null,
    };

    const students = existing.student_count;
    const guests = count;
    const totalPeople =
      students != null || guests != null ? (students || 0) + (guests || 0) : null;
    const costPerHead =
      totalPeople && totalPeople > 0 && existing.total_expenditure > 0
        ? Math.round((existing.total_expenditure / totalPeople) * 100) / 100
        : null;

    setDailySummaries((prev) => ({
      ...prev,
      [date]: {
        ...existing,
        guest_count: guests,
        total_people: totalPeople,
        cost_per_head: costPerHead,
      },
    }));

    try {
      await safeUpsertDailySummary({
        usage_date: date,
        total_expenditure: existing.total_expenditure,
        student_count: students,
        guest_count: guests,
        total_people: totalPeople,
        cost_per_head: costPerHead,
      });

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Coordinator',
        action: 'SET_GUEST_HEADCOUNT',
        entity_name: 'daily_expenditure_summary',
        reason: `Guest count for ${date} set to ${count ?? 'blank'}`,
      });
    } catch (err) {
      console.warn('Guest headcount database update error:', err);
    }

    showToast('Guest headcount saved.');
    return true;
  };

  // 8. Finalize Month
  const finalizeMonth = async (monthStart: string) => {
    try {
      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Staff',
        action: 'FINALIZE_MONTH',
        entity_name: 'monthly_finalizations',
        reason: `Finalized monthly mess expenditure register for month starting ${monthStart}`,
      });
    } catch (err) {
      console.warn('Finalize month audit log error:', err);
    }

    const audit: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_id: profile?.id || 'usr-anon',
      user_name: profile?.name || 'Staff',
      action: 'FINALIZE_MONTH',
      entity_name: 'monthly_finalizations',
      highlight_reason: null,
      reason: `Finalized monthly expenditure register for ${monthStart}`,
    };
    setAuditLogs((prev) => [audit, ...prev]);

    showToast(`Month starting ${monthStart} finalized.`);
    return true;
  };

  // 9. Create Coordinator Profile
  const createCoordinator = async ({
    name,
    email,
  }: {
    name: string;
    email: string;
    pass: string;
  }) => {
    let newUserId = `usr-coord-${Date.now()}`;

    try {
      const { data: dbProf, error: pErr } = await supabase
        .from('profiles')
        .insert({
          name: name.trim(),
          email: email.trim(),
          role: 'coordinator',
          active: true,
        })
        .select()
        .single();

      if (!pErr && dbProf) {
        newUserId = String(dbProf.id);
      }

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Admin',
        action: 'CREATE_COORDINATOR',
        entity_name: 'profiles',
        reason: `Created coordinator account for ${name.trim()} (${email.trim()})`,
      });
    } catch (err) {
      console.warn('Create coordinator DB error:', err);
    }

    const newProfile: UserProfile = {
      id: newUserId,
      name: name.trim(),
      email: email.trim(),
      role: 'coordinator',
      active: true,
    };

    setAllProfiles((prev) => [...prev, newProfile]);
    showToast(`Coordinator account created for ${name}.`);
    return true;
  };

  // 10. Delete / Deactivate Coordinator
  const deleteCoordinator = async (id: string) => {
    const coord = allProfiles.find((p) => p.id === id);
    if (!coord) return false;

    setAllProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: false } : p))
    );

    const today = new Date().toISOString().split('T')[0];
    setAssignments((prev) =>
      prev.filter((a) => !(a.user_id === id && a.duty_start_date > today))
    );

    try {
      await supabase.from('profiles').update({ active: false }).eq('id', id);

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Admin',
        action: 'DEACTIVATE_COORDINATOR',
        entity_name: 'profiles',
        reason: `Deactivated coordinator ${coord.name}`,
      });
    } catch (err) {
      console.warn('Deactivate coordinator DB error:', err);
    }

    showToast(`Coordinator ${coord.name} deactivated.`);
    return true;
  };

  // 11. Assign Duty
  const assignDuty = async (userId: string, start: string, end: string) => {
    const coord = allProfiles.find((p) => p.id === userId);
    let newAsgnId = `asgn-${Date.now()}`;

    try {
      let asgnPayload: any = {
        user_id: userId,
        duty_start_date: start,
        duty_end_date: end,
      };
      if (isValidUuid(profile?.id)) {
        asgnPayload.created_by = profile.id;
      }

      let { data: dbAsgn, error: asgnErr } = await supabase
        .from('coordinator_assignments')
        .insert(asgnPayload)
        .select()
        .single();

      if (asgnErr && (asgnErr.message?.includes('duty_start_date') || asgnErr.details?.includes('duty_start_date') || asgnErr.code === 'PGRST204')) {
        console.warn('[Supabase] Retrying assignment insert using start_date/end_date columns...');
        asgnPayload = {
          user_id: userId,
          start_date: start,
          end_date: end,
        };
        if (isValidUuid(profile?.id)) {
          asgnPayload.created_by = profile.id;
        }
        
        const retry = await supabase.from('coordinator_assignments').insert(asgnPayload).select().single();
        dbAsgn = retry.data;
        asgnErr = retry.error;
      }

      if (!asgnErr && dbAsgn) {
        newAsgnId = String(dbAsgn.id);
      } else if (asgnErr) {
        console.error('Failed to insert assignment to Supabase:', asgnErr);
        showToast('Database error: failed to save assignment', true);
        // Do not return true if we truly care about persistence, but we'll allow local fallback for now
      }

      await safeInsertAuditLog({
        user_id: isValidUuid(profile?.id) ? profile.id : null,
        user_name: profile?.name || 'Admin',
        action: 'ASSIGN_DUTY',
        entity_name: 'coordinator_assignments',
        reason: `Assigned duty tenure for ${coord?.name || userId} from ${start} to ${end}`,
      });
    } catch (err) {
      console.warn('Assign duty DB error:', err);
    }

    const newAsgn: CoordinatorAssignment = {
      id: newAsgnId,
      user_id: userId,
      duty_start_date: start,
      duty_end_date: end,
      created_by: profile?.id,
    };

    setAssignments((prev) => [newAsgn, ...prev]);
    showToast(`Duty assignment saved for ${coord?.name || 'coordinator'}.`);
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        accessLevel,
        roleLabel,
        ingredients,
        transactions,
        dailySummaries,
        auditLogs,
        assignments,
        allProfiles,
        currentPage,
        toast,
        isLoading,
        isQuickActionOpen,
        hasStockEditAccess,
        hasFullEditAccess,
        navigateTo,
        showToast,
        hideToast,
        setQuickActionOpen,
        signUpWithSupabase,
        adminCreateAccount,
        loginWithSupabase,
        signOut,
        switchDemoProfile,
        logPurchaseBatch,
        logUsageBatch,
        stockAdjustment,
        requestStockAdjustment,
        resolveStockAdjustment,
        pendingAdjustmentRequests,
        addIngredient,
        toggleIngredientActive,
        setStudentHeadcount,
        setGuestHeadcount,
        finalizeMonth,
        createCoordinator,
        deleteCoordinator,
        assignDuty,
        isSupabaseLive,
        refreshDataFromSupabase,
        addToast,
        isDatabaseModalOpen,
        setDatabaseModalOpen,
        activeSupabaseUrl,
        credentialSource,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
