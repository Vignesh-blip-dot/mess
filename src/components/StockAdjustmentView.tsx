import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sliders, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function StockAdjustmentView() {
  const {
    ingredients,
    stockAdjustment,
    showToast,
    navigateTo,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  const [ingredientId, setIngredientId] = useState<string>('');
  const [method, setMethod] = useState<'relative' | 'absolute'>('relative');
  const [amountInput, setAmountInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const activeIngredients = ingredients.filter((i) => i.active);
  const selectedIng = ingredients.find((i) => i.ingredient_id === ingredientId);

  const inputValue = parseFloat(amountInput) || 0;
  const currentStock = selectedIng ? selectedIng.current_stock : 0;

  let changeAmount = 0;
  let newTotalStock = 0;

  if (method === 'relative') {
    changeAmount = inputValue;
    newTotalStock = currentStock + changeAmount;
  } else {
    changeAmount = inputValue - currentStock;
    newTotalStock = inputValue;
  }

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId) {
      showToast('Please select an ingredient', true);
      return;
    }
    if (!reason) {
      showToast('Please select a reason for adjustment', true);
      return;
    }
    if (changeAmount === 0) {
      showToast('The adjustment amount is 0. No changes needed.', true);
      return;
    }
    if (newTotalStock < 0) {
      showToast('Invalid adjustment: Total shelf stock cannot drop below zero.', true);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    const fullNotes = remarks ? `${reason} - ${remarks}` : reason;

    const success = await stockAdjustment({
      ingredientId,
      quantityChange: changeAmount,
      usageDate: todayStr,
      reason: fullNotes,
    });

    setIsSubmitting(false);
    if (success) {
      setAmountInput('');
      setRemarks('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="border-b border-[#e5e0d5] pb-4">
        <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#942426] font-bold block mb-1">
          Inventory Audit &middot; Ink Correction
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Stock Adjustment
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Correct physical shelf discrepancies. Every correction is permanently stamped and visible on the audit trail.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form onSubmit={handlePreSubmit} className="space-y-4">
          {/* Ingredient Selector */}
          <div>
            <label
              htmlFor="adj-ingredient"
              className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
            >
              Ingredient
            </label>
            <select
              id="adj-ingredient"
              value={ingredientId}
              required
              onChange={(e) => setIngredientId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            >
              <option value="">Select ingredient...</option>
              {activeIngredients.map((item) => (
                <option key={item.ingredient_id} value={item.ingredient_id}>
                  {item.name} &middot; System Stock: {item.current_stock} {item.unit}
                </option>
              ))}
            </select>
            {selectedIng && (
              <div className="mt-1.5 text-xs text-[#59635e] font-mono-fig flex items-center justify-between">
                <span>Current Ledger Balance:</span>
                <span className="font-semibold text-[#131715]">
                  {selectedIng.current_stock} {selectedIng.unit} (@ ₹{selectedIng.current_price}/{selectedIng.unit})
                </span>
              </div>
            )}
          </div>

          {/* Adjustment Method */}
          <div className="pt-2 border-t border-[#e5e0d5]">
            <label className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-2">
              Adjustment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-sm border cursor-pointer text-xs font-medium transition-colors ${
                  method === 'relative'
                    ? 'bg-white border-[#193d2c] text-[#131715] ring-1 ring-[#193d2c]'
                    : 'bg-[#f5f2eb] border-[#e5e0d5] text-[#59635e]'
                }`}
              >
                <input
                  type="radio"
                  name="adj-method"
                  value="relative"
                  checked={method === 'relative'}
                  onChange={() => setMethod('relative')}
                  className="accent-[#193d2c]"
                />
                <div>
                  <div className="font-semibold text-[#131715]">Relative Change</div>
                  <div className="text-[11px] text-[#59635e]">Add (+) or remove (-) quantity</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-3 rounded-sm border cursor-pointer text-xs font-medium transition-colors ${
                  method === 'absolute'
                    ? 'bg-white border-[#193d2c] text-[#131715] ring-1 ring-[#193d2c]'
                    : 'bg-[#f5f2eb] border-[#e5e0d5] text-[#59635e]'
                }`}
              >
                <input
                  type="radio"
                  name="adj-method"
                  value="absolute"
                  checked={method === 'absolute'}
                  onChange={() => setMethod('absolute')}
                  className="accent-[#193d2c]"
                />
                <div>
                  <div className="font-semibold text-[#131715]">New Count Counted</div>
                  <div className="text-[11px] text-[#59635e]">Directly set physical count on shelf</div>
                </div>
              </label>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label
              htmlFor="adj-amount"
              className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
            >
              {method === 'relative'
                ? `Amount to Add / Remove (use negative for deduction) ${selectedIng ? `(${selectedIng.unit})` : ''}`
                : `Actual Physical Stock Counted on Shelf ${selectedIng ? `(${selectedIng.unit})` : ''}`}
            </label>
            <input
              type="number"
              id="adj-amount"
              step="0.01"
              required
              placeholder={method === 'relative' ? 'e.g. -2.5 or +5' : 'e.g. 42.0'}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="adj-reason"
              className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
            >
              Reason for Adjustment
            </label>
            <select
              id="adj-reason"
              value={reason}
              required
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            >
              <option value="">Select reason...</option>
              <option value="Spoilage / Expired">Spoilage / Expired</option>
              <option value="Spill / Accident">Spill / Accident</option>
              <option value="Inventory Correction (Audit)">Inventory Correction (Audit)</option>
              <option value="Unrecorded Usage">Unrecorded Usage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Additional Remarks */}
          <div>
            <label
              htmlFor="adj-remarks"
              className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
            >
              Additional Remarks / Voucher Ref (Optional)
            </label>
            <input
              type="text"
              id="adj-remarks"
              placeholder="e.g. Bag torn in storage room 2 / physical weigh-in on Sunday morning"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
            />
          </div>

          {/* Live Preview Box */}
          {selectedIng && amountInput !== '' && (
            <div className="bg-[#f5f2eb] border border-[#e5e0d5] rounded-sm p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#942426] flex items-center gap-1.5">
                  <span className="ledger-stamp">ADJUSTMENT</span>
                  <span>Ledger Impact</span>
                </span>
                <span className="text-xs font-mono-fig text-[#59635e]">
                  Date: {todayStr}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono-fig pt-1">
                <div>
                  <span className="text-[#59635e] block text-[10px]">Previous Stock:</span>
                  <span className="font-semibold text-[#131715]">
                    {currentStock} {selectedIng.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#59635e] block text-[10px]">Net Adjustment:</span>
                  <span
                    className={`font-semibold ${
                      changeAmount < 0 ? 'text-[#942426]' : 'text-[#193d2c]'
                    }`}
                  >
                    {changeAmount > 0 ? `+${changeAmount}` : changeAmount} {selectedIng.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[#59635e] block text-[10px]">New Shelf Total:</span>
                  <span className="font-bold text-[#131715]">
                    {newTotalStock} {selectedIng.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            id="adj-submit-btn"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-sm bg-[#942426] text-white font-semibold text-sm hover:bg-[#7e1c1f] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Sliders size={16} />
            <span>Review &amp; Stamp Adjustment</span>
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedIng && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e5e0d5] rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-[#942426]">
              <AlertTriangle size={22} />
              <h3 className="font-serif text-lg font-bold">Confirm Stock Adjustment</h3>
            </div>

            <p className="text-xs text-[#131715] leading-relaxed">
              This action will stamp an indelible red adjustment into the register ledger.
            </p>

            <div className="bg-[#f5f2eb] border border-[#e5e0d5] p-3 rounded-sm text-xs space-y-1 font-mono-fig text-[#131715]">
              <div>
                <strong>Ingredient:</strong> {selectedIng.name}
              </div>
              <div>
                <strong>Adjustment:</strong> {changeAmount > 0 ? `+${changeAmount}` : changeAmount} {selectedIng.unit}
              </div>
              <div>
                <strong>Before / After:</strong> {currentStock} &rarr; {newTotalStock} {selectedIng.unit}
              </div>
              <div>
                <strong>Reason:</strong> {reason} {remarks ? `(${remarks})` : ''}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium bg-white border border-[#e5e0d5] text-[#131715] rounded-sm hover:bg-[#f5f2eb] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSave}
                className="px-4 py-2 text-xs font-semibold bg-[#942426] text-white rounded-sm hover:bg-[#7e1c1f] cursor-pointer"
              >
                Confirm &amp; Stamp
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
