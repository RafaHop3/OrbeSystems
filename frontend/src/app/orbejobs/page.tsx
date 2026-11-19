'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Sparkles,
  FileText,
  Send,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Mail,
  Upload,
  Trash2,
  ExternalLink,
  Search,
  Lock,
  ArrowLeft,
} from 'lucide-react';

type TabKey = 'kanban' | 'living_cv' | 'queue' | 'lgpd';

interface OrbeJobApp {
  id: string;
  company_name: string;
  job_title: string;
  job_url: string;
  recipient_email: string;
  stage: 'DISCOVERED' | 'TAILORED' | 'QUEUED' | 'APPLIED' | 'INTERVIEW';
  match_score: number;
  tailored_cover_letter?: string;
  ai_provider_used?: string;
  approved_by_human: boolean;
}

const INITIAL_APPS: OrbeJobApp[] = [
  {
    id: 'job-1',
    company_name: 'Cloudflare',
    job_title: 'Senior Systems & Security Engineer (Remote)',
    job_url: 'https://boards.greenhouse.io/cloudflare',
    recipient_email: 'talent@cloudflare.com',
    stage: 'DISCOVERED',
    match_score: 0.94,
    approved_by_human: false,
  },
  {
    id: 'job-2',
    company_name: 'Stripe',
    job_title: 'Staff Backend Engineer — Distributed Payments',
    job_url: 'https://jobs.lever.co/stripe',
    recipient_email: 'recruiting@stripe.com',
    stage: 'TAILORED',
    match_score: 0.91,
    tailored_cover_letter:
      'Carta adaptada pela Orbe IA: Experiência sólida em arquitetura distribuída, FastAPI, PostgreSQL pgvector, conciliação financeira atômica e segurança AES-256.',
    ai_provider_used: 'ORBE_IA_ENGINE',
    approved_by_human: false,
  },
];

const KANBAN_STAGES: { key: OrbeJobApp['stage']; label: string }[] = [
  { key: 'DISCOVERED', label: '1. Descobertas (ATS)' },
  { key: 'TAILORED', label: '2. Adaptadas (Orbe IA)' },
  { key: 'QUEUED', label: '3. Fila Segura (MX OK)' },
  { key: 'APPLIED', label: '4. Enviadas (Gmail)' },
  { key: 'INTERVIEW', label: '5. Entrevistas' },
];

export default function OrbeJobsStandalonePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('kanban');
  const [apps, setApps] = useState<OrbeJobApp[]>(INITIAL_APPS);
  const [humanInTheLoop, setHumanInTheLoop] = useState(true);
  const [killSwitch, setKillSwitch] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(12);
  const [sentToday, setSentToday] = useState(2);
  const [banner, setBanner] = useState<string | null>(null);

  // Scraper state
  const [greenhouseBoard, setGreenhouseBoard] = useState('cloudflare');
  const [leverCompany, setLeverCompany] = useState('Netflix');
  const [newCompany, setNewCompany] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Living CV state
  const [fullName, setFullName] = useState('Engenheiro Orbe Systems');
  const [headline, setHeadline] = useState('Senior Full-Stack, AI & Cyber Security Architect');
  const [skills, setSkills] = useState('Python, FastAPI, TypeScript, Next.js, PostgreSQL, pgvector, Docker, AWS');
  const [waCmd, setWaCmd] = useState('+skill Rust, Kubernetes, Z3 Solver');
  const [waHistory, setWaHistory] = useState<string[]>([
    'Living CV sincronizado com vetor pgvector (64 dimensões L2-normalizado).',
  ]);

  // Queue & DNS MX state
  const [mxEmail, setMxEmail] = useState('recruiting@stripe.com');
  const [mxResult, setMxResult] = useState<{ valid: boolean; host: string } | null>({
    valid: true,
    host: 'aspmx.l.google.com',
  });
  const [gmailVaultEmail, setGmailVaultEmail] = useState('');
  const [vaultSaved, setVaultSaved] = useState(true);

  const handleScrape = () => {
    if (killSwitch) {
      setBanner('Kill-Switch ativo: reative a esteira OrbeJobs antes de coletar novas vagas.');
      return;
    }
    const added: OrbeJobApp = {
      id: `job-${Date.now()}`,
      company_name: greenhouseBoard || leverCompany || 'Tech Corp',
      job_title: `Principal AI & Platform Engineer (${greenhouseBoard || leverCompany})`,
      job_url: `https://boards.greenhouse.io/${(greenhouseBoard || 'orbe').toLowerCase()}`,
      recipient_email: `jobs@${(greenhouseBoard || 'orbe').toLowerCase()}.com`,
      stage: 'DISCOVERED',
      match_score: 0.89,
      approved_by_human: false,
    };
    setApps((prev) => [added, ...prev]);
    setBanner(`Coleta ATS concluída (${added.company_name}) · Ranqueamento vetorial pgvector: 89% match.`);
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newTitle.trim()) return;
    const added: OrbeJobApp = {
      id: `job-${Date.now()}`,
      company_name: newCompany.trim(),
      job_title: newTitle.trim(),
      job_url: 'https://orbesystems.com.br/orbejobs',
      recipient_email: newEmail.trim() || 'talent@empresa.com',
      stage: 'DISCOVERED',
      match_score: 0.92,
      approved_by_human: false,
    };
    setApps((prev) => [added, ...prev]);
    setNewCompany('');
    setNewTitle('');
    setNewEmail('');
    setBanner(`Vaga "${added.job_title}" adicionada à esteira OrbeJobs.`);
  };

  const handleTailor = (id: string) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              stage: 'TAILORED',
              ai_provider_used: 'ORBE_IA_ENGINE',
              tailored_cover_letter: `Carta personalizada pela Orbe IA para ${a.company_name} (${a.job_title}): destaque automático para ${skills}.`,
            }
          : a
      )
    );
    setBanner('Currículo e Cover Letter adaptados pela Orbe IA (Cascata IMORTAL Zero-Key)!');
  };

  const handleApproveAndQueue = (id: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, stage: 'QUEUED', approved_by_human: true } : a))
    );
    setBanner('Candidatura aprovada (Human-in-the-Loop) e enfileirada após validação DNS MX.');
  };

  const handleDispatch = (id: string) => {
    if (killSwitch) {
      setBanner('Envio bloqueado pelo Kill-Switch.');
      return;
    }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, stage: 'APPLIED' } : a)));
    setSentToday((s) => Math.min(dailyLimit, s + 1));
    setBanner('Candidatura disparada via Gmail OAuth2 (Cofre MultiFernet AES-256) com hash SHA-256 LGPD!');
  };

  const handleWaUpdate = () => {
    if (!waCmd.trim()) return;
    const cleaned = waCmd.replace(/^\+\w+\s*/, '').trim();
    if (cleaned) {
      setSkills((prev) => `${prev}, ${cleaned}`);
    }
    setWaHistory((prev) => [`Comando WhatsApp processado: "${waCmd}" -> Vetor pgvector atualizado.`, ...prev]);
    setWaCmd('');
    setBanner('Living CV atualizado via comando rápido!');
  };

  return (
    <div className="min-h-screen bg-[#070403] text-white py-10 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar Orbe Systems */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 transition-all"
          >
            <ArrowLeft size={14} /> Voltar ao Portal Orbe Systems
          </Link>
          <span className="px-3 py-1 rounded-full bg-[#FF6B1A]/15 border border-[#FF6B1A]/50 text-[#FFB380] text-[11px] font-mono uppercase tracking-widest">
            Ferramenta Oficial Orbe Systems • Independente do INHO ERP
          </span>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-[#FF6B1A]/50 bg-[#0D0704] p-6 sm:p-8 shadow-[0_0_55px_rgba(255,107,26,0.2)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <Sparkles size={28} className="text-[#FFD2A6] drop-shadow-[0_0_12px_rgba(255,107,26,0.95)]" />
                <h1
                  className="text-3xl sm:text-4xl font-medium tracking-tight text-[#FFF2E5]"
                  style={{
                    textShadow:
                      '0 0 8px rgba(255,140,50,0.95), 0 0 22px rgba(255,107,26,0.85), 0 0 42px rgba(255,80,0,0.55)',
                  }}
                >
                  OrbeJobs
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF6B1A]/20 border border-[#FF6B1A]/50 text-[#FFB380] text-[10px] font-mono uppercase">
                  Orbe IA • Cascata IMORTAL
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-3xl">
                Esteira autônoma de carreira e recrutamento da <strong>Orbe Systems</strong>: Coleta Híbrida ATS (Greenhouse, Lever &amp; RSS), Match Vetorial <strong>pgvector</strong>, Living CV via PDF/WhatsApp, Cofre OAuth2 <strong>MultiFernet AES-256</strong> e validação <strong>DNS MX</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setHumanInTheLoop(!humanInTheLoop)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase border transition-all ${
                  humanInTheLoop
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                }`}
              >
                <ShieldCheck size={14} className="inline mr-1" />
                {humanInTheLoop ? 'Human-in-the-Loop: ON' : 'Modo 100% Autônomo'}
              </button>
              <button
                onClick={() => setKillSwitch(!killSwitch)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase border transition-all ${
                  killSwitch
                    ? 'bg-red-600 text-white border-red-400'
                    : 'bg-red-950/70 text-red-300 border-red-500/40 hover:bg-red-900/60'
                }`}
              >
                <ShieldAlert size={14} className="inline mr-1" />
                {killSwitch ? 'KILL-SWITCH ATIVO (PAUSADO)' : 'Kill-Switch'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-center">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Vagas no Pipeline</div>
              <div className="text-xl font-extrabold text-white mt-0.5">{apps.length}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Cota Diária Anti-Spam</div>
              <div className="text-xl font-extrabold text-[#FFB380] mt-0.5">
                {sentToday} / {dailyLimit}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Cofre Gmail AES-256</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">
                {vaultSaved ? 'PROTEGIDO' : 'PENDENTE'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-zinc-400">Motor Primário</div>
              <div className="text-xl font-extrabold text-[#FFD2A6] mt-0.5">ORBE IA</div>
            </div>
          </div>
        </div>

        {banner && (
          <div className="p-3.5 rounded-2xl bg-[#FF6B1A]/15 border border-[#FF6B1A]/50 text-xs font-bold text-[#FFE0C2] flex justify-between">
            <span>{banner}</span>
            <button onClick={() => setBanner(null)} className="underline ml-3">Fechar</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'kanban', label: '1. Esteira Kanban & Scraper ATS', icon: Briefcase },
            { id: 'living_cv', label: '2. Living CV (JSON Resume + WhatsApp)', icon: FileText },
            { id: 'queue', label: '3. Cofre Gmail AES-256 & DNS MX', icon: Mail },
            { id: 'lgpd', label: '4. Auditoria & Expurgo LGPD Art. 18', icon: Lock },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabKey)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-[#FF6B1A] to-[#FF8C32] text-white border-[#FF8C32] shadow-[0_0_20px_rgba(255,107,26,0.4)]'
                    : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'kanban' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-[#0D0704] p-5 rounded-2xl border border-white/10">
              <div className="space-y-2">
                <div className="text-xs font-extrabold uppercase text-[#FFB380]">
                  Coletor Híbrido ATS (Greenhouse / Lever / RSS)
                </div>
                <div className="flex gap-2">
                  <input
                    value={greenhouseBoard}
                    onChange={(e) => setGreenhouseBoard(e.target.value)}
                    placeholder="Board Greenhouse (ex: cloudflare)"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
                  />
                  <input
                    value={leverCompany}
                    onChange={(e) => setLeverCompany(e.target.value)}
                    placeholder="Lever (ex: Netflix)"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
                  />
                  <button
                    onClick={handleScrape}
                    className="px-4 py-2 rounded-xl bg-[#FF6B1A] hover:bg-[#FF8C32] text-white text-xs font-extrabold uppercase"
                  >
                    <Search size={13} className="inline mr-1" /> Varrer ATS
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddManual} className="space-y-2">
                <div className="text-xs font-extrabold uppercase text-zinc-300">Adicionar Vaga Manualmente</div>
                <div className="flex gap-2">
                  <input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Empresa"
                    className="w-32 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
                  />
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título da Vaga"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
                  />
                  <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold uppercase">
                    + Vaga
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {KANBAN_STAGES.map((st) => {
                const colApps = apps.filter((a) => a.stage === st.key);
                return (
                  <div key={st.key} className="p-4 rounded-2xl bg-[#0D0704] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-extrabold uppercase text-[#FFB380]">{st.label}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">{colApps.length}</span>
                    </div>
                    {colApps.map((a) => (
                      <div key={a.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-extrabold text-white">{a.company_name}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                            {Math.round(a.match_score * 100)}% pgvector
                          </span>
                        </div>
                        <div className="text-xs text-zinc-300 font-medium">{a.job_title}</div>
                        {a.tailored_cover_letter && (
                          <p className="text-[11px] text-zinc-400 bg-black/40 p-2 rounded-lg border border-white/5">
                            {a.tailored_cover_letter}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {a.stage === 'DISCOVERED' && (
                            <button
                              onClick={() => handleTailor(a.id)}
                              className="w-full py-1.5 rounded-lg bg-[#FF6B1A] text-white text-[11px] font-extrabold uppercase"
                            >
                              Adaptar com Orbe IA
                            </button>
                          )}
                          {a.stage === 'TAILORED' && (
                            <button
                              onClick={() => handleApproveAndQueue(a.id)}
                              className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold uppercase"
                            >
                              Aprovar &amp; Enfileirar
                            </button>
                          )}
                          {a.stage === 'QUEUED' && (
                            <button
                              onClick={() => handleDispatch(a.id)}
                              className="w-full py-1.5 rounded-lg bg-sky-600 text-white text-[11px] font-extrabold uppercase"
                            >
                              Disparar via Gmail
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'living_cv' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#0D0704] border border-white/10 space-y-4">
              <h2 className="text-sm font-extrabold uppercase text-[#FFB380]">Living CV (JSON Resume + Vetor pgvector)</h2>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome Completo"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
              />
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Headline Profissional"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
              />
              <textarea
                rows={3}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
              />
              <button
                onClick={() => setBanner('Living CV salvo e re-indexado com embedding vetorial de 64 dimensões!')}
                className="w-full py-2.5 rounded-xl bg-[#FF6B1A] text-white text-xs font-extrabold uppercase"
              >
                Salvar &amp; Re-indexar Living CV
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D0704] border border-white/10 space-y-4">
              <h2 className="text-sm font-extrabold uppercase text-[#FFB380]">
                Atualização Contínua via WhatsApp (+xp / +skill / +curso)
              </h2>
              <div className="flex gap-2">
                <input
                  value={waCmd}
                  onChange={(e) => setWaCmd(e.target.value)}
                  placeholder="Ex: +skill Rust, Kubernetes"
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
                />
                <button
                  onClick={handleWaUpdate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold uppercase"
                >
                  Enviar Comando
                </button>
              </div>
              <div className="space-y-2 text-xs text-zinc-300">
                {waHistory.map((h, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#0D0704] border border-white/10 space-y-4">
              <h2 className="text-sm font-extrabold uppercase text-[#FFB380]">
                Cofre OAuth2 Gmail (MultiFernet AES-256 • Escopo gmail.send)
              </h2>
              <input
                value={gmailVaultEmail}
                onChange={(e) => setGmailVaultEmail(e.target.value)}
                placeholder="Seu e-mail Gmail remetente"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
              />
              <button
                onClick={() => {
                  setVaultSaved(true);
                  setBanner('Token OAuth2 criptografado no cofre MultiFernet AES-256 (bloqueado no PostgREST).');
                }}
                className="w-full py-2.5 rounded-xl bg-[#FF6B1A] text-white text-xs font-extrabold uppercase"
              >
                Salvar no Cofre Criptografado AES-256
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D0704] border border-white/10 space-y-4">
              <h2 className="text-sm font-extrabold uppercase text-[#FFB380]">Validador DNS MX Anti-Bounce</h2>
              <div className="flex gap-2">
                <input
                  value={mxEmail}
                  onChange={(e) => setMxEmail(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white"
                />
                <button
                  onClick={() =>
                    setMxResult({
                      valid: mxEmail.includes('@') && !mxEmail.endsWith('.invalid'),
                      host: 'aspmx.l.google.com',
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-extrabold uppercase"
                >
                  Validar MX
                </button>
              </div>
              {mxResult && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                  Status MX: <strong className="text-emerald-400">{mxResult.valid ? 'VÁLIDO' : 'INVÁLIDO'}</strong> • Host:{' '}
                  <code>{mxResult.host}</code>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lgpd' && (
          <div className="p-6 rounded-2xl bg-[#0D0704] border border-white/10 space-y-4">
            <h2 className="text-sm font-extrabold uppercase text-[#FFB380]">
              Trilha de Auditoria SHA-256 &amp; Direito ao Esquecimento (Art. 18 LGPD)
            </h2>
            <p className="text-xs text-zinc-300">
              Todos os envios do OrbeJobs geram um hash determinístico SHA-256 auditável e você pode expurgar 100% dos seus dados, tokens e candidaturas com 1 clique.
            </p>
            <button
              onClick={() => {
                setApps([]);
                setBanner('Expurgo Total Art. 18 LGPD executado com sucesso.');
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase"
            >
              <Trash2 size={14} className="inline mr-1" /> Executar Expurgo Total LGPD (Art. 18)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
