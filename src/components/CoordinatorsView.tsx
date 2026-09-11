import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Trash2, Shield, ArrowRight, UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function CoordinatorsView() {
  const {
    allProfiles,
    assignments,
    deleteCoordinator,
    assignDuty,
    showToast,
    navigateTo,
  } = useApp();

  const today = new Date().toISOString().split('T')[0];

  // Duty assignment form state
  const [assignUser, setAssignUser] = useState('');
  const [assignStart, setAssignStart] = useState('');
  const [assignEnd, setAssignEnd] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Compute coordinator statuses
  const allCoordinators = allProfiles.filter((p) => p.role === 'coordinator');
  const activeCoordinators = allCoordinators.filter((p) => p.active !== false);

  const profileMap: Record<string, typeof allProfiles[0]> = {};
  allProfiles.forEach((p) => {
    profileMap[p.id] = p;
  });

  const userAssignmentsMap: Record<string, typeof assignments> = {};
  assignments.forEach((a) => {
    if (!userAssignmentsMap[a.user_id]) userAssignmentsMap[a.user_id] = [];
    userAssignmentsMap[a.user_id].push(a);
  });

  const statusRows = activeCoordinators.map((coord) => {
    const userAssigns = (userAssignmentsMap[coord.id] || []).slice().sort((a, b) =>
      a.duty_start_date < b.duty_start_date ? 1 : -1
    );

    let status = 'Off-duty';
    let currentAssign = userAssigns.length > 0 ? userAssigns[0] : null;

    for (const a of userAssigns) {
      if (a.duty_start_date <= today && a.duty_end_date >= today) {
        status = 'On-duty';
        currentAssign = a;
        break;
      } else if (a.duty_start_date > today && status !== 'On-duty') {
        status = 'Next Month';
        currentAssign = a;
      }
    }

    return {
      ...coord,
      status,
      currentAssign,
    };
  });

  const handleAssignDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUser || !assignStart || !assignEnd) {
      showToast('Please select coordinator and dates', true);
      return;
    }
    if (assignStart > assignEnd) {
      showToast('Duty start date must be before or on duty end date', true);
      return;
    }
    setIsAssigning(true);
    const ok = await assignDuty(assignUser, assignStart, assignEnd);
    setIsAssigning(false);
    if (ok) {
      setAssignStart('');
      setAssignEnd('');
    }
  };

  const handleDeleteCoord = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate ${name}? Their future assignments will be removed, but all historic audit logs and past records will be preserved.`
      )
    ) {
      return;
    }
    await deleteCoordinator(id);
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
              Administrator Control &middot; Hostel Duty Roster
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
              Manage Coordinators
            </h2>
            <p className="text-sm text-[#59635e] mt-1">
              Monitor active coordinators and assign monthly mess duty schedules. Deleting a coordinator revokes system privileges while preserving historic journal audit lines.
            </p>
          </div>
          <button
            onClick={() => navigateTo('create-account')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white border border-[#e5e0d5] hover:bg-[#f5f2eb] text-xs font-semibold text-[#193d2c] self-start sm:self-auto shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Create New Account</span>
          </button>
        </div>
      </div>

      {/* Active Coordinators Table */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-3 pb-2 border-b border-[#e5e0d5]">
          Registered Mess Coordinators
        </h3>

        {statusRows.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#59635e]">
            No coordinators registered yet. Provision new coordinator accounts using the{' '}
            <button
              onClick={() => navigateTo('create-account')}
              className="font-semibold text-[#193d2c] underline cursor-pointer"
            >
              Create Account
            </button>{' '}
            menu.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-[#131715] font-bold text-[#59635e] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Coordinator Name</th>
                  <th className="py-2.5 px-3">Duty Status</th>
                  <th className="py-2.5 px-3">Active / Scheduled Duty Window</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e0d5] font-mono-fig text-[#131715]">
                {statusRows.map((coord) => {
                  const dates = coord.currentAssign
                    ? `${coord.currentAssign.duty_start_date} &rarr; ${coord.currentAssign.duty_end_date}`
                    : 'No assignment';

                  return (
                    <tr key={coord.id} className="hover:bg-[#193d2c]/5 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#131715]">
                        {coord.name}
                        {coord.email && (
                          <span className="block text-[11px] font-normal text-[#59635e] font-mono-fig">
                            {coord.email}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {coord.status === 'On-duty' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f0ea] text-[#193d2c] border border-[#193d2c]/30">
                            On-duty
                          </span>
                        )}
                        {coord.status === 'Next Month' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#eef4ff] text-[#2c5282] border border-[#2c5282]/30">
                            Next Month
                          </span>
                        )}
                        {coord.status === 'Off-duty' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f5f2eb] text-[#59635e] border border-[#e5e0d5]">
                            Off-duty
                          </span>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3"
                        dangerouslySetInnerHTML={{ __html: dates }}
                      />
                      <td className="py-2.5 px-3 text-right font-sans">
                        <button
                          onClick={() => handleDeleteCoord(coord.id, coord.name)}
                          className="px-2.5 py-1 text-xs text-[#942426] hover:bg-[#faeaea] border border-[#942426]/30 rounded-sm transition-colors cursor-pointer"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Duty Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Assign Duty Form */}
        <div className="md:col-span-7 bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)] space-y-3">
          <div className="flex items-center gap-2 text-[#193d2c]">
            <Calendar size={18} />
            <h3 className="font-serif text-base font-bold text-[#131715]">
              Assign Duty Period
            </h3>
          </div>

          <form onSubmit={handleAssignDuty} className="space-y-3">
            <div>
              <label
                htmlFor="assign-user"
                className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
              >
                Select Coordinator
              </label>
              <select
                id="assign-user"
                required
                value={assignUser}
                onChange={(e) => setAssignUser(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
              >
                <option value="">Select coordinator...</option>
                {activeCoordinators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email || c.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="assign-start"
                  className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
                >
                  Duty Start Date
                </label>
                <input
                  type="date"
                  id="assign-start"
                  required
                  value={assignStart}
                  onChange={(e) => setAssignStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                />
              </div>

              <div>
                <label
                  htmlFor="assign-end"
                  className="block text-xs font-semibold text-[#59635e] uppercase tracking-wider mb-1"
                >
                  Duty End Date
                </label>
                <input
                  type="date"
                  id="assign-end"
                  required
                  value={assignEnd}
                  onChange={(e) => setAssignEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-fig bg-white border border-[#e5e0d5] rounded-sm text-[#131715] focus:outline-none focus:ring-1 focus:ring-[#193d2c]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#59635e]">
              Coordinators gain editing rights on Duty Start Date, followed by an automatic 15-day post-duty grace window for finalizing monthly accounts.
            </p>

            <button
              type="submit"
              disabled={isAssigning}
              className="w-full py-2 px-3 text-xs font-semibold rounded-sm bg-[#193d2c] text-[#f7f9f7] hover:bg-[#122e21] active:scale-[0.99] transition-all shadow-xs cursor-pointer"
            >
              {isAssigning ? 'Saving Duty...' : 'Save Duty Assignment'}
            </button>
          </form>
        </div>

        {/* Duty Guidelines & Account Management Notice */}
        <div className="md:col-span-5 bg-[#fbfaf7] border border-[#e5e0d5] rounded-sm p-4 sm:p-5 space-y-3.5 text-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[#193d2c] font-bold">
              <Shield size={16} />
              <span className="font-serif text-sm">Duty Rotation Policies</span>
            </div>
            <p className="text-[#59635e] leading-relaxed">
              Coordinators automatically receive active data entry and log editing privileges for their assigned monthly term starting on the <strong>Duty Start Date</strong>.
            </p>
            <p className="text-[#59635e] leading-relaxed">
              An automated <strong>15-day grace period</strong> follows the conclusion of the duty window to allow reconciling monthly bills and submitting the closing stock register.
            </p>
          </div>

          <div className="pt-3 border-t border-[#e5e0d5]">
            <span className="font-semibold text-[#131715] block mb-1">
              Account Provisioning
            </span>
            <p className="text-[#59635e] mb-2 leading-relaxed">
              New coordinator credentials and login accounts are created via the centralized administrator portal.
            </p>
            <button
              type="button"
              onClick={() => navigateTo('create-account')}
              className="text-[#193d2c] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Go to Create Account Page</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Assignment History Log */}
      <div className="bg-white border border-[#e5e0d5] rounded-sm p-4 sm:p-5 shadow-[0_1px_3px_rgba(19,23,21,0.03)]">
        <h3 className="font-serif text-base font-bold text-[#131715] mb-1">
          Historical Duty Log
        </h3>
        <p className="text-xs text-[#59635e] mb-3">
          A permanent record of every duty tenure in the register (including past and inactive coordinators).
        </p>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-[#131715] font-bold text-[#59635e] uppercase tracking-wider">
                <th className="py-2 px-3">Coordinator</th>
                <th className="py-2 px-3">Duty Start</th>
                <th className="py-2 px-3">Duty End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e0d5] font-mono-fig">
              {assignments.map((asgn) => {
                const name = profileMap[asgn.user_id]?.name || 'Unknown / Deleted';
                return (
                  <tr key={asgn.id} className="hover:bg-[#193d2c]/5 transition-colors">
                    <td className="py-2 px-3 font-sans font-medium text-[#131715]">
                      {name}
                    </td>
                    <td className="py-2 px-3 text-[#59635e]">{asgn.duty_start_date}</td>
                    <td className="py-2 px-3 text-[#59635e]">{asgn.duty_end_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
