import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StockAdjustmentRequestPayload } from '../types';

export function AdjustmentRequestsView() {
  const { pendingAdjustmentRequests, resolveStockAdjustment, ingredients, profile } = useApp();

  const handleResolve = async (reqId: string, status: 'approved' | 'denied', payload: StockAdjustmentRequestPayload) => {
    await resolveStockAdjustment(reqId, status, payload);
  };

  const isApprover = profile?.role === 'admin' || profile?.role === 'incharge';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-bold text-[#131715]">Pending Adjustment Requests</h2>
        <span className="px-3 py-1 bg-[#f5f2eb] border border-[#e5e0d5] rounded-sm text-xs font-semibold text-[#59635e]">
          {pendingAdjustmentRequests.length} Pending
        </span>
      </div>

      {pendingAdjustmentRequests.length === 0 ? (
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-8 text-center">
          <p className="text-sm text-[#59635e]">No pending adjustment requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAdjustmentRequests.map((req: any) => {
            const ing = ingredients.find((i) => i.ingredient_id === req.ingredientId);
            return (
              <div key={req.reqId} className="bg-white border border-[#e5e0d5] rounded-sm p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#131715]">{ing?.name || 'Unknown Ingredient'}</h3>
                    <p className="text-xs text-[#59635e] mt-1">Requested by {req.created_by_name} on {new Date(req.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isApprover ? (
                      <>
                        <button
                          onClick={() => handleResolve(req.reqId, 'denied', req)}
                          className="px-3 py-1.5 text-xs font-medium border border-[#e5e0d5] text-[#942426] hover:bg-[#fcfafa] rounded-sm transition-colors flex items-center gap-1.5"
                        >
                          <XCircle size={14} /> Deny
                        </button>
                        <button
                          onClick={() => handleResolve(req.reqId, 'approved', req)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#193d2c] text-white rounded-sm hover:bg-[#112a1f] transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-[#59635e] italic bg-[#f5f2eb] px-2 py-1 rounded-sm border border-[#e5e0d5]">Awaiting Approval</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#f5f2eb] p-3 rounded-sm text-xs font-mono-fig">
                  <div>
                    <span className="block text-[#59635e] text-[10px] uppercase">Prev Stock</span>
                    <span className="font-semibold">{req.newStock - req.quantityChange} {ing?.unit}</span>
                  </div>
                  <div>
                    <span className="block text-[#59635e] text-[10px] uppercase">Adjustment</span>
                    <span className={`font-semibold ${req.quantityChange < 0 ? 'text-[#942426]' : 'text-[#193d2c]'}`}>
                      {req.quantityChange > 0 ? '+' : ''}{req.quantityChange} {ing?.unit}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#59635e] text-[10px] uppercase">New Stock</span>
                    <span className="font-bold text-[#131715]">{req.newStock} {ing?.unit}</span>
                  </div>
                  <div>
                    <span className="block text-[#59635e] text-[10px] uppercase">Reason</span>
                    <span className="text-[#131715]">{req.reason}</span>
                  </div>
                </div>
                {req.remarks && (
                  <div className="text-xs text-[#59635e] italic bg-white p-2 border border-[#e5e0d5] rounded-sm">
                    "{req.remarks}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
