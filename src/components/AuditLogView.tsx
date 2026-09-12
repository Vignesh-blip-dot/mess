import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function AuditLogView() {
  const { auditLogs, ingredients } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = auditLogs.filter((log) => {
    if (filterType === 'adjustment' && log.highlight_reason !== 'adjustment') return false;
    if (filterType === 'grace' && log.highlight_reason !== 'grace_edit') return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const who = (log.user_name || log.profiles?.name || '').toLowerCase();
    const act = log.action.toLowerCase();
    const why = (log.reason || '').toLowerCase();
    return who.includes(q) || act.includes(q) || why.includes(q);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="border-b border-[#e5e0d5] pb-4">
        <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
          Transparency &middot; Immutable Record
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Audit Log
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Every entry, by everyone, forever. Nobody — including the administrator — can edit or purge records here.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs rounded-sm transition-colors cursor-pointer shrink-0 ${
              filterType === 'all'
                ? 'bg-[#193d2c] text-[#f7f9f7] font-semibold'
                : 'bg-white border border-[#e5e0d5] text-[#131715] hover:bg-[#f5f2eb]'
            }`}
          >
            All Logs ({auditLogs.length})
          </button>
          <button
            onClick={() => setFilterType('adjustment')}
            className={`px-3 py-1.5 text-xs rounded-sm transition-colors cursor-pointer shrink-0 ${
              filterType === 'adjustment'
                ? 'bg-[#942426] text-white font-semibold'
                : 'bg-white border border-[#e5e0d5] text-[#942426] hover:bg-[#faeaea]'
            }`}
          >
            Adjustments Only
          </button>
          <button
            onClick={() => setFilterType('grace')}
            className={`px-3 py-1.5 text-xs rounded-sm transition-colors cursor-pointer shrink-0 ${
              filterType === 'grace'
                ? 'bg-[#996515] text-white font-semibold'
                : 'bg-white border border-[#e5e0d5] text-[#996515] hover:bg-[#faf4e6]'
            }`}
          >
            Grace Period Edits
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#59635e]" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
          />
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-[#59635e] text-sm font-serif">
            No audit records found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b-2 border-[#131715] font-bold text-[11px] uppercase tracking-wider text-[#59635e]">
                  <th className="py-2.5 px-3">When</th>
                  <th className="py-2.5 px-3">Who</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Stamp / Particulars</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5] font-mono-fig text-[#131715]">
                {filtered.map((log) => {
                  const stampLabel =
                    log.highlight_reason === 'adjustment'
                      ? 'ADJUSTMENT'
                      : log.highlight_reason === 'grace_edit'
                      ? 'GRACE EDIT'
                      : null;

                  const dateFormatted = new Date(log.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  let renderedReason: React.ReactNode = log.reason;
                  let displayAction = log.action;

                  if (log.reason?.startsWith('ADJ_REQ:')) {
                    try {
                      const jsonStr = log.reason.substring(8);
                      const data = JSON.parse(jsonStr);
                      const ingredient = ingredients.find(i => i.ingredient_id === data.ingredientId);
                      const ingName = ingredient ? ingredient.name : 'Unknown Item';
                      const sign = data.quantityChange > 0 ? '+' : '';
                      const remarksStr = data.remarks ? ` - ${data.remarks}` : '';
                      
                      renderedReason = (
                        <div className="flex flex-col gap-0.5 inline-flex align-middle">
                          <span className="font-semibold text-[#131715]">
                            Pending Request: {sign}{data.quantityChange} {ingredient?.unit || ''} {ingName}
                          </span>
                          <span className="text-[#59635e] text-[11px]">
                            Reason: {data.reason}{remarksStr}
                          </span>
                        </div>
                      );
                    } catch (e) {
                      renderedReason = <span className="text-[#131715]">{log.reason}</span>;
                    }
                  } else if (log.reason?.startsWith('ADJ_RES:')) {
                    try {
                      const jsonStr = log.reason.substring(8);
                      const data = JSON.parse(jsonStr);
                      
                      renderedReason = (
                        <span className="font-semibold text-[#131715]">
                          Request {data.status === 'approved' ? 'Approved' : 'Denied'} (Ref: {data.reqId})
                        </span>
                      );
                    } catch (e) {
                      renderedReason = <span className="text-[#131715]">{log.reason}</span>;
                    }
                  } else if (log.action === 'ADJUSTMENT_REQUEST') {
                     try {
                       const data = JSON.parse(log.reason || '{}');
                       const ingredient = ingredients.find(i => i.ingredient_id === data.ingredientId);
                       const ingName = ingredient ? ingredient.name : 'Unknown Item';
                       const sign = data.quantityChange > 0 ? '+' : '';
                       const remarksStr = data.remarks ? ` - ${data.remarks}` : '';
                       
                       renderedReason = (
                         <div className="flex flex-col gap-0.5 inline-flex align-middle">
                           <span className="font-semibold text-[#131715]">
                             Pending Request: {sign}{data.quantityChange} {ingredient?.unit || ''} {ingName}
                           </span>
                           <span className="text-[#59635e] text-[11px]">
                             Reason: {data.reason}{remarksStr}
                           </span>
                         </div>
                       );
                     } catch (e) {
                       renderedReason = <span className="text-[#131715]">{log.reason}</span>;
                     }
                  } else if (log.action === 'insert' && log.entity_name === 'stock_transactions' && log.after_value) {
                    const data = log.after_value;
                    const ingredient = ingredients.find(i => i.ingredient_id === data.ingredient_id);
                    const ingName = ingredient ? ingredient.name : 'Unknown Item';
                    const unit = ingredient?.unit || '';
                    if (data.txn_type === 'purchase') {
                      displayAction = 'LOG_PURCHASE';
                      renderedReason = <span className="text-[#131715]">Purchased {data.quantity} {unit} {ingName} for ₹{data.total_cost?.toLocaleString('en-IN')}{data.vendor ? ` from ${data.vendor}` : ''}</span>;
                    } else if (data.txn_type === 'usage') {
                      displayAction = 'LOG_USAGE';
                      renderedReason = <span className="text-[#131715]">Deducted {Math.abs(data.quantity)} {unit} {ingName} for {data.meal_type ? data.meal_type.toUpperCase() : 'kitchen'} (₹{data.total_cost?.toLocaleString('en-IN')}) {log.reason && log.reason !== 'USAGE' ? `- ${log.reason}` : ''}</span>;
                    } else if (data.txn_type === 'adjustment') {
                      displayAction = 'STOCK_ADJUSTMENT';
                      renderedReason = <span className="text-[#131715]">Adjusted {data.quantity} {unit} {ingName} (₹{data.total_cost?.toLocaleString('en-IN')}) {log.reason ? `- ${log.reason}` : ''}</span>;
                    } else {
                      renderedReason = <span className="text-[#8b948f] italic">Added new transaction record</span>;
                    }
                  } else if (log.action === 'update' && log.entity_name === 'ingredients' && log.after_value) {
                    displayAction = 'UPDATE_INGREDIENT';
                    const ingName = log.after_value.name || 'Unknown Item';
                    renderedReason = <span className="text-[#131715]">Updated ingredient "{ingName}" details</span>;
                  } else if (log.action === 'insert' && log.entity_name === 'daily_headcount' && log.after_value) {
                    displayAction = 'LOG_HEADCOUNT';
                    const d = log.after_value;
                    renderedReason = <span className="text-[#131715]">Logged headcount for {d.attendance_date}: {d.student_count ?? '?'} students, {d.guest_count ?? '?'} guests</span>;
                  } else if (log.action === 'update' && log.entity_name === 'daily_headcount' && log.after_value) {
                    displayAction = 'UPDATE_HEADCOUNT';
                    const d = log.after_value;
                    renderedReason = <span className="text-[#131715]">Updated headcount for {d.attendance_date}: {d.student_count ?? '?'} students, {d.guest_count ?? '?'} guests</span>;
                  } else if (!log.reason) {
                    renderedReason = (
                      <span className="text-[#8b948f] italic">
                        {log.action === 'insert' ? 'Added new record' : 'Modified record'}
                      </span>
                    );
                  } else {
                    renderedReason = <span className="text-[#131715]">{log.reason}</span>;
                  }

                  // Force the ADJUSTMENT stamp for requests and responses if they don't have it
                  let activeStampLabel = stampLabel;
                  if (!activeStampLabel && (log.reason?.startsWith('ADJ_REQ:') || log.reason?.startsWith('ADJ_RES:') || log.action === 'ADJUSTMENT_REQUEST' || log.action === 'ADJUSTMENT_APPROVAL' || log.action === 'ADJUSTMENT_DENIAL')) {
                    activeStampLabel = 'ADJUSTMENT';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-[#193d2c]/5 transition-colors">
                      <td className="py-2.5 px-3 text-[#59635e] whitespace-nowrap text-xs">
                        {dateFormatted}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#131715] whitespace-nowrap">
                        {log.user_name || log.profiles?.name || 'Staff User'}
                      </td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-sm bg-[#f5f2eb] border border-[#e5e0d5] font-medium text-[#131715]">
                          {displayAction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[#59635e] whitespace-nowrap">
                        {log.entity_name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-xs">
                        {activeStampLabel && (
                          <span
                            className={
                              activeStampLabel === 'ADJUSTMENT'
                                ? 'ledger-stamp mr-2 align-middle'
                                : 'inline-block px-2 py-0.5 text-[10px] font-bold rounded-sm bg-[#faf4e6] text-[#996515] border border-[#996515]/40 mr-2 align-middle'
                            }
                          >
                            {activeStampLabel}
                          </span>
                        )}
                        {renderedReason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
