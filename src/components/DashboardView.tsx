import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  IndianRupee,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ShoppingBag,
  History,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function DashboardView() {
  const {
    ingredients,
    transactions,
    dailySummaries,
    navigateTo,
    hasStockEditAccess,
    setDatabaseModalOpen,
    credentialSource,
    profile,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Stock values
  const provisionsValue = ingredients
    .filter((i) => i.category === 'provisions')
    .reduce((sum, i) => sum + (i.current_stock * i.current_price || 0), 0);

  const perishablesValue = ingredients
    .filter((i) => i.category === 'perishable')
    .reduce((sum, i) => sum + (i.current_stock * i.current_price || 0), 0);

  const zeroStockCount = ingredients.filter((i) => i.active && i.current_stock <= 0).length;

  // Selected date summary
  const daySummary = dailySummaries[selectedDate] || {
    usage_date: selectedDate,
    total_expenditure: 0,
    student_count: null,
    guest_count: null,
    total_people: null,
    cost_per_head: null,
  };

  // Recent 15 entries
  const recentEntries = transactions.slice(0, 15);

  const formatCurrency = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '—';
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e5e0d5] pb-4">
        <div>
          <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
            Overview &middot; Executive Ledger
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
            Dashboard
          </h2>
          <p className="text-sm text-[#59635e] mt-1 max-w-xl">
            Live stock valuation, daily student expenditure, and the active audit trail across the register.
          </p>
        </div>

        {hasStockEditAccess && (
          <div className="flex items-center gap-2">
            <button
              id="dash-quick-purchase-btn"
              onClick={() => navigateTo('log-purchase')}
              className="px-3.5 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>+ Purchase</span>
            </button>
            <button
              id="dash-quick-usage-btn"
              onClick={() => navigateTo('log-usage')}
              className="px-3.5 py-2 text-xs font-semibold rounded-sm bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb] active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingDown size={14} className="text-[#942426]" />
              <span>- Log Usage</span>
            </button>
          </div>
        )}
      </div>

      {/* Database Connection Notice Banner - Admin Only */}
      {profile?.role === 'admin' && credentialSource === 'fallback' && (
        <div className="p-3 bg-[#faf3e8] border border-[#e7d5b8] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#131715]">
          <div className="flex items-start gap-2">
            <Database size={15} className="text-[#9e743a] shrink-0 mt-0.5" />
            <div>
              <strong>Using Default Fallback Database:</strong> The app is not yet pointed to your own Supabase database. If you have created tables in Supabase, click below to connect and fetch your real records.
            </div>
          </div>
          <button
            onClick={() => setDatabaseModalOpen(true)}
            className="px-3 py-1.5 bg-[#193d2c] text-[#f7f9f7] rounded-sm font-semibold hover:bg-[#122e21] transition-colors shrink-0 cursor-pointer text-xs"
          >
            Configure Supabase Connection
          </button>
        </div>
      )}

      {/* Daily Expenditure & Headcount Summary */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#e5e0d5]">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#193d2c]" />
            <h3 className="font-serif text-base font-bold text-[#131715]">
              Daily Expenditure &amp; Cost Per Head
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
                selectedDate === todayStr
                  ? 'bg-[#193d2c] text-[#f7f9f7] border-[#193d2c] font-semibold'
                  : 'bg-white border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1 text-xs rounded-sm border transition-colors ${
                selectedDate === yesterdayStr
                  ? 'bg-[#193d2c] text-[#f7f9f7] border-[#193d2c] font-semibold'
                  : 'bg-white border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }`}
            >
              Yesterday
            </button>
            <input
              type="date"
              id="dash-date-picker"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>
        </div>

        {/* 5 Headcount & Cost metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm p-3">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">
              Total Expenditure
            </span>
            <span className="font-mono-fig text-xl font-bold text-[#131715] block">
              {formatCurrency(daySummary.total_expenditure)}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm p-3">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">
              Students Ate
            </span>
            <span className="font-mono-fig text-xl font-semibold text-[#131715] block">
              {daySummary.student_count ?? '—'}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm p-3">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">
              Guests Ate
            </span>
            <span className="font-mono-fig text-xl font-semibold text-[#131715] block">
              {daySummary.guest_count ?? '—'}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm p-3">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">
              Total People
            </span>
            <span className="font-mono-fig text-xl font-semibold text-[#131715] block">
              {daySummary.total_people ?? '—'}
            </span>
          </div>

          <div className="bg-[#e6f0ea] border border-[#193d2c]/30 rounded-sm p-3 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#193d2c] block font-bold mb-1 uppercase tracking-wide">
              Cost Per Head
            </span>
            <span className="font-mono-fig text-xl font-bold text-[#193d2c] block">
              {daySummary.cost_per_head != null ? formatCurrency(daySummary.cost_per_head) : '—'}
            </span>
          </div>
        </div>

        {daySummary.total_people == null && (
          <div className="mt-3 flex items-center justify-between text-xs text-[#59635e] bg-[#f5f2eb] px-3 py-2 rounded-sm border border-[#e5e0d5]/60">
            <span>
              No headcount entered for {selectedDate} yet. Cost per head calculates once attendance is recorded.
            </span>
            <button
              onClick={() => navigateTo('headcount')}
              className="text-[#193d2c] font-bold hover:underline shrink-0 ml-2"
            >
              Enter Headcount &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Three Stock Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div
          onClick={() => navigateTo('ingredients')}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Provisions Value in Stock</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <IndianRupee size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {formatCurrency(provisionsValue)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Rice, pulses, oils &amp; spices (weighted average)
          </span>
        </div>

        <div
          onClick={() => navigateTo('ingredients')}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Perishables Value in Stock</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <ShoppingBag size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {formatCurrency(perishablesValue)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Milk, eggs, vegetables &amp; dairy items
          </span>
        </div>

        <div
          onClick={() => navigateTo('ingredients')}
          className="bg-white border border-[#e5e0d5] rounded-sm p-4 cursor-pointer hover:border-[#193d2c] transition-all shadow-[0_1px_3px_rgba(19,23,21,0.03)] hover:shadow-[0_2px_6px_rgba(19,23,21,0.06)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Ingredients at Zero Stock</span>
            <div
              className={`w-6 h-6 rounded-sm flex items-center justify-center ${
                zeroStockCount > 0 ? 'bg-[#faeaea] text-[#942426]' : 'bg-[#e6f0ea] text-[#193d2c]'
              }`}
            >
              <AlertTriangle size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {zeroStockCount}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            {zeroStockCount > 0 ? 'Urgent restocking needed for mess kitchen' : 'All staple ingredients in stock'}
          </span>
        </div>
      </div>

      {/* Recent Entries Ledger Table */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[#e5e0d5]">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#193d2c]" />
            <h3 className="font-serif text-base font-bold text-[#131715]">
              Recent Register Entries (Across All Dates)
            </h3>
          </div>
          <button
            onClick={() => navigateTo('daily-usage')}
            className="text-xs text-[#193d2c] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Daily Breakdown</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="text-center py-10 text-[#59635e] text-sm font-serif">
            No entries recorded in the register yet.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#131715] text-[11px] font-bold uppercase tracking-wider text-[#59635e]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">By</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                  <th className="py-2.5 px-3">Note / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5]">
                {recentEntries.map((t) => {
                  const isAdj = t.txn_type === 'adjustment';
                  const isUsage = t.txn_type === 'usage';
                  const isPurchase = t.txn_type === 'purchase';

                  const dateFormatted = new Date(t.created_at || t.usage_date).toLocaleDateString(
                    'en-IN',
                    { day: '2-digit', month: 'short' }
                  );

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#193d2c]/5 transition-colors font-mono-fig text-[#131715]"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-[#59635e]">
                        {dateFormatted}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium whitespace-nowrap">
                        {t.ingredients?.name || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[12px] text-[#59635e]">
                        {t.created_by_name || 'Staff User'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isAdj && <span className="ledger-stamp">Adjusted</span>}
                        {isUsage && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#faeaea] text-[#942426] font-semibold font-sans">
                            Usage
                          </span>
                        )}
                        {isPurchase && (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-[#e6f0ea] text-[#193d2c] font-semibold font-sans">
                            Purchase
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right whitespace-nowrap font-medium ${
                          t.quantity > 0 ? 'text-[#193d2c]' : 'text-[#942426]'
                        }`}
                      >
                        {t.quantity > 0 ? `+${t.quantity}` : t.quantity}{' '}
                        <span className="text-[11px] text-[#59635e] font-sans">
                          {t.ingredients?.unit || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold">
                        {formatCurrency(t.total_cost)}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#59635e] font-sans max-w-xs truncate">
                        {t.meal_type
                          ? `${t.meal_type.toUpperCase()}`
                          : t.vendor
                          ? `Vendor: ${t.vendor}`
                          : t.reason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
