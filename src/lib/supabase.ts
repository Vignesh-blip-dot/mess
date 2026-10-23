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

    // Auto-purge known unreachable or malformed URLs
    if (savedUrl && (savedUrl.includes('fvcbdbcmixifptwmemzr') || !savedUrl.includes('.'))) {
      localStorage.removeItem('mess_custom_supabase_url');
      localStorage.removeItem('mess_custom_supabase_key');
    } else if (savedUrl && savedKey) {
      let clean = savedUrl.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      return {
        url: clean,
        key: savedKey.trim(),
        source: 'custom',
        isCustom: true,
      };
    }
  }

  const effectiveUrl = ENV_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const effectiveKey = ENV_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  return {
    url: effectiveUrl.trim(),
    key: effectiveKey.trim(),
    source: ENV_SUPABASE_URL ? 'env' : 'fallback',
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
  resolvedTableName?: string;
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
  const tableCheckDefinitions: Array<{
    key: string;
    candidates: string[];
  }> = [
    { key: 'ingredients', candidates: ['ingredients'] },
    { key: 'ingredient_current_stock', candidates: ['ingredient_current_stock'] },
    { key: 'stock_transactions', candidates: ['stock_transactions'] },
    { key: 'daily_summaries', candidates: ['daily_summaries', 'daily_expenditure_summary', 'daily_headcount'] },
    { key: 'coordinator_assignments', candidates: ['coordinator_assignments'] },
    { key: 'profiles', candidates: ['profiles'] },
    { key: 'audit_logs', candidates: ['audit_logs', 'audit_log'] },
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

  for (const def of tableCheckDefinitions) {
    let resolvedMatch: {
      candidate: string;
      count: number;
      sampleName?: string;
    } | null = null;
    let lastError: any = null;

    for (const cand of def.candidates) {
      try {
        const { data, count, error } = await client
          .from(cand)
          .select('*', { count: 'exact', head: false })
          .limit(2);

        if (!error) {
          report.connected = true;
          const rowCount = count ?? (data ? data.length : 0);
          const sampleName =
            data && data.length > 0
              ? (data[0].name || data[0].ingredient_id || data[0].usage_date || data[0].attendance_date || 'row')
              : undefined;

          resolvedMatch = {
            candidate: cand,
            count: rowCount,
            sampleName,
          };
          break;
        } else {
          lastError = error;
          const isRoleErr =
            error.message?.includes('current_role') ||
            error.details?.includes('current_role') ||
            error.code === '42501';

          if (isRoleErr) {
            report.hasRoleFunctionConflict = true;
          }

          // If the error was NOT a missing table error, but an RLS or permission error,
          // then the table DOES exist in Postgres!
          const isMissingTable =
            error.message?.includes('Could not find') ||
            error.code === '42P01' ||
            error.code === 'PGRST205';

          if (!isMissingTable) {
            resolvedMatch = {
              candidate: cand,
              count: 0,
            };
            break;
          }
        }
      } catch (e: any) {
        lastError = e;
      }
    }

    if (resolvedMatch) {
      report.tables[def.key] = {
        tableName: def.key,
        resolvedTableName: resolvedMatch.candidate,
        exists: true,
        count: resolvedMatch.count,
        error: null,
        sampleItemName: resolvedMatch.sampleName,
      };
      report.totalRecordsFound += resolvedMatch.count;
    } else {
      const errMessage = lastError?.message || 'Table not found in schema';
      report.tables[def.key] = {
        tableName: def.key,
        exists: false,
        count: 0,
        error: errMessage,
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

