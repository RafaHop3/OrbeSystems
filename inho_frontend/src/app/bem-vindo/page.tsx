'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Lock, Building2, Mail, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';

function BemVindoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = searchParams.get('session_id') || '';
  const paramEmail = searchParams.get('email') || '';
  const paramBusiness = searchParams.get('business') || '';
  const paramPlan = searchParams.get('plan') || '';

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState(paramEmail);
  const [businessName, setBusinessName] = useState(paramBusiness);
  const [phone, setPhone] = useState('');
  const [planTier, setPlanTier] = useState(paramPlan || 'INHO_PRO_IA');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) {
        setLoadingInfo(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/billing/session-info?session_id=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.email) setEmail(data.email);
          if (data.business_name) setBusinessName(data.business_name);
          if (data.phone) setPhone(data.phone);
          if (data.plan_tier) setPlanTier(data.plan_tier);
          if (data.billing_cycle) setBillingCycle(data.billing_cycle);
        }
      } catch {
        // Fallback silently if session info request fails
      } finally {
        setLoadingInfo(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/welcome-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || `cs_manual_${Date.now()}`,
          email: email.trim().toLowerCase(),
          password,
          business_name: businessName || 'Minha Empresa',
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Falha ao ativar conta. Tente novamente.');
        setSubmitting(false);
        return;
      }

      if (data.access_token) {
        auth.setAccessToken(data.access_token);
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        router.push('/login');
      }
    } catch {
      setError('Erro de conexão ao servidor. Tente novamente.');
      setSubmitting(false);
    }
  };

  const formatPlanName = (tier: string) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('ESSENCIAL')) return 'INHO Essencial (R$ 290/mês)';
    if (t.includes('ENTERPRISE') || t.includes('COOPERATIVA') || t.includes('OURO')) return 'Enterprise & Corporativo (R$ 990/mês)';
    return 'INHO Pro + Copilot IA (R$ 590/mês)';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles size={14} className="text-emerald-600" />
            <span>Assinatura Confirmada via Stripe</span>
          </div>
          <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
            Bem-vindo ao <span className="text-[#9A6F0B]">Portal INHO</span>
          </h1>
          <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider mt-1">
            Defina sua senha de Administrador para liberar seu Painel Executivo
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#E2E8F0] shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#D4AF37] to-emerald-500" />

          <div className="mb-6 p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Status da Assinatura
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                <CheckCircle2 size={12} /> Ativo &amp; Provisionado
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Building2 size={15} className="text-[#9A6F0B]" />
                <span>{businessName || 'Sua Empresa'}</span>
              </div>
              <div className="text-xs font-extrabold text-[#9A6F0B]">
                {formatPlanName(planTier)}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleActivateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-1.5">
                E-mail Principal de Acesso (Login)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@empresa.com.br"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#9A6F0B] focus:ring-1 focus:ring-[#9A6F0B] text-xs font-bold text-[#0F172A] outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Crie sua Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#9A6F0B] focus:ring-1 focus:ring-[#9A6F0B] text-xs font-bold text-[#0F172A] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#9A6F0B] focus:ring-1 focus:ring-[#9A6F0B] text-xs font-bold text-[#0F172A] outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-[#C59B27] to-emerald-600 hover:brightness-105 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Ativando Acesso...' : 'Ativar Minha Conta & Entrar no Painel INHO'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#64748B]">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Ambiente blindado e provisionado instantaneamente</span>
            </div>
            <a
              href="https://wa.me/5551981598760?text=Ol%C3%A1%21%20Acabei%20de%20assinar%20o%20INHO%20e%20gostaria%20de%20suporte."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
            >
              <MessageSquare size={13} />
              <span>Suporte OrBrick WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BemVindoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-[#9A6F0B] font-bold">Carregando confirmação...</div>}>
      <BemVindoContent />
    </Suspense>
  );
}
