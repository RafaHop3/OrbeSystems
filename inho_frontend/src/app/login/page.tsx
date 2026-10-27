'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, Users, Crown, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { addLoginLog } from '@/lib/loginLog';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [loginMode, setLoginMode] = useState<'selection' | 'colaborador' | 'proprietario'>('selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const ssoToken = searchParams.get('token') || searchParams.get('sso_token');
    if (ssoToken) {
      localStorage.setItem('inho_access_token', ssoToken);
      router.push('/dashboard');
    }
  }, [searchParams, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    if (showMfa && (!mfaCode || mfaCode.length !== 6)) {
      setError('Digite o código de 6 dígitos do seu Authenticator.');
      return;
    }
    setLoading(true);
    setError('');
    const payload = { email: form.email, password: form.password, ...(showMfa && mfaCode ? { mfa_code: mfaCode } : {}) };
    try {
      const loggedUser = await login(payload);
      await addLoginLog({ timestamp: new Date().toISOString(), payload, result: loggedUser });
      if (loggedUser && (loggedUser.role === 'admin' || loggedUser.role === 'super_admin')) {
        router.push('/admin');
      } else if (loggedUser && loggedUser.role === 'operator') {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await addLoginLog({ timestamp: new Date().toISOString(), payload, error: err });
      if (msg.includes('MFA_REQUIRED') || msg.includes('2FA')) {
        setShowMfa(true);
        setError('Autenticação de 2 fatores ativada! Digite o código do seu aplicativo Authenticator.');
      } else {
        setError(msg || 'Credenciais inválidas ou acesso não autorizado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] grid-bg flex flex-col items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Ambient Executive Gold Lights */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/12 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl animate-float-delayed" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 animate-fade-in flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] border border-slate-200 text-[#8B6508] text-[10px] font-extrabold uppercase tracking-widest mb-4 shadow-sm">
            <Crown size={12} className="text-[#B8860B]" />
            Padrão Executivo Ouro
          </div>
          <div className="w-16 h-16 rounded-2xl bg-inho-gold-gradient shadow-inho-gold flex items-center justify-center mb-4 border border-slate-300 relative">
            <span className="font-sans font-black text-3xl text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">I</span>
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] mb-1.5 tracking-tight">
            Portal <span className="text-shimmer">INHO</span>
          </h1>
          <p className="text-[#64748B] text-xs font-bold tracking-widest uppercase">
            Plataforma Executiva de Gestão & Governança
          </p>
        </div>

        {/* Executive Porcelain Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#9A6F0B] via-[#D4AF37] to-[#9A6F0B]" />

          {loginMode === 'selection' ? (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-[#475569] text-sm font-medium">Selecione o seu perfil executivo de acesso para entrar no sistema.</p>
              </div>

              {/* Path 1: Proprietário / Diretoria */}
              <button
                onClick={() => setLoginMode('proprietario')}
                className="group w-full p-5 bg-[#F1F5F9] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#D4AF37] rounded-2xl transition-all flex items-start gap-4 text-left shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F1F5F9] to-[#F3E5AB] border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={22} className="text-[#8B6508]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#0F172A] font-extrabold text-sm tracking-wide mb-1">Proprietário / Admin</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Acesso administrativo e diretoria focado em governança, finanças e visão consolidada.
                  </p>
                </div>
              </button>

              {/* Path 2: Equipe / Sub-usuários */}
              <button
                onClick={() => setLoginMode('colaborador')}
                className="group w-full p-5 bg-[#F1F5F9] hover:bg-emerald-50/70 border border-[#E2E8F0] hover:border-emerald-400 rounded-2xl transition-all flex items-start gap-4 text-left shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Users size={22} className="text-emerald-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#0F172A] font-extrabold text-sm tracking-wide mb-1">Equipe / Colaborador</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Acesso operacional para colaboradores e operadores vinculados à instituição.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-4">
                <button
                  onClick={() => setLoginMode('selection')}
                  className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:border-[#B8860B] transition-colors font-bold"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-[#0F172A] font-extrabold text-sm">
                    {loginMode === 'proprietario' ? 'Entrar como Proprietário' : 'Entrar como Colaborador'}
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    {loginMode === 'proprietario'
                      ? 'Gestão Financeira, Cooperativa e Administrativa'
                      : 'Use suas credenciais cadastradas pelo gestor.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate>
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[#475569] text-[11px] font-extrabold uppercase tracking-wider pl-1">E-mail de Acesso</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Seu e-mail institucional"
                    className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0F172A] text-sm focus:outline-none focus:border-[#B8860B] focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="text-[#475569] text-[11px] font-extrabold uppercase tracking-wider pl-1">Senha de Segurança</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Sua senha secreta"
                    className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0F172A] text-sm focus:outline-none focus:border-[#B8860B] focus:bg-white transition-colors"
                  />
                </div>
                {showMfa && (
                  <div className="space-y-1.5 pt-1 animate-fade-in">
                    <label className="text-[#8B6508] text-[11px] font-extrabold uppercase tracking-wider pl-1 flex items-center gap-1">
                      <ShieldCheck size={14} /> Código 2FA Authenticator (6 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center text-xl font-mono tracking-[0.4em] font-black bg-[#F1F5F9] border border-[#D4AF37] rounded-xl py-3 text-[#0F172A] focus:outline-none focus:border-[#B8860B]"
                    />
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-[#9A6F0B] via-[#C59B27] to-[#9A6F0B] text-white font-extrabold text-sm rounded-xl hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-inho-gold disabled:opacity-50"
                  >
                    {loading ? 'Validando Acesso...' : 'Acessar Painel Executivo'}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* OrBrick WhatsApp Direct Onboarding Banner */}
        <div className="mt-6 text-center animate-fade-in">
          <p className="text-xs text-[#64748B] mb-2 font-medium">
            Deseja credenciar sua cooperativa ou assinar o INHO?
          </p>
          <a
            href="https://wa.me/5551981598760?text=Ol%C3%A1%21%20Gostaria%20de%20assinar%20e%20ativar%20o%20ORBE%20INHO%20para%20minha%20empresa%2Fcooperativa."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-800 hover:text-emerald-700 shadow-sm transition-all"
          >
            <MessageSquare size={15} className="text-emerald-600" />
            <span>Falar com o OrBrick no WhatsApp</span>
            <ArrowRight size={13} className="text-slate-400" />
          </a>
        </div>

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[#64748B] text-[11px] font-semibold">
          <ShieldCheck size={14} className="text-[#B8860B]" />
          <span className="uppercase tracking-widest">Ambiente Institucional Criptografado • Orbe Systems</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-[#8B6508] font-bold">Carregando Portal Executivo...</div>}>
      <LoginContent />
    </Suspense>
  );
}
