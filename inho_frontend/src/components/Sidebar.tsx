'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, FileSignature, ShoppingCart, Monitor, ShieldCheck,
  ChevronDown, ChevronRight, LogOut, User, Users,
  X, Settings, BellRing, MessageSquare, Calendar,
  Layers, Lock, TrendingUp, FileCheck, Wallet, Crown
} from 'lucide-react';
import OrbeLogo from './OrbeLogo';
import { useAuth } from '@/lib/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [crmOpen, setCrmOpen] = useState(true);
  const [recOpen, setRecOpen] = useState(true);
  const [pagOpen, setPagOpen] = useState(true);
  const [orgOpen, setOrgOpen] = useState(true);
  const [accOpen, setAccOpen] = useState(true);
  const [sysOpen, setSysOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setActiveCategory(params.get('category'));
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const isExactOrSub = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/billing') return pathname === '/dashboard/billing';
    if (href === '/dashboard/payable') return pathname === '/dashboard/payable';
    if (href === '/dashboard/contacts') return pathname === '/dashboard/contacts' && !activeCategory;
    return pathname.startsWith(href);
  };

  // ── RBAC helpers ─────────────────────────────────────────────────
  const normRole = (user?.role || 'admin').toLowerCase();
  const isAdmin = normRole === 'super_admin' || normRole === 'admin';

  const roleColor: Record<string, string> = {
    super_admin: 'text-[#8B6508] border-[#D4AF37]/50 bg-[#FDF7E2]',
    admin: 'text-[#8B6508] border-[#D4AF37]/50 bg-[#FDF7E2]',
    operator: 'text-emerald-800 border-emerald-300 bg-emerald-50',
    viewer: 'text-slate-600 border-slate-300 bg-slate-100',
    client: 'text-slate-700 border-slate-300 bg-slate-100',
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5DEC9] font-sans text-xs select-none shadow-[4px_0_24px_rgba(15,23,42,0.03)]">
      {/* Brand Header — Padrão Executivo Ouro */}
      <div className="p-5 border-b border-[#E5DEC9] flex items-center justify-between bg-gradient-to-r from-[#FAF6EB] via-white to-[#FAF6EB]">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 rounded-xl bg-[#FDF8E8] border border-[#D4AF37]/40 flex items-center justify-center shadow-sm">
            <OrbeLogo className="w-6 h-6" variant="header" />
          </div>
          <div>
            <span className="font-extrabold text-sm text-[#0F172A] tracking-wider uppercase block leading-none">
              ORBE INHO
            </span>
            <span className="text-[9px] text-[#9A6F0B] font-bold tracking-widest uppercase flex items-center gap-1 mt-1">
              <Crown size={9} className="text-[#B8860B]" /> Executive Gold
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
          <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">Online</span>
        </div>
      </div>

      {/* Navigation (Arquitetura Nimbus Elevada ao Padrão Ouro) */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 custom-scrollbar">
        {/* Hub Principal */}
        <Link
          href="/dashboard"
          onClick={() => { setActiveCategory(null); setMobileOpen(false); }}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
            isExactOrSub('/dashboard')
              ? 'bg-gradient-to-r from-[#FDF7E2] to-[#FAF0CA] text-[#7A5605] border border-[#D4AF37]/60 shadow-sm font-extrabold'
              : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] border border-transparent font-semibold'
          }`}
        >
          <BarChart3 size={16} className={isExactOrSub('/dashboard') ? 'text-[#B8860B]' : 'text-[#64748B]'} />
          <span className="uppercase tracking-wider">Hub Executivo</span>
        </Link>

        {/* SESSÃO 1: CRM & ENTIDADES (Estilo NIMBUS + SÓCIOS Cooperativismo) */}
        <div className="space-y-1">
          <button
            onClick={() => setCrmOpen(!crmOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[#0F172A] hover:bg-[#FAF7EE] rounded-lg transition-colors font-extrabold uppercase tracking-wider text-[11px]"
          >
            <span className="flex items-center gap-2.5">
              <Users size={15} className="text-[#B8860B]" />
              <span>CRM & ENTIDADES</span>
            </span>
            {crmOpen ? <ChevronDown size={14} className="text-[#64748B]" /> : <ChevronRight size={14} className="text-[#64748B]" />}
          </button>

          {crmOpen && (
            <div className="pl-3 space-y-1 ml-2 mt-1 border-l-2 border-[#E5DEC9]">
              {[
                { label: 'CLIENTES', href: '/dashboard/contacts?category=CUSTOMER', cat: 'CUSTOMER' },
                { label: 'FORNECEDORES', href: '/dashboard/contacts?category=SUPPLIER', cat: 'SUPPLIER' },
                { label: 'FUNCIONÁRIOS', href: '/dashboard/contacts?category=EMPLOYEE', cat: 'EMPLOYEE' },
                { label: 'SÓCIOS', href: '/dashboard/cooperativa', cat: 'COOPERADO' },
              ].map((item) => {
                const isActive =
                  item.cat === 'COOPERADO'
                    ? pathname.startsWith('/dashboard/cooperativa')
                    : pathname === '/dashboard/contacts' && activeCategory === item.cat;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setActiveCategory(item.cat === 'COOPERADO' ? null : item.cat);
                      setMobileOpen(false);
                    }}
                    className={`block px-3.5 py-2 rounded-xl tracking-wider uppercase transition-all text-xs ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FDF7E2] to-[#FAF0CA] text-[#7A5605] font-extrabold border border-[#D4AF37]/60 shadow-sm'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] font-semibold'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* SESSÃO 2: RECEBIMENTOS (Indicador Esmeralda Executivo estilo NIMBUS) */}
        <div className="space-y-1">
          <button
            onClick={() => setRecOpen(!recOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[#0F172A] hover:bg-[#FAF7EE] rounded-lg transition-colors font-extrabold uppercase tracking-wider text-[11px]"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 border border-emerald-600 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
              <span>RECEBIMENTOS</span>
            </span>
            {recOpen ? <ChevronDown size={14} className="text-[#64748B]" /> : <ChevronRight size={14} className="text-[#64748B]" />}
          </button>

          {recOpen && (
            <div className="pl-4 space-y-1 ml-2.5 mt-1 border-l-2 border-emerald-200">
              {[
                { label: 'Receber', href: '/dashboard/billing' },
                { label: 'Agendar', href: '/dashboard/billing/schedule' },
                { label: 'Boletos', href: '/dashboard/billing/boletos' },
                { label: 'NFS-e', href: '/dashboard/billing/nfse' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setActiveCategory(null); setMobileOpen(false); }}
                  className={`block px-3.5 py-2 rounded-lg transition-colors text-xs ${
                    isExactOrSub(item.href)
                      ? 'bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-300 shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] font-medium'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* SESSÃO 3: PAGAMENTOS & CAIXA */}
        <div className="space-y-1">
          <button
            onClick={() => setPagOpen(!pagOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[#0F172A] hover:bg-[#FAF7EE] rounded-lg transition-colors font-extrabold uppercase tracking-wider text-[11px]"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-100 border border-[#B8860B] flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B]" />
              </span>
              <span>PAGAMENTOS</span>
            </span>
            {pagOpen ? <ChevronDown size={14} className="text-[#64748B]" /> : <ChevronRight size={14} className="text-[#64748B]" />}
          </button>

          {pagOpen && (
            <div className="pl-4 space-y-1 ml-2.5 mt-1 border-l-2 border-[#E5DEC9]">
              {[
                { label: 'Contas a Pagar', href: '/dashboard/payable', icon: Wallet },
                { label: 'Agendar Pagamentos', href: '/dashboard/payable/schedule', icon: Calendar },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setActiveCategory(null); setMobileOpen(false); }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg transition-colors text-xs ${
                    isExactOrSub(item.href)
                      ? 'bg-[#FDF7E2] text-[#7A5605] font-extrabold border border-[#D4AF37]/60 shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] font-medium'
                  }`}
                >
                  <item.icon size={13} className={isExactOrSub(item.href) ? 'text-[#B8860B]' : 'text-[#64748B]'} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* SESSÃO 4: ORGANIZAÇÃO & COMERCIAL */}
        <div className="space-y-1">
          <button
            onClick={() => setOrgOpen(!orgOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[#7A5605] hover:bg-[#FAF7EE] rounded-lg transition-colors font-extrabold uppercase tracking-wider text-[11px]"
          >
            <span className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#B8860B] rounded-full" />
              <span>ORGANIZAÇÃO & COMERCIAL</span>
            </span>
            {orgOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {orgOpen && (
            <div className="pl-3 space-y-1 border-l-2 border-[#E5DEC9] ml-3 mt-1">
              {[
                { label: 'GESTÃO DE CONTATOS', href: '/dashboard/contacts', icon: Users },
                { label: 'WHATSAPP (ORBRICK)', href: '/dashboard/whatsapp', icon: MessageSquare },
                { label: 'FUNIL DE VENDAS', href: '/dashboard/funnel', icon: TrendingUp },
                { label: 'PROPOSTAS & ORÇAM.', href: '/dashboard/proposals', icon: FileCheck },
                { label: 'PEDIDOS DE VENDA', href: '/dashboard/sales-orders', icon: ShoppingCart },
                { label: 'FRENTE DE CAIXA (PDV)', href: '/dashboard/pdv', icon: Monitor },
                { label: 'COBRANÇAS E AVISOS', href: '/dashboard/billing', icon: BellRing },
                { label: 'ASSIST. E CONTRATOS', href: '/dashboard/contracts', icon: FileSignature },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => { setActiveCategory(null); setMobileOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-[11px] tracking-wider ${
                    isExactOrSub(item.href)
                      ? 'bg-[#FDF7E2] text-[#7A5605] font-extrabold border border-[#D4AF37]/60 shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] font-medium'
                  }`}
                >
                  <item.icon size={14} className={isExactOrSub(item.href) ? 'text-[#B8860B]' : 'text-[#64748B]'} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* SESSÃO 5: CONTABILIDADE & INTELIGÊNCIA BI */}
        <div className="space-y-1">
          <button
            onClick={() => setAccOpen(!accOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[#0F172A] hover:bg-[#FAF7EE] rounded-lg transition-colors font-extrabold uppercase tracking-wider text-[11px]"
          >
            <span className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#059669] rounded-full" />
              <span>CONTABILIDADE & BI</span>
            </span>
            {accOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {accOpen && (
            <div className="pl-3 space-y-1 border-l-2 border-[#E5DEC9] ml-3 mt-1">
              {[
                { label: 'RELATÓRIOS & DRE', href: '/dashboard/reports', icon: BarChart3 },
                { label: 'PLANO DE CONTAS', href: '/dashboard/categories', icon: Layers },
                { label: 'FECHAMENTO & CONTADOR', href: '/dashboard/accounting', icon: Lock },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setActiveCategory(null); setMobileOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-[11px] tracking-wider ${
                    isExactOrSub(item.href)
                      ? 'bg-[#FDF7E2] text-[#7A5605] font-extrabold border border-[#D4AF37]/60 shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] font-medium'
                  }`}
                >
                  <item.icon size={14} className={isExactOrSub(item.href) ? 'text-[#B8860B]' : 'text-[#64748B]'} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* SESSÃO 6: SISTEMA & GOVERNANÇA */}
        <div className="space-y-1 pt-2 border-t border-[#E5DEC9]">
          <button
            onClick={() => setSysOpen(!sysOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-[#0F172A] hover:bg-[#FAF7EE] rounded-lg transition-colors font-extrabold uppercase tracking-wider text-[11px]"
          >
            <span className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#1D4ED8] rounded-full" />
              <span>GOVERNANÇA & SISTEMA</span>
            </span>
            {sysOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {sysOpen && (
            <div className="pl-3 space-y-1 border-l-2 border-[#E5DEC9] ml-3 mt-1">
              {[
                { label: 'PESQUISA DE CLIMA (PCO)', href: '/dashboard/pco', icon: Users },
                ...(isAdmin
                  ? [
                      { label: 'TRILHA DE AUDITORIA', href: '/dashboard/audit', icon: ShieldCheck },
                      { label: 'EQUIPE & OPERADORES', href: '/dashboard/users', icon: Users },
                      { label: 'CONFIGURAÇÕES & API', href: '/dashboard/settings', icon: Settings },
                    ]
                  : []),
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => { setActiveCategory(null); setMobileOpen(false); }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-[11px] tracking-wider ${
                    isExactOrSub(item.href)
                      ? 'bg-[#FDF7E2] text-[#7A5605] font-extrabold border border-[#D4AF37]/60 shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#FAF7EE] font-medium'
                  }`}
                >
                  <item.icon size={14} className={isExactOrSub(item.href) ? 'text-[#B8860B]' : 'text-[#64748B]'} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Session Footer — Cartão de Identidade Executivo */}
      {user && (
        <div className="p-4 border-t border-[#E5DEC9] space-y-3 bg-[#FAF8F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FDF7E2] to-[#F3E5AB] border border-[#D4AF37]/50 flex items-center justify-center flex-shrink-0 shadow-sm">
              <User size={15} className="text-[#8B6508]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[#0F172A] font-extrabold truncate text-xs">{user.full_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-widest ${roleColor[user.role] ?? roleColor.client}`}>
                  {user.role_label || (user.role === 'admin' ? 'Usuário Mestre' : user.role === 'operator' ? 'Operador' : user.role === 'super_admin' ? 'Super Admin' : 'Visualizador')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-white border border-[#DED6C1] hover:border-red-400 hover:bg-red-50 hover:text-red-700 text-[#475569] py-2 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider shadow-sm"
          >
            <LogOut size={12} />
            Sair da Conta
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 flex-shrink-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-64 max-w-xs h-full bg-white animate-slide-right shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A]"
            >
              <X size={18} />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
