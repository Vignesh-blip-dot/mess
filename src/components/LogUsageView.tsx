import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { MinusCircle, AlertCircle, Trash2, Plus, ScanText, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MealType } from '../types';
import { SearchableIngredientSelect } from './SearchableIngredientSelect';
import { ScanUsageModal } from './ScanUsageModal';

export function LogUsageView() {
  const {
    ingredients,
    logUsageBatch,
    accessLevel,
    showToast,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageDate, setUsageDate] = useState(todayStr);
  const [globalMealType, setGlobalMealType] = useState<MealType | ''>('');
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  interface UsageRow {
    id: string;
    ingredientId: string;
    quantity: string;
    unit: string;
  }

  const [rows, setRows] = useState<UsageRow[]>([
    { id: `row-${Date.now()}`, ingredientId: '', quantity: '', unit: '' },
  ]);

  const eligibleIngredients = useMemo(
    () => ingredients.filter((i) => i.active && i.tracks_usage),
    [ingredients]
  );

  const addRow = () => {
    setRows([...rows, { id: `row-${Date.now()}`, ingredientId: '', quantity: '', unit: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof UsageRow, value: string) => {
    setRows(
      rows.map((r) => {
        if (r.id !== id) return r;
        if (field === 'ingredientId') {
          const selected = eligibleIngredients.find((i) => i.ingredient_id === value);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToLog = [];
    for (const row of rows) {
      if (!row.ingredientId) {
        showToast('Please select an ingredient for all rows', true);
        return;
      }
      const qtyNum = parseFloat(row.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        showToast('Quantity must be greater than zero for all rows', true);
        return;
      }

      const ing = eligibleIngredients.find((i) => i.ingredient_id === row.ingredientId);
      const conv = ing?.conversions?.find((c) => c.unit_name === row.unit);
      const multiplier = conv ? conv.multiplier : 1;
      const baseQty = Math.round(qtyNum * multiplier * 1000) / 1000;
      const isPackaging = conv && (conv.multiplier !== 1 || conv.unit_name !== ing?.unit);

      itemsToLog.push({
        ingredientId: row.ingredientId,
        quantity: baseQty,
        enteredQuantity: isPackaging ? qtyNum : null,
        enteredUnit: isPackaging ? row.unit : null,
      });
    }

    const overStockItems = itemsToLog
      .map((item) => {
        const ing = eligibleIngredients.find((i) => i.ingredient_id === item.ingredientId);
        if (ing && item.quantity > ing.current_stock) {
          return `• ${ing.name}: Available ${ing.current_stock} ${ing.unit}, requested ${item.quantity} ${ing.unit}`;
        }
        return null;
      })
      .filter(Boolean);

    if (overStockItems.length > 0) {
      const confirmProceed = window.confirm(
        `Stock Warning:\n\nThe following items exceed current recorded inventory:\n${overStockItems.join('\n')}\n\nRecording this usage will set their recorded stock to 0. Do you want to proceed?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    setIsSubmitting(true);
    const success = await logUsageBatch({
      items: itemsToLog,
      usageDate,
      mealType: globalMealType,
    });
    setIsSubmitting(false);

    if (success) {
      setRows([{ id: `row-${Date.now()}`, ingredientId: '', quantity: '', unit: '' }]);
      setGlobalMealType('');
    }
  };

  const handleApplyScannedUsages = (data: {
    usageDate?: string;
    mealType?: MealType | '';
    items: {
      ingredientId: string;
      quantity: string;
      unit: string;
    }[];
  }) => {
    if (data.usageDate) {
      setUsageDate(data.usageDate);
    }
    if (data.mealType) {
      setGlobalMealType(data.mealType);
    }
    if (data.items.length > 0) {
      const mappedRows: UsageRow[] = data.items.map((item, idx) => ({
        id: `usage-scanned-${Date.now()}-${idx}`,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
      }));
      setRows(mappedRows);
      showToast(`Loaded ${data.items.length} usage items from scan`, false);
    }
  };

  const dateHint =
    accessLevel === 'grace'
      ? "You're in your 15-day grace window — entries logged here will be recorded with grace-period audit markings."
      : 'Defaults to today. Coordinators can backdate within their designated duty month.';

  // Calculate live warnings and costs
  let totalDeductionCost = 0;
  let anyOverStock = false;

  rows.forEach((r) => {
    const ing = eligibleIngredients.find((i) => i.ingredient_id === r.ingredientId);
    const qty = parseFloat(r.quantity) || 0;
    if (ing && qty > 0) {
      const conv = ing.conversions?.find((c) => c.unit_name === r.unit);
      const mult = conv ? conv.multiplier : 1;
      const baseQty = qty * mult;

      totalDeductionCost += baseQty * ing.current_price;
      if (baseQty > ing.current_stock) {
        anyOverStock = true;
      }
    }
  });

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
          Mess Kitchen &middot; Daily Consumption
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Log Meal Usages
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Deduct stock using physical packaging units (e.g., tins, bags, packets) or loose weights. Automatically converts to base inventory.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form id="usage-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-[#e5e0d5]">
            {/* Date */}
            <div>
              <label
                htmlFor="usage-date"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Date of Usage
              </label>
              <input
                type="date"
                id="usage-date"
                value={usageDate}
                max={todayStr}
                required
                onChange={(e) => setUsageDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
            
            {/* Meal selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="usage-meal"
                  className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider"
                >
                  Meal Type
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono-fig px-1.5 py-0.5 rounded bg-[#f4f7f5] text-[#59635e] border border-[#e5e0d5]">
                    Optional
                  </span>
                  {globalMealType && (
                    <button
                      type="button"
                      onClick={() => setGlobalMealType('')}
                      className="text-[11px] text-[#942426] hover:underline cursor-pointer font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <select
                id="usage-meal"
                value={globalMealType}
                onChange={(e) => setGlobalMealType(e.target.value as MealType | '')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="">No Meal Specified (General / Whole-Day Issue)</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
              <p className="text-[11px] text-[#8b948f] mt-1">
                Completely optional. Leave as "No Meal Specified" for general daily storeroom issues.
              </p>
            </div>
          </div>

          {/* OCR Meal Usage Scan Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-[#fafbf9] border border-[#e5e0d5] rounded-sm">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="p-2 rounded-sm bg-[#e6f0ea] text-[#193d2c] shrink-0 mt-0.5 sm:mt-0">
                <ScanText size={18} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-bold text-[#131715]">
                    Auto-Fill from Kitchen Chit / Sheet (Gemini AI OCR)
                  </span>
                  <span className="text-[10px] font-mono-fig px-1.5 py-0.5 rounded bg-[#e6f0ea] text-[#193d2c] font-semibold border border-[#193d2c]/20">
                    Provisions Daily Usage
                  </span>
                </div>
                <p className="text-[11px] text-[#59635e] mt-0.5">
                  Scan kitchen register, chalkboard, or daily issue chit. AI extracts date, meal type, ingredients, and quantities consumed.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="scan-meal-usage-btn"
              onClick={() => setIsScanModalOpen(true)}
              className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#112a1f] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 touch-manipulation"
            >
              <Sparkles size={14} className="text-[#a3e635]" />
              <span>Scan Usage Sheet</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-2">
              <div className="col-span-6 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                Ingredient
              </div>
              <div className="col-span-5 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">
                Quantity Used &amp; Packaging Unit
              </div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((row) => {
              const selectedIng = eligibleIngredients.find((i) => i.ingredient_id === row.ingredientId);
              const activeConversion = selectedIng?.conversions?.find((c) => c.unit_name === row.unit);
              const multiplier = activeConversion ? activeConversion.multiplier : 1;
              const qtyNum = parseFloat(row.quantity) || 0;
              const calculatedBaseQty = qtyNum > 0 ? Math.round(qtyNum * multiplier * 100) / 100 : 0;
              const isOverStock = selectedIng && calculatedBaseQty > selectedIng.current_stock;

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-3 sm:p-0 rounded-sm relative group ${
                    isOverStock
                      ? 'bg-[#faeaea] border border-[#942426]/30'
                      : 'bg-[#fcfbf9] sm:bg-transparent border border-[#e5e0d5] sm:border-0'
                  }`}
                >
                  <div className="sm:col-span-6">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                      Ingredient
                    </label>
                    <SearchableIngredientSelect
                      ingredients={eligibleIngredients}
                      value={row.ingredientId}
                      required
                      placeholder="Search or select ingredient..."
                      isError={isOverStock}
                      onChange={(id) => updateRow(row.id, 'ingredientId', id)}
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                      Quantity Used &amp; Packaging Unit
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder={selectedIng ? 'e.g. 1' : 'Qty'}
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 text-sm font-mono-fig bg-white border rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c] ${
                            isOverStock ? 'border-[#942426]/50 text-[#942426]' : 'border-[#e5e0d5]'
                          }`}
                        />
                      </div>

                      {/* Interactive Unit Dropdown with Secondary Conversions */}
                      <div className="w-28 sm:w-36">
                        <select
                          value={row.unit || (selectedIng ? selectedIng.unit : '')}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
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

                    {/* Live conversion and overstock preview */}
                    {selectedIng && calculatedBaseQty > 0 && (
                      <div
                        className={`mt-1 flex items-center justify-between text-[11px] font-mono-fig px-2 py-0.5 rounded-sm border ${
                          isOverStock
                            ? 'bg-[#faeaea] text-[#942426] border-[#942426]/30 font-semibold'
                            : 'bg-[#eef3f0] text-[#193d2c] border-[#193d2c]/20'
                        }`}
                      >
                        <span>
                          = <strong>{calculatedBaseQty} {selectedIng.unit}</strong> deducted
                        </span>
                        <span className="text-[10px] text-[#59635e]">
                          Current: {selectedIng.current_stock} {selectedIng.unit}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-1 flex justify-end sm:pt-1">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
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
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={addRow}
              className="w-full sm:w-auto justify-center px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-[#193d2c] bg-[#eef3f0] hover:bg-[#dfebe3] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <Plus size={14} /> Add Another Ingredient
            </button>

            <div className="text-right flex items-center justify-between sm:justify-end">
              <span className="text-xs text-[#59635e] uppercase tracking-wider font-semibold mr-3">Est. Usage Value:</span>
              <span className="font-mono-fig text-lg font-bold text-[#193d2c]">₹{totalDeductionCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {anyOverStock && (
            <div className="flex items-center gap-2 p-3 bg-[#faeaea] border border-[#942426]/30 text-[#942426] rounded-sm text-sm font-semibold">
              <AlertCircle size={16} />
              <span>Warning: One or more selected quantities exceed current system stock!</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#e5e0d5]">
            <p className="text-[12px] text-[#59635e] italic mb-3">{dateHint}</p>
            <button
              type="submit"
              id="usage-submit-btn"
              disabled={isSubmitting || rows.length === 0}
              className="w-full py-3.5 sm:py-3 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#112a1f] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              <MinusCircle size={16} />
              <span>{isSubmitting ? 'Recording Deductions...' : 'Save Bulk Usage Entry'}</span>
            </button>
          </div>
        </form>
      </div>

      <ScanUsageModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApply={handleApplyScannedUsages}
        provisions={eligibleIngredients}
      />
    </motion.div>
  );
}
