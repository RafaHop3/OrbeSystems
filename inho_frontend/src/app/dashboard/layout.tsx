'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ShieldCheck, Crown, Building2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useAuth } from '@/lib/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, activeBusinessId, isLoading } = useAuth();
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!auth.isAuthenticated() || auth.isExpired() || !user) {
      auth.clear();
      router.replace('/login');
    } else {
      if (['admin', 'super_admin'].includes(user.role) && !activeBusinessId) {
        router.replace('/onboarding');
      } else {
        setCanRender(true);
      }
    }
  }, [router, user, activeBusinessId, isLoading]);

  if (!canRender) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-9 h-9 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Executive Top Bar (Desktop & Mobile) */}
        <header className="flex items-center justify-between px-6 py-3 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-20 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 text-[#475569] hover:text-[#0F172A] bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] hover:border-[#B8860B] transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F1F5F9] to-[#F1F5F9] border border-slate-200 text-[#0F172A] text-[10px] font-extrabold uppercase tracking-widest">
                <Crown size={11} className="text-[#B8860B]" />
                Padrão Executivo Ouro
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] pl-2 border-l border-[#E2E8F0]">
                <Building2 size={13} className="text-[#B8860B]" />
                {user?.full_name || 'Instituição Cooperativa'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] text-[#475569] font-medium">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Governança Multi-Tenant & Open Finance BACEN</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Wrapper */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {children}
        </main>
      </div>
    </div>
  );
}
