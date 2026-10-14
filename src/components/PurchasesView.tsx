import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt,
  Search,
  Printer,
  PlusCircle,
  Calendar,
  Package,
  Layers,
  ChevronDown,
  Clock,
  Store,
  User,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StockTransaction } from '../types';
import { IngredientNameDisplay } from '../lib/ingredientDisplay';

interface PurchaseBatchGroup {
  batchKey: string;
  purchaseDate: string; // YYYY-MM-DD
  loggedTimestamp: string; // ISO string
  vendor: string | null;
  createdBy: string;
  items: StockTransaction[];
  totalCost: number;
  totalQuantity: number;
  isBulk: boolean;
}

export function PurchasesView() {
  const {
    transactions,
    ingredients,
    navigateTo,
    hasStockEditAccess,
  } = useApp();

  // Primary Register Mode: 'provisions' or 'perishable'
  const [registerMode, setRegisterMode] = useState<'provisions' | 'perishable'>('provisions');

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

  // Total counts for provisions vs perishables
  const { provisionsTotalCount, perishablesTotalCount } = useMemo(() => {
    let prov = 0;
    let perish = 0;
    purchaseTxns.forEach((t) => {
      const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
      const cat = ing?.category || t.ingredients?.category || 'provisions';
      if (cat === 'perishable') perish++;
      else prov++;
    });
    return { provisionsTotalCount: prov, perishablesTotalCount: perish };
  }, [purchaseTxns, ingredients]);

  // Extract unique vendors for the active register mode
  const allVendors = useMemo(() => {
    const set = new Set<string>();
    purchaseTxns.forEach((t) => {
      const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
      const cat = ing?.category || t.ingredients?.category || 'provisions';
      if (cat === registerMode && t.vendor && t.vendor.trim()) {
        set.add(t.vendor.trim());
      }
    });
    return Array.from(set).sort();
  }, [purchaseTxns, ingredients, registerMode]);

  // Date filter state
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'this_month' | 'last_month' | 'today' | 'custom'>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedPerishableItem, setSelectedPerishableItem] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'cost_desc' | 'cost_asc'>('date_desc');
  
  // View mode & expandable batch state
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const toggleBatch = (batchKey: string) => {
    setExpandedBatches((prev) => ({
      ...prev,
      [batchKey]: !prev[batchKey],
    }));
  };

  const expandAllBatches = () => {
    const next: Record<string, boolean> = {};
    groupedBatches.forEach((b) => {
      next[b.batchKey] = true;
    });
    setExpandedBatches(next);
  };

  const collapseAllBatches = () => {
    setExpandedBatches({});
  };

  // Compute active date range and filters
  const filteredTxns = useMemo(() => {
    return purchaseTxns.filter((t) => {
      const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
      const cat = ing?.category || t.ingredients?.category || 'provisions';

      // 1. Primary Register Mode Filter
      if (cat !== registerMode) {
        return false;
      }

      // 2. Specific Perishable Item Filter
      if (registerMode === 'perishable' && selectedPerishableItem !== 'all') {
        if (t.ingredient_id !== selectedPerishableItem) {
          return false;
        }
      }

      // 3. Date filtering
      const txnDate = t.usage_date || t.created_at.split('T')[0];
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

      // 4. Vendor filter
      if (selectedVendor !== 'all' && (t.vendor || '').trim() !== selectedVendor) {
        return false;
      }

      // 5. Search query (matches ingredient english, telugu, or vendor, or received by)
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
    registerMode,
    selectedPerishableItem,
    dateFilterMode,
    currentMonthStr,
    now,
    selectedMonth,
    ingredients,
    selectedVendor,
    searchTerm,
    sortOrder,
  ]);

  // Group filtered transactions into batch purchase logs
  const groupedBatches = useMemo<PurchaseBatchGroup[]>(() => {
    const groupsMap = new Map<string, StockTransaction[]>();

    filteredTxns.forEach((txn) => {
      const pDate = txn.usage_date || txn.created_at.split('T')[0];
      const vend = (txn.vendor || '').trim().toLowerCase();
      const creator = (txn.created_by_name || txn.created_by || '').trim();
      const minutePrefix = txn.created_at ? txn.created_at.substring(0, 16) : pDate;
      const key = `${pDate}__${vend}__${creator}__${minutePrefix}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(txn);
    });

    const groups: PurchaseBatchGroup[] = [];
    groupsMap.forEach((items, key) => {
      const first = items[0];
      const totalCost = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      groups.push({
        batchKey: key,
        purchaseDate: first.usage_date || first.created_at.split('T')[0],
        loggedTimestamp: first.created_at,
        vendor: first.vendor || null,
        createdBy: first.created_by_name || 'Staff User',
        items,
        totalCost,
        totalQuantity,
        isBulk: items.length > 1,
      });
    });

    return groups.sort((a, b) => {
      if (sortOrder === 'cost_desc') return b.totalCost - a.totalCost;
      if (sortOrder === 'cost_asc') return a.totalCost - b.totalCost;
      const dateA = `${a.purchaseDate}_${a.loggedTimestamp}`;
      const dateB = `${b.purchaseDate}_${b.loggedTimestamp}`;
      if (sortOrder === 'date_asc') return dateA.localeCompare(dateB);
      return dateB.localeCompare(dateA);
    });
  }, [filteredTxns, sortOrder]);

  // Summary Metrics for filtered view
  const totalSpend = useMemo(() => {
    return filteredTxns.reduce((sum, t) => sum + (t.total_cost || 0), 0);
  }, [filteredTxns]);

  const totalQuantity = useMemo(() => {
    return filteredTxns.reduce((sum, t) => sum + (t.quantity || 0), 0);
  }, [filteredTxns]);

  // Perishable spend breakdown by item
  const topPerishableItem = useMemo(() => {
    if (registerMode !== 'perishable') return null;
    const spendMap: Record<string, { name: string; amount: number }> = {};
    filteredTxns.forEach((t) => {
      const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
      const name = ing?.name || t.ingredients?.name || 'Item';
      if (!spendMap[name]) spendMap[name] = { name, amount: 0 };
      spendMap[name].amount += t.total_cost || 0;
    });
    const sorted = Object.values(spendMap).sort((a, b) => b.amount - a.amount);
    return sorted.length > 0 ? sorted[0] : null;
  }, [filteredTxns, registerMode, ingredients]);

  const perishableIngredientsList = useMemo(() => {
    return ingredients.filter((i) => i.category === 'perishable');
  }, [ingredients]);

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

  const formatLoggedDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
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
            Detailed log of ingredient purchases, vendor invoices, inward weights, and acquisition costs.
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

      {/* Primary Register Mode Switcher Tabs */}
      <div className="flex border-b border-[#e5e0d5] gap-2">
        <button
          type="button"
          onClick={() => {
            setRegisterMode('provisions');
            setSelectedPerishableItem('all');
          }}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            registerMode === 'provisions'
              ? 'border-[#193d2c] text-[#193d2c]'
              : 'border-transparent text-[#59635e] hover:text-[#131715]'
          }`}
        >
          <Package size={16} />
          <span>Provisional Purchase Register</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f4f7f5] text-[#59635e] font-mono-fig font-bold">
            {provisionsTotalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRegisterMode('perishable');
          }}
          className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            registerMode === 'perishable'
              ? 'border-[#193d2c] text-[#193d2c]'
              : 'border-transparent text-[#59635e] hover:text-[#131715]'
          }`}
        >
          <Receipt size={16} />
          <span>Perishable Purchase Register</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e6f0ea] text-[#193d2c] font-mono-fig font-bold">
            {perishablesTotalCount}
          </span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spend */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">
              {registerMode === 'provisions' ? 'Total Provisions Spend' : 'Total Perishable Spend'}
            </span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Receipt size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#193d2c]">
            {formatCurrency(totalSpend)}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            Across {filteredTxns.length} entries ({groupedBatches.length} purchase logs)
          </span>
        </div>

        {/* Purchase Sessions / Entries */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#59635e] font-medium">
              {registerMode === 'provisions' ? 'Purchase Sessions' : 'Perishable Log Entries'}
            </span>
            <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
              <Package size={13} />
            </div>
          </div>
          <div className="font-mono-fig text-2xl font-bold text-[#131715]">
            {registerMode === 'provisions' ? groupedBatches.length : filteredTxns.length}
          </div>
          <span className="text-[11px] text-[#59635e] mt-1 block">
            {registerMode === 'provisions'
              ? `${filteredTxns.length} total provision line items`
              : `${groupedBatches.length} delivery sessions logged`}
          </span>
        </div>

        {/* Volume Received (Provisions) OR Top Perishable Spend (Perishables) */}
        {registerMode === 'provisions' ? (
          <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#59635e] font-medium">Stock Volume Received</span>
              <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
                <Layers size={13} />
              </div>
            </div>
            <div className="font-mono-fig text-2xl font-bold text-[#131715]">
              {totalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
            </div>
            <span className="text-[11px] text-[#59635e] mt-1 block">
              Measured stock units (kg, ltr, pcs)
            </span>
          </div>
        ) : (
          <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#59635e] font-medium">Top Perishable Spend</span>
              <div className="w-6 h-6 rounded-sm bg-[#e6f0ea] text-[#193d2c] flex items-center justify-center">
                <Sparkles size={13} />
              </div>
            </div>
            <div className="font-serif text-lg font-bold text-[#131715] truncate">
              {topPerishableItem ? topPerishableItem.name : '—'}
            </div>
            <span className="text-[11px] font-mono-fig text-[#193d2c] font-semibold mt-1 block">
              {topPerishableItem ? formatCurrency(topPerishableItem.amount) : 'No data in range'}
            </span>
          </div>
        )}
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

        {/* Search, Item/Vendor & Sort Options */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b948f] pointer-events-none"
            />
            <input
              type="text"
              placeholder={
                registerMode === 'provisions'
                  ? 'Search by provision, Telugu name, or vendor...'
                  : 'Search by perishable item, vendor, or logger...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] placeholder-[#8b948f] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>

          {/* If Perishable mode: Specific Perishable Item Filter */}
          {registerMode === 'perishable' ? (
            <div className="md:col-span-3">
              <select
                value={selectedPerishableItem}
                onChange={(e) => setSelectedPerishableItem(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="all">All 7 Perishables</option>
                {perishableIngredientsList.map((item) => (
                  <option key={item.ingredient_id} value={item.ingredient_id}>
                    {item.name} {item.name_telugu ? `(${item.name_telugu})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-3">
              <div className="px-2.5 py-1.5 text-xs bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm text-[#59635e] font-medium">
                Dry Provisions Only
              </div>
            </div>
          )}

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

        {/* View Mode Switch & Bulk Expand/Collapse */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e5e0d5] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#59635e] font-medium">Layout:</span>
            <div className="inline-flex rounded-sm border border-[#e5e0d5] bg-[#fbfaf7] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 rounded-[2px] font-semibold transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-[#193d2c] text-[#f7f9f7] shadow-xs'
                    : 'text-[#59635e] hover:text-[#131715]'
                }`}
              >
                Grouped by Purchase Log
              </button>
              <button
                type="button"
                onClick={() => setViewMode('individual')}
                className={`px-2.5 py-1 rounded-[2px] font-semibold transition-all cursor-pointer ${
                  viewMode === 'individual'
                    ? 'bg-[#193d2c] text-[#f7f9f7] shadow-xs'
                    : 'text-[#59635e] hover:text-[#131715]'
                }`}
              >
                Individual Items
              </button>
            </div>
          </div>

          {viewMode === 'grouped' && groupedBatches.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllBatches}
                className="text-[11px] font-semibold text-[#193d2c] hover:underline cursor-pointer"
              >
                Expand all
              </button>
              <span className="text-[#8b948f]">&middot;</span>
              <button
                type="button"
                onClick={collapseAllBatches}
                className="text-[11px] font-semibold text-[#59635e] hover:underline cursor-pointer"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Register Display */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        {filteredTxns.length === 0 ? (
          <div className="text-center py-14 space-y-3">
            <Receipt size={32} className="mx-auto text-[#8b948f] opacity-40" />
            <p className="text-sm font-serif text-[#59635e]">
              No {registerMode} purchases found matching the selected filters.
            </p>
            {(searchTerm || selectedVendor !== 'all' || selectedPerishableItem !== 'all' || dateFilterMode !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedVendor('all');
                  setSelectedPerishableItem('all');
                  setDateFilterMode('all');
                }}
                className="text-xs text-[#193d2c] font-semibold hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
          /* Grouped / Collapsible View */
          <div className="space-y-3">
            {groupedBatches.map((batch) => {
              const isExpanded = expandedBatches[batch.batchKey] ?? false;

              return (
                <div
                  key={batch.batchKey}
                  className="border border-[#e5e0d5] rounded-sm overflow-hidden transition-all bg-white hover:border-[#193d2c]/40"
                >
                  {/* Collapsible Dropdown Header */}
                  <div
                    onClick={() => toggleBatch(batch.batchKey)}
                    className="w-full p-3.5 bg-[#fcfbf9] hover:bg-[#f7f9f7] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 text-left select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`p-1.5 rounded-sm transition-transform duration-200 mt-0.5 sm:mt-0 ${
                          isExpanded
                            ? 'bg-[#193d2c] text-white rotate-180'
                            : 'bg-[#eef3f0] text-[#193d2c]'
                        }`}
                      >
                        <ChevronDown size={16} />
                      </div>

                      <div>
                        {/* Primary Dates: Purchase Date & Logged Date/Time */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif font-bold text-base text-[#131715]">
                            Purchase Date: {formatDate(batch.purchaseDate)}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] font-mono-fig px-2 py-0.5 bg-[#193d2c]/10 text-[#193d2c] font-semibold rounded-sm">
                            <Clock size={11} />
                            Logged: {formatLoggedDateTime(batch.loggedTimestamp)}
                          </span>

                          {batch.isBulk ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#e5e0d5]/60 text-[#59635e] rounded-sm">
                              {batch.items.length} items (Bulk)
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#59635e]">
                              1 item
                            </span>
                          )}
                        </div>

                        {/* Sub details: Vendor & Logger */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#59635e]">
                          {batch.vendor && (
                            <span className="inline-flex items-center gap-1 font-medium text-[#131715]">
                              <Store size={12} className="text-[#8b948f]" />
                              {batch.vendor}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[#59635e]">
                            <User size={12} className="text-[#8b948f]" />
                            Received by: {batch.createdBy}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side: Total and toggle affordance */}
                    <div className="flex items-center justify-between md:justify-end gap-4 pl-9 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e5e0d5]">
                      <div className="text-right">
                        <div className="font-mono-fig text-base font-bold text-[#193d2c]">
                          {formatCurrency(batch.totalCost)}
                        </div>
                        <div className="text-[10px] text-[#59635e] uppercase tracking-wider">
                          {isExpanded ? 'Click to hide items' : 'Click to view items'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Table */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[#e5e0d5] bg-white overflow-hidden"
                      >
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse text-[13px]">
                            <thead>
                              <tr className="bg-[#f7f9f7] border-b border-[#e5e0d5] text-[11px] font-bold uppercase tracking-wider text-[#59635e]">
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">
                                  {registerMode === 'provisions' ? 'Ingredient' : 'Perishable Item'}
                                </th>
                                {registerMode === 'provisions' && (
                                  <>
                                    <th className="py-2 px-3 text-right">Quantity</th>
                                    <th className="py-2 px-3 text-right">Rate / Unit</th>
                                  </>
                                )}
                                <th className="py-2 px-3 text-right">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e5e0d5]">
                              {batch.items.map((t, idx) => {
                                const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
                                const ingName = ing?.name || t.ingredients?.name || 'Unknown Item';
                                const ingTelugu = ing?.name_telugu || t.ingredients?.name_telugu;
                                const unit = ing?.unit || t.ingredients?.unit || 'unit';
                                const unitRate = t.quantity > 0 ? (t.total_cost || 0) / t.quantity : null;

                                return (
                                  <tr
                                    key={t.id}
                                    className="hover:bg-[#193d2c]/5 transition-colors font-mono-fig text-[#131715]"
                                  >
                                    <td className="py-2.5 px-3 text-xs text-[#8b948f]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-sans font-medium">
                                      <IngredientNameDisplay
                                        name={ingName}
                                        nameTelugu={ingTelugu}
                                      />
                                    </td>
                                    {registerMode === 'provisions' && (
                                      <>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                          {t.quantity > 0 ? (
                                            <div>
                                              <span className="font-semibold text-[#193d2c]">
                                                +{t.quantity}{' '}
                                                <span className="text-[11px] text-[#59635e] font-sans font-normal">
                                                  {unit}
                                                </span>
                                              </span>
                                              {t.entered_quantity && t.entered_unit && (
                                                <span className="block text-[11px] text-[#59635e] font-sans font-normal">
                                                  ({t.entered_quantity} {t.entered_unit})
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-[#8b948f] font-sans italic">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-[#59635e] text-xs">
                                          {t.entered_quantity && t.entered_unit && t.entered_quantity > 0 ? (
                                            <div>
                                              <span className="font-medium text-[#131715]">
                                                ₹{((t.total_cost || 0) / t.entered_quantity).toFixed(2)}/{t.entered_unit}
                                              </span>
                                              <span className="block text-[10px] text-[#8b948f]">
                                                (₹{unitRate !== null ? unitRate.toFixed(2) : '—'}/{unit})
                                              </span>
                                            </div>
                                          ) : unitRate !== null ? (
                                            `₹${unitRate.toFixed(2)}/${unit}`
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                      </>
                                    )}
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-[#131715]">
                                      {formatCurrency(t.total_cost || 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Footer Summary for Grouped View */}
            <div className="pt-4 border-t-2 border-[#131715] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-semibold bg-[#fbfaf7] p-3 rounded-sm">
              <span className="text-[#59635e] uppercase tracking-wider">
                Total for {registerMode === 'provisions' ? 'Provisions' : 'Perishables'} ({groupedBatches.length} purchase logs &middot; {filteredTxns.length} line items)
              </span>
              <div className="flex items-center gap-4">
                {registerMode === 'provisions' && (
                  <span className="font-mono-fig text-sm text-[#193d2c]">
                    Total Volume: +{totalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </span>
                )}
                <span className="font-mono-fig text-base text-[#193d2c] font-bold">
                  Total Spend: {formatCurrency(totalSpend)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Individual Items Table View */
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#131715] text-[11px] font-bold uppercase tracking-wider text-[#59635e]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">
                    {registerMode === 'provisions' ? 'Ingredient' : 'Perishable Item'}
                  </th>
                  <th className="py-2.5 px-3">Vendor</th>
                  {registerMode === 'provisions' && (
                    <>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Rate / Unit</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right">
                    {registerMode === 'provisions' ? 'Total Bill (₹)' : 'Total Price (₹)'}
                  </th>
                  <th className="py-2.5 px-3">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5]">
                {filteredTxns.map((t) => {
                  const ing = ingredients.find((i) => i.ingredient_id === t.ingredient_id);
                  const ingName = ing?.name || t.ingredients?.name || 'Unknown Item';
                  const ingTelugu = ing?.name_telugu || t.ingredients?.name_telugu;
                  const unit = ing?.unit || t.ingredients?.unit || 'unit';
                  const unitRate = t.quantity > 0 ? (t.total_cost || 0) / t.quantity : null;

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

                      {/* Vendor (Left blank if no vendor specified) */}
                      <td className="py-2.5 px-3 font-sans text-xs text-[#59635e]">
                        {t.vendor ? (
                          <span className="font-medium text-[#131715]">{t.vendor}</span>
                        ) : (
                          <span className="text-[#8b948f] italic">—</span>
                        )}
                      </td>

                      {/* Provisions: Quantity and Rate */}
                      {registerMode === 'provisions' && (
                        <>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {t.quantity > 0 ? (
                              <div>
                                <span className="font-semibold text-[#193d2c]">
                                  +{t.quantity}{' '}
                                  <span className="text-[11px] text-[#59635e] font-sans font-normal">
                                    {unit}
                                  </span>
                                </span>
                                {t.entered_quantity && t.entered_unit && (
                                  <span className="block text-[11px] text-[#59635e] font-sans font-normal">
                                    ({t.entered_quantity} {t.entered_unit})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#8b948f] font-sans italic">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap text-[#59635e] text-xs">
                            {t.entered_quantity && t.entered_unit && t.entered_quantity > 0 ? (
                              <div>
                                <span className="font-medium text-[#131715]">
                                  ₹{((t.total_cost || 0) / t.entered_quantity).toFixed(2)}/{t.entered_unit}
                                </span>
                                <span className="block text-[10px] text-[#8b948f]">
                                  (₹{unitRate !== null ? unitRate.toFixed(2) : '—'}/{unit})
                                </span>
                              </div>
                            ) : unitRate !== null ? (
                              `₹${unitRate.toFixed(2)}/${unit}`
                            ) : (
                              '—'
                            )}
                          </td>
                        </>
                      )}

                      {/* Total Cost / Price */}
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
                  <td
                    colSpan={registerMode === 'provisions' ? 3 : 3}
                    className="py-3 px-3 font-sans text-xs uppercase tracking-wider"
                  >
                    Total for {registerMode === 'provisions' ? 'Provisions' : 'Perishables'} ({filteredTxns.length} entries)
                  </td>
                  {registerMode === 'provisions' && (
                    <>
                      <td className="py-3 px-3 text-right font-mono-fig text-sm text-[#193d2c]">
                        +{totalQuantity.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 px-3"></td>
                    </>
                  )}
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

