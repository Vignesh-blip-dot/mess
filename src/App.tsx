import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { SignInPage } from './components/SignInPage';
import { DashboardView } from './components/DashboardView';
import { IngredientsView } from './components/IngredientsView';
import { PurchasesView } from './components/PurchasesView';
import { LogPurchaseView } from './components/LogPurchaseView';
import { LogUsageView } from './components/LogUsageView';
import { StockAdjustmentView } from './components/StockAdjustmentView';
import { AdjustmentRequestsView } from './components/AdjustmentRequestsView';
import { AddIngredientView } from './components/AddIngredientView';
import { DailyUsageView } from './components/DailyUsageView';
import { HeadcountView } from './components/HeadcountView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { AuditLogView } from './components/AuditLogView';
import { CoordinatorsView } from './components/CoordinatorsView';
import { CreateAccountView } from './components/CreateAccountView';
import { QuickActionModal } from './components/QuickActionModal';
import { ToastNotification } from './components/ToastNotification';
import { DatabaseStatusModal } from './components/DatabaseStatusModal';

function MainAppShell() {
  const { profile, currentPage, isSupabaseLive } = useApp();

  // Gate access behind authentication: users must sign in first
  if (!profile) {
    return (
      <>
        <SignInPage />
        <DatabaseStatusModal />
        <ToastNotification />
      </>
    );
  }

  const renderActiveView = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardView key="dashboard" />;
      case 'purchases':
        return <PurchasesView key="purchases" />;
      case 'ingredients':
        return <IngredientsView key="ingredients" />;
      case 'log-purchase':
        return <LogPurchaseView key="log-purchase" />;
      case 'log-usage':
        return <LogUsageView key="log-usage" />;
      case 'adjustment':
        return <StockAdjustmentView key="adjustment" />;
      case 'adjustment-requests':
        return <AdjustmentRequestsView key="adjustment-requests" />;
      case 'add-ingredient':
        return <AddIngredientView key="add-ingredient" />;
      case 'daily-usage':
        return <DailyUsageView key="daily-usage" />;
      case 'headcount':
        return <HeadcountView key="headcount" />;
      case 'report':
        return <MonthlyReportView key="report" />;
      case 'audit-log':
        return <AuditLogView key="audit-log" />;
      case 'coordinators':
        return <CoordinatorsView key="coordinators" />;
      case 'create-account':
        return <CreateAccountView key="create-account" />;
      default:
        return <DashboardView key="default" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#131715] flex flex-col lg:flex-row antialiased">
      {/* Navigation (Desktop rail + Mobile top header & bottom nav) */}
      <Navigation />

      <div className="flex-1 flex flex-col min-w-0">
        {!isSupabaseLive && (
          <div className="bg-[#fff9e6] border-b border-[#e5d5b0] px-4 py-2 text-center text-xs text-[#8a631e] font-medium flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#d97706] animate-pulse"></span>
            <span>Local Offline Mode — changes are saved safely to your device and will sync automatically when connected to Supabase.</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-5 sm:px-8 sm:py-8 pb-28 lg:pb-12 max-w-6xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {renderActiveView()}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals & Overlays */}
      <QuickActionModal />
      {profile.role === 'admin' && <DatabaseStatusModal />}
      <ToastNotification />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}
