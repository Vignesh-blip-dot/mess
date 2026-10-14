import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Trash2, Plus, Package, Receipt, Sparkles, ScanText, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SearchableIngredientSelect } from './SearchableIngredientSelect';
import { ScanBillModal } from './ScanBillModal';

interface ProvisionRow {
  id: string;
  ingredientId: string;
  quantity: string;
  unit: string;
  totalCost: string;
}

interface PerishableRow {
  id: string;
  ingredientId: string;
  totalCost: string;
}

export function LogPurchaseView() {
  const {
    ingredients,
    logPurchaseBatch,
    accessLevel,
    showToast,
  } = useApp();

  const activeIngredients = ingredients.filter((i) => i.active);
  const provisionIngredients = activeIngredients.filter((i) => i.category === 'provisions');
  const perishableIngredients = activeIngredients.filter((i) => i.category === 'perishable');

  const todayStr = new Date().toISOString().split('T')[0];
  const [purchaseMode, setPurchaseMode] = useState<'provisions' | 'perishable'>('provisions');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageDate, setUsageDate] = useState(todayStr);
  const [vendor, setVendor] = useState('');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const handleApplyScannedBill = (data: {
    vendor?: string;
    usageDate?: string;
    items: {
      ingredientId: string;
      quantity: string;
      unit: string;
      totalCost: string;
    }[];
  }) => {
    if (data.vendor) {
      setVendor(data.vendor);
    }
    if (data.usageDate) {
      setUsageDate(data.usageDate);
    }
    if (data.items.length > 0) {
      const mappedRows: ProvisionRow[] = data.items.map((it, idx) => ({
        id: `prov-ocr-${idx}-${Date.now()}`,
        ingredientId: it.ingredientId,
        quantity: it.quantity,
        unit: it.unit,
        totalCost: it.totalCost,
      }));
      setProvisionRows(mappedRows);
      showToast(`Loaded ${mappedRows.length} line items from bill. Please review.`);
    }
  };

  // Provisions purchase state
  const [provisionRows, setProvisionRows] = useState<ProvisionRow[]>([
    { id: `prov-${Date.now()}`, ingredientId: '', quantity: '', unit: '', totalCost: '' },
  ]);

  // Perishable purchase state
  const [perishableRows, setPerishableRows] = useState<PerishableRow[]>([
    { id: `perish-${Date.now()}`, ingredientId: '', totalCost: '' },
  ]);

  // Handlers for Provisions
  const addProvisionRow = () => {
    setProvisionRows((prev) => [
      ...prev,
      { id: `prov-${Date.now()}-${Math.random()}`, ingredientId: '', quantity: '', unit: '', totalCost: '' },
    ]);
  };

  const removeProvisionRow = (id: string) => {
    if (provisionRows.length > 1) {
      setProvisionRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const updateProvisionRow = (id: string, field: keyof ProvisionRow, value: string) => {
    setProvisionRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === 'ingredientId') {
          const selected = provisionIngredients.find((i) => i.ingredient_id === value);
          return {
            ...r,
            ingredientId: value,
            unit: selected ? selected.unit : '',
          };
        }
        return { ...r, [field]: value };
      })
    );
  };

  // Handlers for Perishables
  const addPerishableRow = (ingredientId = '') => {
    setPerishableRows((prev) => [
      ...prev,
      { id: `perish-${Date.now()}-${Math.random()}`, ingredientId, totalCost: '' },
    ]);
  };

  const removePerishableRow = (id: string) => {
    if (perishableRows.length > 1) {
      setPerishableRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      setPerishableRows([{ id: `perish-${Date.now()}`, ingredientId: '', totalCost: '' }]);
    }
  };

  const updatePerishableRow = (id: string, field: keyof PerishableRow, value: string) => {
    setPerishableRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addQuickPerishableItem = (ingId: string) => {
    const existingIndex = perishableRows.findIndex((r) => r.ingredientId === ingId);
    if (existingIndex !== -1) {
      showToast('Item already present in list below');
      return;
    }
    // If the first row is blank, replace it
    if (perishableRows.length === 1 && !perishableRows[0].ingredientId && !perishableRows[0].totalCost) {
      setPerishableRows([{ id: perishableRows[0].id, ingredientId: ingId, totalCost: '' }]);
      return;
    }
    setPerishableRows((prev) => [
      ...prev,
      { id: `perish-${Date.now()}-${Math.random()}`, ingredientId: ingId, totalCost: '' },
    ]);
  };

  const addAllPerishables = () => {
    const newRows: PerishableRow[] = perishableIngredients.map((ing, idx) => {
      const existing = perishableRows.find((r) => r.ingredientId === ing.ingredient_id);
      return {
        id: existing ? existing.id : `perish-all-${idx}-${Date.now()}`,
        ingredientId: ing.ingredient_id,
        totalCost: existing ? existing.totalCost : '',
      };
    });
    setPerishableRows(newRows);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (purchaseMode === 'provisions') {
      const itemsToLog = [];
      for (const row of provisionRows) {
        if (!row.ingredientId) {
          showToast('Please select a provision for all rows', true);
          return;
        }
        const ing = provisionIngredients.find((i) => i.ingredient_id === row.ingredientId);
        const costNum = parseFloat(row.totalCost);

        if (isNaN(costNum) || costNum <= 0) {
          showToast(`Please enter a valid total cost for ${ing?.name || 'all items'}`, true);
          return;
        }

        const qtyNum = parseFloat(row.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          showToast(`Quantity is required for ${ing?.name || 'item'}`, true);
          return;
        }

        // Secondary packaging unit multiplier calculation
        const conv = ing?.conversions?.find((c) => c.unit_name === row.unit);
        const multiplier = conv ? conv.multiplier : 1;
        const baseQty = Math.round(qtyNum * multiplier * 1000) / 1000;
        const isPackaging = conv && (conv.multiplier !== 1 || conv.unit_name !== ing?.unit);

        itemsToLog.push({
          ingredientId: row.ingredientId,
          quantity: baseQty,
          totalCost: costNum,
          enteredQuantity: isPackaging ? qtyNum : null,
          enteredUnit: isPackaging ? row.unit : null,
        });
      }

      setIsSubmitting(true);
      const success = await logPurchaseBatch({
        items: itemsToLog,
        usageDate,
        vendor: vendor.trim() || undefined,
      });
      setIsSubmitting(false);

      if (success) {
        setProvisionRows([{ id: `prov-${Date.now()}`, ingredientId: '', quantity: '', unit: '', totalCost: '' }]);
        setVendor('');
      }
    } else {
      // Perishable mode: price only, ignore rows with empty or 0 cost unless all are empty
      const activeRows = perishableRows.filter((r) => r.ingredientId);
      if (activeRows.length === 0) {
        showToast('Please select at least one perishable item', true);
        return;
      }

      const rowsWithCost = activeRows.filter((r) => r.totalCost.trim() !== '');
      if (rowsWithCost.length === 0) {
        showToast('Please enter the total price for at least one perishable item', true);
        return;
      }

      const itemsToLog = [];
      for (const row of rowsWithCost) {
        const costNum = parseFloat(row.totalCost);
        const ing = perishableIngredients.find((i) => i.ingredient_id === row.ingredientId);

        if (isNaN(costNum) || costNum <= 0) {
          showToast(`Please enter a valid price for ${ing?.name || 'selected item'}`, true);
          return;
        }

        // Perishables are price-only, quantity logged as 0
        itemsToLog.push({ ingredientId: row.ingredientId, quantity: 0, totalCost: costNum });
      }

      setIsSubmitting(true);
      const success = await logPurchaseBatch({
        items: itemsToLog,
        usageDate,
        vendor: vendor.trim() || undefined,
      });
      setIsSubmitting(false);

      if (success) {
        setPerishableRows([{ id: `perish-${Date.now()}`, ingredientId: '', totalCost: '' }]);
        setVendor('');
      }
    }
  };

  const dateHint =
    accessLevel === 'grace'
      ? "You're in your 15-day grace window — entries logged here will be recorded with grace-period audit markings."
      : 'Defaults to today. Coordinators can backdate within their designated duty month.';

  const grandTotal =
    purchaseMode === 'provisions'
      ? provisionRows.reduce((acc, row) => acc + (parseFloat(row.totalCost) || 0), 0)
      : perishableRows.reduce((acc, row) => acc + (parseFloat(row.totalCost) || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="border-b border-[#e5e0d5] pb-4">
        <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
          Stock Receiving &middot; Physical Ledger
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Log Bulk Purchases
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Record batch purchases for dry provisions (with packaging units auto-converted to base stock) or daily perishables (price-only).
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex border-b border-[#e5e0d5] gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setPurchaseMode('provisions')}
          className={`pb-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
            purchaseMode === 'provisions'
              ? 'border-[#193d2c] text-[#193d2c]'
              : 'border-transparent text-[#59635e] hover:text-[#131715]'
          }`}
        >
          <Package size={16} />
          <span>Provisional Purchase</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#f4f7f5] text-[#59635e] font-mono-fig hidden sm:inline">
            Packaging &amp; Units
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPurchaseMode('perishable')}
          className={`pb-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
            purchaseMode === 'perishable'
              ? 'border-[#193d2c] text-[#193d2c]'
              : 'border-transparent text-[#59635e] hover:text-[#131715]'
          }`}
        >
          <Receipt size={16} />
          <span>Perishable Purchase</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#e6f0ea] text-[#193d2c] font-mono-fig hidden sm:inline">
            Price Only
          </span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form id="purchase-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Top Form Row: Date and Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-[#e5e0d5]">
            {/* Date */}
            <div>
              <label
                htmlFor="purchase-date"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Date of Purchase
              </label>
              <input
                type="date"
                id="purchase-date"
                value={usageDate}
                max={todayStr}
                required
                onChange={(e) => setUsageDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
            {/* Vendor */}
            <div>
              <label
                htmlFor="purchase-vendor"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Vendor (Optional)
              </label>
              <input
                type="text"
                id="purchase-vendor"
                placeholder={
                  purchaseMode === 'provisions'
                    ? 'e.g. Sri Venkateswara Rice Mill / Wholesale Traders'
                    : 'e.g. Mandi Vegetable Market / Vijaya Dairy'
                }
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
          </div>

          {/* PROVISIONS PURCHASE FORM */}
          {purchaseMode === 'provisions' && (
            <div className="space-y-4">
              {/* OCR Bill Scan Bar - Provisions Only */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-[#fafbf9] border border-[#e5e0d5] rounded-sm">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="p-2 rounded-sm bg-[#e6f0ea] text-[#193d2c] shrink-0 mt-0.5 sm:mt-0">
                    <ScanText size={18} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-bold text-[#131715]">
                        Auto-Fill from Bill / Invoice (Gemini AI OCR)
                      </span>
                      <span className="text-[10px] font-mono-fig px-1.5 py-0.5 rounded bg-[#e6f0ea] text-[#193d2c] font-semibold border border-[#193d2c]/20">
                        Provisions Only
                      </span>
                    </div>
                    <p className="text-[11px] text-[#59635e] mt-0.5">
                      Upload photo or PDF of your wholesale kirana invoice. AI will extract items, quantities, and packaging units for review.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="scan-provisional-bill-btn"
                  onClick={() => setIsScanModalOpen(true)}
                  className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 touch-manipulation"
                >
                  <Sparkles size={14} className="text-[#a3e635]" />
                  <span>Scan Bill / Auto-Fill</span>
                </button>
              </div>

              <div className="hidden sm:grid grid-cols-12 gap-3 px-2">
                <div className="col-span-5 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                  Provisional Ingredient
                </div>
                <div className="col-span-4 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                  Quantity &amp; Packaging Unit
                </div>
                <div className="col-span-2 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                  Total Cost (₹)
                </div>
                <div className="col-span-1"></div>
              </div>

              {provisionRows.map((row) => {
                const selectedIng = provisionIngredients.find((i) => i.ingredient_id === row.ingredientId);
                const activeConversion = selectedIng?.conversions?.find((c) => c.unit_name === row.unit);
                const multiplier = activeConversion ? activeConversion.multiplier : 1;
                const enteredQtyNum = parseFloat(row.quantity);
                const calculatedBaseQty =
                  !isNaN(enteredQtyNum) && enteredQtyNum > 0
                    ? Math.round(enteredQtyNum * multiplier * 100) / 100
                    : null;
                const costNum = parseFloat(row.totalCost);
                const calculatedBaseRate =
                  calculatedBaseQty && !isNaN(costNum) && costNum > 0
                    ? (costNum / calculatedBaseQty).toFixed(2)
                    : null;

                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-[#fcfbf9] sm:bg-transparent p-3 sm:p-0 border sm:border-0 border-[#e5e0d5] rounded-sm relative group"
                  >
                    <div className="sm:col-span-5">
                      <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                        Provisional Ingredient
                      </label>
                      <SearchableIngredientSelect
                        ingredients={provisionIngredients}
                        value={row.ingredientId}
                        required
                        placeholder="Search dry provision (rice, dal, oil...)"
                        onChange={(id) => updateProvisionRow(row.id, 'ingredientId', id)}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                        Quantity &amp; Packaging Unit
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder={selectedIng ? 'e.g. 2' : 'Qty'}
                            value={row.quantity}
                            onChange={(e) => updateProvisionRow(row.id, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                          />
                        </div>

                        {/* Interactive Unit Dropdown with Secondary Conversions */}
                        <div className="w-28 sm:w-36">
                          <select
                            value={row.unit || (selectedIng ? selectedIng.unit : '')}
                            onChange={(e) => updateProvisionRow(row.id, 'unit', e.target.value)}
                            className="w-full px-2 py-2 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c] font-medium"
                          >
                            {selectedIng ? (
                              <>
                                <option value={selectedIng.unit}>{selectedIng.unit} (Base)</option>
                                {selectedIng.conversions?.map((c) => (
                                  <option key={c.id} value={c.unit_name}>
                                    {c.unit_name} (×{c.multiplier})
                                  </option>
                                ))}
                              </>
                            ) : (
                              <option value="">Unit</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Live inline conversion preview badge */}
                      {selectedIng && calculatedBaseQty !== null && activeConversion && (
                        <div className="mt-1 flex items-center justify-between text-[11px] font-mono-fig text-[#193d2c] bg-[#eef3f0] px-2 py-0.5 rounded-sm border border-[#193d2c]/20">
                          <span>
                            = <strong>{calculatedBaseQty} {selectedIng.unit}</strong> stock
                          </span>
                          {calculatedBaseRate && (
                            <span className="text-[#59635e] text-[10px]">
                              ₹{calculatedBaseRate}/{selectedIng.unit}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                        Total Cost (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="e.g. 2400"
                        value={row.totalCost}
                        onChange={(e) => updateProvisionRow(row.id, 'totalCost', e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end sm:pt-1">
                      {provisionRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProvisionRow(row.id)}
                          className="p-2 sm:p-1.5 text-[#8b948f] hover:text-[#942426] hover:bg-[#faeaea] rounded-sm transition-colors cursor-pointer touch-manipulation"
                          title="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={addProvisionRow}
                  className="w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-[#193d2c] bg-[#eef3f0] hover:bg-[#dfebe3] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Plus size={14} /> Add Another Provision
                </button>

                <div className="text-right flex items-center justify-between sm:justify-end">
                  <span className="text-xs text-[#59635e] uppercase tracking-wider font-semibold mr-3">
                    Provisions Total:
                  </span>
                  <span className="font-mono-fig text-xl font-bold text-[#193d2c]">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PERISHABLE PURCHASE FORM */}
          {purchaseMode === 'perishable' && (
            <div className="space-y-5">
              {/* Quick-Add Chips for the 7 Perishable Items */}
              <div className="bg-[#fcfbf9] border border-[#e5e0d5] rounded-sm p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#59635e] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={13} className="text-[#193d2c]" /> Quick Select Perishable:
                  </span>
                  <button
                    type="button"
                    onClick={addAllPerishables}
                    className="text-xs text-[#193d2c] font-semibold hover:underline cursor-pointer"
                  >
                    + Fill All 7 Perishables
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {perishableIngredients.map((item) => {
                    const isAdded = perishableRows.some((r) => r.ingredientId === item.ingredient_id);
                    return (
                      <button
                        key={item.ingredient_id}
                        type="button"
                        onClick={() => addQuickPerishableItem(item.ingredient_id)}
                        className={`px-2.5 py-1 text-xs rounded-sm transition-all flex items-center gap-1 cursor-pointer font-medium ${
                          isAdded
                            ? 'bg-[#193d2c] text-white'
                            : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f4f7f5] hover:border-[#193d2c]/50'
                        }`}
                      >
                        <span>{item.name}</span>
                        {item.name_telugu && (
                          <span className={isAdded ? 'text-white/80 text-[10px]' : 'text-[#8b948f] text-[10px]'}>
                            ({item.name_telugu})
                          </span>
                        )}
                        <span className="text-[11px] font-bold ml-0.5">{isAdded ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rows for Perishable Items */}
              <div className="space-y-3">
                <div className="hidden sm:grid grid-cols-12 gap-3 px-2">
                  <div className="col-span-7 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                    Perishable Item (Price Only &middot; No Stock Tracking)
                  </div>
                  <div className="col-span-4 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                    Total Price (₹)
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {perishableRows.map((row) => {
                  const selectedIng = perishableIngredients.find((i) => i.ingredient_id === row.ingredientId);
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-[#fcfbf9] sm:bg-transparent p-3 sm:p-0 border sm:border-0 border-[#e5e0d5] rounded-sm relative group"
                    >
                      <div className="sm:col-span-7">
                        <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                          Perishable Item
                        </label>
                        <select
                          value={row.ingredientId}
                          onChange={(e) => updatePerishableRow(row.id, 'ingredientId', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                        >
                          <option value="">Select perishable item...</option>
                          {perishableIngredients.map((item) => (
                            <option key={item.ingredient_id} value={item.ingredient_id}>
                              {item.name} {item.name_telugu ? `(${item.name_telugu})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                          Total Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-mono-fig text-[#8b948f] pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder={selectedIng ? `Total price for ${selectedIng.name}` : 'Enter price (₹)'}
                            value={row.totalCost}
                            onChange={(e) => updatePerishableRow(row.id, 'totalCost', e.target.value)}
                            className="w-full pl-7 pr-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePerishableRow(row.id)}
                          className="p-2 sm:p-1.5 text-[#8b948f] hover:text-[#942426] hover:bg-[#faeaea] rounded-sm transition-colors cursor-pointer touch-manipulation"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => addPerishableRow()}
                  className="w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-[#193d2c] bg-[#eef3f0] hover:bg-[#dfebe3] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Plus size={14} /> Add Another Perishable Item
                </button>

                <div className="text-right flex items-center justify-between sm:justify-end">
                  <span className="text-xs text-[#59635e] uppercase tracking-wider font-semibold mr-3">
                    Perishables Total:
                  </span>
                  <span className="font-mono-fig text-xl font-bold text-[#193d2c]">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#e5e0d5]">
            <p className="text-[12px] text-[#59635e] italic mb-3">{dateHint}</p>
            <button
              type="submit"
              id="purchase-submit-btn"
              disabled={isSubmitting}
              className="w-full py-3.5 sm:py-3 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#112a1f] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              <PlusCircle size={16} />
              <span>
                {isSubmitting
                  ? 'Saving to Register...'
                  : purchaseMode === 'provisions'
                  ? 'Save Provisional Bulk Purchase'
                  : 'Save Perishable Purchase'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* OCR Scan Bill Modal */}
      <ScanBillModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApply={handleApplyScannedBill}
        provisions={provisionIngredients}
      />
    </motion.div>
  );
}

