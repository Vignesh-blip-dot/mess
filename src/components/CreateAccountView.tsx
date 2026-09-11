import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Lock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export function CreateAccountView() {
  const { profile, allProfiles, adminCreateAccount, isLoading } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('coordinator');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Guard: Only administrators can access this page
  if (profile?.role !== 'admin') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 max-w-xl mx-auto text-center"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-[#faeaea] text-[#942426] flex items-center justify-center mb-4">
          <ShieldAlert size={28} />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#131715] mb-2">
          Administrator Access Required
        </h2>
        <p className="text-sm text-[#59635e] mb-6">
          Account creation is restricted strictly to System Administrators. Your current profile role ({profile?.role || 'Guest'}) does not have permission to view or create user accounts.
        </p>
      </motion.div>
    );
  }

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = await adminCreateAccount({
      name: name.trim(),
      email: email.trim(),
      pass: password,
      role,
    });
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMsg(`Account successfully created for ${name.trim()} (${role}).`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('coordinator');
    } else {
      setErrorMsg(result.error || 'Failed to create user account. Please try again.');
    }
  };

  const filteredProfiles = allProfiles.filter((p) => {
    if (roleFilter === 'all') return true;
    return p.role === roleFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {/* Page Header */}
      <div className="border-b border-[#e5e0d5] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="font-mono-fig text-[11px] uppercase tracking-wider text-[#193d2c] font-bold block mb-1">
              Administration &amp; Access Control
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715]">
              Create User Account
            </h1>
            <p className="text-xs sm:text-sm text-[#59635e] mt-1">
              Provision login credentials for mess coordinators, hostel incharges, and administrators.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#193d2c]/10 text-[#193d2c] text-xs font-semibold self-start sm:self-auto border border-[#193d2c]/20">
            <ShieldCheck size={14} />
            <span>Admin Authorization Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Account Creation Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-[#e5e0d5] rounded-md shadow-xs p-6 sm:p-7">
            <h2 className="font-serif text-lg font-bold text-[#131715] mb-1 flex items-center gap-2">
              <UserPlus size={18} className="text-[#193d2c]" />
              <span>New Account Details</span>
            </h2>
            <p className="text-xs text-[#59635e] mb-6">
              Create an authenticated login. Once created, the user can immediately sign in with their email and password.
            </p>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-sm bg-[#faeaea] border border-[#f0c2c2] text-[#942426] text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-5 p-3 rounded-sm bg-[#eaf4ec] border border-[#c1dec6] text-[#193d2c] text-xs flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#131715] mb-1.5">
                  Full Name <span className="text-[#942426]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59635e]">
                    <User size={15} />
                  </div>
                  <input
                    id="admin-create-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. K. Ramanathan"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#fcfbf9] border border-[#d5cebf] rounded-sm focus:outline-none focus:border-[#193d2c] focus:ring-1 focus:ring-[#193d2c] transition-colors"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-[#131715] mb-1.5">
                  Email Address <span className="text-[#942426]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59635e]">
                    <Mail size={15} />
                  </div>
                  <input
                    id="admin-create-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@college.edu"
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#fcfbf9] border border-[#d5cebf] rounded-sm focus:outline-none focus:border-[#193d2c] focus:ring-1 focus:ring-[#193d2c] transition-colors"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#131715] mb-1.5">
                  Assigned Institutional Role <span className="text-[#942426]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'coordinator' as UserRole,
                      label: 'Coordinator',
                      desc: 'Stock entry & daily logs',
                    },
                    {
                      id: 'incharge' as UserRole,
                      label: 'Hostel Incharge',
                      desc: 'Oversight & inspection',
                    },
                    {
                      id: 'admin' as UserRole,
                      label: 'Administrator',
                      desc: 'Full system control',
                    },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`p-3 rounded-sm border text-left transition-all cursor-pointer ${
                        role === r.id
                          ? 'bg-[#193d2c] text-white border-[#193d2c] shadow-xs'
                          : 'bg-[#fcfbf9] text-[#131715] border-[#d5cebf] hover:bg-[#f5f2eb]'
                      }`}
                    >
                      <span className="block text-xs font-bold mb-0.5">
                        {r.label}
                      </span>
                      <span
                        className={`block text-[11px] leading-tight ${
                          role === r.id ? 'text-white/80' : 'text-[#59635e]'
                        }`}
                      >
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Initial Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#131715]">
                    Initial Password <span className="text-[#942426]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-medium text-[#193d2c] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound size={12} />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59635e]">
                    <Lock size={15} />
                  </div>
                  <input
                    id="admin-create-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full pl-9 pr-10 py-2 text-sm bg-[#fcfbf9] border border-[#d5cebf] rounded-sm focus:outline-none focus:border-[#193d2c] focus:ring-1 focus:ring-[#193d2c] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#59635e] hover:text-[#131715] cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-[#59635e] mt-1">
                  Share this password with the user. They will use it along with their email to sign in.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  id="admin-create-account-submit"
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full py-2.5 px-4 bg-[#193d2c] hover:bg-[#122e21] text-white text-sm font-semibold rounded-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Create &amp; Provision User Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Role Permissions & Guidelines */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#fbfaf7] border border-[#e5e0d5] rounded-md p-5 space-y-4">
            <h3 className="font-serif text-sm font-bold text-[#131715] flex items-center gap-2">
              <Shield size={16} className="text-[#193d2c]" />
              <span>Role Permissions Matrix</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white border border-[#e5e0d5] rounded-sm">
                <span className="font-bold text-[#131715] block mb-1">
                  Mess Coordinator
                </span>
                <p className="text-[#59635e] leading-relaxed">
                  Permitted to log purchases, record daily meal stock usage, and submit stock adjustments during their designated duty assignment windows.
                </p>
              </div>

              <div className="p-3 bg-white border border-[#e5e0d5] rounded-sm">
                <span className="font-bold text-[#131715] block mb-1">
                  Hostel Incharge
                </span>
                <p className="text-[#59635e] leading-relaxed">
                  Supervisory read-only inspection access to all stock balances, transaction journals, daily headcount, and monthly expenditure reports.
                </p>
              </div>

              <div className="p-3 bg-white border border-[#e5e0d5] rounded-sm">
                <span className="font-bold text-[#131715] block mb-1">
                  System Administrator
                </span>
                <p className="text-[#59635e] leading-relaxed">
                  Unrestricted access across all register functions, ingredient catalog management, coordinator duty assignments, audit trail, and user provisioning.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Existing User Accounts Directory */}
      <div className="bg-white border border-[#e5e0d5] rounded-md shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e5e0d5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-[#131715] flex items-center gap-2">
              <Users size={17} className="text-[#193d2c]" />
              <span>Authorized User Directory ({allProfiles.length})</span>
            </h3>
            <p className="text-xs text-[#59635e] mt-0.5">
              All active staff and supervisory profiles configured in the register.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {(['all', 'coordinator', 'incharge', 'admin'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRoleFilter(f)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-sm border transition-colors cursor-pointer capitalize ${
                  roleFilter === f
                    ? 'bg-[#193d2c] text-white border-[#193d2c]'
                    : 'bg-[#fcfbf9] text-[#59635e] border-[#d5cebf] hover:bg-[#f5f2eb]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#fbfaf7] border-b border-[#e5e0d5] text-[#59635e] font-semibold">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e0d5]">
              {filteredProfiles.map((p) => {
                const isCurrent = p.id === profile?.id;
                return (
                  <tr key={p.id} className="hover:bg-[#fbfaf7]/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#131715]">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#193d2c]/10 text-[#193d2c] font-bold">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-fig text-[#59635e]">
                      {p.email || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                          p.role === 'admin'
                            ? 'bg-[#193d2c] text-white'
                            : p.role === 'incharge'
                            ? 'bg-[#2b4c7e] text-white'
                            : 'bg-[#f5f2eb] border border-[#d5cebf] text-[#131715]'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#193d2c]">
                        <UserCheck size={13} />
                        <span>Active</span>
                      </span>
                    </td>
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
