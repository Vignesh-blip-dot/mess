import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, AlertTriangle, Search, PackageMinus, PackagePlus, Scale, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function StockAdjustmentView() {
  const {
    ingredients,
    stockAdjustment,
    requestStockAdjustment,
    profile,
    navigateTo,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [ingredientId, setIngredientId] = useState<string>('');

  // Adjustment State
  const [adjMode, setAdjMode] = useState<'remove' | 'add' | 'set'>('remove');
  const [amountInput, setAmountInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitAsRequest, setSubmitAsRequest] = useState(profile?.role === 'coordinator');

  React.useEffect(() => {
    setSubmitAsRequest(profile?.role === 'coordinator');
  }, [profile?.role]);

  const activeIngredients = ingredients.filter((i) => i.active);
  const filteredIngredients = activeIngredients.filter((i) => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.name_telugu && i.name_telugu.includes(searchQuery))
  );

  const selectedIng = ingredients.find((i) => i.ingredient_id === ingredientId);

  const inputValue = parseFloat(amountInput) || 0;
  const currentStock = selectedIng ? selectedIng.current_stock : 0;

  let changeAmount = 0;
  let newTotalStock = 0;

  if (adjMode === 'remove') {
    changeAmount = -Math.abs(inputValue);
    newTotalStock = currentStock + changeAmount;
  } else if (adjMode === 'add') {
    changeAmount = Math.abs(inputValue);
    newTotalStock = currentStock + changeAmount;
  } else if (adjMode === 'set') {
    changeAmount = inputValue - currentStock;
    newTotalStock = inputValue;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIng) return;
    if (inputValue <= 0 && adjMode !== 'set') return;
    if (adjMode === 'set' && inputValue < 0) return;
    if (!reason) return;
    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);

    let success = false;
    
    if (submitAsRequest) {
      success = await requestStockAdjustment({
        ingredientId,
        quantityChange: changeAmount,
        newStock: newTotalStock,
        reason,
        remarks,
      });
    } else {
      const fullNotes = remarks ? `${reason} - ${remarks}` : reason;
      success = await stockAdjustment({
        ingredientId,
        quantityChange: changeAmount,
        usageDate: todayStr,
        reason: fullNotes,
      });
    }

    setIsSubmitting(false);
    if (success) {
      setAmountInput('');
      setRemarks('');
      setReason('');
      setIngredientId('');
      if (profile?.role === 'coordinator' || submitAsRequest) {
        navigateTo('dashboard');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-2xl font-serif font-bold text-[#131715]">Stock Adjustment Workbench</h2>
        <p className="text-sm text-[#59635e] mt-1">Audit and correct physical inventory discrepancies.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Pane: Ingredient Selection */}
        <div className="w-full lg:w-1/3 flex flex-col h-[600px] bg-white border border-[#e5e0d5] rounded-sm overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#e5e0d5] bg-[#fcfafa]">
            <h3 className="text-xs font-bold text-[#131715] uppercase tracking-wider mb-3">1. Select Item</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#59635e]" size={16} />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#e5e0d5] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#fcfafa]">
            {filteredIngredients.length === 0 ? (
              <p className="text-center text-xs text-[#59635e] p-4">No ingredients found.</p>
            ) : (
              filteredIngredients.map(ing => (
                <button
                  key={ing.ingredient_id}
                  onClick={() => {
                    setIngredientId(ing.ingredient_id);
                    setAmountInput('');
                  }}
                  className={`w-full text-left p-3 rounded-sm border transition-all ${
                    ingredientId === ing.ingredient_id 
                      ? 'bg-[#193d2c] border-[#193d2c] text-white shadow-sm' 
                      : 'bg-white border-transparent hover:border-[#e5e0d5] text-[#131715]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{ing.name}</span>
                    <span className={`text-xs font-mono-fig ${ingredientId === ing.ingredient_id ? 'text-[#e5e0d5]' : 'text-[#59635e]'}`}>
                      {ing.current_stock} {ing.unit}
                    </span>
                  </div>
                  {ing.name_telugu && (
                    <div className={`text-[10px] mt-0.5 ${ingredientId === ing.ingredient_id ? 'text-[#e5e0d5]/80' : 'text-[#59635e]'}`}>
                      {ing.name_telugu}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane: Adjustment Ticket */}
        <div className="w-full lg:w-2/3">
          <AnimatePresence mode="wait">
            {!selectedIng ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[600px] border-2 border-dashed border-[#e5e0d5] rounded-sm flex flex-col items-center justify-center text-[#59635e] bg-[#fcfafa]/50"
              >
                <Sliders size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Select an ingredient from the list to begin.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white border border-[#e5e0d5] rounded-sm shadow-sm flex flex-col h-[600px]"
              >
                {/* Header */}
                <div className="p-5 border-b border-[#e5e0d5] bg-[#193d2c] text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-serif font-bold">{selectedIng.name}</h3>
                    <p className="text-xs text-[#e5e0d5] mt-1 tracking-wider uppercase">Adjustment Ticket</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-[#e5e0d5] mb-0.5">Current Recorded Stock</p>
                    <p className="text-xl font-mono-fig font-bold">{currentStock} {selectedIng.unit}</p>
                  </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Mode Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[#131715] uppercase tracking-wider">2. Action Required</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setAdjMode('remove')}
                        className={`p-3 border rounded-sm flex flex-col items-center justify-center gap-2 transition-colors ${
                          adjMode === 'remove' ? 'bg-[#fdf2f2] border-[#942426] text-[#942426]' : 'bg-[#fcfafa] border-[#e5e0d5] text-[#59635e] hover:border-[#131715]'
                        }`}
                      >
                        <PackageMinus size={20} />
                        <span className="text-xs font-semibold">Deduct Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjMode('add')}
                        className={`p-3 border rounded-sm flex flex-col items-center justify-center gap-2 transition-colors ${
                          adjMode === 'add' ? 'bg-[#f2fdf5] border-[#193d2c] text-[#193d2c]' : 'bg-[#fcfafa] border-[#e5e0d5] text-[#59635e] hover:border-[#131715]'
                        }`}
                      >
                        <PackagePlus size={20} />
                        <span className="text-xs font-semibold">Add Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjMode('set')}
                        className={`p-3 border rounded-sm flex flex-col items-center justify-center gap-2 transition-colors ${
                          adjMode === 'set' ? 'bg-[#f5f2eb] border-[#d4a017] text-[#8a680e]' : 'bg-[#fcfafa] border-[#e5e0d5] text-[#59635e] hover:border-[#131715]'
                        }`}
                      >
                        <Scale size={20} />
                        <span className="text-xs font-semibold">Physical Count</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Amount Input */}
                    <div>
                      <label className="block text-xs font-bold text-[#131715] uppercase tracking-wider mb-2">
                        {adjMode === 'remove' && 'Amount to Deduct'}
                        {adjMode === 'add' && 'Amount to Add'}
                        {adjMode === 'set' && 'Actual Counted Stock'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min={adjMode === 'set' ? "0" : "0.01"}
                          placeholder="0.00"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          className="w-full pl-4 pr-12 py-3 text-lg font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#59635e]">
                          {selectedIng.unit}
                        </span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="block text-xs font-bold text-[#131715] uppercase tracking-wider mb-2">
                        Reason / Category
                      </label>
                      <select
                        value={reason}
                        required
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-3 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c] h-[50px]"
                      >
                        <option value="">Select reason...</option>
                        {adjMode === 'remove' && (
                          <>
                            <option value="Spoilage / Expired">Spoilage / Expired</option>
                            <option value="Spill / Accident">Spill / Accident</option>
                            <option value="Unrecorded Usage">Unrecorded Usage</option>
                            <option value="Returned to Vendor">Returned to Vendor</option>
                          </>
                        )}
                        {adjMode === 'add' && (
                          <>
                            <option value="Unrecorded Purchase">Unrecorded Purchase</option>
                            <option value="Found in Storage">Found in Storage</option>
                            <option value="Vendor Compensation">Vendor Compensation</option>
                          </>
                        )}
                        {adjMode === 'set' && (
                          <>
                            <option value="Inventory Correction (Audit)">Inventory Correction (Audit)</option>
                            <option value="Month-End Count">Month-End Count</option>
                          </>
                        )}
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-[#131715] uppercase tracking-wider mb-2">
                      Additional Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Specific details, locations, or reference numbers..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-3 text-sm bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                    />
                  </div>
                  
                  {profile?.role !== 'coordinator' && (
                    <div className="pt-2 border-t border-[#e5e0d5]">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center w-5 h-5 border border-[#e5e0d5] rounded-sm group-hover:border-[#193d2c]">
                          <input 
                            type="checkbox" 
                            checked={!submitAsRequest} 
                            onChange={(e) => setSubmitAsRequest(!e.target.checked)}
                            className="peer opacity-0 absolute inset-0 cursor-pointer"
                          />
                          {!submitAsRequest && <CheckCircle size={14} className="text-[#193d2c]" />}
                        </div>
                        <span className="text-sm font-semibold text-[#131715]">
                          Skip Request Queue (Directly stamp into ledger)
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Dynamic Preview Footer */}
                  <div className="mt-auto bg-[#f5f2eb] p-4 rounded-sm border border-[#e5e0d5] flex items-center justify-between">
                    <div className="flex gap-6 text-sm font-mono-fig">
                      <div>
                        <span className="block text-[10px] uppercase font-sans text-[#59635e] font-bold">Effect</span>
                        <span className={`font-semibold ${changeAmount < 0 ? 'text-[#942426]' : changeAmount > 0 ? 'text-[#193d2c]' : 'text-[#131715]'}`}>
                          {changeAmount > 0 ? '+' : ''}{changeAmount ? changeAmount.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-sans text-[#59635e] font-bold">New Balance</span>
                        <span className="font-bold text-[#131715]">{newTotalStock ? newTotalStock.toFixed(2) : currentStock.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || !amountInput || !reason}
                      className="py-2.5 px-6 rounded-sm bg-[#131715] text-white font-semibold text-sm hover:bg-[#2a332e] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
                    >
                      {submitAsRequest ? 'Submit for Approval' : 'Stamp Adjustment'}
                    </button>
                  </div>

                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedIng && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-[#e5e0d5] rounded-sm p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-[#131715]">
              <AlertTriangle size={22} className={submitAsRequest ? "text-[#d4a017]" : "text-[#942426]"} />
              <h3 className="font-serif text-xl font-bold">
                {submitAsRequest ? 'Submit Request?' : 'Stamp Ledger?'}
              </h3>
            </div>
            
            <p className="text-sm text-[#59635e] leading-relaxed">
              {submitAsRequest 
                ? 'This adjustment will be queued for the Hostel Incharge to review and approve. Your physical stock will not update until then.'
                : 'Warning: This will create an indelible adjustment record in the daily ledger that cannot be deleted.'}
            </p>

            <div className="bg-[#fcfafa] border border-[#e5e0d5] p-4 rounded-sm space-y-2 text-sm font-mono-fig text-[#131715]">
              <div className="flex justify-between border-b border-[#e5e0d5] pb-2">
                <span className="text-[#59635e] font-sans text-xs">Item</span>
                <span className="font-bold">{selectedIng.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#e5e0d5] pb-2 pt-1">
                <span className="text-[#59635e] font-sans text-xs">Correction</span>
                <span className={changeAmount < 0 ? "text-[#942426] font-bold" : "text-[#193d2c] font-bold"}>
                  {changeAmount > 0 ? '+' : ''}{changeAmount} {selectedIng.unit}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#59635e] font-sans text-xs">Final Stock</span>
                <span className="font-bold">{newTotalStock} {selectedIng.unit}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-sm font-medium bg-white border border-[#e5e0d5] text-[#131715] rounded-sm hover:bg-[#f5f2eb] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSave}
                className={`px-4 py-2.5 text-sm font-semibold text-white rounded-sm cursor-pointer shadow-sm ${
                  submitAsRequest ? 'bg-[#193d2c] hover:bg-[#112a1f]' : 'bg-[#942426] hover:bg-[#7e1c1f]'
                }`}
              >
                {submitAsRequest ? 'Submit Request' : 'Confirm & Stamp'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
