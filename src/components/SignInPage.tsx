import React, { useState } from 'react';
import {
  BookOpen,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function SignInPage() {
  const { loginWithSupabase, isLoading } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithSupabase(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Invalid credentials or user not found.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col justify-center items-center px-4 py-12 antialiased">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-md bg-[#193d2c] text-[#f7f9f7] mb-4 shadow-sm">
            <BookOpen size={28} />
          </div>
          <span className="font-mono-fig text-[11px] uppercase tracking-widest text-[#193d2c] font-bold block mb-1">
            JNTUGV College of Engineering
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#131715] tracking-tight">
            Hostel Mess Ledger
          </h1>
          <p className="text-xs sm:text-sm text-[#59635e] mt-1.5 max-w-xs mx-auto">
            Provisions register, daily stock accounting &amp; expenditure tracking
          </p>
        </div>

        {/* Main Sign In Card */}
        <div className="bg-white border border-[#e5e0d5] rounded-md shadow-[0_2px_12px_rgba(19,23,21,0.05)] overflow-hidden">
          <div className="p-6 sm:p-7">
            <div className="mb-5 pb-3 border-b border-[#e5e0d5]">
              <h2 className="font-serif text-lg font-bold text-[#131715]">
                Sign In to Mess Ledger
              </h2>
              <p className="text-xs text-[#59635e] mt-0.5">
                Enter your authorized credentials to access stock and register logs.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-sm bg-[#faeaea] border border-[#f0c2c2] text-[#942426] text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#131715] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59635e]">
                    <Mail size={15} />
                  </div>
                  <input
                    id="signin-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@college.edu"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm bg-[#fcfbf9] border border-[#d5cebf] rounded-sm focus:outline-none focus:border-[#193d2c] focus:ring-1 focus:ring-[#193d2c] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#131715]">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#59635e]">
                    <Lock size={15} />
                  </div>
                  <input
                    id="signin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
              </div>

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-[#193d2c] hover:bg-[#122e21] text-white text-sm font-semibold rounded-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In to Register</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#e5e0d5] text-center">
              <p className="text-[11px] text-[#59635e]">
                Don't have an account? Contact the <span className="font-semibold text-[#131715]">System Administrator</span> to request authorized access.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Access Information */}
        <div className="mt-5 text-center text-xs text-[#59635e] flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-[#193d2c]" />
          <span>Role-Based Access Control • Managed by Administration</span>
        </div>
      </div>
    </div>
  );
}
