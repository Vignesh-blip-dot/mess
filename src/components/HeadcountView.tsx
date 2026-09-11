import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Check, Calendar, IndianRupee } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function HeadcountView() {
  const {
    profile,
    dailySummaries,
    setStudentHeadcount,
    setGuestHeadcount,
    hasStockEditAccess,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);

  const summary = dailySummaries[date] || {
    usage_date: date,
    total_expenditure: 0,
    student_count: null,
    guest_count: null,
    total_people: null,
    cost_per_head: null,
  };

  const [studentInput, setStudentInput] = useState<string>(
    summary.student_count !== null ? String(summary.student_count) : ''
  );
  const [guestInput, setGuestInput] = useState<string>(
    summary.guest_count !== null ? String(summary.guest_count) : ''
  );

  // Update inputs when date changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const s = dailySummaries[newDate];
    setStudentInput(s?.student_count != null ? String(s.student_count) : '');
    setGuestInput(s?.guest_count != null ? String(s.guest_count) : '');
  };

  const canSetStudents = profile?.role === 'admin' || profile?.role === 'incharge';
  const canSetGuests = profile?.role === 'admin' || (profile?.role === 'coordinator' && hasStockEditAccess);

  const handleSaveStudents = async () => {
    const val = studentInput.trim() === '' ? null : parseInt(studentInput, 10);
    await setStudentHeadcount(date, val);
  };

  const handleSaveGuests = async () => {
    const val = guestInput.trim() === '' ? null : parseInt(guestInput, 10);
    await setGuestHeadcount(date, val);
  };

  const formatCurrency = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '—';
    return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="border-b border-[#e5e0d5] pb-4">
        <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
          Mess Hall &middot; Attendance Roster
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
          Daily Headcount
        </h2>
        <p className="text-sm text-[#59635e] mt-1">
          Students (entered by the hostel incharge) + guests (entered by on-duty coordinators) together divide that day’s total expenditure into an accurate per-head meal charge.
        </p>
      </div>

      {/* Date selector */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 flex items-center justify-between shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#193d2c]" />
          <label htmlFor="hc-date" className="text-xs font-semibold text-[#131715]">
            Select Attendance Date:
          </label>
        </div>
        <input
          type="date"
          id="hc-date"
          value={date}
          max={todayStr}
          onChange={(e) => handleDateChange(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
        />
      </div>

      {/* Headcount Summary Box */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-3 pb-2 border-b border-[#e5e0d5]">
          Attendance &amp; Per-Head Metrics for {date}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Total Expenditure</span>
            <span className="font-mono-fig text-xl font-bold text-[#131715] block">
              {formatCurrency(summary.total_expenditure)}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Students Ate</span>
            <span className="font-mono-fig text-xl font-semibold text-[#131715] block">
              {summary.student_count ?? '—'}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Guests Ate</span>
            <span className="font-mono-fig text-xl font-semibold text-[#131715] block">
              {summary.guest_count ?? '—'}
            </span>
          </div>

          <div className="bg-[#fbfaf7] border border-[#e5e0d5] p-3 rounded-sm">
            <span className="text-[11px] text-[#59635e] block font-medium mb-1">Total Diners</span>
            <span className="font-mono-fig text-xl font-semibold text-[#131715] block">
              {summary.total_people ?? '—'}
            </span>
          </div>

          <div className="bg-[#e6f0ea] border border-[#193d2c]/30 p-3 rounded-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] text-[#193d2c] block font-bold mb-1 uppercase tracking-wide">
              Cost Per Head
            </span>
            <span className="font-mono-fig text-xl font-bold text-[#193d2c] block">
              {summary.cost_per_head != null ? formatCurrency(summary.cost_per_head) : '—'}
            </span>
          </div>
        </div>

        {summary.total_people == null && (
          <p className="text-xs text-[#59635e] mt-3">
            No headcount entered for this day yet — cost per head stays blank until student and/or guest count is recorded.
          </p>
        )}
      </div>

      {/* Role-Specific Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Count Entry (Incharge or Admin) */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 space-y-3 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div>
            <span className="font-mono-fig text-[10px] text-[#193d2c] font-bold uppercase tracking-wider block">
              Hostel Incharge Privilege
            </span>
            <h4 className="font-serif text-base font-bold text-[#131715]">
              Students Attendance
            </h4>
            <p className="text-xs text-[#59635e] mt-0.5">
              Official biometric / turnstile student meal attendance count.
            </p>
          </div>

          {canSetStudents ? (
            <div className="space-y-2">
              <input
                type="number"
                id="hc-student-input"
                min="0"
                step="1"
                placeholder="Number of students..."
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
              <button
                onClick={handleSaveStudents}
                className="w-full py-2 px-3 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check size={14} />
                <span>Save Student Count</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#f5f2eb] border border-[#e5e0d5]/60 rounded-sm text-xs text-[#59635e]">
              View only: Student attendance must be updated by the Hostel Incharge.
            </div>
          )}
        </div>

        {/* Guest Count Entry (Coordinator or Admin) */}
        <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 space-y-3 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
          <div>
            <span className="font-mono-fig text-[10px] text-[#193d2c] font-bold uppercase tracking-wider block">
              Mess Coordinator Privilege
            </span>
            <h4 className="font-serif text-base font-bold text-[#131715]">
              Guest / Visitor Meals
            </h4>
            <p className="text-xs text-[#59635e] mt-0.5">
              Day scholars, visitors, parents, or faculty guest meal coupons.
            </p>
          </div>

          {canSetGuests ? (
            <div className="space-y-2">
              <input
                type="number"
                id="hc-guest-input"
                min="0"
                step="1"
                placeholder="Number of guest meals..."
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              />
              <button
                onClick={handleSaveGuests}
                className="w-full py-2 px-3 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Check size={14} />
                <span>Save Guest Count</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#f5f2eb] border border-[#e5e0d5]/60 rounded-sm text-xs text-[#59635e]">
              View only: Guest coupons are entered by on-duty mess coordinators.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
