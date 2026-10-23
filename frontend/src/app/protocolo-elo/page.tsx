'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PostItem {
  id: string;
  author: string;
  handle: string;
  time: string;
  format: 'photo' | 'short' | 'long' | 'thread';
  formatLabel: string;
  level: number;
  levelName: string;
  reqPcr: number;
  reqKey: boolean;
  title: string;
  body: string;
  mediaNote: string;
  likes: number;
  replies: number;
  likedByMe: boolean;
}

const INITIAL_POSTS: PostItem[] = [
  {
    id: 'p1',
    author: 'Marina Costa',
    handle: '@marinacosta',
    time: 'T-02h',
    format: 'short',
    formatLabel: 'VÍDEO CURTO [00:48]',
    level: 1,
    levelName: 'Praça Pública',
    reqPcr: 0,
    reqKey: false,
    title: 'Estudo de iluminação natural e acústica no novo estúdio no Bom Fim',
    body: 'Testando a captura vertical em 60fps enquanto ajustamos o setup de edição. O contraste da luz de fim de tarde dispensou correção de cor.',
    mediaNote: 'STREAM: 9:16 VERTICAL • 1080p • CODEC AV1',
    likes: 42,
    replies: 9,
    likedByMe: false,
  },
  {
    id: 'p2',
    author: 'Marina Costa',
    handle: '@marinacosta',
    time: 'T-05h',
    format: 'thread',
    formatLabel: 'THREAD TÉCNICA [3 BLOCOS]',
    level: 1,
    levelName: 'Praça Pública',
    reqPcr: 0,
    reqKey: false,
    title: 'Por que a arquitetura das redes sociais migrou da conexão real para a retenção forçada?',
    body: '1/3 Quando o grafo social foi substituído por feeds puramente algorítmicos, deixamos de conversar com amigos reais para consumir mídia otimizada para retenção de desconhecidos.',
    mediaNote: 'THREAD_NODES: 3 • RESPOSTAS BILATERAIS ATIVAS',
    likes: 87,
    replies: 24,
    likedByMe: false,
  },
  {
    id: 'p3',
    author: 'Marina Costa',
    handle: '@marinacosta',
    time: 'T-24h',
    format: 'photo',
    formatLabel: 'ÁLBUM FOTOGRÁFICO [6 RAW]',
    level: 2,
    levelName: 'Órbita Próxima',
    reqPcr: 50,
    reqKey: false,
    title: 'Bastidores da montagem do apartamento novo e bancada de trabalho',
    body: 'Ainda há caixas empilhadas no corredor, mas a estante de livros e o servidor local já estão rodando. Quem estiver por perto essa semana está convidado para um café.',
    mediaNote: 'CARROSSEL 6 FRAMES + NOTA DE VOZ (00:42)',
    likes: 19,
    replies: 11,
    likedByMe: false,
  },
  {
    id: 'p4',
    author: 'Marina Costa',
    handle: '@marinacosta',
    time: 'T-48h',
    format: 'long',
    formatLabel: 'VLOG LONGO [16:24]',
    level: 3,
    levelName: 'Sala de Estar',
    reqPcr: 100,
    reqKey: false,
    title: 'Ensaio em Vídeo: Por que recusei a proposta da agência para manter autonomia criativa',
    body: 'Gravei este registro de 16 minutos exclusivamente para quem acompanha meu trabalho de perto. Abordo os números reais, os riscos da transição e o planejamento dos próximos 6 meses.',
    mediaNote: 'WIDESCREEN 16:9 • 4K HDR • JWT SIGNED STREAM',
    likes: 14,
    replies: 12,
    likedByMe: false,
  },
  {
    id: 'p5',
    author: 'Marina Costa',
    handle: '@marinacosta',
    time: 'T-72h',
    format: 'photo',
    formatLabel: 'CÁPSULA DE MEMÓRIA [08:15]',
    level: 4,
    levelName: 'Cofre Íntimo (Dunbar ≤15)',
    reqPcr: 160,
    reqKey: true,
    title: 'Arquivo de família na serra e balanço pessoal do último ano',
    body: 'Fotografias sem tratamento do domingo em família e um relato gravado para as 12 pessoas que estiveram presentes nos momentos mais exigentes deste ciclo.',
    mediaNote: 'ZERO-TRUST VAULT • CHAVE MÚTUA VERIFICADA • WATERMARK ID',
    likes: 8,
    replies: 8,
    likedByMe: false,
  },
];

export default function EloProtocolPage() {
  const [activeTab, setActiveTab] = useState<'hero' | 'sim' | 'analysis' | 'db_schema'>('sim');
  const [pcr, setPcr] = useState<number>(35);
  const [mutualKey, setMutualKey] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [posts, setPosts] = useState<PostItem[]>(INITIAL_POSTS);

  // Toast notification
  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string; type: 'info' | 'alert' | 'success' }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showToast = (title: string, message: string, type: 'info' | 'alert' | 'success' = 'info') => {
    setToast({ visible: true, title, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4500);
  };

  const handleBilateralAction = (type: 'thread' | 'voice' | 'video' | 'handshake') => {
    if (type === 'thread') {
      setPcr((prev) => prev + 20);
      showToast('INTERAÇÃO BILATERAL VERIFICADA', '+20 PCR adicionados. Autor respondeu ao seu comentário na thread.', 'success');
    } else if (type === 'voice') {
      setPcr((prev) => prev + 30);
      showToast('NOTA DE VOZ RECÍPROCA', '+30 PCR adicionados. Troca de áudio de 1 min autenticada nos dois nós.', 'success');
    } else if (type === 'video') {
      setPcr((prev) => prev + 35);
      showToast('RETENÇÃO & DIÁLOGO VALIDADO', '+35 PCR adicionados. Assistiu vlog longo + enviou reflexão direta.', 'success');
    } else if (type === 'handshake') {
      setPcr((prev) => prev + 45);
      setMutualKey(true);
      showToast('HANDSHAKE CRIPTOGRÁFICO', '+45 PCR adicionados + Chave Mútua assinada bilateralmente.', 'success');
    }
  };

  const handleZeroTrustTest = (action: 'spam' | 'paywall') => {
    if (action === 'spam') {
      showToast(
        'TRAVA ANTI-FARM DISPARADA',
        '15 likes detectados em 3 segundos. Regra SAST acionada: 0 PCR concedido. Curtidas unilaterais não pontuam.',
        'alert'
      );
    } else if (action === 'paywall') {
      showToast(
        'POLÍTICA ZERO-PAYWALL VIOLADA',
        'Tentativa de injeção de gateway financeiro (R$ 50). O protocolo ELO rejeita transações para camadas íntimas.',
        'alert'
      );
    }
  };

  const currentLevelNumber = pcr >= 160 && mutualKey ? 4 : pcr >= 100 ? 3 : pcr >= 50 ? 2 : 1;

  const filteredPosts = posts.filter((post) => {
    if (selectedFormat !== 'all' && post.format !== selectedFormat) return false;
    if (selectedLevel !== 'all' && post.level.toString() !== selectedLevel) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-[#030508] text-slate-200 selection:bg-neon-cyan/20 selection:text-neon-cyan relative pt-16">
      <Header />

      {/* Top Telemetry HUD */}
      <section className="border-b border-slate-800 bg-[#04060A] text-[11px] font-mono text-slate-400 px-4 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-neon-cyan font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
              {'ORBE HUD // SYS 12'}
            </span>
            <span className="text-slate-600">|</span>
            <span>PROTOCOLO ELO: KINETIC SOCIAL GRAPH</span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-emerald-400">ZERO-LEAKAGE POSTGRES SCHEMA</span>
          </div>
          <div className="flex items-center gap-4">
            <span>SYNC RATE: <strong className="text-slate-200">100%</strong></span>
            <span>LATÊNCIA: <strong className="text-emerald-400">0.02ms</strong></span>
            <span className="text-neon-cyan">orbesystems.com.br</span>
          </div>
        </div>
      </section>

      {/* Hero Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-b border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-mono text-xs uppercase tracking-widest mb-3">
              Engenharia de Grafo Social &amp; Arquitetura Zero-Trust
            </div>
            <h1 className="text-3xl sm:text-5xl font-tilt-neon font-bold text-white tracking-tight">
              Protocolo ELO <span className="text-neon-cyan">{'// v2.0'}</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl font-light">
              Desbloqueio de camadas íntimas conquistado por reciprocidade bilateral verificada. Sem paywalls, sem algoritmos de retenção tóxica e com isolamento total de banco de dados.
            </p>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap items-center bg-[#070b12] p-1.5 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setActiveTab('sim')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'sim' ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,255,245,0.4)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Simulador da Rede
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'analysis' ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,255,245,0.4)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Auditoria &amp; Dunbar
            </button>
            <button
              onClick={() => setActiveTab('db_schema')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'db_schema' ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,255,245,0.4)]' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Banco Isolado (Postgres)
            </button>
          </nav>
        </div>
      </section>

      {/* Main Workspace */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: SIMULATOR */}
        {activeTab === 'sim' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Console: Telemetry & Triggers */}
            <div className="lg:col-span-4 space-y-6">
              {/* Node Card */}
              <div className="p-5 rounded-2xl bg-[#060911] border border-neon-cyan/30 shadow-[0_0_30px_rgba(0,255,245,0.08)] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black border border-neon-cyan/50 flex items-center justify-center font-mono font-bold text-neon-cyan text-sm">
                      MC
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-sm">NODE: Marina Costa</h2>
                      <p className="text-[11px] font-mono text-slate-400">Arquitetura &amp; Design • RS</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPcr(35);
                      setMutualKey(false);
                      showToast('TELEMETRIA REINICIADA', 'Score resetado para 35 PCR padrão.', 'info');
                    }}
                    className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#090e18] hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* PCR Gauge */}
                <div className="p-4 rounded-xl bg-black/50 border border-slate-800 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">PONTOS DE CONEXÃO REAL:</span>
                    <span className="text-base font-bold text-neon-cyan">{pcr} PCR</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-neon-cyan rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((pcr / 185) * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-300">
                      Órbita Ativa: <strong className="text-neon-cyan">Nível {currentLevelNumber}</strong>
                    </span>
                    <span className={mutualKey ? 'text-emerald-400' : 'text-slate-500'}>
                      {mutualKey ? '✓ Chave Mútua Ativa' : 'Chave Pendente'}
                    </span>
                  </div>
                </div>

                {/* Interaction Triggers */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    EXECUTAR INTERAÇÃO BILATERAL:
                  </div>

                  <button
                    onClick={() => handleBilateralAction('thread')}
                    className="w-full p-3 rounded-xl bg-[#080d18] hover:bg-[#0c1424] border border-slate-800 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-neon-cyan">
                        Debater na Thread com ideia real
                      </div>
                      <div className="text-[11px] text-slate-400">Resposta recíproca do autor</div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-cyan-950/60 text-neon-cyan border border-neon-cyan/30">
                      +20 PCR
                    </span>
                  </button>

                  <button
                    onClick={() => handleBilateralAction('voice')}
                    className="w-full p-3 rounded-xl bg-[#080d18] hover:bg-[#0c1424] border border-slate-800 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-neon-cyan">
                        Trocar Áudio de 1 min sobre cotidiano
                      </div>
                      <div className="text-[11px] text-slate-400">Nota de voz bilateral confirmada</div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-cyan-950/60 text-neon-cyan border border-neon-cyan/30">
                      +30 PCR
                    </span>
                  </button>

                  <button
                    onClick={() => handleBilateralAction('video')}
                    className="w-full p-3 rounded-xl bg-[#080d18] hover:bg-[#0c1424] border border-slate-800 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-neon-cyan">
                        Assistir Vlog Longo + Enviar Reflexão
                      </div>
                      <div className="text-[11px] text-slate-400">Retenção completa + reflexão</div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-cyan-950/60 text-neon-cyan border border-neon-cyan/30">
                      +35 PCR
                    </span>
                  </button>

                  <button
                    onClick={() => handleBilateralAction('handshake')}
                    className="w-full p-3 rounded-xl bg-[#080d18] hover:bg-[#0c1424] border border-slate-800 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                        Encontro Real + Chave de Confiança
                      </div>
                      <div className="text-[11px] text-slate-400">Handshake criptográfico mútuo</div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                      +45 PCR + Chave
                    </span>
                  </button>

                  {/* Anti-Cheat / Zero-Trust Testing */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                      AUDITORIA ZERO-TRUST (TESTAR TRAVAS):
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <button
                        onClick={() => handleZeroTrustTest('spam')}
                        className="p-2.5 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-left transition-colors"
                      >
                        <div className="text-[11px] font-bold text-rose-300">15 Likes em 3s</div>
                        <div className="text-[10px] text-slate-400">Testar Anti-Farm</div>
                      </button>
                      <button
                        onClick={() => handleZeroTrustTest('paywall')}
                        className="p-2.5 rounded-lg bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-left transition-colors"
                      >
                        <div className="text-[11px] font-bold text-rose-300">Pagar R$ 50</div>
                        <div className="text-[10px] text-slate-400">Testar Anti-Paywall</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Feed Stream */}
            <div className="lg:col-span-8 space-y-4">
              {/* Filters */}
              <div className="p-4 rounded-xl bg-[#060911] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['all', 'photo', 'short', 'long', 'thread'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-3 py-1.5 rounded-lg uppercase tracking-wider text-[11px] font-semibold transition-all ${
                        selectedFormat === fmt
                          ? 'bg-neon-cyan text-black font-bold'
                          : 'bg-[#090e18] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {fmt === 'all' ? 'Todos' : fmt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">FILTRAR ÓRBITA:</span>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#04060c] border border-slate-700 text-xs text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="all">Todas as Órbitas (1 a 4)</option>
                    <option value="1">Nível 1 • Praça Pública</option>
                    <option value="2">Nível 2 • Órbita Próxima</option>
                    <option value="3">Nível 3 • Sala de Estar</option>
                    <option value="4">Nível 4 • Cofre Íntimo</option>
                  </select>
                </div>
              </div>

              {/* Feed Items */}
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const isUnlocked = pcr >= post.reqPcr && (!post.reqKey || mutualKey);
                  return (
                    <article
                      key={post.id}
                      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isUnlocked
                          ? 'bg-[#060911] border-slate-800 hover:border-slate-700'
                          : 'bg-[#04060b] border-slate-800/60 opacity-80'
                      }`}
                    >
                      {/* Post Header */}
                      <div className="px-5 py-3.5 bg-[#04060A] border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white">{post.author}</span>
                          <span className="text-slate-500">{post.handle}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">{post.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                            {post.formatLabel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              post.level === 1
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                : post.level === 2
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                                : post.level === 3
                                ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                                : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            Órbita {post.level}
                          </span>
                        </div>
                      </div>

                      {/* Post Body & Locked State */}
                      <div className="p-5 relative">
                        {isUnlocked ? (
                          <div className="space-y-3">
                            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">{post.title}</h3>
                            <p className="text-sm text-slate-300 leading-relaxed font-light">{post.body}</p>
                            <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 font-mono text-[11px] text-neon-cyan flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
                              <span>{post.mediaNote}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 font-mono text-lg">
                              🔒
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                                {'CONTEÚDO RESTRITO // ÓRBITA '}{post.level}: {post.levelName}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1 max-w-md font-sans">
                                {post.reqKey
                                  ? `Exige ${post.reqPcr} PCR e Assinatura de Chave Mútua (Dunbar ≤ 15 nós). Interaja bilateralmente para conquistar afinidade.`
                                  : `Exige ${post.reqPcr} Pontos de Conexão Real (seu saldo atual é de ${pcr} PCR).`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDITORIA & DUNBAR */}
        {activeTab === 'analysis' && (
          <div className="space-y-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#060911] border border-slate-800 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs uppercase tracking-widest">
                Blindagem SAST &amp; Engenharia Comportamental
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Os 4 Vetores de Falha das Redes Tradicionais e as Mitigações do Protocolo ELO
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-3xl font-light">
                Redes legadas forçam o <strong className="text-white">colapso de contexto</strong>: transmitir a mesma foto íntima para 2.000 desconhecidos e para amigos de infância destrói a espontaneidade humana. Abaixo documentamos as 4 travas determinísticas implementadas na Orbe Systems:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-5 rounded-xl bg-black/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold">{'VETOR 01 // STALKING & FARMING'}</span>
                    <span className="text-emerald-400 font-bold">[MITIGADO]</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Proof-of-Reciprocity Bilateral</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    O motor de pontuação computa arestas no grafo <strong>apenas com resposta verificada do autor</strong>. Flood unilateral de comentários ou curtidas em massa tem pontuação nula (0 PCR).
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-black/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold">{'VETOR 02 // MERCADO PARALELO (PIX)'}</span>
                    <span className="text-emerald-400 font-bold">[MITIGADO]</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Limite Antropológico de Dunbar (≤15)</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    O Nível 4 possui limite físico de 15 nós e o Nível 3 de 50 nós, com janela de carência de 30 dias para rotatividade de chaves. Com 15 vagas não-rotativas, monetizar venda de vagas é matematicamente inviável.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-black/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-400 font-bold">{'VETOR 03 // FADIGA DE GAMIFICAÇÃO'}</span>
                    <span className="text-emerald-400 font-bold">[MITIGADO]</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Estado de Hibernação Sem Punição</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    O protocolo oferece congelamento de decaimento sob demanda e ausência total de alertas punitivos de rebaixamento de nível, eliminando a ansiedade tóxica de “streaks”.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-black/40 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-bold">{'VETOR 04 // CUSTO DE CDN PARA 4K'}</span>
                    <span className="text-emerald-400 font-bold">[MITIGADO]</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Sustentabilidade via Orbe Vault</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    Monetização ancorada no armazenamento de arquivo criptografado de longo prazo (Orbe Vault RAW/4K) e parcerias contextuais restritas unicamente à superfície pública (Nível 1).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BANCO DE DADOS ISOLADO (POSTGRES) */}
        {activeTab === 'db_schema' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#060911] border border-neon-cyan/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-neon-cyan font-bold uppercase tracking-widest">
                    {'Segurança de Banco de Dados // Zero Lateral Leakage'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                    Arquitetura de Isolamento no PostgreSQL da Orbe
                  </h2>
                </div>
                <span className="px-3 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs">
                  SCHEMA: elo_network (ISOLADO)
                </span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed font-light">
                Para garantir que a rede social ELO viva no mesmo banco de dados da Orbe Systems <strong>sem nenhuma chance de vazamento lateral ou interferência em tabelas de outros projetos</strong> (como CRM, Opt-Out, Inho ou Usuários Master), adotamos a estratégia de <strong className="text-white">Hard-Schema Segregation + Role-Based Access Control (RBAC) + Row Level Security (RLS)</strong>:
              </p>

              {/* Architecture Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono pt-2">
                <div className="p-4 rounded-xl bg-black/60 border border-slate-800 space-y-1.5">
                  <span className="text-neon-cyan font-bold">{'01 // NAMESPACE EXCLUSIVO'}</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Todas as tabelas residem sob o schema dedicado <code>elo_network.*</code>, completamente desacopladas de <code>public.*</code>. Nenhuma query da ELO enxerga tabelas de terceiros.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-slate-800 space-y-1.5">
                  <span className="text-neon-cyan font-bold">{'02 // ROLE & PERMISSÕES FECHADAS'}</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Usuário de banco <code>elo_service_role</code> possui <code>REVOKE ALL ON SCHEMA public</code>, impedindo qualquer injeção lateral de consultas transversais.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/60 border border-slate-800 space-y-1.5">
                  <span className="text-neon-cyan font-bold">{'03 // RLS MULTI-TENANT POR PCR'}</span>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Políticas nativas de PostgreSQL RLS (<code>ALTER TABLE ... ENABLE ROW LEVEL SECURITY</code>) validam o nível criptográfico do espectador antes de liberar payloads de mídia.
                  </p>
                </div>
              </div>

              {/* SQL DDL Showcase */}
              <div className="rounded-xl bg-[#020306] border border-slate-800 p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed">
                <pre>{`-- ORBE SYSTEMS // ELO SOCIAL PROTOCOL - PRODUCTION SCHEMA ISOLATION
-- Garante isolamento estrito contra vazamento lateral e interferência em outros bancos.

CREATE SCHEMA IF NOT EXISTS elo_network;

-- 1. NÓS DA REDE SOCIAL (ISOLADOS DE USUÁRIOS PUBLIC)
CREATE TABLE elo_network.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE, -- Referência lógica de auth, sem foreign key intrusiva
    handle VARCHAR(64) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    bio_vault TEXT,
    public_identity_key TEXT NOT NULL, -- Chave pública para assinatura de arestas
    dunbar_vault_count INT DEFAULT 0 CHECK (dunbar_vault_count <= 15),
    lounge_count INT DEFAULT 0 CHECK (lounge_count <= 50),
    is_hibernating BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. GRAFO DETERMINÍSTICO DE RECIPROCIDADE BILATERAL (ARESTAS PCR)
CREATE TABLE elo_network.bilateral_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_a_id UUID NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    node_b_id UUID NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    pcr_score INT DEFAULT 0 CHECK (pcr_score >= 0),
    verified_replies INT DEFAULT 0,
    voice_notes_count INT DEFAULT 0,
    mutual_key_signed BOOLEAN DEFAULT FALSE,
    orbit_level INT DEFAULT 1 CHECK (orbit_level BETWEEN 1 AND 4),
    cooldown_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_bilateral_pair UNIQUE (node_a_id, node_b_id),
    CONSTRAINT no_self_connection CHECK (node_a_id != node_b_id)
);

-- 3. POSTS EM CAMADAS (FOTO, VÍDEO CURTO, VÍDEO LONGO, THREAD)
CREATE TABLE elo_network.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_node_id UUID NOT NULL REFERENCES elo_network.nodes(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('photo', 'short', 'long', 'thread')),
    orbit_level INT NOT NULL CHECK (orbit_level BETWEEN 1 AND 4),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    media_url TEXT, -- URL assinada ou ponteiro S3/Cloudflare Stream
    media_metadata JSONB DEFAULT '{}'::jsonb,
    is_zero_trust_locked BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TRAVA DE AUDITORIA CONTRA SPAM & ANTI-PAYWALL (APPEND-ONLY LEDGER)
CREATE TABLE elo_network.audit_ledger (
    id BIGSERIAL PRIMARY KEY,
    sender_node_id UUID NOT NULL REFERENCES elo_network.nodes(id),
    target_node_id UUID NOT NULL REFERENCES elo_network.nodes(id),
    event_type VARCHAR(50) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL, -- SHA-256 do handshake
    pcr_delta INT DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE elo_network.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.bilateral_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_network.audit_ledger ENABLE ROW LEVEL SECURITY;`}</pre>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Notification Toast */}
      {toast.visible && (
        <aside
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-xl border border-neon-cyan/40 bg-[#070B12]/95 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md font-mono text-xs space-y-1.5 transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-bold tracking-wider uppercase ${
                toast.type === 'alert' ? 'text-rose-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-neon-cyan'
              }`}
            >
              [{toast.title}]
            </span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className="text-slate-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 font-sans leading-relaxed">{toast.message}</p>
        </aside>
      )}

      <Footer />
    </main>
  );
}
