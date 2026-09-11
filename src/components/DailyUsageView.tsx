import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Calendar, Printer, Utensils } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function DailyUsageView() {
  const { transactions } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(yesterdayStr);

  const usageEntries = transactions.filter(
    (t) => t.txn_type === 'usage' && (t.usage_date === selectedDate || t.created_at.startsWith(selectedDate))
  );

  const totalCost = usageEntries.reduce((sum, t) => sum + (t.total_cost || 0), 0);

  const formatCurrency = (n: number) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e5e0d5] pb-4">
        <div>
          <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
            Kitchen Audit &middot; Daily Consumption
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
            Daily Stock Usage
          </h2>
          <p className="text-sm text-[#59635e] mt-1">
            Review the exact ingredients, quantities, and costs consumed on a specific day.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 text-xs text-[#131715] hover:bg-[#f5f2eb] border border-[#e5e0d5] bg-white rounded-sm flex items-center gap-1.5 self-start sm:self-auto shadow-xs cursor-pointer transition-colors"
        >
          <Printer size={14} />
          <span>Print Sheet</span>
        </button>
      </div>

      {/* Date filter card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#193d2c]" />
          <span className="text-xs font-semibold text-[#131715]">Select Audit Date:</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-2.5 py-1 text-xs rounded-sm border transition-colors cursor-pointer ${
              selectedDate === todayStr
                ? 'bg-[#193d2c] text-[#f7f9f7] border-[#193d2c] font-semibold'
                : 'bg-white border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`px-2.5 py-1 text-xs rounded-sm border transition-colors cursor-pointer ${
              selectedDate === yesterdayStr
                ? 'bg-[#193d2c] text-[#f7f9f7] border-[#193d2c] font-semibold'
                : 'bg-white border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
            }`}
          >
            Yesterday
          </button>
          <input
            type="date"
            id="daily-usage-date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        {usageEntries.length === 0 ? (
          <div className="text-center py-12 text-[#59635e] text-sm font-serif">
            No stock usage logged for {selectedDate}.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#131715] text-[11px] font-bold uppercase tracking-wider text-[#59635e]">
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Meal</th>
                  <th className="py-2.5 px-3 text-right">Qty Used</th>
                  <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5]">
                {usageEntries.map((t) => {
                  const qty = Math.abs(t.quantity);
                  const meal = t.meal_type
                    ? t.meal_type.charAt(0).toUpperCase() + t.meal_type.slice(1)
                    : '—';
                  const isProv = t.ingredients?.category === 'provisions';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#193d2c]/5 transition-colors font-mono-fig text-[#131715]"
                    >
                      <td className="py-2.5 px-3 font-sans font-medium">
                        {t.ingredients?.name || 'Unknown'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-sm capitalize font-medium ${
                            isProv
                              ? 'bg-[#f5f2eb] text-[#131715] border border-[#e5e0d5]'
                              : 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20'
                          }`}
                        >
                          {t.ingredients?.category || 'provisions'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-xs">
                        {meal}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#942426]">
                        {qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}{' '}
                        <span className="text-[11px] text-[#59635e] font-sans">
                          {t.ingredients?.unit || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {formatCurrency(t.total_cost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#131715] font-mono-fig font-bold bg-[#f5f2eb]">
                  <td colSpan={4} className="py-3 px-3 text-right text-xs uppercase tracking-wider text-[#131715]">
                    Total Day Consumption Expenditure:
                  </td>
                  <td className="py-3 px-3 text-right text-base text-[#193d2c]">
                    {formatCurrency(totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
