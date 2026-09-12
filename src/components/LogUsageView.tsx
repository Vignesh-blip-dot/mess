import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { MinusCircle, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MealType } from '../types';

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

  interface UsageRow {
    id: string;
    ingredientId: string;
    quantity: string;
  }

  const [rows, setRows] = useState<UsageRow[]>([
    { id: `row-${Date.now()}`, ingredientId: '', quantity: '' },
  ]);

  const eligibleIngredients = useMemo(
    () => ingredients.filter((i) => i.active && i.tracks_usage),
    [ingredients]
  );

  // Check if any provision is selected, to require meal type
  const hasProvisions = rows.some((r) => {
    const ing = eligibleIngredients.find((i) => i.ingredient_id === r.ingredientId);
    return ing?.category === 'provisions';
  });

  const addRow = () => {
    setRows([...rows, { id: `row-${Date.now()}`, ingredientId: '', quantity: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof UsageRow, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hasProvisions && !globalMealType) {
      showToast('Meal Type is required when logging provisions (non-perishables).', true);
      return;
    }

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
      itemsToLog.push({ ingredientId: row.ingredientId, quantity: qtyNum });
    }

    setIsSubmitting(true);
    const success = await logUsageBatch({
      items: itemsToLog,
      usageDate,
      mealType: globalMealType,
    });
    setIsSubmitting(false);

    if (success) {
      setRows([{ id: `row-${Date.now()}`, ingredientId: '', quantity: '' }]);
      setGlobalMealType('');
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
      totalDeductionCost += qty * ing.current_price;
      if (qty > ing.current_stock) {
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
          Deduct multiple items from stock simultaneously. Provisions require meal attribution; perishables do not.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
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
            <div className={hasProvisions ? '' : 'opacity-50'}>
              <label
                htmlFor="usage-meal"
                className="block text-xs font-semibold text-[#193d2c] uppercase tracking-wider mb-1 flex items-center justify-between"
              >
                <span>Meal Type {hasProvisions ? '(Required for selected provisions)' : '(Not required for perishables)'}</span>
              </label>
              <select
                id="usage-meal"
                value={globalMealType}
                required={hasProvisions}
                onChange={(e) => setGlobalMealType(e.target.value as MealType)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#193d2c] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="">Select meal...</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-2">
              <div className="col-span-7 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">Ingredient</div>
              <div className="col-span-4 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">Quantity Used</div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((row) => {
              const selectedIng = eligibleIngredients.find((i) => i.ingredient_id === row.ingredientId);
              const qtyNum = parseFloat(row.quantity) || 0;
              const isOverStock = selectedIng && qtyNum > selectedIng.current_stock;
              
              return (
                <div key={row.id} className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-3 sm:p-0 rounded-sm relative group ${isOverStock ? 'bg-[#faeaea] border border-[#942426]/30' : 'bg-[#fcfbf9] sm:bg-transparent border border-[#e5e0d5] sm:border-0'}`}>
                  <div className="sm:col-span-7">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">Ingredient</label>
                    <select
                      value={row.ingredientId}
                      required
                      onChange={(e) => updateRow(row.id, 'ingredientId', e.target.value)}
                      className={`w-full px-3 py-2 text-sm bg-white border rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c] ${isOverStock ? 'border-[#942426]/50' : 'border-[#e5e0d5]'}`}
                    >
                      <option value="">Select ingredient...</option>
                      {eligibleIngredients.map((item) => (
                        <option key={item.ingredient_id} value={item.ingredient_id}>
                          {item.name} ({item.unit}) &middot; Stock: {item.current_stock}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="sm:col-span-4">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">Quantity {selectedIng ? `(${selectedIng.unit})` : ''}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="e.g. 25"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                        className={`w-full px-3 py-2 text-sm font-mono-fig bg-white border rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c] ${isOverStock ? 'border-[#942426]/50 text-[#942426]' : 'border-[#e5e0d5]'}`}
                      />
                      {selectedIng && (
                        <span className={`absolute right-3 top-2 text-xs pointer-events-none ${isOverStock ? 'text-[#942426]/70' : 'text-[#8b948f]'}`}>{selectedIng.unit}</span>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-1 flex justify-end sm:pt-1">
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 text-[#8b948f] hover:text-[#942426] hover:bg-[#faeaea] rounded-sm transition-colors cursor-pointer"
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

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={addRow}
              className="px-3 py-1.5 text-xs font-semibold text-[#193d2c] bg-[#eef3f0] hover:bg-[#dfebe3] rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add Another Ingredient
            </button>

            <div className="text-right">
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
              className="w-full py-3 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <MinusCircle size={16} />
              <span>{isSubmitting ? 'Recording Deductions...' : 'Save Bulk Usage Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
