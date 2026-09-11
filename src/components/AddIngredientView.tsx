import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, PackagePlus, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function AddIngredientView() {
  const { addIngredient, showToast, navigateTo } = useApp();

  const [name, setName] = useState('');
  const [nameTelugu, setNameTelugu] = useState('');
  const [category, setCategory] = useState<'provisions' | 'perishable'>('provisions');
  const [unit, setUnit] = useState('kg');
  const [tracksUsage, setTracksUsage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter an ingredient name', true);
      return;
    }
    if (!unit.trim()) {
      showToast('Please enter a measurement unit', true);
      return;
    }

    setIsSubmitting(true);
    const success = await addIngredient({
      name,
      name_telugu: nameTelugu.trim() || undefined,
      category,
      unit,
      tracks_usage: tracksUsage,
    });

    setIsSubmitting(false);
    if (success) {
      setName('');
      setNameTelugu('');
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
      <div className="flex items-center justify-between border-b border-[#e5e0d5] pb-4">
        <div>
          <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
            Master Registry &middot; Permanent Item
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
            Add an Ingredient
          </h2>
          <p className="text-sm text-[#59635e] mt-1">
            New provisions and perishable inventory entries. Items are permanent and cannot be deleted, preserving historic audit lines.
          </p>
        </div>

        <button
          onClick={() => navigateTo('ingredients')}
          className="px-3 py-1.5 text-xs text-[#59635e] hover:text-[#131715] border border-[#e5e0d5] bg-white rounded-sm flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Back to List</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name English */}
            <div>
              <label
                htmlFor="ing-name-en"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Ingredient Name (English)
              </label>
              <input
                type="text"
                id="ing-name-en"
                required
                placeholder="e.g. Sona Masoori Rice / Kashmiri Chilli"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>

            {/* Name Telugu */}
            <div>
              <label
                htmlFor="ing-name-te"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Name (Telugu, Optional)
              </label>
              <input
                type="text"
                id="ing-name-te"
                placeholder="e.g. బియ్యం / కారం పొడి"
                value={nameTelugu}
                onChange={(e) => setNameTelugu(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label
                htmlFor="ing-cat"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Category
              </label>
              <select
                id="ing-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'provisions' | 'perishable')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="provisions">Provisions (Stocked)</option>
                <option value="perishable">Perishable (Daily)</option>
              </select>
            </div>

            {/* Unit */}
            <div>
              <label
                htmlFor="ing-unit"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Unit of Measure
              </label>
              <input
                type="text"
                id="ing-unit"
                required
                placeholder="kg, litre, bag, piece..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>

            {/* Tracks meal-wise usage */}
            <div>
              <label
                htmlFor="ing-track"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Tracks Meal Usage?
              </label>
              <select
                id="ing-track"
                value={tracksUsage ? 'true' : 'false'}
                onChange={(e) => setTracksUsage(e.target.value === 'true')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="true">Yes — Meal Breakdown</option>
                <option value="false">No — Purchase Only (Salt, Sugar)</option>
              </select>
            </div>
          </div>

          <div className="bg-[#f5f2eb] border border-[#e5e0d5] p-3 rounded-sm text-xs text-[#59635e]">
            <strong className="text-[#131715]">Note on register durability:</strong> New items start with 0.00 shelf stock and 0.00 unit price. When the first purchase is logged, the initial cost and stock balance will be established automatically.
          </div>

          <button
            type="submit"
            id="add-ing-submit-btn"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-sm bg-[#193d2c] text-[#f7f9f7] font-semibold text-sm hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Plus size={16} />
            <span>{isSubmitting ? 'Registering...' : 'Add Ingredient to Register'}</span>
          </button>
        </form>
      </div>
    </motion.div>
  );
}
