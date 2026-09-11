import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Printer,
  CheckCircle,
  AlertCircle,
  Calendar,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailyExpenditureSummary } from '../types';

export function MonthlyReportView() {
  const {
    ingredients,
    transactions,
    dailySummaries,
    finalizeMonth,
    hasStockEditAccess,
    profile,
  } = useApp();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedInfo, setFinalizedInfo] = useState<{ date: string; user: string } | null>(null);

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = `${selectedMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  // Filter transactions for this month
  const monthTxns = transactions.filter((t) => {
    const d = t.usage_date || t.created_at.split('T')[0];
    return d >= monthStart && d <= monthEnd;
  });

  // Filter opening balance (txns before monthStart)
  const openingByIngredient: Record<string, number> = {};
  transactions
    .filter((t) => {
      const d = t.usage_date || t.created_at.split('T')[0];
      return d < monthStart;
    })
    .forEach((t) => {
      openingByIngredient[t.ingredient_id] =
        (openingByIngredient[t.ingredient_id] || 0) + Number(t.quantity);
    });

  // Daily rows in this month
  const dailyRows: DailyExpenditureSummary[] = (Object.values(dailySummaries) as DailyExpenditureSummary[])
    .filter((s) => s.usage_date >= monthStart && s.usage_date <= monthEnd)
    .sort((a, b) => a.usage_date.localeCompare(b.usage_date));

  // Aggregate by ingredient
  interface IngredientMonthLine {
    id: string;
    name: string;
    category: string;
    unit: string;
    opening: number;
    purchasedQty: number;
    purchasedCost: number;
    usedQty: number;
    usedCost: number;
    adjustQty: number;
    netQty: number;
    closing: number;
    closingValue: number;
  }

  const perIngredient: Record<string, IngredientMonthLine> = {};

  monthTxns.forEach((t) => {
    const id = t.ingredient_id;
    if (!perIngredient[id]) {
      const ing = ingredients.find((i) => i.ingredient_id === id);
      perIngredient[id] = {
        id,
        name: ing?.name || t.ingredients?.name || 'Unknown',
        category: ing?.category || t.ingredients?.category || 'provisions',
        unit: ing?.unit || t.ingredients?.unit || 'kg',
        opening: 0,
        purchasedQty: 0,
        purchasedCost: 0,
        usedQty: 0,
        usedCost: 0,
        adjustQty: 0,
        netQty: 0,
        closing: 0,
        closingValue: 0,
      };
    }

    const row = perIngredient[id];
    row.netQty += Number(t.quantity);

    if (t.txn_type === 'purchase') {
      row.purchasedQty += Number(t.quantity);
      row.purchasedCost += Number(t.total_cost || 0);
    } else if (t.txn_type === 'usage') {
      row.usedQty += Math.abs(Number(t.quantity));
      row.usedCost += Number(t.total_cost || 0);
    } else if (t.txn_type === 'adjustment') {
      row.adjustQty += Number(t.quantity);
    }
  });

  const provisionsRows: IngredientMonthLine[] = [];
  const perishableRows: IngredientMonthLine[] = [];

  Object.values(perIngredient).forEach((line) => {
    const ing = ingredients.find((i) => i.ingredient_id === line.id);
    line.opening = openingByIngredient[line.id] || 0;
    line.closing = line.opening + line.netQty;
    line.closingValue = line.closing * (ing?.current_price || 0);

    if (line.category === 'provisions') {
      provisionsRows.push(line);
    } else {
      perishableRows.push(line);
    }
  });

  // Calculate high-level summary metrics
  const totalProvisionsCost = provisionsRows.reduce((s, r) => s + r.usedCost, 0);
  const totalPerishablesCost = perishableRows.reduce((s, r) => s + r.usedCost, 0);
  const totalExpenditure = totalProvisionsCost + totalPerishablesCost;

  const totalPersonDays = dailyRows.reduce((s, r) => s + (r.total_people || 0), 0);
  const avgCostPerHead = totalPersonDays > 0 ? totalExpenditure / totalPersonDays : null;

  // Month adjustments
  const monthAdjustments = monthTxns.filter((t) => t.txn_type === 'adjustment');

  const handleFinalize = async () => {
    const success = await finalizeMonth(selectedMonth);
    if (success) {
      setIsFinalized(true);
      setFinalizedInfo({
        date: new Date().toLocaleDateString('en-IN'),
        user: profile?.name || 'Mess Incharge',
      });
    }
  };

  const formatCurrency = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '—';
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatQty = (n: number, unit: string) => {
    return `${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#e5e0d5] pb-4 no-print">
        <div>
          <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
            Mess Committee &middot; Official Audit Statement
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
            Monthly Report
          </h2>
          <p className="text-sm text-[#59635e] mt-1">
            Complete reconciliation statement: provisions, perishables, day-wise headcount, and per-head mess charge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-semibold rounded-sm bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} />
            <span>Print / Save PDF</span>
          </button>
          {hasStockEditAccess && (
            <button
              id="finalize-report-btn"
              onClick={handleFinalize}
              className={`px-3 py-2 text-xs font-semibold rounded-sm text-[#f7f9f7] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isFinalized ? 'bg-[#193d2c] hover:bg-[#122e21]' : 'bg-[#942426] hover:bg-[#7e1c1f]'
              }`}
            >
              <Lock size={13} />
              <span>{isFinalized ? 'Re-Finalize Month' : 'Finalize This Month'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Selector Bar (No Print) */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 flex items-center justify-between no-print shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#193d2c]" />
          <span className="text-xs font-semibold text-[#131715]">Choose Ledger Month:</span>
        </div>
        <input
          type="month"
          id="report-month-input"
          value={selectedMonth}
          max={currentMonthStr}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
        />
      </div>

      {/* Summary Page (Styled for print and screen) */}
      <div className="report-page bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e0d5] pb-3">
          <div>
            <span className="font-mono-fig text-xs font-bold uppercase tracking-widest text-[#193d2c]">
              {monthLabel}
            </span>
            <h3 className="font-serif text-xl font-bold text-[#131715]">
              Mess Expenditure Summary
            </h3>
          </div>

          <div>
            {isFinalized ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/30">
                <CheckCircle size={13} />
                <span>Finalized on {finalizedInfo?.date} by {finalizedInfo?.user}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#faeaea] text-[#942426] border border-[#942426]/30">
                <AlertCircle size={13} />
                <span>Draft — Not Yet Finalized</span>
              </span>
            )}
          </div>
        </div>

        {/* 5 Big Stat Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Provisions Cost</span>
            <span className="font-mono-fig text-lg font-bold text-[#131715] block">
              {formatCurrency(totalProvisionsCost)}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Perishables Cost</span>
            <span className="font-mono-fig text-lg font-bold text-[#131715] block">
              {formatCurrency(totalPerishablesCost)}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Total Ingredients</span>
            <span className="font-mono-fig text-lg font-bold text-[#193d2c] block">
              {formatCurrency(totalExpenditure)}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Person-Days</span>
            <span className="font-mono-fig text-lg font-bold text-[#131715] block">
              {totalPersonDays || '—'}
            </span>
          </div>

          <div className="bg-[#e6f0ea] border border-[#193d2c]/30 p-3 rounded-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#193d2c] block font-bold mb-1 uppercase tracking-wide">
              Avg Cost Per Head
            </span>
            <span className="font-mono-fig text-lg font-bold text-[#193d2c] block">
              {avgCostPerHead != null ? formatCurrency(avgCostPerHead) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="report-page bg-white border border-[#e5e0d5] rounded-sm p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-3 pb-2 border-b border-[#e5e0d5]">
          Daily Attendance &amp; Cost Breakdown ({monthLabel})
        </h3>
        {dailyRows.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#59635e]">
            No daily headcount or expenditure entries logged in {monthLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#131715] font-bold text-[#59635e] uppercase tracking-wider">
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5 text-right">Expenditure</th>
                  <th className="py-2 px-2.5 text-right">Students</th>
                  <th className="py-2 px-2.5 text-right">Guests</th>
                  <th className="py-2 px-2.5 text-right">Total Diners</th>
                  <th className="py-2 px-2.5 text-right">Cost / Head</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5] font-mono-fig">
                {dailyRows.map((r) => (
                  <tr key={r.usage_date} className="hover:bg-[#193d2c]/5 transition-colors">
                    <td className="py-2 px-2.5 text-[#59635e]">{r.usage_date}</td>
                    <td className="py-2 px-2.5 text-right font-semibold text-[#131715]">
                      {formatCurrency(r.total_expenditure)}
                    </td>
                    <td className="py-2 px-2.5 text-right">{r.student_count ?? '—'}</td>
                    <td className="py-2 px-2.5 text-right">{r.guest_count ?? '—'}</td>
                    <td className="py-2 px-2.5 text-right font-medium">{r.total_people ?? '—'}</td>
                    <td className="py-2 px-2.5 text-right font-bold text-[#193d2c]">
                      {r.cost_per_head != null ? formatCurrency(r.cost_per_head) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provisions Ingredient Detail Table */}
      <div className="report-page bg-white border border-[#e5e0d5] rounded-sm p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-3 pb-2 border-b border-[#e5e0d5]">
          Provisions &middot; Detailed Stock Ledger
        </h3>
        {provisionsRows.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#59635e]">
            No provisions activity recorded for this month.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#131715] font-bold text-[#59635e] uppercase tracking-wider">
                  <th className="py-2 px-2.5">Ingredient</th>
                  <th className="py-2 px-2.5 text-right">Opening</th>
                  <th className="py-2 px-2.5 text-right">Purchased</th>
                  <th className="py-2 px-2.5 text-right">Purchase Cost</th>
                  <th className="py-2 px-2.5 text-right">Used</th>
                  <th className="py-2 px-2.5 text-right">Usage Cost</th>
                  <th className="py-2 px-2.5 text-right">Closing</th>
                  <th className="py-2 px-2.5 text-right">Closing Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5] font-mono-fig">
                {provisionsRows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#193d2c]/5 transition-colors">
                    <td className="py-2 px-2.5 font-sans font-medium text-[#131715]">{r.name}</td>
                    <td className="py-2 px-2.5 text-right text-[#59635e]">{formatQty(r.opening, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right text-[#193d2c]">+{formatQty(r.purchasedQty, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right">{formatCurrency(r.purchasedCost)}</td>
                    <td className="py-2 px-2.5 text-right text-[#942426]">-{formatQty(r.usedQty, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right font-semibold text-[#942426]">{formatCurrency(r.usedCost)}</td>
                    <td className="py-2 px-2.5 text-right font-medium">{formatQty(r.closing, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right font-bold">{formatCurrency(r.closingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Perishables Ingredient Detail Table */}
      <div className="report-page bg-white border border-[#e5e0d5] rounded-sm p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-3 pb-2 border-b border-[#e5e0d5]">
          Perishables &middot; Detailed Stock Ledger
        </h3>
        {perishableRows.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#59635e]">
            No perishables activity recorded for this month.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#131715] font-bold text-[#59635e] uppercase tracking-wider">
                  <th className="py-2 px-2.5">Ingredient</th>
                  <th className="py-2 px-2.5 text-right">Opening</th>
                  <th className="py-2 px-2.5 text-right">Purchased</th>
                  <th className="py-2 px-2.5 text-right">Purchase Cost</th>
                  <th className="py-2 px-2.5 text-right">Used</th>
                  <th className="py-2 px-2.5 text-right">Usage Cost</th>
                  <th className="py-2 px-2.5 text-right">Closing</th>
                  <th className="py-2 px-2.5 text-right">Closing Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5] font-mono-fig">
                {perishableRows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#193d2c]/5 transition-colors">
                    <td className="py-2 px-2.5 font-sans font-medium text-[#131715]">{r.name}</td>
                    <td className="py-2 px-2.5 text-right text-[#59635e]">{formatQty(r.opening, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right text-[#193d2c]">+{formatQty(r.purchasedQty, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right">{formatCurrency(r.purchasedCost)}</td>
                    <td className="py-2 px-2.5 text-right text-[#942426]">-{formatQty(r.usedQty, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right font-semibold text-[#942426]">{formatCurrency(r.usedCost)}</td>
                    <td className="py-2 px-2.5 text-right font-medium">{formatQty(r.closing, r.unit)}</td>
                    <td className="py-2 px-2.5 text-right font-bold">{formatCurrency(r.closingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjustments in this month */}
      <div className="report-page bg-white border border-[#e5e0d5] rounded-sm p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-3 pb-2 border-b border-[#e5e0d5]">
          Corrections &amp; Adjustments This Month
        </h3>
        {monthAdjustments.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#59635e]">
            No inventory adjustments recorded in {monthLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#131715] font-bold text-[#59635e] uppercase tracking-wider">
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Ingredient</th>
                  <th className="py-2 px-2.5 text-right">Adjustment Qty</th>
                  <th className="py-2 px-2.5">Reason &amp; Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5] font-mono-fig">
                {monthAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#193d2c]/5 transition-colors">
                    <td className="py-2 px-2.5 text-[#59635e]">{a.usage_date}</td>
                    <td className="py-2 px-2.5 font-sans font-medium text-[#131715]">{a.ingredients?.name}</td>
                    <td className="py-2 px-2.5 text-right font-bold text-[#942426]">
                      {a.quantity > 0 ? `+${a.quantity}` : a.quantity} {a.ingredients?.unit}
                    </td>
                    <td className="py-2 px-2.5 font-sans">
                      <span className="ledger-stamp mr-1.5">ADJUSTMENT</span>
                      <span className="text-[#131715]">{a.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
