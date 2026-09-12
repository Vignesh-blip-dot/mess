import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { INITIAL_INGREDIENTS } from './initialData';

export const FALLBACK_SUPABASE_URL = 'https://dribchwasdoxumbvhoaf.supabase.co';
export const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY';

export const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export type CredentialSource = 'env' | 'custom' | 'fallback';

export function getActiveCredentials(): {
  url: string;
  key: string;
  source: CredentialSource;
  isCustom: boolean;
} {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('mess_custom_supabase_url');
    const savedKey = localStorage.getItem('mess_custom_supabase_key');
    if (savedUrl && savedKey) {
      return {
        url: savedUrl.trim(),
        key: savedKey.trim(),
        source: 'custom',
        isCustom: true,
      };
    }
  }

  if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
    return {
      url: ENV_SUPABASE_URL.trim(),
      key: ENV_SUPABASE_ANON_KEY.trim(),
      source: 'env',
      isCustom: false,
    };
  }

  return {
    url: FALLBACK_SUPABASE_URL,
    key: FALLBACK_SUPABASE_ANON_KEY,
    source: 'fallback',
    isCustom: false,
  };
}

let activeClient: SupabaseClient = createClient(
  getActiveCredentials().url,
  getActiveCredentials().key,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    }
  }
);

export function getSupabase(): SupabaseClient {
  return activeClient;
}

// Dynamic proxy ensuring all direct imports of `supabase` automatically route to the current active client
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (activeClient as any)[prop];
  },
});

export function updateSupabaseCredentials(url: string, key: string): SupabaseClient {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = key.trim();

  if (typeof window !== 'undefined') {
    localStorage.setItem('mess_custom_supabase_url', cleanUrl);
    localStorage.setItem('mess_custom_supabase_key', cleanKey);
  }

  activeClient = createClient(cleanUrl, cleanKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    }
  });
  return activeClient;
}

export function resetSupabaseCredentials(): SupabaseClient {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mess_custom_supabase_url');
    localStorage.removeItem('mess_custom_supabase_key');
  }

  const creds = getActiveCredentials();
  activeClient = createClient(creds.url, creds.key, {
    auth: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    }
  });
  return activeClient;
}

export function isSupabaseConfigured(): boolean {
  const creds = getActiveCredentials();
  return Boolean(creds.url && creds.key && creds.source !== 'fallback');
}

export interface TableDiagnostic {
  tableName: string;
  exists: boolean;
  count: number;
  error: string | null;
  sampleItemName?: string;
}

export interface SupabaseHealthReport {
  connected: boolean;
  activeUrl: string;
  source: CredentialSource;
  isCustom: boolean;
  tables: Record<string, TableDiagnostic>;
  hasRoleFunctionConflict: boolean;
  totalRecordsFound: number;
  errorMessage?: string;
}

export async function runSupabaseHealthCheck(client = getSupabase()): Promise<SupabaseHealthReport> {
  const creds = getActiveCredentials();
  const tablesToCheck = [
    'ingredients',
    'ingredient_current_stock',
    'stock_transactions',
    'daily_summaries',
    'coordinator_assignments',
    'profiles',
    'audit_logs',
  ];

  const report: SupabaseHealthReport = {
    connected: false,
    activeUrl: creds.url,
    source: creds.source,
    isCustom: creds.isCustom,
    tables: {},
    hasRoleFunctionConflict: false,
    totalRecordsFound: 0,
  };

  for (const tbl of tablesToCheck) {
    try {
      const { data, count, error } = await client
        .from(tbl)
        .select('*', { count: 'exact', head: false })
        .limit(2);

      if (error) {
        const isRoleErr =
          error.message?.includes('current_role') ||
          error.details?.includes('current_role') ||
          error.code === '42501';

        if (isRoleErr) {
          report.hasRoleFunctionConflict = true;
        }

        report.tables[tbl] = {
          tableName: tbl,
          exists: !error.message?.includes('Could not find') && error.code !== '42P01',
          count: 0,
          error: error.message,
        };
      } else {
        report.connected = true;
        const rowCount = count ?? (data ? data.length : 0);
        const sampleName = data && data.length > 0 ? (data[0].name || data[0].ingredient_id || 'row') : undefined;

        report.tables[tbl] = {
          tableName: tbl,
          exists: true,
          count: rowCount,
          error: null,
          sampleItemName: sampleName,
        };
        report.totalRecordsFound += rowCount;
      }
    } catch (e: any) {
      report.tables[tbl] = {
        tableName: tbl,
        exists: false,
        count: 0,
        error: e.message || 'Network error',
      };
    }
  }

  return report;
}

export async function seedIngredientsToSupabase(client = getSupabase()): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    const payload = INITIAL_INGREDIENTS.map((ing) => ({
      name: ing.name,
      name_telugu: ing.name_telugu || null,
      category: ing.category,
      unit: ing.unit,
      tracks_usage: ing.tracks_usage,
      active: ing.active,
      current_stock: ing.current_stock,
      current_price: ing.current_price,
    }));

    const { data, error } = await client.from('ingredients').insert(payload).select();

    if (error) {
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: data?.length || payload.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Failed to seed ingredients' };
  }
}

