import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  MinusCircle,
  Sliders,
  Plus,
  CalendarDays,
  Users,
  FileText,
  ShieldCheck,
  UserCheck,
  UserPlus,
  LogOut,
  Menu,
  X,
  Clock,
  BookOpen,
  Database,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageId } from '../types';

interface NavItemDef {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: string[];
  needs?: 'stock' | 'full';
  badge?: string;
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'incharge', 'coordinator'] },
  { id: 'ingredients', label: 'Ingredients & Stock', icon: Package, roles: ['admin', 'incharge', 'coordinator'] },
  { id: 'log-purchase', label: 'Log a Purchase', icon: PlusCircle, roles: ['admin', 'coordinator'], needs: 'stock' },
  { id: 'log-usage', label: 'Log Meal Usage', icon: MinusCircle, roles: ['admin', 'coordinator'], needs: 'stock' },
  { id: 'adjustment', label: 'Stock Adjustment', icon: Sliders, roles: ['admin', 'coordinator'], needs: 'stock' },
  { id: 'add-ingredient', label: 'Add Ingredient', icon: Plus, roles: ['admin', 'coordinator'], needs: 'full' },
  { id: 'daily-usage', label: 'Daily Stock Usage', icon: CalendarDays, roles: ['admin', 'incharge', 'coordinator'] },
  { id: 'headcount', label: 'Daily Headcount', icon: Users, roles: ['admin', 'incharge', 'coordinator'] },
  { id: 'report', label: 'Monthly Report', icon: FileText, roles: ['admin', 'incharge', 'coordinator'] },
  { id: 'audit-log', label: 'Audit Log', icon: ShieldCheck, roles: ['admin', 'incharge', 'coordinator'] },
  { id: 'coordinators', label: 'Manage Coordinators', icon: UserCheck, roles: ['admin'] },
  { id: 'create-account', label: 'Create Account', icon: UserPlus, roles: ['admin'] },
];

export function Navigation() {
  const {
    profile,
    accessLevel,
    roleLabel,
    currentPage,
    navigateTo,
    signOut,
    hasStockEditAccess,
    hasFullEditAccess,
    setQuickActionOpen,
    setDatabaseModalOpen,
    credentialSource,
  } = useApp();

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const visibleNav = ALL_NAV_ITEMS.filter((item) => {
    if (!profile) return item.id === 'dashboard' || item.id === 'ingredients';
    if (!item.roles.includes(profile.role)) return false;
    if (item.needs === 'stock' && profile.role === 'coordinator' && !hasStockEditAccess) return false;
    if (item.needs === 'full' && profile.role === 'coordinator' && !hasFullEditAccess) return false;
    return true;
  });

  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <>
      {/* ================= DESKTOP SIDEBAR RAIL ================= */}
      <aside
        id="desktop-sidebar"
        className="hidden lg:flex w-64 flex-col shrink-0 border-r border-[#e5e0d5] bg-[#ffffff] sticky top-0 h-screen z-20 shadow-[1px_0_4px_rgba(19,23,21,0.02)]"
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#e5e0d5] bg-[#fbfaf7]">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-sm bg-[#193d2c] text-[#f7f9f7] flex items-center justify-center shadow-xs">
              <BookOpen size={17} />
            </div>
            <div>
              <span className="font-mono-fig text-[10px] uppercase tracking-wider text-[#193d2c] font-bold block leading-tight">
                Hostel Mess Ledger
              </span>
              <h1 className="font-serif text-lg font-bold text-[#131715] leading-tight">
                Provisions Register
              </h1>
            </div>
          </div>
          <div className="text-[11px] text-[#59635e] flex items-center gap-1.5 mt-2 bg-[#f5f2eb] border border-[#e5e0d5]/60 px-2.5 py-1 rounded-sm">
            <Clock size={12} className="text-[#193d2c]" />
            <span className="font-mono-fig">{formattedDate}</span>
            <span className="font-mono-fig text-[#193d2c] font-semibold ml-auto">{formattedTime}</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-[13.5px] font-medium transition-all text-left group ${
                  isActive
                    ? 'bg-[#193d2c] text-[#f7f9f7] shadow-xs font-semibold'
                    : 'text-[#131715] hover:bg-[#193d2c]/5 active:bg-[#e5e0d5]/50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={16}
                    className={isActive ? 'text-[#f7f9f7]' : 'text-[#59635e] group-hover:text-[#131715]'}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="active-pill-dot"
                    className="w-1.5 h-1.5 rounded-full bg-[#f7f9f7]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile card */}
        <div className="p-3.5 border-t border-[#e5e0d5] bg-[#fbfaf7]">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#131715] block truncate">
                {profile ? profile.name : 'Guest Reader'}
              </span>
              <span className="text-[11px] text-[#59635e] block leading-tight truncate">
                {roleLabel}
              </span>
            </div>
            {accessLevel === 'grace' && (
              <span className="text-[9px] font-mono-fig px-1.5 py-0.5 rounded bg-[#faf3e8] text-[#9e743a] border border-[#e7d5b8] font-bold uppercase">
                Grace
              </span>
            )}
          </div>

          {profile?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setDatabaseModalOpen(true)}
              className={`w-full mb-2 px-2 py-1.5 text-[11px] font-medium border rounded-sm flex items-center justify-between transition-colors cursor-pointer ${
                credentialSource === 'fallback'
                  ? 'bg-[#faeaea] border-[#f0c2c2] text-[#942426] hover:bg-[#f6dcdc]'
                  : 'bg-[#f5f2eb] border-[#e5e0d5] text-[#193d2c] hover:bg-[#e6f0ea]'
              }`}
              title="Click to check Supabase connection & diagnostics (Admin only)"
            >
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <Database size={12} className={credentialSource === 'fallback' ? 'text-[#942426]' : 'text-[#193d2c]'} />
                <span className="truncate">
                  {credentialSource === 'fallback' ? 'Default DB (Setup)' : 'Database Status'}
                </span>
              </div>
              <span className="text-[9px] font-mono-fig uppercase tracking-wider font-bold shrink-0 ml-1">
                {credentialSource === 'env' ? '.env' : credentialSource === 'custom' ? 'Custom' : 'Admin'}
              </span>
            </button>
          )}

          <button
            id="signout-desktop-btn"
            onClick={signOut}
            className="w-full px-2 py-1.5 text-xs font-medium bg-[#ffffff] border border-[#e5e0d5] hover:bg-[#faeaea] hover:text-[#942426] text-[#59635e] rounded-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Sign out of register"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ================= MOBILE STICKY TOP HEADER ================= */}
      <header
        id="mobile-top-header"
        className="lg:hidden sticky top-0 z-30 bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e5e0d5] px-4 py-2.5 flex items-center justify-between shadow-[0_1px_3px_rgba(19,23,21,0.03)]"
      >
        <div className="flex items-center gap-2.5">
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 -ml-1 rounded flex items-center justify-center text-[#131715] active:bg-[#f5f2eb] transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu size={20} />
          </button>
          <div
            onClick={() => navigateTo('dashboard')}
            className="cursor-pointer"
          >
            <span className="font-mono-fig text-[9px] uppercase tracking-wider text-[#193d2c] font-bold block leading-none">
              Hostel Ledger
            </span>
            <span className="font-serif text-base font-bold text-[#131715] leading-tight block">
              Provisions Register
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="mobile-signout-btn"
            onClick={signOut}
            className="flex items-center gap-1 text-xs bg-[#f5f2eb] border border-[#e5e0d5] px-2.5 py-1.5 rounded-full text-[#131715] font-medium active:bg-[#e5e0d5]"
            title="Sign out of register"
          >
            <LogOut size={13} className="text-[#942426]" />
            <span className="max-w-[85px] truncate font-medium">{profile?.name.split(' ')[0] || 'User'}</span>
          </button>
        </div>
      </header>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e5e0d5] px-2 py-1 pb-safe flex items-center justify-around shadow-[0_-2px_8px_rgba(19,23,21,0.04)]"
      >
        {/* 1. Dashboard */}
        <button
          id="mobile-nav-dashboard"
          onClick={() => navigateTo('dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-lg transition-colors relative ${
            currentPage === 'dashboard' ? 'text-[#193d2c]' : 'text-[#59635e]'
          }`}
        >
          <LayoutDashboard size={20} strokeWidth={currentPage === 'dashboard' ? 2.3 : 1.8} />
          <span className="text-[10px] mt-1 font-medium leading-none">Overview</span>
          {currentPage === 'dashboard' && (
            <motion.div
              layoutId="mobile-nav-indicator"
              className="absolute -top-1 w-6 h-0.5 bg-[#193d2c] rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>

        {/* 2. Stock */}
        <button
          id="mobile-nav-stock"
          onClick={() => navigateTo('ingredients')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-lg transition-colors relative ${
            currentPage === 'ingredients' ? 'text-[#193d2c]' : 'text-[#59635e]'
          }`}
        >
          <Package size={20} strokeWidth={currentPage === 'ingredients' ? 2.3 : 1.8} />
          <span className="text-[10px] mt-1 font-medium leading-none">Stock</span>
          {currentPage === 'ingredients' && (
            <motion.div
              layoutId="mobile-nav-indicator"
              className="absolute -top-1 w-6 h-0.5 bg-[#193d2c] rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>

        {/* 3. Center Quick Action Trigger */}
        {hasStockEditAccess && (
          <button
            id="mobile-quick-action-fab"
            onClick={() => setQuickActionOpen(true)}
            className="flex flex-col items-center justify-center -mt-4 w-12 h-12 rounded-full bg-[#193d2c] text-[#f7f9f7] shadow-md active:scale-95 transition-transform"
            aria-label="Quick entry options"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        )}

        {/* 4. Headcount */}
        <button
          id="mobile-nav-usage"
          onClick={() => navigateTo('headcount')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-lg transition-colors relative ${
            currentPage === 'headcount' ? 'text-[#193d2c]' : 'text-[#59635e]'
          }`}
        >
          <Users size={20} strokeWidth={currentPage === 'headcount' ? 2.3 : 1.8} />
          <span className="text-[10px] mt-1 font-medium leading-none">Headcount</span>
          {currentPage === 'headcount' && (
            <motion.div
              layoutId="mobile-nav-indicator"
              className="absolute -top-1 w-6 h-0.5 bg-[#193d2c] rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>

        {/* 5. More Drawer */}
        <button
          id="mobile-nav-more"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] min-h-[48px] rounded-lg transition-colors relative text-[#59635e]"
        >
          <Menu size={20} />
          <span className="text-[10px] mt-1 font-medium leading-none">Menu</span>
        </button>
      </nav>

      {/* ================= MOBILE SLIDE-OUT DRAWER ================= */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              id="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.div
              id="mobile-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-[#ffffff] z-50 flex flex-col shadow-2xl border-r border-[#e5e0d5] lg:hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#e5e0d5] flex items-center justify-between bg-[#fbfaf7]">
                <div>
                  <span className="font-mono-fig text-[10px] uppercase tracking-wider text-[#193d2c] font-bold block">
                    Hostel Mess Ledger
                  </span>
                  <h2 className="font-serif text-lg font-bold text-[#131715]">Navigation Menu</h2>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded flex items-center justify-center text-[#59635e] hover:text-[#131715] active:bg-[#f5f2eb]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Time display */}
              <div className="px-4 py-2 border-b border-[#e5e0d5] bg-[#f5f2eb] flex items-center justify-between text-xs font-mono-fig text-[#59635e]">
                <span>{formattedDate}</span>
                <span className="font-semibold text-[#193d2c]">{formattedTime}</span>
              </div>

              {/* Drawer Menu Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {visibleNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigateTo(item.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded text-sm transition-colors text-left ${
                        isActive
                          ? 'bg-[#193d2c] text-[#f7f9f7] font-semibold'
                          : 'text-[#131715] active:bg-[#f5f2eb]'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-[#f7f9f7]' : 'text-[#59635e]'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer with Profile */}
              <div className="p-4 border-t border-[#e5e0d5] bg-[#fbfaf7]">
                <div className="mb-3">
                  <span className="text-xs font-bold text-[#131715] block">
                    {profile?.name || 'Guest'}
                  </span>
                  <span className="text-[11px] text-[#59635e] block leading-tight">
                    {roleLabel}
                  </span>
                </div>
                {profile?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      setDatabaseModalOpen(true);
                    }}
                    className={`w-full mb-2 px-2 py-2 text-xs font-medium border rounded flex items-center justify-between transition-colors cursor-pointer ${
                      credentialSource === 'fallback'
                        ? 'bg-[#faeaea] border-[#f0c2c2] text-[#942426]'
                        : 'bg-white border-[#e5e0d5] text-[#193d2c]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Database size={13} className={credentialSource === 'fallback' ? 'text-[#942426]' : 'text-[#193d2c]'} />
                      <span>Database Status</span>
                    </div>
                    <span className="text-[9px] font-mono-fig uppercase tracking-wider font-bold">
                      {credentialSource === 'env' ? '.env' : credentialSource === 'custom' ? 'Custom' : 'Admin'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    signOut();
                  }}
                  className="w-full px-2 py-2 text-xs font-medium bg-white border border-[#e5e0d5] hover:bg-[#faeaea] hover:text-[#942426] text-[#59635e] rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
