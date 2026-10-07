import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Receipt,
  Search,
  Printer,
  PlusCircle,
  Calendar,
  Package,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StockTransaction } from '../types';
import { IngredientNameDisplay } from '../lib/ingredientDisplay';

export function PurchasesView() {
  const {
    transactions,
    ingredients,
    navigateTo,
    hasStockEditAccess,
  } = useApp();

  // All purchase transactions, sorted by purchase date (newest first)
  const purchaseTxns = useMemo(() => {
    return transactions
      .filter((t) => t.txn_type === 'purchase')
      .sort((a, b) => {
        const dateA = a.usage_date || a.created_at;
        const dateB = b.usage_date || b.created_at;
        return dateB.localeCompare(dateA);
      });
  }, [transactions]);

  // Extract unique vendors
  const allVendors = useMemo(() => {
    const set = new Set<string>();
    purchaseTxns.forEach((t) => {
      if (t.vendor && t.vendor.trim()) {
        set.add(t.vendor.trim());
      }
    });
    return Array.from(set).sort();
  }, [purchaseTxns]);

  // Date filter state
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'this_month' | 'last_month' | 'today' | 'custom'>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'provisions' | 'perishable'>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc'>('date_desc');

  // Compute active date range based on filter mode
  const filteredTxns = useMemo(() => {
    return purchaseTxns.filter((t) => {
      const txnDate = t.usage_date || t.created_at.split('T')[0];

      // Date filtering
      if (dateFilterMode === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (txnDate !== todayStr) return false;
      } else if (dateFilterMode === 'this_month') {
        if (!txnDate.startsWith(currentMonthStr)) return false;
      } else if (dateFilterMode === 'last_month') {
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
        if (!txnDate.startsWith(prevMonthStr)) return false;
      } else if (dateFilterMode === 'custom') {
        if (selectedMonth && !txnDate.startsWith(selectedMonth)) return false;
      }

      // Category filter
      const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
      const cat = ing?.category || t.ingredients?.category;
      if (selectedCategory !== 'all' && cat !== selectedCategory) {
        return false;
      }

      // Vendor filter
      if (selectedVendor !== 'all' && (t.vendor || '').trim() !== selectedVendor) {
        return false;
      }

      // Search query (matches ingredient english, telugu, or vendor, or received by)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const ingName = (ing?.name || t.ingredients?.name || '').toLowerCase();
        const ingTelugu = (ing?.name_telugu || t.ingredients?.name_telugu || '').toLowerCase();
        const vendor = (t.vendor || '').toLowerCase();
        const by = (t.created_by_name || '').toLowerCase();
        if (!ingName.includes(q) && !ingTelugu.includes(q) && !vendor.includes(q) && !by.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'cost_desc') return (b.total_cost || 0) - (a.total_cost || 0);
      if (sortOrder === 'cost_asc') return (a.total_cost || 0) - (b.total_cost || 0);
      const dateA = a.usage_date || a.created_at;
      const dateB = b.usage_date || b.created_at;
      if (sortOrder === 'date_asc') return dateA.localeCompare(dateB);
      return dateB.localeCompare(dateA);
    });
  }, [
    purchaseTxns,
    dateFilterMode,
    currentMonthStr,
    now,
    selectedMonth,
    ingredients,
    selectedCategory,
    selectedVendor,
    searchTerm,
    sortOrder,
  ]);

  // Summary Metrics for filtered view
  const totalSpend = useMemo(() => {
    return filteredTxns.reduce((sum, t) => sum + (t.total_cost || 0), 0);
  }, [filteredTxns]);

  const totalQuantity = useMemo(() => {
    return filteredTxns.reduce((sum, t) => sum + (t.quantity || 0), 0);
  }, [filteredTxns]);

  const formatCurrency = (n: number) => {
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (usageDate?: string | null, createdAt?: string | null) => {
    const raw = usageDate || (createdAt ? createdAt.split('T')[0] : '');
    if (!raw) return '—';
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts.map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }
    }
    return new Date(raw).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
            Goods Received &middot; Inward Stock Register
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
            Purchase Register
          </h2>
          <p className="text-sm text-[#59635e] mt-1 max-w-2xl">
            Detailed log of all ingredient purchases, vendor invoices, inward weights, and acquisition costs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs text-[#131715] hover:bg-[#f4f7f5] border border-[#e5e0d5] bg-white rounded-sm flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Printer size={14} />
            <span>Print Register</span>
          </button>

          {hasStockEditAccess && (
            <button
              onClick={() => navigateTo('log-purchase')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>Log a Purchase</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spend */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Total Spend</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Receipt size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#193d2c]">
            {formatCurrency(totalSpend)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Across {filteredTxns.length} purchase entries
          </span>
        </div>

        {/* Total Items Received */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Inward Entries</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Package size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {filteredTxns.length}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Recorded receipts
          </span>
        </div>

        {/* Total Net Quantity */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">Volume Received</span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Layers size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {totalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Gross incoming units
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 space-y-3.5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e5e0d5]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#59635e] mr-1 flex items-center gap-1">
              <Calendar size={13} /> Period:
            </span>
            <button
              onClick={() => setDateFilterMode('this_month')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                dateFilterMode === 'this_month'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilterMode('last_month')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                dateFilterMode === 'last_month'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateFilterMode('today')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                dateFilterMode === 'today'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilterMode('all')}
              className={`px-2.5 py-1 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                dateFilterMode === 'all'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Month selector for custom filtering */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#59635e]">Filter Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setDateFilterMode('custom');
              }}
              className="px-2.5 py-1 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>
        </div>

        {/* Search, Category, Vendor & Sort Options */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b948f] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by ingredient, Telugu name, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] placeholder-[#8b948f] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            >
              <option value="all">All Categories</option>
              <option value="provisions">Provisions Only</option>
              <option value="perishable">Perishables Only</option>
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            >
              <option value="all">All Vendors ({allVendors.length})</option>
              {allVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div className="md:col-span-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="cost_desc">Cost (High to Low)</option>
              <option value="cost_asc">Cost (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Register Table */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        {filteredTxns.length === 0 ? (
          <div className="text-center py-14 space-y-3">
            <Receipt size={32} className="mx-auto text-[#8b948f] opacity-40" />
            <p className="text-sm font-serif text-[#59635e]">
              No purchases found matching the selected filters.
            </p>
            {(searchTerm || selectedCategory !== 'all' || selectedVendor !== 'all' || dateFilterMode !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedVendor('all');
                  setDateFilterMode('all');
                }}
                className="text-xs text-[#193d2c] font-semibold hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#131715] text-[11px] font-bold uppercase tracking-wider text-[#59635e]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Rate / Unit</th>
                  <th className="py-2.5 px-3 text-right">Total Bill (₹)</th>
                  <th className="py-2.5 px-3">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5]">
                {filteredTxns.map((t) => {
                  const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
                  const ingName = ing?.name || t.ingredients?.name || 'Unknown Item';
                  const ingTelugu = ing?.name_telugu || t.ingredients?.name_telugu;
                  const unit = ing?.unit || t.ingredients?.unit || 'unit';
                  const cat = ing?.category || t.ingredients?.category || 'provisions';
                  const unitRate = t.quantity > 0 ? (t.total_cost || 0) / t.quantity : 0;

                  // Date formatting
                  const rawTxnDate = t.usage_date || (t.created_at ? t.created_at.split('T')[0] : '');
                  const rawLoggedDate = t.created_at ? t.created_at.split('T')[0] : '';
                  const isBackdated = rawLoggedDate && rawTxnDate && rawLoggedDate !== rawTxnDate;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#193d2c]/5 transition-colors font-mono-fig text-[#131715]"
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-xs text-[#131715]">
                          {formatDate(t.usage_date, t.created_at)}
                        </div>
                        {isBackdated && (
                          <div
                            className="text-[10px] text-[#8b948f] font-sans"
                            title={`Logged into system on ${rawLoggedDate}`}
                          >
                            Logged: {rawLoggedDate}
                          </div>
                        )}
                      </td>

                      {/* Ingredient (English & Telugu side by side) */}
                      <td className="py-2.5 px-3 font-sans font-medium">
                        <IngredientNameDisplay
                          name={ingName}
                          nameTelugu={ingTelugu}
                        />
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-sm capitalize font-medium ${
                            cat === 'provisions'
                              ? 'bg-[#ffffff] text-[#131715] border border-[#e5e0d5]'
                              : 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20'
                          }`}
                        >
                          {cat}
                        </span>
                      </td>

                      {/* Vendor (Left blank if no vendor specified) */}
                      <td className="py-2.5 px-3 font-sans text-xs text-[#59635e]">
                        {t.vendor ? (
                          <span className="font-medium text-[#131715]">{t.vendor}</span>
                        ) : null}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-[#193d2c]">
                        +{t.quantity}{' '}
                        <span className="text-[11px] text-[#59635e] font-sans font-normal">
                          {unit}
                        </span>
                      </td>

                      {/* Rate / Unit */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap text-[#59635e] text-xs">
                        ₹{unitRate.toFixed(2)}/{unit}
                      </td>

                      {/* Total Cost */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-[#131715]">
                        {formatCurrency(t.total_cost || 0)}
                      </td>

                      {/* Received By */}
                      <td className="py-2.5 px-3 font-sans text-xs text-[#59635e] whitespace-nowrap">
                        {t.created_by_name || 'Staff User'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Summary Footer Row */}
              <tfoot>
                <tr className="border-t-2 border-[#131715] font-bold bg-[#fbfaf7] text-[#131715]">
                  <td colSpan={4} className="py-3 px-3 font-sans text-xs uppercase tracking-wider">
                    Total for Filtered Period ({filteredTxns.length} entries)
                  </td>
                  <td className="py-3 px-3 text-right font-mono-fig text-sm text-[#193d2c]">
                    +{totalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3 text-right font-mono-fig text-base text-[#193d2c]">
                    {formatCurrency(totalSpend)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
