'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Compass,
  PlusSquare,
  User,
  Lock,
  Shield,
  Sparkles,
  LogOut,
  Mic,
  Video,
  Image as ImageIcon,
  Grid,
  MoreHorizontal,
  Search,
  CheckCircle2,
  Share2,
  Layers,
  KeyRound,
  X,
  Volume2
} from 'lucide-react';

interface Story {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  orbitLevel: number;
  hasUnread: boolean;
  mediaText: string;
}

interface Comment {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  text: string;
  time: string;
  isAuthorReply?: boolean;
}

interface Post {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  orbitLevel: 1 | 2 | 3 | 4;
  reqPcr: number;
  reqKey: boolean;
  image: string;
  caption: string;
  format: 'photo' | 'short' | 'long' | 'thread';
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: Comment[];
  affinityPcr: number;
}

interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  postsCount: number;
  pcrScore: number;
  dunbarCount: number;
  dunbarMax: number;
  mutualKeySigned: boolean;
}

const DEMO_ACCOUNTS: Record<string, UserProfile> = {
  lucas: {
    id: 'u_lucas',
    name: 'Lucas Amaral',
    handle: '@lucas_amaral',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Software Engineer & Systems Architect. Explorando redes de reciprocidade determinística na @orbesystems.',
    postsCount: 18,
    pcrScore: 120,
    dunbarCount: 8,
    dunbarMax: 15,
    mutualKeySigned: true,
  },
  marina: {
    id: 'u_marina',
    name: 'Marina Costa',
    handle: '@marinacosta',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Arquitetura de Espaços & Cinema de Autor. Porto Alegre, RS. Membro do núcleo fundador Mesh Social.',
    postsCount: 34,
    pcrScore: 185,
    dunbarCount: 12,
    dunbarMax: 15,
    mutualKeySigned: true,
  },
  bia: {
    id: 'u_bia',
    name: 'Bia Nunes',
    handle: '@bia_nunes',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    bio: 'Pesquisadora em Interação Humana & Grafos Sociais. Curadoria sem algoritmos de retenção.',
    postsCount: 12,
    pcrScore: 55,
    dunbarCount: 4,
    dunbarMax: 15,
    mutualKeySigned: false,
  },
};

const INITIAL_STORIES: Story[] = [
  {
    id: 's1',
    name: 'Marina',
    handle: '@marinacosta',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 4,
    hasUnread: true,
    mediaText: 'Ajustando a luz natural do novo estúdio no Bom Fim. Captura RAW 60fps.',
  },
  {
    id: 's2',
    name: 'Lucas',
    handle: '@lucas_amaral',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 3,
    hasUnread: true,
    mediaText: 'Servidor Proxmox rodando silencioso no rack. Conexão real > feed de dopamina.',
  },
  {
    id: 's3',
    name: 'Bia',
    handle: '@bia_nunes',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 2,
    hasUnread: true,
    mediaText: 'Café da manhã lendo sobre o colapso de contexto das redes de 2015 a 2026.',
  },
  {
    id: 's4',
    name: 'Diego',
    handle: '@diego_arq',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 1,
    hasUnread: false,
    mediaText: 'Fachada em concreto aparente finalizada hoje no Moinhos.',
  },
  {
    id: 's5',
    name: 'Elena',
    handle: '@elena_cine',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 3,
    hasUnread: false,
    mediaText: 'Tratamento de cor do curta metragem em andamento no DaVinci.',
  },
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    author: 'Marina Costa',
    handle: '@marinacosta',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    time: 'Há 2 horas',
    orbitLevel: 1,
    reqPcr: 0,
    reqKey: false,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    caption: 'Estudo de iluminação natural e reflexão acústica no novo espaço. O contraste de fim de tarde dispensou qualquer filtro comercial. A beleza da arquitetura está na verdade dos materiais.',
    format: 'photo',
    likes: 48,
    isLiked: false,
    isSaved: false,
    affinityPcr: 120,
    comments: [
      {
        id: 'c1',
        author: 'Lucas Amaral',
        handle: '@lucas_amaral',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        text: 'A entrada de luz zenital ficou perfeita com esse piso de madeira.',
        time: '1h atrás',
      },
      {
        id: 'c2',
        author: 'Marina Costa',
        handle: '@marinacosta',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        text: 'Obrigada Lucas! Ajudou muito no isolamento do eco para gravações.',
        time: '45m atrás',
        isAuthorReply: true,
      },
    ],
  },
  {
    id: 'post_2',
    author: 'Marina Costa',
    handle: '@marinacosta',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    time: 'Há 5 horas',
    orbitLevel: 2,
    reqPcr: 50,
    reqKey: false,
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    caption: 'Órbita 2 (Amigos Frequentes) · Bastidores reais da bancada de montagem. Ainda tem caixas pelo chão, mas o workstation já tá rodando os renders em 4K. Café sempre passado na hora pra quem vier.',
    format: 'photo',
    likes: 27,
    isLiked: true,
    isSaved: false,
    affinityPcr: 120,
    comments: [
      {
        id: 'c3',
        author: 'Bia Nunes',
        handle: '@bia_nunes',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
        text: 'Essa mesa de carvalho maciço ficou incrível! Semana que vem passo aí.',
        time: '3h atrás',
      },
    ],
  },
  {
    id: 'post_3',
    author: 'Marina Costa',
    handle: '@marinacosta',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    time: 'Ontem',
    orbitLevel: 3,
    reqPcr: 100,
    reqKey: false,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    caption: 'Órbita 3 (Sala de Estar) · Vlog Longo [16:24 min 4K HDR]: Por que recusei a oferta da agência de marketing para manter 100% de controle sobre o estúdio e o tempo com a família.',
    format: 'long',
    likes: 19,
    isLiked: false,
    isSaved: true,
    affinityPcr: 120,
    comments: [
      {
        id: 'c4',
        author: 'Lucas Amaral',
        handle: '@lucas_amaral',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        text: 'Decisão muito corajosa Marina. A autonomia criativa compensa qualquer salário corporativo.',
        time: 'Ontem',
      },
    ],
  },
  {
    id: 'post_4',
    author: 'Marina Costa',
    handle: '@marinacosta',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    time: 'Há 2 dias',
    orbitLevel: 4,
    reqPcr: 160,
    reqKey: true,
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
    caption: '🔒 ÓRBITA 4 (DUNBAR VAULT ≤ 15 NÓS) · Arquivo íntimo de família na serra gaúcha. Sem edição, sem maquiagem e sem alcance público. Apenas para quem guarda a chave mútua de confiança.',
    format: 'photo',
    likes: 8,
    isLiked: false,
    isSaved: false,
    affinityPcr: 120,
    comments: [],
  },
];

export default function MeshSocialApp() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [currentAccountKey, setCurrentAccountKey] = useState<string>('lucas');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_ACCOUNTS.lucas);

  // Navigation
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'vault' | 'profile'>('feed');

  // Stories modal
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Posts state
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  // Create Post Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newOrbit, setNewOrbit] = useState<1 | 2 | 3 | 4>(1);
  const [newFormat, setNewFormat] = useState<'photo' | 'short' | 'long' | 'thread'>('photo');

  // Comment input state per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSwitchAccount = (key: string) => {
    setCurrentAccountKey(key);
    setCurrentUser(DEMO_ACCOUNTS[key]);
    showToast(`Conectado como ${DEMO_ACCOUNTS[key].name} (${DEMO_ACCOUNTS[key].handle})`);
  };

  const handleLikePost = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const nextLiked = !p.isLiked;
          return {
            ...p,
            isLiked: nextLiked,
            likes: nextLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
  };

  const handleSavePost = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const nextSaved = !p.isSaved;
          showToast(nextSaved ? 'Publicação salva na sua coleção privada' : 'Publicação removida dos salvos');
          return { ...p, isSaved: nextSaved };
        }
        return p;
      })
    );
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      author: currentUser.name,
      handle: currentUser.handle,
      avatar: currentUser.avatar,
      text: text,
      time: 'Agora mesmo',
    };

    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, newComment],
          };
        }
        return p;
      })
    );

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    // Simulação de reciprocidade: autora responde e aumenta PCR
    setTimeout(() => {
      const authorReply: Comment = {
        id: `reply_${Date.now()}`,
        author: 'Marina Costa',
        handle: '@marinacosta',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        text: 'Obrigada pelo comentário! Diálogo mútuo verificado no Mesh Social (+20 PCR adicionados ao grafo bilateral).',
        time: 'Agora',
        isAuthorReply: true,
      };

      setPosts(prev =>
        prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              affinityPcr: p.affinityPcr + 20,
              comments: [...p.comments, authorReply],
            };
          }
          return p;
        })
      );

      setCurrentUser(prev => ({
        ...prev,
        pcrScore: prev.pcrScore + 20,
      }));

      showToast('⚡ Reciprocidade Bilateral confirmada! +20 PCR concedidos no seu elo com @marinacosta.');
    }, 1200);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;

    const created: Post = {
      id: `post_${Date.now()}`,
      author: currentUser.name,
      handle: currentUser.handle,
      avatar: currentUser.avatar,
      time: 'Agora mesmo',
      orbitLevel: newOrbit,
      reqPcr: newOrbit === 1 ? 0 : newOrbit === 2 ? 50 : newOrbit === 3 ? 100 : 160,
      reqKey: newOrbit === 4,
      image: newFormat === 'photo' 
        ? 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      caption: `${newTitle ? `**${newTitle}**\n\n` : ''}${newCaption}`,
      format: newFormat,
      likes: 1,
      isLiked: true,
      isSaved: false,
      affinityPcr: 0,
      comments: [],
    };

    setPosts([created, ...posts]);
    setIsCreateOpen(false);
    setNewTitle('');
    setNewCaption('');
    showToast(`✓ Publicação lançada na Órbita ${newOrbit}!`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA DE LOGIN (ESTILO INSTAGRAM DARK CYBER)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#030508] text-slate-100 flex items-center justify-center p-4 selection:bg-neon-cyan/20 selection:text-neon-cyan font-sans relative overflow-hidden">
        {/* Ambient Grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,255,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,0.05) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
          {/* Mockup visual à esquerda */}
          <div className="hidden md:flex flex-col items-center justify-center p-6 relative">
            <div className="w-[300px] h-[580px] rounded-[3rem] border-4 border-slate-800 bg-[#070b12] shadow-[0_0_60px_rgba(0,255,245,0.15)] overflow-hidden flex flex-col p-4 relative group">
              {/* Notch */}
              <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-4 border border-slate-800" />
              
              {/* Feed Preview */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono text-neon-cyan">
                <span>MESH SOCIAL</span>
                <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              </div>

              {/* Story Rings */}
              <div className="flex gap-2 py-3 overflow-hidden">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className="w-11 h-11 rounded-full p-0.5 border-2 border-neon-cyan/70 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-800" />
                  </div>
                ))}
              </div>

              {/* Card Preview */}
              <div className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-800 p-3 space-y-2">
                <div className="w-full h-40 rounded-xl bg-slate-800/80 animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-800 rounded" />
                <div className="h-2 w-1/2 bg-slate-800/60 rounded" />
                <div className="pt-2 flex justify-between text-slate-500 text-xs font-mono">
                  <span>PCR: 120</span>
                  <span className="text-neon-cyan">Órbita 3</span>
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="pt-3 border-t border-slate-800 flex justify-around text-slate-500 text-xs">
                <span>●</span>
                <span>▲</span>
                <span>■</span>
              </div>
            </div>
          </div>

          {/* Form de Login à direita */}
          <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="p-8 rounded-3xl bg-[#070a12]/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-mono uppercase tracking-widest">
                  <Shield className="w-3.5 h-3.5" />
                  Zero-Trust Network
                </div>
                <h1 className="text-3xl font-tilt-neon font-bold text-white tracking-tight">
                  Mesh Social
                </h1>
                <p className="text-xs text-slate-400">
                  Conexão real, mídias em 4K e sem algoritmos de retenção comercial.
                </p>
              </div>

              {/* Form Inputs */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsLoggedIn(true);
                  showToast(`Bem-vindo de volta, ${currentUser.name}!`);
                }}
                className="space-y-3.5"
              >
                <div>
                  <input
                    type="text"
                    defaultValue={currentUser.handle}
                    placeholder="Nome de usuário, e-mail ou handle"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#04060b] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan transition-colors"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    defaultValue="••••••••••••"
                    placeholder="Senha"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#04060b] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-neon-cyan text-black font-bold text-sm hover:bg-cyan-300 transition-all duration-300 shadow-[0_0_25px_rgba(0,255,245,0.35)]"
                >
                  Entrar no Mesh Social
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-[11px] font-mono uppercase">OU ACESSE COM TESTE</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Quick Login Test Pills */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchAccount('lucas');
                    setIsLoggedIn(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#05080e] hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan" />
                    <span>Entrar como <strong>@lucas_amaral</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-neon-cyan">Engenheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSwitchAccount('marina');
                    setIsLoggedIn(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#05080e] hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Entrar como <strong>@marinacosta</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300">Autora</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070a12]/60 border border-slate-800/80 text-center text-xs text-slate-400">
              Não tem uma conta?{' '}
              <button 
                onClick={() => {
                  handleSwitchAccount('bia');
                  setIsLoggedIn(true);
                }} 
                className="text-neon-cyan font-bold hover:underline"
              >
                Cadastre-se na rede
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APLICAÇÃO PRINCIPAL LOGADA (DASHBOARD INSTAGRAM-STYLE)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 font-sans selection:bg-neon-cyan/20 selection:text-neon-cyan flex flex-col md:flex-row">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SIDEBAR ESQUERDA (DESKTOP) / HEADER / BOTTOM BAR (MOBILE) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 lg:w-72 md:h-screen md:sticky md:top-0 border-r border-slate-800 bg-[#05070d]/95 backdrop-blur-xl flex flex-col justify-between p-4 z-40 shrink-0">
        <div className="space-y-6">
          {/* Logo & Marca */}
          <div className="flex items-center justify-between pt-2 px-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan group-hover:shadow-[0_0_15px_rgba(0,255,245,0.4)] transition-all">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-tilt-neon font-bold text-lg text-white tracking-tight">Mesh Social</span>
                <span className="block text-[9px] font-mono text-neon-cyan tracking-widest">ORBE SYSTEMS</span>
              </div>
            </Link>

            <button
              onClick={() => setIsLoggedIn(false)}
              title="Sair / Testar Tela de Login"
              className="md:hidden text-slate-400 hover:text-rose-400 p-1.5"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('feed')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'feed'
                  ? 'bg-neon-cyan/15 text-neon-cyan font-bold shadow-[0_0_20px_rgba(0,255,245,0.15)] border border-neon-cyan/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Compass className="w-5 h-5" />
              <span>Página Inicial</span>
            </button>

            <button
              onClick={() => setActiveTab('explore')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'explore'
                  ? 'bg-neon-cyan/15 text-neon-cyan font-bold shadow-[0_0_20px_rgba(0,255,245,0.15)] border border-neon-cyan/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>Explorar Órbitas</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
            >
              <PlusSquare className="w-5 h-5 text-neon-cyan" />
              <span>Criar Publicação</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'vault'
                  ? 'bg-neon-cyan/15 text-neon-cyan font-bold shadow-[0_0_20px_rgba(0,255,245,0.15)] border border-neon-cyan/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Lock className="w-5 h-5 text-purple-400" />
              <div className="flex items-center justify-between flex-1">
                <span>Cofre Dunbar</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30">
                  {currentUser.dunbarCount}/{currentUser.dunbarMax}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-neon-cyan/15 text-neon-cyan font-bold shadow-[0_0_20px_rgba(0,255,245,0.15)] border border-neon-cyan/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Meu Perfil</span>
            </button>
          </nav>
        </div>

        {/* User Card & Switcher (Bottom of sidebar) */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          {/* Active Profile Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#030408] border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border border-neon-cyan/40 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] font-mono text-neon-cyan truncate">{currentUser.handle}</div>
              </div>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              title="Trocar de Conta / Sair"
              className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Profile Switch */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span>Alternar Conta:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleSwitchAccount('lucas')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  currentAccountKey === 'lucas' ? 'bg-neon-cyan text-black font-bold' : 'hover:bg-slate-800'
                }`}
              >
                Lucas
              </button>
              <button
                onClick={() => handleSwitchAccount('marina')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  currentAccountKey === 'marina' ? 'bg-neon-cyan text-black font-bold' : 'hover:bg-slate-800'
                }`}
              >
                Marina
              </button>
              <button
                onClick={() => handleSwitchAccount('bia')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  currentAccountKey === 'bia' ? 'bg-neon-cyan text-black font-bold' : 'hover:bg-slate-800'
                }`}
              >
                Bia
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CONTEÚDO PRINCIPAL (FEED CENTRAL & WIDGETS) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-24 md:pb-8 space-y-6">
        {/* =================================================================== */}
        {/* ABA: FEED PRINCIPAL (INSTAGRAM STYLE) */}
        {/* =================================================================== */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Top Stories Bar (Glowing Orbit Rings) */}
            <div className="p-4 rounded-2xl bg-[#060911] border border-slate-800 flex items-center gap-4 overflow-x-auto no-scrollbar">
              {/* Meu Story (Add) */}
              <button 
                onClick={() => setIsCreateOpen(true)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-neon-cyan/50 group-hover:border-neon-cyan transition-colors flex items-center justify-center">
                  <img
                    src={currentUser.avatar}
                    alt="Você"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-neon-cyan text-black flex items-center justify-center text-xs font-bold shadow-md">
                    +
                  </div>
                </div>
                <span className="text-[11px] text-slate-300">Seu story</span>
              </button>

              {/* Stories de Amigos */}
              {INITIAL_STORIES.map(story => (
                <button
                  key={story.id}
                  onClick={() => setSelectedStory(story)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                >
                  <div
                    className={`w-16 h-16 rounded-full p-0.5 transition-all duration-300 ${
                      story.orbitLevel === 4
                        ? 'bg-gradient-to-tr from-purple-500 via-rose-500 to-amber-400 p-[2.5px] shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : story.orbitLevel === 3
                        ? 'bg-gradient-to-tr from-neon-cyan via-blue-500 to-indigo-500 p-[2px] shadow-[0_0_12px_rgba(0,255,245,0.3)]'
                        : 'border-2 border-slate-700 p-0.5'
                    }`}
                  >
                    <img
                      src={story.avatar}
                      alt={story.name}
                      className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[11px] text-slate-300 truncate max-w-[64px]">{story.name}</span>
                </button>
              ))}
            </div>

            {/* Posts Stream */}
            <div className="space-y-8">
              {posts.map(post => {
                const isLocked = currentUser.pcrScore < post.reqPcr;

                return (
                  <article
                    key={post.id}
                    className="rounded-3xl bg-[#060911] border border-slate-800 shadow-xl overflow-hidden"
                  >
                    {/* Header do Post */}
                    <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.avatar}
                          alt={post.author}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{post.author}</span>
                            <span className="text-xs text-slate-500">{post.handle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span>{post.time}</span>
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold ${
                                post.orbitLevel === 1
                                  ? 'text-cyan-400 bg-cyan-950/60'
                                  : post.orbitLevel === 2
                                  ? 'text-blue-400 bg-blue-950/60'
                                  : post.orbitLevel === 3
                                  ? 'text-purple-400 bg-purple-950/60'
                                  : 'text-rose-400 bg-rose-950/60'
                              }`}
                            >
                              Órbita {post.orbitLevel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.affinityPcr > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan">
                            {post.affinityPcr} PCR
                          </span>
                        )}
                        <button className="text-slate-500 hover:text-white p-1">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Mídia do Post (com trava se não atender ao PCR) */}
                    <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                      {isLocked ? (
                        <div className="p-6 text-center space-y-3 z-10 flex flex-col items-center">
                          <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
                            <Lock className="w-7 h-7" />
                          </div>
                          <h3 className="text-base font-bold text-white">Conteúdo Restrito à Órbita {post.orbitLevel}</h3>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Exige {post.reqPcr} PCR de reciprocidade bilateral. O seu saldo atual com {post.author} é de {currentUser.pcrScore} PCR.
                          </p>
                          <button
                            onClick={() => {
                              showToast('Dica: Envie comentários relevantes ou áudios nos posts abertos para aumentar seu PCR!');
                            }}
                            className="px-4 py-2 rounded-xl bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan text-xs font-bold hover:bg-neon-cyan/30 transition-colors"
                          >
                            Como Desbloquear
                          </button>
                        </div>
                      ) : (
                        <img
                          src={post.image}
                          alt={post.caption}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Watermark / Badge de Formato */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono uppercase text-slate-200">
                        {post.format === 'photo' ? 'Foto RAW' : post.format === 'long' ? '4K HDR' : 'Vídeo'}
                      </div>
                    </div>

                    {/* Barra de Ações (Estilo Instagram) */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className="transition-transform active:scale-125"
                          >
                            <Heart
                              className={`w-6 h-6 ${
                                post.isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-300 hover:text-white'
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => {
                              const el = document.getElementById(`input_${post.id}`);
                              el?.focus();
                            }}
                            className="text-slate-300 hover:text-white"
                          >
                            <MessageCircle className="w-6 h-6" />
                          </button>

                          <button
                            onClick={() => {
                              showToast('⚡ Grafo compartilhado via link criptográfico efêmero.');
                            }}
                            className="text-slate-300 hover:text-white"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleSavePost(post.id)}
                          className="text-slate-300 hover:text-white"
                        >
                          <Bookmark
                            className={`w-6 h-6 ${post.isSaved ? 'fill-neon-cyan text-neon-cyan' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Contador de Curtidas */}
                      <div className="text-xs font-bold text-white">
                        {post.likes} curtidas
                      </div>

                      {/* Legenda */}
                      <div className="text-xs text-slate-300 leading-relaxed">
                        <span className="font-bold text-white mr-2">{post.author}</span>
                        {post.caption}
                      </div>

                      {/* Comentários */}
                      {post.comments.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60 space-y-2">
                          <div className="text-[11px] font-mono text-slate-500">
                            Comentários com validação recíproca:
                          </div>
                          {post.comments.map(c => (
                            <div
                              key={c.id}
                              className={`text-xs p-2 rounded-xl ${
                                c.isAuthorReply
                                  ? 'bg-neon-cyan/5 border border-neon-cyan/20 text-slate-200'
                                  : 'text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <span>{c.author}</span>
                                {c.isAuthorReply && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neon-cyan text-black font-extrabold uppercase">
                                    Autora
                                  </span>
                                )}
                                <span className="text-[10px] font-normal text-slate-500 ml-auto">{c.time}</span>
                              </div>
                              <p className="mt-0.5">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Caixa de Entrada de Comentário */}
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-800/60">
                        <input
                          id={`input_${post.id}`}
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post.id);
                          }}
                          placeholder="Adicione um comentário com ideia real..."
                          className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="text-xs font-bold text-neon-cyan disabled:text-slate-600 transition-colors"
                        >
                          Publicar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA: EXPLORAR ÓRBITAS */}
        {/* =================================================================== */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white font-tilt-neon">Explorar Órbitas de Conexão</h2>
              <span className="text-xs font-mono text-neon-cyan">GRAFO DESCENTRALIZADO</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-black group cursor-pointer border border-slate-800"
                >
                  <img
                    src={post.image}
                    alt={post.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                    <span className="text-[10px] font-mono text-neon-cyan">Órbita {post.orbitLevel}</span>
                    <p className="text-xs line-clamp-2">{post.caption}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span>♥ {post.likes}</span>
                      <span>💬 {post.comments.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA: COFRE DUNBAR (≤ 15 NÓS ÍNTIMOS) */}
        {/* =================================================================== */}
        {activeTab === 'vault' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#070a14] border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/50 flex items-center justify-center text-purple-300">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Cofre Dunbar (Nível 4)</h2>
                    <p className="text-xs text-slate-400">Limite físico de 15 pessoas para preservação da intimidade humana.</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-bold text-purple-300">
                    {currentUser.dunbarCount} / {currentUser.dunbarMax}
                  </div>
                  <div className="text-[10px] text-slate-500">VAGAS OCUPADAS</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                No Mesh Social, o Nível 4 não pode ser comprado por assinatura, pix ou paywall. Apenas conexões com mais de <strong>160 PCR</strong> e com <strong>Chave Mútua Criptográfica assinada</strong> têm acesso a memórias sem filtro, álbuns de família e vlogs pessoais.
              </div>

              {/* Lista dos Nós no Cofre */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Nós Verificados no seu Cofre:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Marina Costa (@marinacosta)', 'Bia Nunes (@bia_nunes)', 'Diego Souza (@diego_arq)', 'Elena Rocha (@elena_cine)'].map((friend, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white">{friend}</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-300">CHAVE ATIVA</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA: MEU PERFIL (ESTILO INSTAGRAM) */}
        {/* =================================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Cabeçalho do Perfil */}
            <div className="p-6 rounded-3xl bg-[#060911] border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,255,245,0.3)]"
                />

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
                    <span className="text-xs font-mono text-neon-cyan">{currentUser.handle}</span>
                    <button
                      onClick={() => showToast('Perfil editado com sucesso.')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                    >
                      Editar Perfil
                    </button>
                  </div>

                  <div className="flex justify-center sm:justify-start gap-6 text-xs font-mono">
                    <div>
                      <strong className="text-white text-sm">{currentUser.postsCount}</strong> publicações
                    </div>
                    <div>
                      <strong className="text-neon-cyan text-sm">{currentUser.pcrScore}</strong> PCR Afeto
                    </div>
                    <div>
                      <strong className="text-purple-300 text-sm">{currentUser.dunbarCount}/15</strong> Dunbar
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-light">
                    {currentUser.bio}
                  </p>
                </div>
              </div>
            </div>

            {/* Abas da Grelha */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex justify-center gap-8 text-xs font-mono uppercase tracking-wider text-slate-400">
                <button className="flex items-center gap-2 text-neon-cyan font-bold border-t-2 border-neon-cyan pt-2 -mt-4">
                  <Grid className="w-4 h-4" />
                  <span>Publicações</span>
                </button>
                <button className="flex items-center gap-2 hover:text-white pt-2 -mt-4">
                  <Video className="w-4 h-4" />
                  <span>Reels / Vídeos</span>
                </button>
                <button className="flex items-center gap-2 hover:text-white pt-2 -mt-4">
                  <Bookmark className="w-4 h-4" />
                  <span>Salvos</span>
                </button>
              </div>

              {/* Grid 3 colunas Instagram */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6">
                {posts.map(post => (
                  <div
                    key={post.id}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black border border-slate-800 group"
                  >
                    <img
                      src={post.image}
                      alt={post.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-xs font-bold">
                      <span>♥ {post.likes}</span>
                      <span>💬 {post.comments.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CRIAR PUBLICAÇÃO (ESTILO INSTAGRAM) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#070b14] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between font-mono text-xs text-white">
              <span className="font-bold uppercase tracking-wider text-neon-cyan">Nova Publicação</span>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Título ou Ensaio (Opcional)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Registro do novo estúdio..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04060c] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Legenda da Publicação
                </label>
                <textarea
                  rows={4}
                  required
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Compartilhe um relato sincero sem pretensão de métricas de vaidade..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04060c] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1">
                    Formato da Mídia
                  </label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#04060c] border border-slate-800 text-xs text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="photo">Foto RAW (1:1 / 4:5)</option>
                    <option value="short">Vídeo Curto (9:16)</option>
                    <option value="long">Vídeo Longo (4K 16:9)</option>
                    <option value="thread">Thread / Ensaio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 uppercase mb-1">
                    Órbita de Acesso
                  </label>
                  <select
                    value={newOrbit}
                    onChange={(e) => setNewOrbit(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#04060c] border border-slate-800 text-xs text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value={1}>Órbita 1: Praça Pública (Aberto)</option>
                    <option value={2}>Órbita 2: Amigos (50+ PCR)</option>
                    <option value={3}>Órbita 3: Sala de Estar (100+ PCR)</option>
                    <option value={4}>Órbita 4: Cofre Dunbar (≤ 15 Nós)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-[11px] text-slate-400">
                🔒 <strong>Zero-Paywall Garantido:</strong> Cobranças via Pix ou links de assinatura são bloqueados automaticamente nas órbitas privadas.
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-neon-cyan hover:bg-cyan-300 text-black text-xs font-bold shadow-[0_0_20px_rgba(0,255,245,0.3)]"
                >
                  Compartilhar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: STORY VIEWER */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm h-[580px] rounded-3xl bg-[#080d1a] border border-slate-800 overflow-hidden flex flex-col justify-between p-6 shadow-2xl">
            {/* Top Bar do Story */}
            <div className="space-y-3">
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="w-full h-full bg-neon-cyan animate-pulse" />
              </div>
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedStory.avatar}
                    alt={selectedStory.name}
                    className="w-8 h-8 rounded-full object-cover border border-neon-cyan"
                  />
                  <div>
                    <div className="text-xs font-bold">{selectedStory.name}</div>
                    <div className="text-[10px] text-neon-cyan">{selectedStory.handle}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStory(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Story */}
            <div className="text-center space-y-4 p-4">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan">
                ÓRBITA {selectedStory.orbitLevel}
              </span>
              <p className="text-base text-white font-light leading-relaxed">
                "{selectedStory.mediaText}"
              </p>
            </div>

            {/* Resposta Rápida */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Responder a ${selectedStory.name}...`}
                className="flex-1 px-4 py-2.5 rounded-full bg-black/60 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan"
              />
              <button
                onClick={() => {
                  setSelectedStory(null);
                  showToast(`Mensagem enviada para ${selectedStory.name}! (+10 PCR de diálogo)`);
                }}
                className="p-2.5 rounded-full bg-neon-cyan text-black"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TOAST FLUTUANTE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <aside
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl border border-neon-cyan/40 bg-[#070b14]/95 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {toastMessage}
        </aside>
      )}
    </div>
  );
}
