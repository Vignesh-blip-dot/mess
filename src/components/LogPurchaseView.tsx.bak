import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, ShoppingBag, ArrowRight, Calculator } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LogPurchaseView() {
  const {
    ingredients,
    logPurchase,
    accessLevel,
    showToast,
    navigateTo,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  const [usageDate, setUsageDate] = useState<string>(todayStr);
  const [ingredientId, setIngredientId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeIngredients = ingredients.filter((i) => i.active);
  const selectedIng = ingredients.find((i) => i.ingredient_id === ingredientId);

  const qtyNum = parseFloat(quantity) || 0;
  const costNum = parseFloat(totalCost) || 0;
  const unitPricePreview = qtyNum > 0 && costNum > 0 ? costNum / qtyNum : 0;

  // Weighted average preview
  let newStockPreview = 0;
  let newPricePreview = 0;
  if (selectedIng && qtyNum > 0 && costNum > 0) {
    const curVal = selectedIng.current_stock * selectedIng.current_price;
    newStockPreview = selectedIng.current_stock + qtyNum;
    newPricePreview = newStockPreview > 0 ? (curVal + costNum) / newStockPreview : 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId) {
      showToast('Please select an ingredient', true);
      return;
    }
    if (qtyNum <= 0 || costNum <= 0) {
      showToast('Quantity and cost must be greater than zero', true);
      return;
    }

    setIsSubmitting(true);
    const success = await logPurchase({
      ingredientId,
      quantity: qtyNum,
      totalCost: costNum,
      usageDate,
      vendor: vendor.trim() || undefined,
    });

    setIsSubmitting(false);
    if (success) {
      setQuantity('');
      setTotalCost('');
      setVendor('');
    }
  };

  const dateHint =
    accessLevel === 'grace'
      ? "You're in your 15-day grace window — entries logged here will be recorded with grace-period audit markings."
      : 'Defaults to today. Coordinators can backdate within their designated duty month.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Page Header */}
      <div className="border-b border-[#e5e0d5] pb-4">
        <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
          Stock Receiving &middot; Physical Ledger
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Log a Purchase
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Adds to physical stock and automatically recalculates the running weighted-average price per unit.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form id="purchase-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Ingredient */}
            <div>
              <label
                htmlFor="purchase-ingredient"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Ingredient
              </label>
              <select
                id="purchase-ingredient"
                value={ingredientId}
                required
                onChange={(e) => setIngredientId(e.target.value)}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label
                htmlFor="purchase-qty"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Quantity {selectedIng ? `(${selectedIng.unit})` : ''}
              </label>
              <input
                type="number"
                id="purchase-qty"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>

            {/* Total Amount Paid */}
            <div>
              <label
                htmlFor="purchase-cost"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Total Amount Paid (₹)
              </label>
              <input
                type="number"
                id="purchase-cost"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 2400"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
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

          {/* Live Weighted-Average Calculation Box */}
          {selectedIng && qtyNum > 0 && costNum > 0 && (
            <div className="bg-[#f5f2eb] border border-[#e5e0d5] p-3.5 rounded-sm text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#193d2c]">
                <Calculator size={14} />
                <span>Weighted-Average Valuation Preview</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono-fig pt-1">
                <div>
                  <span className="text-[#59635e] block text-[10px]">Purchase Unit Price:</span>
                  <span className="font-semibold text-[#131715]">
                    ₹{unitPricePreview.toFixed(2)} / {selectedIng.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#59635e] block text-[10px]">New Shelf Stock:</span>
                  <span className="font-semibold text-[#131715]">
                    {selectedIng.current_stock} &rarr; {newStockPreview.toFixed(2)} {selectedIng.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#59635e] block text-[10px]">New Weighted Price:</span>
                  <span className="font-bold text-[#193d2c]">
                    ₹{newPricePreview.toFixed(2)} / {selectedIng.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-[12px] text-[#59635e] italic">{dateHint}</p>

          <button
            type="submit"
            id="purchase-submit-btn"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>{isSubmitting ? 'Saving to Register...' : 'Save Purchase Entry'}</span>
          </button>
        </form>
      </div>
    </motion.div>
  );
}
