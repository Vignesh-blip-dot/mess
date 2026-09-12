import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Calculator, AlertCircle, Trash2, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LogPurchaseView() {
  const {
    ingredients,
    logPurchaseBatch,
    accessLevel,
    showToast,
  } = useApp();

  const activeIngredients = ingredients.filter((i) => i.active);
  const todayStr = new Date().toISOString().split('T')[0];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usageDate, setUsageDate] = useState(todayStr);
  const [vendor, setVendor] = useState('');

  interface PurchaseRow {
    id: string;
    ingredientId: string;
    quantity: string;
    totalCost: string;
  }

  const [rows, setRows] = useState<PurchaseRow[]>([
    { id: `row-${Date.now()}`, ingredientId: '', quantity: '', totalCost: '' },
  ]);

  const addRow = () => {
    setRows([...rows, { id: `row-${Date.now()}`, ingredientId: '', quantity: '', totalCost: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((r) => r.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof PurchaseRow, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
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
      const costNum = parseFloat(row.totalCost);
      if (isNaN(qtyNum) || qtyNum <= 0 || isNaN(costNum) || costNum <= 0) {
        showToast('Quantity and cost must be greater than zero for all rows', true);
        return;
      }
      itemsToLog.push({ ingredientId: row.ingredientId, quantity: qtyNum, totalCost: costNum });
    }

    setIsSubmitting(true);
    const success = await logPurchaseBatch({
      items: itemsToLog,
      usageDate,
      vendor: vendor.trim() || undefined,
    });
    setIsSubmitting(false);

    if (success) {
      setRows([{ id: `row-${Date.now()}`, ingredientId: '', quantity: '', totalCost: '' }]);
      setVendor('');
    }
  };

  const dateHint =
    accessLevel === 'grace'
      ? "You're in your 15-day grace window — entries logged here will be recorded with grace-period audit markings."
      : 'Defaults to today. Coordinators can backdate within their designated duty month.';

  const grandTotal = rows.reduce((acc, row) => acc + (parseFloat(row.totalCost) || 0), 0);

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
          Add multiple ingredients at once from a single vendor/receipt. Automatically recalculates weighted-average prices.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form id="purchase-form" onSubmit={handleSubmit} className="space-y-6">
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
                Vendor / Supplier (Optional)
              </label>
              <input
                type="text"
                id="purchase-vendor"
                placeholder="e.g. Wholesale Mandi Stall #12 / Sri Ram Traders"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="hidden sm:grid grid-cols-12 gap-3 px-2">
              <div className="col-span-5 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">Ingredient</div>
              <div className="col-span-3 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">Quantity</div>
              <div className="col-span-3 text-[11px] font-semibold text-[#59635e] uppercase tracking-wider">Total Cost (₹)</div>
              <div className="col-span-1"></div>
            </div>

            {rows.map((row, index) => {
              const selectedIng = activeIngredients.find((i) => i.ingredient_id === row.ingredientId);
              
              return (
                <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-[#fcfbf9] sm:bg-transparent p-3 sm:p-0 border sm:border-0 border-[#e5e0d5] rounded-sm relative group">
                  <div className="sm:col-span-5">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">Ingredient</label>
                    <select
                      value={row.ingredientId}
                      required
                      onChange={(e) => updateRow(row.id, 'ingredientId', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                    >
                      <option value="">Select ingredient...</option>
                      {activeIngredients.map((item) => (
                        <option key={item.ingredient_id} value={item.ingredient_id}>
                          {item.name} ({item.unit}) &middot; Current: {item.current_stock}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">Quantity {selectedIng ? `(${selectedIng.unit})` : ''}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="e.g. 50"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                      />
                      {selectedIng && (
                        <span className="absolute right-3 top-2 text-xs text-[#8b948f] pointer-events-none">{selectedIng.unit}</span>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block sm:hidden text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">Total Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 2400"
                      value={row.totalCost}
                      onChange={(e) => updateRow(row.id, 'totalCost', e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                    />
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
              <span className="text-xs text-[#59635e] uppercase tracking-wider font-semibold mr-3">Grand Total:</span>
              <span className="font-mono-fig text-xl font-bold text-[#193d2c]">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e5e0d5]">
            <p className="text-[12px] text-[#59635e] italic mb-3">{dateHint}</p>
            <button
              type="submit"
              id="purchase-submit-btn"
              disabled={isSubmitting || rows.length === 0}
              className="w-full py-3 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>{isSubmitting ? 'Saving to Register...' : 'Save Bulk Purchase'}</span>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
