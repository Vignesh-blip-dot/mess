import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MinusCircle, Utensils, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MealType } from '../types';

export function LogUsageView() {
  const {
    ingredients,
    logUsage,
    accessLevel,
    showToast,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  const [usageDate, setUsageDate] = useState<string>(todayStr);
  const [ingredientId, setIngredientId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [mealType, setMealType] = useState<MealType | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible ingredients: active & tracks_usage !== false
  const eligibleIngredients = ingredients.filter((i) => i.active && i.tracks_usage !== false);
  const selectedIng = ingredients.find((i) => i.ingredient_id === ingredientId);
  const isProvisions = selectedIng?.category === 'provisions';

  const qtyNum = parseFloat(quantity) || 0;
  const estimatedCost = selectedIng ? qtyNum * selectedIng.current_price : 0;
  const isOverStock = selectedIng ? qtyNum > selectedIng.current_stock : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientId) {
      showToast('Please select an ingredient', true);
      return;
    }
    if (qtyNum <= 0) {
      showToast('Quantity must be greater than zero', true);
      return;
    }
    if (isProvisions && !mealType) {
      showToast('Please select a meal (Breakfast, Lunch, or Dinner) for provisions', true);
      return;
    }

    setIsSubmitting(true);
    const success = await logUsage({
      ingredientId,
      quantity: qtyNum,
      usageDate,
      mealType: isProvisions ? (mealType as MealType) : null,
    });

    setIsSubmitting(false);
    if (success) {
      setQuantity('');
      setMealType('');
    }
  };

  const dateHint =
    accessLevel === 'grace'
      ? "Grace period active: backdated entries into your duty month will be flagged in the permanent audit ledger."
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
          Mess Kitchen &middot; Daily Consumption
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Log Meal Usage
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Deducts from current stock. Provisions require meal attribution (Breakfast, Lunch, Dinner); perishables track daily total consumption.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form id="usage-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Ingredient */}
            <div>
              <label
                htmlFor="usage-ingredient"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Ingredient
              </label>
              <select
                id="usage-ingredient"
                value={ingredientId}
                required
                onChange={(e) => {
                  setIngredientId(e.target.value);
                  const ing = ingredients.find((i) => i.ingredient_id === e.target.value);
                  if (ing?.category !== 'provisions') {
                    setMealType('');
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="">Select ingredient...</option>
                {eligibleIngredients.map((item) => (
                  <option key={item.ingredient_id} value={item.ingredient_id}>
                    {item.name} ({item.unit}) &middot; Stock: {item.current_stock}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label
                htmlFor="usage-qty"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Quantity Used {selectedIng ? `(${selectedIng.unit})` : ''}
              </label>
              <input
                type="number"
                id="usage-qty"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>

            {/* Meal selector (Conditional for provisions) */}
            {isProvisions ? (
              <div>
                <label
                  htmlFor="usage-meal"
                  className="block text-xs font-semibold text-[#193d2c] uppercase tracking-wider mb-1 flex items-center justify-between"
                >
                  <span>Meal (Required for Provisions)</span>
                </label>
                <select
                  id="usage-meal"
                  value={mealType}
                  required
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#193d2c] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                >
                  <option value="">Select meal...</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1">
                  Category Note
                </label>
                <div className="w-full px-3 py-2 text-xs bg-[#f5f2eb] border border-[#e5e0d5] rounded-sm text-[#59635e] font-mono-fig">
                  Perishable &middot; No meal breakdown required
                </div>
              </div>
            )}
          </div>

          {/* Quick presets for common kitchen batches */}
          {selectedIng && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-[#59635e]">Quick batch:</span>
              {[5, 10, 20, 40].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuantity(String(amt))}
                  className="px-2 py-0.5 rounded-sm bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb] transition-colors cursor-pointer"
                >
                  {amt} {selectedIng.unit}
                </button>
              ))}
            </div>
          )}

          {/* Stock impact summary box */}
          {selectedIng && qtyNum > 0 && (
            <div
              className={`p-3.5 rounded-sm text-xs space-y-1.5 border ${
                isOverStock
                  ? 'bg-[#faeaea] border-[#942426] text-[#942426]'
                  : 'bg-[#f5f2eb] border-[#e5e0d5] text-[#131715]'
              }`}
            >
              <div className="flex items-center justify-between font-medium">
                <span>Calculated Consumption Cost:</span>
                <span className="font-mono-fig font-bold text-sm">
                  ₹{estimatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#59635e]">
                <span>Remaining Shelf Stock after entry:</span>
                <span className="font-mono-fig font-semibold">
                  {(selectedIng.current_stock - qtyNum).toFixed(2)} {selectedIng.unit}
                </span>
              </div>
              {isOverStock && (
                <div className="flex items-center gap-1.5 text-xs text-[#942426] font-semibold pt-1 border-t border-[#942426]/20">
                  <AlertCircle size={14} />
                  <span>Warning: Logged quantity exceeds recorded system stock!</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[12px] text-[#59635e] italic">{dateHint}</p>

          <button
            type="submit"
            id="usage-submit-btn"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <MinusCircle size={16} />
            <span>{isSubmitting ? 'Recording Deduction...' : 'Save Usage Entry'}</span>
          </button>
        </form>
      </div>
    </motion.div>
  );
}
