import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  X,
  KeyRound,
  Globe,
  Terminal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  runSupabaseHealthCheck,
  SupabaseHealthReport,
  TableDiagnostic,
  getActiveCredentials,
  updateSupabaseCredentials,
  resetSupabaseCredentials,
  seedIngredientsToSupabase,
} from '../lib/supabase';

export function DatabaseStatusModal() {
  const {
    isDatabaseModalOpen,
    setDatabaseModalOpen,
    refreshDataFromSupabase,
    addToast,
    profile,
  } = useApp();

  const [report, setReport] = useState<SupabaseHealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Form states for custom credentials
  const currentCreds = getActiveCredentials();
  const [customUrl, setCustomUrl] = useState(currentCreds.url);
  const [customKey, setCustomKey] = useState(currentCreds.key);

  const runCheck = async () => {
    if (profile?.role !== 'admin') return;
    setIsChecking(true);
    try {
      const rep = await runSupabaseHealthCheck();
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isDatabaseModalOpen && profile?.role === 'admin') {
      const creds = getActiveCredentials();
      setCustomUrl(creds.url);
      setCustomKey(creds.key);
      runCheck();
    }
  }, [isDatabaseModalOpen, profile?.role]);

  // Authorization check: ONLY admin can view or interact with this modal
  if (!isDatabaseModalOpen || profile?.role !== 'admin') return null;

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customKey.trim()) {
      addToast('error', 'Both Supabase URL and Anon API Key are required.');
      return;
    }

    setIsSaving(true);
    try {
      updateSupabaseCredentials(customUrl.trim(), customKey.trim());
      addToast('success', 'Supabase credentials saved. Connecting...');
      await refreshDataFromSupabase();
      await runCheck();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to connect to Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    resetSupabaseCredentials();
    const creds = getActiveCredentials();
    setCustomUrl(creds.url);
    setCustomKey(creds.key);
    addToast('info', 'Reset to project default Supabase credentials.');
    await refreshDataFromSupabase();
    await runCheck();
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const res = await seedIngredientsToSupabase();
      if (res.success) {
        addToast('success', `Successfully seeded ${res.count} standard mess provisions to Supabase!`);
        await refreshDataFromSupabase();
        await runCheck();
      } else {
        addToast('error', `Seeding failed: ${res.error}`);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Seeding error');
    } finally {
      setIsSeeding(false);
    }
  };

  const rlsFixSql = `-- Run this in Supabase SQL Editor to allow reading tables without RLS errors:
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read ingredients" ON public.ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public update ingredients" ON public.ingredients FOR ALL USING (true);

ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read stock_transactions" ON public.stock_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert stock_transactions" ON public.stock_transactions FOR INSERT WITH CHECK (true);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read daily_summaries" ON public.daily_summaries FOR SELECT USING (true);
CREATE POLICY "Allow public all daily_summaries" ON public.daily_summaries FOR ALL USING (true);`;

  const envFileSnippet = `# Create or edit .env in your project root in VS Code:
VITE_SUPABASE_URL=${customUrl || 'https://your-project.supabase.co'}
VITE_SUPABASE_ANON_KEY=${customKey || 'your-anon-key-here'}`;

  const copyToClipboard = (text: string, type: 'sql' | 'env') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } else {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2500);
    }
    addToast('success', 'Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="bg-white border border-[#e5e0d5] rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#e5e0d5] flex items-center justify-between bg-[#fbfaf7] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#193d2c] text-[#f7f9f7] flex items-center justify-center shadow-xs">
              <Database size={16} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#131715] leading-tight">
                Supabase Database Connection &amp; Diagnostics
              </h3>
              <p className="text-xs text-[#59635e]">
                Verify database connectivity, inspect live table records, and configure credentials
              </p>
            </div>
          </div>
          <button
            onClick={() => setDatabaseModalOpen(false)}
            className="w-8 h-8 rounded-sm flex items-center justify-center text-[#59635e] hover:text-[#131715] hover:bg-[#e5e0d5]/40 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Active Connection Summary Badge */}
          <div className="bg-[#f5f2eb] border border-[#e5e0d5] rounded-sm p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#59635e] uppercase tracking-wider">
                  Active Database URL:
                </span>
                <span className="font-mono-fig text-xs font-bold text-[#131715] break-all">
                  {currentCreds.url}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono-fig uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                    currentCreds.source === 'env'
                      ? 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20'
                      : currentCreds.source === 'custom'
                      ? 'bg-[#faf3e8] text-[#9e743a] border border-[#e7d5b8]'
                      : 'bg-[#faeaea] text-[#942426] border border-[#942426]/20'
                  }`}
                >
                  Source: {currentCreds.source === 'env' ? '.env file' : currentCreds.source === 'custom' ? 'In-App Custom' : 'Default Fallback'}
                </span>
                <button
                  onClick={runCheck}
                  disabled={isChecking}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#e5e0d5] rounded-sm text-[#131715] hover:bg-[#e5e0d5]/30 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <RefreshCw size={12} className={isChecking ? 'animate-spin text-[#193d2c]' : ''} />
                  <span>{isChecking ? 'Pinging...' : 'Re-check'}</span>
                </button>
              </div>
            </div>

            {currentCreds.source === 'fallback' && (
              <div className="flex items-start gap-2 text-xs text-[#942426] bg-[#faeaea]/70 border border-[#942426]/20 p-2.5 rounded-sm">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Notice:</strong> Your app is currently connected to the project default fallback database. If you have your own Supabase database, paste your credentials below or set them in your local <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded">.env</code> file.
                </div>
              </div>
            )}
          </div>

          {/* Table Diagnostic Status */}
          <div>
            <h4 className="font-serif text-sm font-bold text-[#131715] mb-2 flex items-center justify-between">
              <span>Live Database Tables Status</span>
              {report && (
                <span className="font-mono-fig text-xs font-normal text-[#59635e]">
                  {report.totalRecordsFound} total rows detected
                </span>
              )}
            </h4>

            {report ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-fig">
                {Object.entries(report.tables).map(([tbl, rawDiag]) => {
                  const diag = rawDiag as TableDiagnostic;
                  const isOk = diag.exists && !diag.error;
                  return (
                    <div
                      key={tbl}
                      className={`p-2.5 rounded-sm border flex items-center justify-between ${
                        isOk
                          ? 'bg-white border-[#e5e0d5]'
                          : diag.error?.includes('42501') || diag.error?.includes('permission')
                          ? 'bg-[#faf3e8] border-[#e7d5b8]'
                          : 'bg-[#faeaea]/50 border-[#942426]/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#131715] truncate">{tbl}</div>
                        <div className="text-[11px] text-[#59635e]">
                          {diag.error ? (
                            <span className="text-[#942426] font-sans">
                              {diag.error.length > 40 ? `${diag.error.slice(0, 40)}...` : diag.error}
                            </span>
                          ) : (
                            <span>{diag.count} rows {diag.sampleItemName ? `(${diag.sampleItemName})` : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isOk ? (
                          <CheckCircle2 size={16} className="text-[#193d2c]" />
                        ) : diag.error?.includes('permission') ? (
                          <ShieldAlert size={16} className="text-[#9e743a]" />
                        ) : (
                          <XCircle size={16} className="text-[#942426]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#59635e] bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm">
                Running database diagnostics...
              </div>
            )}

            {/* If 0 ingredients detected */}
            {report && report.tables['ingredients']?.count === 0 && (
              <div className="mt-3 p-3 bg-[#faf3e8] border border-[#e7d5b8] rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="text-xs text-[#131715]">
                  <strong>Table 'ingredients' has 0 rows:</strong> Either your database is newly created, or Row Level Security (RLS) is hiding rows from public read queries.
                </div>
                <button
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="px-3 py-1.5 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>{isSeeding ? 'Seeding...' : 'Seed 14 Default Ingredients'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Form to connect user's own Supabase project */}
          <div className="bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-[#193d2c]" />
              <h4 className="font-serif text-sm font-bold text-[#131715]">
                Connect Your Supabase Project (Instant Update)
              </h4>
            </div>
            <p className="text-xs text-[#59635e]">
              Enter your Supabase credentials here to immediately connect this browser tab to your database without restarting your Vite dev server:
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://your-project-id.supabase.co"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                  Supabase Anon Public API Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs text-[#59635e] hover:text-[#942426] underline cursor-pointer"
                >
                  Reset to default credentials
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] transition-all shadow-xs cursor-pointer"
                >
                  {isSaving ? 'Connecting...' : 'Connect & Fetch Live Data'}
                </button>
              </div>
            </form>
          </div>

          {/* VS Code Setup Guide */}
          <div className="border border-[#e5e0d5] rounded-sm p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-[#193d2c]" />
                <h4 className="font-serif text-sm font-bold text-[#131715]">
                  How to configure in VS Code (.env file)
                </h4>
              </div>
              <button
                onClick={() => copyToClipboard(envFileSnippet, 'env')}
                className="text-xs text-[#193d2c] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedEnv ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedEnv ? 'Copied' : 'Copy .env snippet'}</span>
              </button>
            </div>
            <p className="text-xs text-[#59635e]">
              In your VS Code workspace root, create a file named <code className="bg-[#f5f2eb] px-1 py-0.5 rounded font-mono text-[11px] text-[#131715]">.env</code>:
            </p>
            <pre className="bg-[#131715] text-[#e5e0d5] p-3 rounded-sm text-[11px] font-mono overflow-x-auto">
              {envFileSnippet}
            </pre>
            <p className="text-[11px] text-[#59635e]">
              * Note: After creating or editing <code className="font-mono text-[11px]">.env</code> in VS Code, stop Vite (<kbd className="bg-white border border-[#e5e0d5] px-1 rounded">Ctrl+C</kbd>) and re-run <code className="font-mono text-[11px]">npm run dev</code> so Vite reloads the new variables into memory.
            </p>
          </div>

          {/* Row Level Security (RLS) SQL helper */}
          <div className="border border-[#e5e0d5] rounded-sm p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-[#9e743a]" />
                <h4 className="font-serif text-sm font-bold text-[#131715]">
                  Supabase RLS Policy Quick Fix (if queries return 0 rows)
                </h4>
              </div>
              <button
                onClick={() => copyToClipboard(rlsFixSql, 'sql')}
                className="text-xs text-[#193d2c] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <p className="text-xs text-[#59635e]">
              If tables exist in your Supabase dashboard but the app displays 0 rows, Supabase Row Level Security (RLS) is blocking the anon key. Run this SQL in your Supabase SQL Editor:
            </p>
            <pre className="bg-[#131715] text-[#e5e0d5] p-3 rounded-sm text-[11px] font-mono overflow-x-auto max-h-36 custom-scrollbar">
              {rlsFixSql}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#e5e0d5] bg-[#fbfaf7] flex justify-end shrink-0">
          <button
            onClick={() => setDatabaseModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
