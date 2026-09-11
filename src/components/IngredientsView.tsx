import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Plus,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Ingredient } from '../types';

export function IngredientsView() {
  const {
    ingredients,
    toggleIngredientActive,
    hasFullEditAccess,
    navigateTo,
    setDatabaseModalOpen,
    credentialSource,
    profile,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'provisions' | 'perishable' | 'zero'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = ingredients.filter((item) => {
    if (activeTab === 'provisions' && item.category !== 'provisions') return false;
    if (activeTab === 'perishable' && item.category !== 'perishable') return false;
    if (activeTab === 'zero' && (!item.active || item.current_stock > 0)) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(q);
    const teluguMatch = item.name_telugu ? item.name_telugu.toLowerCase().includes(q) : false;
    return nameMatch || teluguMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') {
      comp = a.name.localeCompare(b.name);
    } else if (sortBy === 'stock') {
      comp = a.current_stock - b.current_stock;
    } else if (sortBy === 'value') {
      comp = a.current_stock * a.current_price - b.current_stock * b.current_price;
    }
    return sortAsc ? comp : -comp;
  });

  const toggleSort = (field: 'name' | 'stock' | 'value') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const formatCurrency = (n: number) => {
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const provisionsCount = ingredients.filter((i) => i.category === 'provisions').length;
  const perishablesCount = ingredients.filter((i) => i.category === 'perishable').length;
  const zeroStockCount = ingredients.filter((i) => i.active && i.current_stock <= 0).length;

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
            Master List &middot; Physical Inventory
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
            Ingredients &amp; Stock
          </h2>
          <p className="text-sm text-[#59635e] mt-1 max-w-2xl">
            Provisions (weighted-average priced, meal-wise usage) and perishables (same pricing mechanics, logged daily). Ingredients are never deleted, only marked inactive.
          </p>
        </div>

        {hasFullEditAccess && (
          <button
            id="add-ingredient-top-btn"
            onClick={() => navigateTo('add-ingredient')}
            className="px-3.5 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus size={15} />
            <span>Add New Ingredient</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-3.5 sm:p-4 space-y-3 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }`}
            >
              All ({ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('provisions')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'provisions'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }`}
            >
              Provisions ({provisionsCount})
            </button>
            <button
              onClick={() => setActiveTab('perishable')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'perishable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
              }`}
            >
              Perishables ({perishablesCount})
            </button>
            <button
              onClick={() => setActiveTab('zero')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'zero'
                  ? 'bg-[#942426] text-white'
                  : 'bg-white border border-[#e5e0d5] text-[#942426] hover:bg-[#faeaea]'
              }`}
            >
              Zero Stock ({zeroStockCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#59635e]"
            />
            <input
              type="text"
              id="ingredients-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search English or Telugu..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>
        </div>
      </div>

      {/* Fallback DB Notice Banner - Admin Only */}
      {profile?.role === 'admin' && credentialSource === 'fallback' && (
        <div className="p-3 bg-[#faf3e8] border border-[#e7d5b8] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#131715]">
          <div className="flex items-start gap-2">
            <Database size={15} className="text-[#9e743a] shrink-0 mt-0.5" />
            <div>
              <strong>Database Connection Notice:</strong> This local app instance is currently connected to the default Supabase project. If you want to load the ingredients from your personal Supabase database, configure your credentials below.
            </div>
          </div>
          <button
            onClick={() => setDatabaseModalOpen(true)}
            className="px-3 py-1.5 bg-[#193d2c] text-[#f7f9f7] rounded-sm font-semibold hover:bg-[#122e21] transition-colors shrink-0 cursor-pointer text-xs"
          >
            Connect My Supabase
          </button>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        {ingredients.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <Package size={36} className="mx-auto text-[#59635e]/50" />
            <div className="font-serif text-base font-bold text-[#131715]">
              {profile?.role === 'admin'
                ? '0 Ingredients Found in Supabase Table'
                : 'No Ingredients Registered'}
            </div>
            <p className="text-xs text-[#59635e] max-w-md mx-auto">
              {profile?.role === 'admin' ? (
                <>
                  Your database was reached, but no rows were returned from the <code className="font-mono bg-[#f5f2eb] px-1 py-0.5 rounded text-[#131715]">ingredients</code> table. This happens if the table is empty or if Row Level Security (RLS) policies are blocking anon reads.
                </>
              ) : (
                'There are currently no items registered in the inventory ledger. Please contact the Mess Administrator to add provisions.'
              )}
            </p>
            {profile?.role === 'admin' && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDatabaseModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Database size={13} />
                  <span>Open Database Diagnostics &amp; Seed Data</span>
                </button>
              </div>
            )}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-[#59635e] text-sm font-serif">
            No ingredients matched your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-[#131715] text-[11px] font-bold uppercase tracking-wider text-[#59635e]">
                  <th
                    onClick={() => toggleSort('name')}
                    className="py-2.5 px-3 cursor-pointer select-none hover:text-[#131715]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ingredient</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Category</th>
                  <th
                    onClick={() => toggleSort('stock')}
                    className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-[#131715]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Stock On Shelf</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right">Price / Unit</th>
                  <th
                    onClick={() => toggleSort('value')}
                    className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-[#131715]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Stock Value</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  {hasFullEditAccess && <th className="py-2.5 px-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5]">
                {sorted.map((item) => {
                  const stockVal = item.current_stock * item.current_price;
                  const isZero = item.current_stock <= 0;

                  return (
                    <tr
                      key={item.ingredient_id}
                      className={`hover:bg-[#193d2c]/5 transition-colors font-mono-fig text-[#131715] ${
                        !item.active ? 'opacity-55' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-sm text-[#131715]">
                          {item.name}
                        </div>
                        {item.name_telugu && (
                          <div className="text-[11px] text-[#59635e]">
                            {item.name_telugu}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-sm capitalize font-medium ${
                            item.category === 'provisions'
                              ? 'bg-[#f5f2eb] text-[#131715] border border-[#e5e0d5]'
                              : 'bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/20'
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-semibold ${
                            isZero && item.active ? 'text-[#942426]' : 'text-[#131715]'
                          }`}
                        >
                          {item.current_stock.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                          })}
                        </span>{' '}
                        <span className="text-[11px] text-[#59635e] font-sans">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#59635e]">
                        {formatCurrency(item.current_price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {formatCurrency(stockVal)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {item.active ? (
                          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#e6f0ea] text-[#193d2c] font-semibold border border-[#193d2c]/25">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#faeaea] text-[#942426] font-semibold border border-[#942426]/25">
                            Inactive
                          </span>
                        )}
                      </td>
                      {hasFullEditAccess && (
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            id={`toggle-active-${item.ingredient_id}`}
                            onClick={() => toggleIngredientActive(item.ingredient_id)}
                            className={`px-2.5 py-1 text-xs rounded-sm border transition-colors cursor-pointer ${
                              item.active
                                ? 'bg-white border-[#e5e0d5] text-[#59635e] hover:bg-[#faeaea] hover:text-[#942426] hover:border-[#942426]'
                                : 'bg-white border-[#193d2c] text-[#193d2c] hover:bg-[#e6f0ea]'
                            }`}
                          >
                            {item.active ? 'Mark inactive' : 'Reactivate'}
                          </button>
                        </td>
                      )}
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
