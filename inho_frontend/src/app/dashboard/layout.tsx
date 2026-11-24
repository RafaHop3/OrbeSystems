'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, ShieldCheck, Crown, Building2, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import { auth } from '@/lib/auth';
import { useAuth } from '@/lib/AuthContext';
import { authApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import OrbeAssistantRoot from '@/components/OrbeAssistantRoot';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, activeBusinessId, setActiveBusinessId, isLoading } = useAuth();
  const [canRender, setCanRender] = useState(false);

  // Modal Global de Troca de Senha no Topo do Painel
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [showPwds, setShowPwds] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!currPwd.trim() || !newPwd.trim()) {
      setPwdMsg({ type: 'err', text: 'Preencha a senha atual e a nova senha.' });
      return;
    }
    if (newPwd.trim().length < 8) {
      setPwdMsg({ type: 'err', text: 'A nova senha deve ter no mínimo 8 caracteres.' });
      return;
    }
    if (newPwd.trim() !== confPwd.trim()) {
      setPwdMsg({ type: 'err', text: 'A confirmação da nova senha não confere.' });
      return;
    }
    setPwdLoading(true);
    try {
      await authApi.changePassword(currPwd.trim(), newPwd.trim());
      setPwdMsg({ type: 'ok', text: 'Senha alterada com sucesso!' });
      setCurrPwd('');
      setNewPwd('');
      setConfPwd('');
      setTimeout(() => {
        setShowPwdModal(false);
        setPwdMsg(null);
      }, 1500);
    } catch (err: any) {
      setPwdMsg({ type: 'err', text: err?.message || 'Erro ao alterar a senha. Verifique sua senha atual.' });
    } finally {
      setPwdLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    if (!auth.isAuthenticated() || auth.isExpired() || !user) {
      auth.clear();
      router.replace('/login');
    } else {
      const userBizId = (user as any).business_id ? String((user as any).business_id) : null;
      if (!activeBusinessId && userBizId) {
        setActiveBusinessId(userBizId);
        setCanRender(true);
      } else if (['admin', 'super_admin'].includes(user.role) && !activeBusinessId) {
        router.replace('/onboarding');
      } else {
        setCanRender(true);
      }
    }
  }, [router, user, activeBusinessId, setActiveBusinessId, isLoading]);

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
                {user?.full_name || 'Instituição Corporativa'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] text-[#475569] font-medium">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Governança Multi-Tenant & Open Finance BACEN</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setPwdMsg(null);
                setShowPwdModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 hover:bg-amber-100 border border-amber-300 text-[#8B6508] font-extrabold text-[11px] uppercase tracking-wider transition-all shadow-sm"
              title="Alterar sua senha de acesso quando desejar"
            >
              <KeyRound size={13} className="text-[#B8860B]" />
              <span>Trocar Senha</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Wrapper */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {children}
        </main>
      </div>

      {/* Modal Global: Trocar Minha Senha */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#8B6508]">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wide">Trocar Minha Senha</h3>
                  <p className="text-[11px] text-[#64748B]">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPwdModal(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwdMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    pwdMsg.type === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {pwdMsg.text}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider">
                    Senha Atual
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPwds((p) => !p)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8B6508] hover:underline"
                  >
                    {showPwds ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showPwds ? 'Ocultar senhas' : 'Ver senhas'}
                  </button>
                </div>
                <input
                  type={showPwds ? 'text' : 'password'}
                  value={currPwd}
                  onChange={(e) => setCurrPwd(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#B8860B] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider block">
                  Nova Senha (mín. 8 caracteres)
                </label>
                <input
                  type={showPwds ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#B8860B] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider block">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPwds ? 'text' : 'password'}
                  value={confPwd}
                  onChange={(e) => setConfPwd(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#B8860B] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#9A6F0B] via-[#C59B27] to-[#9A6F0B] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm hover:brightness-105 disabled:opacity-50"
                >
                  {pwdLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orbe Assistant AI — Super-Operador com Poder ROOT (Universal) */}
      <OrbeAssistantRoot />
    </div>
  );
}
