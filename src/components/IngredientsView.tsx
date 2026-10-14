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
  Scale,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Ingredient, UnitConversion } from '../types';

export function IngredientsView() {
  const {
    ingredients,
    toggleIngredientActive,
    hasFullEditAccess,
    hasStockEditAccess,
    updateIngredientConversions,
    navigateTo,
    setDatabaseModalOpen,
    credentialSource,
    profile,
  } = useApp();

  const canManage = hasFullEditAccess || hasStockEditAccess;

  const [activeTab, setActiveTab] = useState<'provisions' | 'perishable' >('provisions');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'telugu' | 'stock' | 'value'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Conversion management state
  const [managingIngredient, setManagingIngredient] = useState<Ingredient | null>(null);
  const [tempConversions, setTempConversions] = useState<UnitConversion[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newMultiplier, setNewMultiplier] = useState('');
  const [isSavingConversions, setIsSavingConversions] = useState(false);

  const openManageModal = (ing: Ingredient) => {
    setManagingIngredient(ing);
    setTempConversions(ing.conversions ? [...ing.conversions] : []);
    setNewUnitName('');
    setNewMultiplier('');
  };

  const closeManageModal = () => {
    setManagingIngredient(null);
    setTempConversions([]);
    setNewUnitName('');
    setNewMultiplier('');
  };

  const handleAddConversion = () => {
    const trimmed = newUnitName.trim();
    const mult = parseFloat(newMultiplier);
    if (!trimmed || isNaN(mult) || mult <= 0) return;
    if (tempConversions.some((c) => c.unit_name.toLowerCase() === trimmed.toLowerCase())) return;

    setTempConversions((prev) => [
      ...prev,
      {
        id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        unit_name: trimmed,
        multiplier: mult,
      },
    ]);
    setNewUnitName('');
    setNewMultiplier('');
  };

  const handleRemoveConversion = (convId: string, unitName: string) => {
    setTempConversions((prev) =>
      prev.filter((c) => (c.id ? c.id !== convId : c.unit_name !== unitName))
    );
  };

  const handleSaveConversions = async () => {
    if (!managingIngredient) return;
    setIsSavingConversions(true);
    await updateIngredientConversions(managingIngredient.ingredient_id, tempConversions);
    setIsSavingConversions(false);
    closeManageModal();
  };

  const getPresetsForUnit = (unit: string) => {
    const u = unit.toLowerCase();
    if (u === 'kg') {
      return [
        { unit_name: '25 kg Bag', multiplier: 25 },
        { unit_name: '50 kg Bag', multiplier: 50 },
        { unit_name: '100 kg Quintal', multiplier: 100 },
        { unit_name: '500 g Packet', multiplier: 0.5 },
        { unit_name: '1 kg Packet', multiplier: 1 },
      ];
    }
    if (u === 'litre' || u === 'liter' || u === 'l') {
      return [
        { unit_name: '15 L Tin', multiplier: 15 },
        { unit_name: '1 L Pouch', multiplier: 1 },
        { unit_name: '5 L Can', multiplier: 5 },
      ];
    }
    if (u === 'piece' || u === 'pieces' || u === 'pcs') {
      return [
        { unit_name: 'Tray of 30', multiplier: 30 },
        { unit_name: 'Box of 100', multiplier: 100 },
        { unit_name: 'Pack of 10', multiplier: 10 },
      ];
    }
    return [
      { unit_name: `Pack of 10 ${unit}`, multiplier: 10 },
      { unit_name: `Box of 25 ${unit}`, multiplier: 25 },
    ];
  };

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
    } else if (sortBy === 'telugu') {
      comp = (a.name_telugu || '').localeCompare(b.name_telugu || '');
    } else if (sortBy === 'stock') {
      comp = a.current_stock - b.current_stock;
    } else if (sortBy === 'value') {
      comp = a.current_stock * a.current_price - b.current_stock * b.current_price;
    }
    return sortAsc ? comp : -comp;
  });

  const toggleSort = (field: 'name' | 'telugu' | 'stock' | 'value') => {
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
            className="px-3.5 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
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
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
              }`}
            >
              All ({ingredients.length})
            </button>
            <button
              onClick={() => setActiveTab('provisions')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'provisions'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
              }`}
            >
              Provisions ({provisionsCount})
            </button>
            <button
              onClick={() => setActiveTab('perishable')}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'perishable'
                  ? 'bg-[#193d2c] text-[#f7f9f7]'
                  : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5]'
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
            className="px-3 py-1.5 bg-[#193d2c] text-[#f7f9f7] rounded-sm font-semibold hover:bg-[#112a1f] transition-colors shrink-0 cursor-pointer text-xs"
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
                  Your database was reached, but no rows were returned from the <code className="font-mono bg-[#f4f7f5] border border-[#e5e0d5] px-1 py-0.5 rounded text-[#131715]">ingredients</code> table. This happens if the table is empty or if Row Level Security (RLS) policies are blocking anon reads.
                </>
              ) : (
                'There are currently no items registered in the inventory ledger. Please contact the Mess Administrator to add provisions.'
              )}
            </p>
            {profile?.role === 'admin' && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setDatabaseModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
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
                  <th
                    onClick={() => toggleSort('telugu')}
                    className="py-2.5 px-3 cursor-pointer select-none hover:text-[#131715]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Telugu Name</span>
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
                  {canManage && <th className="py-2.5 px-3 text-right">Action</th>}
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
                        {item.category === 'provisions' && item.conversions && item.conversions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.conversions.map((c) => (
                              <span
                                key={c.id || c.unit_name}
                                className="inline-flex items-center text-[10px] font-mono-fig px-1.5 py-0.5 rounded bg-[#f4f7f5] text-[#193d2c] border border-[#e5e0d5]"
                                title={`1 ${c.unit_name} = ${c.multiplier} ${item.unit}`}
                              >
                                {c.unit_name} (={c.multiplier}{item.unit})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {item.name_telugu ? (
                          <div className="text-sm font-medium text-[#131715]">
                            {item.name_telugu}
                          </div>
                        ) : (
                          <span className="text-xs text-[#8b948f] italic">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-sm capitalize font-medium ${
                            item.category === 'provisions'
                              ? 'bg-[#ffffff] text-[#131715] border border-[#e5e0d5]'
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
                        {item.conversions && item.conversions.length > 0 && item.current_stock > 0 && (
                          <div
                            className="text-[10.5px] text-[#193d2c] font-sans mt-0.5"
                            title={item.conversions
                              .map(
                                (c) =>
                                  `≈ ${(item.current_stock / c.multiplier).toLocaleString('en-IN', {
                                    maximumFractionDigits: 1,
                                  })} ${c.unit_name}`
                              )
                              .join(' | ')}
                          >
                            ≈{' '}
                            {(item.current_stock / item.conversions[0].multiplier).toLocaleString('en-IN', {
                              maximumFractionDigits: 1,
                            })}{' '}
                            {item.conversions[0].unit_name}
                          </div>
                        )}
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
                      {canManage && (
                        <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.category === 'provisions' && (
                              <button
                                onClick={() => openManageModal(item)}
                                className="px-2 py-1 text-xs rounded-sm border border-[#193d2c]/40 bg-white text-[#193d2c] hover:bg-[#e6f0ea] transition-colors cursor-pointer flex items-center gap-1 font-medium"
                                title="Configure secondary packaging units (bags, tins, packets, crates)"
                              >
                                <Scale size={11} />
                                <span>Units ({item.conversions?.length || 0})</span>
                              </button>
                            )}
                            {hasFullEditAccess && (
                              <button
                                id={`toggle-active-${item.ingredient_id}`}
                                onClick={() => toggleIngredientActive(item.ingredient_id)}
                                className={`px-2 py-1 text-xs rounded-sm border transition-colors cursor-pointer ${
                                  item.active
                                    ? 'bg-white border-[#e5e0d5] text-[#59635e] hover:bg-[#faeaea] hover:text-[#942426] hover:border-[#942426]'
                                    : 'bg-white border-[#193d2c] text-[#193d2c] hover:bg-[#e6f0ea]'
                                }`}
                              >
                                {item.active ? 'Inactive' : 'Reactivate'}
                              </button>
                            )}
                          </div>
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

      {/* Manage Packaging Units Modal */}
      {managingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#e5e0d5] rounded-sm max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#e5e0d5] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-sm bg-[#e6f0ea] text-[#193d2c]">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#131715]">
                    Packaging Units &amp; Conversions
                  </h3>
                  <p className="text-xs text-[#59635e]">
                    {managingIngredient.name} {managingIngredient.name_telugu ? `(${managingIngredient.name_telugu})` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={closeManageModal}
                className="text-[#59635e] hover:text-[#131715] p-1 rounded hover:bg-[#f4f7f5] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Base Unit Card */}
            <div className="bg-[#f4f7f5] border border-[#e5e0d5] rounded-sm p-3 text-xs flex items-center justify-between">
              <div>
                <span className="text-[#59635e] block text-[10px] uppercase tracking-wider font-mono-fig font-bold">
                  Base Inventory Unit
                </span>
                <span className="font-bold text-[#193d2c] text-sm font-mono-fig">
                  {managingIngredient.unit}
                </span>
              </div>
              <div className="text-right text-[#59635e] text-[11px] max-w-[240px]">
                All packaging units convert into <strong className="text-[#131715]">{managingIngredient.unit}</strong> automatically during purchases and daily meal usage.
              </div>
            </div>

            {/* Configured Conversions List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#59635e] uppercase tracking-wider font-mono-fig block">
                Configured Packaging Units ({tempConversions.length})
              </span>

              {tempConversions.length === 0 ? (
                <div className="text-center py-5 border border-dashed border-[#e5e0d5] rounded-sm text-xs text-[#59635e]">
                  No secondary packaging units configured yet. Purchases will use base unit ({managingIngredient.unit}).
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {tempConversions.map((conv) => (
                    <div
                      key={conv.id || conv.unit_name}
                      className="flex items-center justify-between p-2.5 bg-white border border-[#e5e0d5] rounded-sm text-xs hover:border-[#193d2c]/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#131715]">{conv.unit_name}</span>
                        <span className="font-mono-fig text-[11px] px-2 py-0.5 rounded bg-[#e6f0ea] text-[#193d2c] font-medium border border-[#193d2c]/20">
                          1 {conv.unit_name} = {conv.multiplier} {managingIngredient.unit}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveConversion(conv.id, conv.unit_name)}
                        className="text-[#942426] hover:bg-[#faeaea] p-1.5 rounded transition-colors cursor-pointer"
                        title="Remove unit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Presets */}
            {(() => {
              const presets = getPresetsForUnit(managingIngredient.unit).filter(
                (p) => !tempConversions.some((c) => c.unit_name.toLowerCase() === p.unit_name.toLowerCase())
              );
              if (presets.length === 0) return null;
              return (
                <div className="space-y-1.5 pt-1 border-t border-[#e5e0d5]">
                  <span className="text-[10px] font-semibold text-[#59635e] uppercase tracking-wider font-mono-fig flex items-center gap-1">
                    <Sparkles size={11} className="text-[#193d2c]" /> Quick Suggestions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((preset) => (
                      <button
                        key={preset.unit_name}
                        type="button"
                        onClick={() => {
                          setTempConversions((prev) => [
                            ...prev,
                            {
                              id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                              unit_name: preset.unit_name,
                              multiplier: preset.multiplier,
                            },
                          ]);
                        }}
                        className="text-[11px] px-2 py-1 rounded bg-[#f7f9f7] hover:bg-[#e6f0ea] text-[#193d2c] border border-[#e5e0d5] hover:border-[#193d2c]/30 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={10} />
                        <span>{preset.unit_name} ({preset.multiplier} {managingIngredient.unit})</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Add Custom Unit Form */}
            <div className="p-3 bg-[#fafbf9] border border-[#e5e0d5] rounded-sm space-y-2.5">
              <span className="text-[11px] font-bold text-[#131715] uppercase tracking-wider font-mono-fig block">
                Add Custom Packaging Unit
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#59635e] mb-1 font-mono-fig">
                    Unit Name / Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25 kg Bag, 15 L Tin, Box"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#59635e] mb-1 font-mono-fig">
                    Contains ({managingIngredient.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    placeholder="Multiplier (e.g. 25, 0.5)"
                    value={newMultiplier}
                    onChange={(e) => setNewMultiplier(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] font-mono-fig focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                  />
                </div>
              </div>

              {/* Live Preview of Conversion Formula */}
              {newUnitName.trim() && parseFloat(newMultiplier) > 0 && (
                <div className="text-[11px] text-[#193d2c] font-medium bg-[#e6f0ea] px-2.5 py-1 rounded-sm border border-[#193d2c]/20">
                  Formula: 1 {newUnitName.trim()} = {parseFloat(newMultiplier)} {managingIngredient.unit}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddConversion}
                disabled={!newUnitName.trim() || !newMultiplier || parseFloat(newMultiplier) <= 0}
                className="w-full py-1.5 text-xs font-semibold rounded-sm bg-white border border-[#193d2c] text-[#193d2c] hover:bg-[#e6f0ea] transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={13} />
                <span>Add Packaging Unit</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e0d5]">
              <button
                type="button"
                onClick={closeManageModal}
                disabled={isSavingConversions}
                className="px-3 py-1.5 text-xs border border-[#e5e0d5] rounded-sm text-[#59635e] hover:text-[#131715] bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConversions}
                disabled={isSavingConversions}
                className="px-4 py-1.5 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSavingConversions ? 'Saving Changes...' : 'Save Units'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
