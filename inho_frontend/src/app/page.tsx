'use client';

import Link from 'next/link';
import {
  ArrowRight, Globe2, ShieldCheck, TrendingUp, Users, MessageSquare,
  Zap, Lock, BarChart3, CheckCircle2, ChevronRight, Layers,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Counter from '@/components/Counter';
import { PlasmaBackground } from '@/components/ui/plasma-background';
import { Particles } from '@/components/ui/particles';
import { GlassButton } from '@/components/ui/glass-button';
import { AuroraText } from '@/components/ui/aurora-text';
import { MagicCard } from '@/components/ui/magic-card';
import { FeatureCarousel } from '@/components/ui/feature-carousel';

// ── Data ─────────────────────────────────────────────────────────
const stats = [
  { value: 5, suffix: '', label: 'Níveis de RBAC', icon: Users },
  { value: 7, suffix: '', label: 'Eventos de Auditoria', icon: BarChart3 },
  { value: 3, suffix: '', label: 'Camadas de Segurança', icon: Zap },
  { value: 100, suffix: '%', label: 'Operações Auditadas', icon: Globe2 },
];

const features = [
  {
    icon: ShieldCheck,
    title: 'Segurança por Design',
    description: 'Arquitetura Zero-Trust com JWT rotativo, RBAC granular e logs de auditoria imutáveis. Cada operação é rastreada em tempo real.',
    color: 'gold',
    tag: 'Security by Design',
  },
  {
    icon: TrendingUp,
    title: 'Impacto Mensurável',
    description: 'Cada transação é vinculada a métricas de impacto social verificáveis. Transparência total, da origem ao destino.',
    color: 'green',
    tag: 'ESG Compliance',
  },
  {
    icon: Zap,
    title: 'Alta Disponibilidade',
    description: 'FastAPI assíncrono com conexões em pool ao PostgreSQL. Latência de milissegundos, mesmo sob alta carga.',
    color: 'blue',
    tag: '99.9% SLA',
  },
  {
    icon: Globe2,
    title: 'Alcance Global',
    description: 'Suporte a múltiplas moedas, integração com Open Finance e gateways internacionais. Sem fronteiras financeiras.',
    color: 'gold',
    tag: 'Multi-Currency',
  },
  {
    icon: Layers,
    title: 'RBAC Granular',
    description: 'Controle de acesso baseado em funções com 5 níveis de permissão. Do Super Admin ao Cliente — cada dado protegido.',
    color: 'green',
    tag: 'Role-Based Access',
  },
  {
    icon: Lock,
    title: 'Open Finance Ready',
    description: 'Infraestrutura preparada para integração com Banco Central, PIX e APIs de Open Finance. Conformidade regulatória nativa.',
    color: 'blue',
    tag: 'LGPD & Open Finance',
  },
];

const principles = [
  'Auditoria imutável de 100% das operações',
  'Criptografia end-to-end em repouso e em trânsito',
  'Rate limiting e proteção contra brute-force',
  'Migrações de banco versionadas com Alembic',
  'Conformidade LGPD desde a fundação',
  'Monitoramento de anomalias em tempo real',
];

// ── Color Map ─────────────────────────────────────────────────────
const colorMap = {
  gold: { bg: 'bg-inho-gold/10', border: 'border-inho-gold/20', text: 'text-inho-gold', glow: 'hover:shadow-inho-gold' },
  green: { bg: 'bg-inho-green/10', border: 'border-inho-green/20', text: 'text-inho-green', glow: 'hover:shadow-inho-green' },
  blue: { bg: 'bg-inho-blue/10', border: 'border-inho-blue/20', text: 'text-inho-blue', glow: 'hover:glow-green' },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-inho-black overflow-x-hidden">
      <Header />

      {/* ══ HERO ═════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        aria-label="Hero Section"
      >
        <PlasmaBackground />
        <Particles className="opacity-80 mix-blend-screen" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glassmorphism rounded-full px-5 py-2.5 mb-8 animate-fade-in border border-inho-gold/30 shadow-[0_0_20px_rgba(245,166,35,0.2)]">
            <div className="w-2 h-2 bg-inho-green rounded-full animate-pulse" />
            <span className="font-mono text-xs text-inho-text uppercase tracking-widest font-semibold">
              Fase 2 — Orbe Platform Otimizada
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-tight mb-8 animate-slide-up drop-shadow-2xl">
            <span className="text-[#0F172A]">Finanças com</span>
            <br />
            <AuroraText text="Propósito Global" />
          </h1>

          {/* Sub */}
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-[#0F172A] leading-relaxed mb-12 animate-fade-in drop-shadow-md">
            Uma plataforma de gestão financeira construída para <strong className="text-[#0F172A]">alta disponibilidade</strong>,
            <strong className="text-inho-gold"> máxima segurança</strong> e impacto social
            <strong className="text-inho-green"> mensurável e global</strong>.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <GlassButton
              glowColor="green"
              onClick={() => window.open('https://wa.me/5551981598760?text=Ol%C3%A1%21%20Gostaria%20de%20assinar%20e%20ativar%20o%20ORBE%20INHO%20para%20minha%20empresa%2Fcooperativa.', '_blank')}
              className="w-full sm:w-auto min-w-[220px] justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm flex items-center gap-2"
            >
              <MessageSquare size={18} />
              Assinar no WhatsApp (OrBrick)
            </GlassButton>
            <GlassButton glowColor="blue" onClick={() => window.location.href = '#about'} className="w-full sm:w-auto min-w-[200px] justify-center text-[#0F172A] border-[#E2E8F0]">
              Conhecer a visão
              <ChevronRight size={18} />
            </GlassButton>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-14 text-inho-muted text-sm animate-fade-in">
            {['LGPD Compliant', 'Open Finance Ready', '99.9% SLA', 'Auditoria Imutável'].map(t => (
              <span key={t} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-inho-green flex-shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float" aria-hidden="true">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-inho-gold/50" />
          <div className="w-1.5 h-1.5 bg-inho-gold rounded-full" />
        </div>
      </section>

      {/* ══ STATS ════════════════════════════════════════════════ */}
      <section id="stats" aria-label="Estatísticas" className="py-20 border-y border-inho-border bg-inho-dark/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, suffix, label, icon: Icon }) => (
              <div key={label} className="text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-inho-gold/10 border border-inho-gold/20 flex items-center justify-center">
                  <Icon size={20} className="text-inho-gold" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-shimmer">
                  <Counter end={value} suffix={suffix} />
                </div>
                <p className="text-inho-muted text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ABOUT ════════════════════════════════════════════════ */}
      <section id="about" aria-label="Sobre o INHO" className="py-28 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 glassmorphism rounded-full px-4 py-2 w-fit">
              <Globe2 size={14} className="text-inho-gold" />
              <span className="font-mono text-xs text-inho-muted uppercase tracking-widest">Missão e Visão</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-inho-text leading-tight">
              Tecnologia que <span className="text-shimmer">transforma</span> realidades
            </h2>
            <p className="text-inho-muted text-lg leading-relaxed">
              O INHO nasceu da convicção de que ferramentas financeiras de classe institucional devem estar acessíveis a organizações que geram impacto social real. Nossa missão é democratizar a gestão financeira de alta performance.
            </p>
            <p className="text-inho-muted leading-relaxed">
              Construído sobre uma infraestrutura assíncrona de alta disponibilidade — FastAPI, PostgreSQL e Next.js — o INHO oferece processamento financeiro seguro, auditável e escalável, do primeiro centavo ao bilionésimo.
            </p>
            <GlassButton glowColor="gold" onClick={() => window.location.href = '/login'} className="w-fit">
              Acessar a Plataforma <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </GlassButton>
          </div>

          {/* Visual card */}
          <div className="relative">
            <div className="glassmorphism rounded-3xl p-8 border border-inho-gold/10 hover:border-inho-gold/30 transition-all duration-500">
              <div className="font-mono text-xs text-inho-muted mb-6 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-inho-green rounded-full animate-pulse" />
                Sistema Operacional · API v1.0.0
              </div>
              {[
                { label: 'Throughput', value: '12.4k req/s', color: 'text-inho-gold' },
                { label: 'Latência P99', value: '18ms', color: 'text-inho-green' },
                { label: 'DB Pool', value: '10/10 conn', color: 'text-inho-blue' },
                { label: 'Audit Events', value: '99.98% cap', color: 'text-inho-gold' },
                { label: 'Auth Success', value: '99.7%', color: 'text-inho-green' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-inho-border last:border-0">
                  <span className="text-inho-muted text-sm font-mono">{label}</span>
                  <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="absolute -inset-4 bg-inho-gold/5 rounded-3xl blur-2xl -z-10" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═════════════════════════════════════════════ */}
      <section id="impact" aria-label="Funcionalidades" className="py-28 bg-inho-dark/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glassmorphism rounded-full px-4 py-2 mb-6">
              <Layers size={14} className="text-inho-gold" />
              <span className="font-mono text-xs text-inho-muted uppercase tracking-widest">Plataforma Completa</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-inho-text mb-4">
              Tudo que você precisa, <span className="text-shimmer">sem compromissos</span>
            </h2>
            <p className="text-inho-muted text-lg max-w-2xl mx-auto">
              Uma stack moderna construída para resistir ao tempo, escalar sem dor e auditável por design desde o primeiro commit.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description, color, tag }) => {
              const c = colorMap[color as keyof typeof colorMap];
              return (
                <article
                  key={title}
                  className={`glassmorphism rounded-2xl p-7 border ${c.border} ${c.glow} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5 group cursor-default`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={22} className={c.text} />
                    </div>
                    <span className={`font-mono text-[10px] ${c.text} bg-opacity-10 ${c.bg} border ${c.border} px-2.5 py-1 rounded-full uppercase tracking-widest`}>
                      {tag}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-inho-text font-bold text-lg">{title}</h3>
                    <p className="text-inho-muted text-sm leading-relaxed">{description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ SECURITY ═════════════════════════════════════════════ */}
      <section id="security" aria-label="Segurança" className="py-28 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Checklist */}
          <div className="glassmorphism rounded-3xl p-8 border border-inho-green/10 hover:border-inho-green/30 transition-all duration-500">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-inho-green/10 border border-inho-green/20 flex items-center justify-center">
                <ShieldCheck size={20} className="text-inho-green" />
              </div>
              <div>
                <div className="font-bold text-inho-text">Security Checklist</div>
                <div className="font-mono text-xs text-inho-muted">Fase 1 — Cyber Safety Base</div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {principles.map(p => (
                <div key={p} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-inho-green flex-shrink-0 mt-0.5" />
                  <span className="text-inho-muted text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 glassmorphism rounded-full px-4 py-2 w-fit">
              <ShieldCheck size={14} className="text-inho-green" />
              <span className="font-mono text-xs text-inho-muted uppercase tracking-widest">Security by Design</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-inho-text leading-tight">
              Segurança não é <span className="text-inho-green">uma feature</span> — é a base
            </h2>
            <p className="text-inho-muted text-lg leading-relaxed">
              Toda ação na plataforma gera um registro imutável de auditoria com timestamp, IP, entidade afetada e contexto completo. LGPD e conformidade regulatória não são afterthoughts — são o ponto de partida.
            </p>
            <p className="text-inho-muted leading-relaxed">
              Com RBAC de 5 níveis, rate limiting nas rotas de autenticação, middlewares CORS e rotação automática de tokens JWT, o INHO é blindado em todas as camadas.
            </p>
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ════════════════════════════════════════════ */}
      <section id="cta" aria-label="Call to Action" className="py-28 bg-inho-dark/50 border-y border-inho-border">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-inho-text mb-6 leading-tight">
            Pronto para financiar <span className="text-shimmer">o futuro</span>?
          </h2>
          <p className="text-inho-muted text-lg mb-10 max-w-xl mx-auto">
            Junte-se à plataforma que une alta performance empresarial, conformidade e impacto social.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/5551981598760?text=Ol%C3%A1%21%20Gostaria%20de%20assinar%20e%20ativar%20o%20ORBE%20INHO%20para%20minha%20empresa%2Fcooperativa."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
            >
              <MessageSquare size={18} />
              Falar com OrBrick no WhatsApp
            </a>
            <GlassButton glowColor="gold" onClick={() => window.location.href = '/login'} className="px-8 py-4 text-base font-black">
              Acessar a Plataforma
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </GlassButton>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
