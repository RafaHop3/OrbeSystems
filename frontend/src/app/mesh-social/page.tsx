'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  Grid,
  MoreHorizontal,
  Search,
  CheckCircle2,
  X,
  Volume2,
  Loader2,
  Share2,
  Camera,
  Video,
  Smile
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
  image: string;
  caption: string;
  format: 'photo' | 'short' | 'long' | 'thread';
  likes: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: Comment[];
}

interface UserProfile {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatar: string;
  bio: string;
  provider: 'google' | 'direct' | 'demo';
  postsCount: number;
  friendsCount: number;
  bestFriendsCount: number;
}

const DEFAULT_GOOGLE_USER: UserProfile = {
  id: 'u_google_rafael',
  name: 'Rafael Souza',
  handle: '@rafael',
  email: 'rafael@orbesystems.com.br',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
  bio: 'Criador & entusiasta de conexões autênticas na Orbe Systems. Vivendo sem algoritmos manipuladores.',
  provider: 'google',
  postsCount: 14,
  friendsCount: 42,
  bestFriendsCount: 7,
};

const DEMO_ACCOUNTS: Record<string, UserProfile> = {
  rafael: DEFAULT_GOOGLE_USER,
  lucas: {
    id: 'u_lucas',
    name: 'Lucas Amaral',
    handle: '@lucas_amaral',
    email: 'lucas@mesh.social',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Software Engineer & Systems Architect. Explorando redes de amizade real na @orbesystems.',
    provider: 'demo',
    postsCount: 18,
    friendsCount: 35,
    bestFriendsCount: 8,
  },
  marina: {
    id: 'u_marina',
    name: 'Marina Costa',
    handle: '@marinacosta',
    email: 'marina@mesh.social',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Arquitetura de Espaços & Cinema de Autor. Porto Alegre, RS. Apaixonada por luz natural e café.',
    provider: 'demo',
    postsCount: 34,
    friendsCount: 50,
    bestFriendsCount: 12,
  },
  bia: {
    id: 'u_bia',
    name: 'Bia Nunes',
    handle: '@bia_nunes',
    email: 'bia@mesh.social',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    bio: 'Pesquisadora em Interação Humana & Fotografia Urbana. Menos filtros, mais presença.',
    provider: 'demo',
    postsCount: 12,
    friendsCount: 28,
    bestFriendsCount: 5,
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
    mediaText: 'Ajustando a luz natural do novo estúdio no Bom Fim. Captura RAW sem nenhum filtro.',
  },
  {
    id: 's2',
    name: 'Lucas',
    handle: '@lucas_amaral',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 3,
    hasUnread: true,
    mediaText: 'Café da manhã fresquinho e preparando o novo release da Orbe. Conexão real > dopamina rápida.',
  },
  {
    id: 's3',
    name: 'Bia',
    handle: '@bia_nunes',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 2,
    hasUnread: true,
    mediaText: 'Caminhada matinal pela orla do Guaíba observando o reflexo dourado das águas.',
  },
  {
    id: 's4',
    name: 'Diego',
    handle: '@diego_arq',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 1,
    hasUnread: false,
    mediaText: 'Fachada em concreto aparente finalizada hoje no Moinhos. Arquitetura viva!',
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
  {
    id: 's6',
    name: 'Gabriel',
    handle: '@gabriel_dev',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    orbitLevel: 2,
    hasUnread: false,
    mediaText: 'Trilha sonora ambiente e silêncio perfeito para focar.',
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
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    caption: 'Estudo de iluminação natural e reflexão no novo espaço. O contraste de fim de tarde dispensou qualquer filtro. A beleza da arquitetura está na sinceridade dos materiais.',
    format: 'photo',
    likes: 48,
    isLiked: false,
    isSaved: false,
    comments: [
      {
        id: 'c1',
        author: 'Lucas Amaral',
        handle: '@lucas_amaral',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        text: 'A entrada de luz zenital ficou perfeita com esse piso de madeira maciça!',
        time: '1h atrás',
      },
      {
        id: 'c2',
        author: 'Marina Costa',
        handle: '@marinacosta',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        text: 'Obrigada Lucas! Ajudou muito no isolamento do som para podermos gravar com calma.',
        time: '45m atrás',
        isAuthorReply: true,
      },
    ],
  },
  {
    id: 'post_2',
    author: 'Lucas Amaral',
    handle: '@lucas_amaral',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    time: 'Há 4 horas',
    orbitLevel: 2,
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    caption: 'Bastidores da bancada de montagem. Ainda tem caixas pelo chão, mas os equipamentos já estão funcionando. Café passado na hora pra quem passar aqui hoje!',
    format: 'photo',
    likes: 31,
    isLiked: true,
    isSaved: false,
    comments: [
      {
        id: 'c3',
        author: 'Bia Nunes',
        handle: '@bia_nunes',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
        text: 'Essa mesa de carvalho ficou linda! Passo aí no fim da tarde.',
        time: '3h atrás',
      },
    ],
  },
  {
    id: 'post_3',
    author: 'Bia Nunes',
    handle: '@bia_nunes',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    time: 'Ontem',
    orbitLevel: 3,
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    caption: 'Conversa longa sobre por que decidimos criar um espaço onde amizades verdadeiras não competem com métricas de likes ou algoritmos comerciais. Estar presente é o melhor presente.',
    format: 'long',
    likes: 54,
    isLiked: false,
    isSaved: true,
    comments: [
      {
        id: 'c4',
        author: 'Rafael Souza',
        handle: '@rafael',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
        text: 'Reflexão essencial, Bia! Redes sociais deveriam aproximar quem amamos, não viciar.',
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
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
    caption: 'Momento em família na serra gaúcha. Sem pressa, sem maquiagem e com muitas risadas ao redor da lareira. Guardado no meu círculo de Melhores Amigos.',
    format: 'photo',
    likes: 19,
    isLiked: true,
    isSaved: false,
    comments: [],
  },
];

// Pool de posts dinâmicos para o Feed Infinito
const INFINITE_POST_POOL: Omit<Post, 'id' | 'isLiked' | 'isSaved' | 'comments'>[] = [
  {
    author: 'Diego Souza',
    handle: '@diego_arq',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    time: 'Há 5 horas',
    orbitLevel: 1,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    caption: 'Manhã de sol entrando pela janela da sala. A luz suave muda completamente a energia do dia. Bom dia a todos!',
    format: 'photo',
    likes: 38,
  },
  {
    author: 'Elena Rocha',
    handle: '@elena_cine',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    time: 'Há 7 horas',
    orbitLevel: 2,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
    caption: 'Pôr do sol cinematográfico capturado na estrada. Pequenas pausas durante o trabalho nos lembram do que realmente importa.',
    format: 'photo',
    likes: 67,
  },
  {
    author: 'Gabriel Dev',
    handle: '@gabriel_dev',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    time: 'Há 9 horas',
    orbitLevel: 1,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    caption: 'Reunião com amigos queridos para desenhar novas ideias criativas. Conversa boa, café forte e projetos que fazem sentido.',
    format: 'photo',
    likes: 45,
  },
  {
    author: 'Camila Torres',
    handle: '@camila_art',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    time: 'Há 12 horas',
    orbitLevel: 2,
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    caption: 'Processo de pintura a óleo finalizado hoje. Texturas ricas e cores terrosas que aquecem o ambiente.',
    format: 'photo',
    likes: 82,
  },
  {
    author: 'Thiago Mendes',
    handle: '@thiago_photo',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    time: 'Há 1 dia',
    orbitLevel: 1,
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
    caption: 'Respiro no alto da serra. Respirar ar puro e se desconectar das telas por algumas horas recarrega a alma.',
    format: 'photo',
    likes: 93,
  },
];

export default function MeshSocialApp() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_GOOGLE_USER);

  // Tabs: 'feed' | 'explore' | 'vault' | 'profile'
  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'vault' | 'profile'>('feed');

  // Stories
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Posts & Infinite Feed
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [pageIteration, setPageIteration] = useState<number>(1);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Quick Composer at top of Feed
  const [composerText, setComposerText] = useState<string>('');

  // Create Post Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newCaption, setNewCaption] = useState('');
  const [newOrbit, setNewOrbit] = useState<1 | 2 | 3 | 4>(1);

  // Comments state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar sessão salva no localStorage ao iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mesh_social_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          setCurrentUser(parsed);
          setIsLoggedIn(true);
        }
      }
    } catch (e) {
      // Ignora erro de storage
    }
  }, []);

  // Login com Google
  const handleGoogleSignIn = () => {
    const googleUser: UserProfile = { ...DEFAULT_GOOGLE_USER };
    setCurrentUser(googleUser);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('mesh_social_user', JSON.stringify(googleUser));
    } catch (e) {}
    showToast(`Bem-vindo, ${googleUser.name}! Login com Google realizado com sucesso.`);
  };

  // Trocar conta de teste
  const handleSwitchAccount = (key: string) => {
    const user = DEMO_ACCOUNTS[key] || DEFAULT_GOOGLE_USER;
    setCurrentUser(user);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('mesh_social_user', JSON.stringify(user));
    } catch (e) {}
    showToast(`Conectado como ${user.name} (${user.handle})`);
  };

  // Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem('mesh_social_user');
    } catch (e) {}
    showToast('Você saiu da sua conta.');
  };

  // Curtir Post
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

  // Salvar Post
  const handleSavePost = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const nextSaved = !p.isSaved;
          showToast(nextSaved ? 'Publicação salva nos seus favoritos!' : 'Publicação removida dos salvos.');
          return { ...p, isSaved: nextSaved };
        }
        return p;
      })
    );
  };

  // Adicionar Comentário
  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const newComment: Comment = {
            id: `c_${Date.now()}`,
            author: currentUser.name,
            handle: currentUser.handle,
            avatar: currentUser.avatar,
            text,
            time: 'Agora',
          };
          return {
            ...p,
            comments: [...p.comments, newComment],
          };
        }
        return p;
      })
    );

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    showToast('Comentário publicado com sucesso!');
  };

  // Publicar pelo Composer Rápido
  const handleQuickPublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim()) return;

    const newPost: Post = {
      id: `post_${Date.now()}`,
      author: currentUser.name,
      handle: currentUser.handle,
      avatar: currentUser.avatar,
      time: 'Agora mesmo',
      orbitLevel: 1,
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      caption: composerText.trim(),
      format: 'photo',
      likes: 1,
      isLiked: true,
      isSaved: false,
      comments: [],
    };

    setPosts(prev => [newPost, ...prev]);
    setComposerText('');
    setCurrentUser(prev => ({ ...prev, postsCount: prev.postsCount + 1 }));
    showToast('Sua publicação foi compartilhada no feed!');
  };

  // Criar Post pelo Modal
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;

    const newPost: Post = {
      id: `post_${Date.now()}`,
      author: currentUser.name,
      handle: currentUser.handle,
      avatar: currentUser.avatar,
      time: 'Agora mesmo',
      orbitLevel: newOrbit,
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      caption: newCaption.trim(),
      format: 'photo',
      likes: 1,
      isLiked: true,
      isSaved: false,
      comments: [],
    };

    setPosts(prev => [newPost, ...prev]);
    setNewCaption('');
    setIsCreateOpen(false);
    setCurrentUser(prev => ({ ...prev, postsCount: prev.postsCount + 1 }));
    showToast(`Publicado com sucesso no nível: ${newOrbit === 1 ? 'Público' : newOrbit === 2 ? 'Amigos' : newOrbit === 3 ? 'Círculo Próximo' : 'Melhores Amigos'}!`);
  };

  // Carregar mais posts para o Feed Infinito
  const loadMorePosts = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    setTimeout(() => {
      const nextBatch: Post[] = INFINITE_POSTPool_Batch(pageIteration);
      setPosts(prev => [...prev, ...nextBatch]);
      setPageIteration(prev => prev + 1);
      setIsLoadingMore(false);
      showToast('Mais fotos e momentos de amigos carregados!');
    }, 700);
  };

  const INFINITE_POSTPool_Batch = (iter: number): Post[] => {
    return INFINITE_POST_POOL.map((p, idx) => ({
      ...p,
      id: `inf_post_${iter}_${idx}_${Date.now()}`,
      isLiked: false,
      isSaved: false,
      comments: [],
    }));
  };

  // IntersectionObserver para rolar suavemente e carregar mais posts
  useEffect(() => {
    if (activeTab !== 'feed') return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.2 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [activeTab, isLoadingMore, pageIteration]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA DE LOGIN CONVIDATIVA & CADASTRO COM GOOGLE
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
          {/* Mockup visual amigável à esquerda */}
          <div className="hidden md:flex flex-col items-center justify-center p-6 relative">
            <div className="w-[300px] h-[580px] rounded-[3rem] border-4 border-slate-800 bg-[#070b12] shadow-[0_0_60px_rgba(0,255,245,0.15)] overflow-hidden flex flex-col p-4 relative group">
              {/* Notch */}
              <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-4 border border-slate-800" />
              
              {/* Feed Preview */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono text-neon-cyan">
                <span className="font-bold">MESH SOCIAL</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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
                <div className="pt-2 flex justify-between text-slate-400 text-xs font-mono">
                  <span>Amigos Reais</span>
                  <span className="text-neon-cyan">100% Grátis</span>
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

          {/* Card de Login à direita */}
          <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="p-8 rounded-3xl bg-[#070a12]/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Rede Social 100% Gratuita
                </div>
                <h1 className="text-3xl font-tilt-neon font-bold text-white tracking-tight">
                  Mesh Social
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fotos, vídeos e histórias com amigos de verdade. Sem algoritmos tóxicos e sem anúncios.
                </p>
              </div>

              {/* CADASTRO / LOGIN RÁPIDO COM GOOGLE */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg group hover:scale-[1.02]"
                >
                  {/* Google SVG G icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar com o Google</span>
                </button>

                <p className="text-[11px] text-center text-slate-500 font-mono">
                  Cadastro instantâneo em 1 clique
                </p>
              </div>

              {/* Separador */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-slate-500 text-[10px] font-mono uppercase">OU EXPERIMENTE PERFIS DE TESTE</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              {/* Contas de Demonstração */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSwitchAccount('lucas')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#05080e] hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={DEMO_ACCOUNTS.lucas.avatar}
                      alt="Lucas"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>Entrar como <strong>Lucas Amaral</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-neon-cyan">Engenheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchAccount('marina')}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#05080e] hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={DEMO_ACCOUNTS.marina.avatar}
                      alt="Marina"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span>Entrar como <strong>Marina Costa</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300">Fotógrafa</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#070a12]/60 border border-slate-800/80 text-center text-xs text-slate-400">
              <Link href="/" className="text-neon-cyan font-bold hover:underline">
                ← Voltar para a página inicial da Orbe Systems
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APLICAÇÃO PRINCIPAL LOGADA (DASHBOARD INSTAGRAM-STYLE COM FEED INFINITO)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 font-sans selection:bg-neon-cyan/20 selection:text-neon-cyan flex flex-col md:flex-row">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* HEADER MOBILE COM VISUALIZAÇÃO DO USUÁRIO LOGADO */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-[#05070d]/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-tilt-neon font-bold text-base text-white tracking-tight">Mesh Social</span>
        </Link>

        {/* User Badge Mobile */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#080d1a] border border-slate-800 px-2 py-1 rounded-full">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-neon-cyan"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-black" />
            </div>
            <span className="text-xs font-semibold text-white max-w-[90px] truncate">{currentUser.name}</span>
          </div>

          <button
            onClick={handleLogout}
            title="Sair"
            className="text-slate-400 hover:text-rose-400 p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SIDEBAR ESQUERDA (DESKTOP) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 lg:w-72 h-screen sticky top-0 border-r border-slate-800 bg-[#05070d]/95 backdrop-blur-xl flex-col justify-between p-4 z-40 shrink-0">
        <div className="space-y-6">
          {/* Logo & Marca */}
          <div className="pt-2 px-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan group-hover:shadow-[0_0_15px_rgba(0,255,245,0.4)] transition-all">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-tilt-neon font-bold text-lg text-white tracking-tight">Mesh Social</span>
                <span className="block text-[9px] font-mono text-neon-cyan tracking-widest">ORBE SYSTEMS</span>
              </div>
            </Link>
          </div>

          {/* VISUALIZAÇÃO CLARA DO USUÁRIO LOGADO */}
          <div className="p-3 rounded-2xl bg-[#080d1a] border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-neon-cyan"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                  {currentUser.provider === 'google' && (
                    <span className="text-[10px] text-emerald-400" title="Verificado via Google">✓</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 truncate block">{currentUser.handle}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
              <span className="text-slate-500">{currentUser.provider === 'google' ? 'Google ID' : 'Perfil Ativo'}</span>
            </div>
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
              <span>Feed de Amigos</span>
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
              <span>Explorar Fotos</span>
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
                <span>Melhores Amigos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30">
                  {currentUser.bestFriendsCount} íntimos
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

        {/* Bottom Switcher & Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Alternar Perfil:</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleSwitchAccount('rafael')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  currentUser.handle === '@rafael' ? 'bg-neon-cyan text-black font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                Rafael
              </button>
              <button
                onClick={() => handleSwitchAccount('lucas')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  currentUser.handle === '@lucas_amaral' ? 'bg-neon-cyan text-black font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                Lucas
              </button>
              <button
                onClick={() => handleSwitchAccount('marina')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  currentUser.handle === '@marinacosta' ? 'bg-neon-cyan text-black font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                Marina
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs transition-colors border border-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CONTEÚDO PRINCIPAL (FEED CENTRAL & FEED INFINITO) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto px-3 sm:px-6 py-6 pb-24 md:pb-8 space-y-6">
        
        {/* =================================================================== */}
        {/* ABA: FEED PRINCIPAL (INSTAGRAM STYLE + COMPOSER + FEED INFINITO) */}
        {/* =================================================================== */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            
            {/* COMPOSER RÁPIDO DO TOPO (VISUALIZAÇÃO DO USUÁRIO LOGADO) */}
            <div className="p-4 rounded-3xl bg-[#060911] border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover border border-neon-cyan"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickPublish(e);
                    }}
                    placeholder={`No que você está pensando, ${currentUser.name.split(' ')[0]}?`}
                    className="w-full px-4 py-2.5 rounded-full bg-[#030508] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-[11px]"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>Foto</span>
                  </button>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-[11px]"
                  >
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>Vídeo</span>
                  </button>
                </div>

                <button
                  onClick={handleQuickPublish}
                  disabled={!composerText.trim()}
                  className="px-4 py-1.5 rounded-full bg-neon-cyan text-black font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-300 transition-colors shadow-sm"
                >
                  Publicar
                </button>
              </div>
            </div>

            {/* Top Stories Bar (Glowing Rings) */}
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

            {/* Posts Stream (Feed Infinito) */}
            <div className="space-y-8">
              {posts.map(post => (
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
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
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
                            {post.orbitLevel === 1
                              ? 'Público'
                              : post.orbitLevel === 2
                              ? 'Amigos'
                              : post.orbitLevel === 3
                              ? 'Círculo Próximo'
                              : 'Melhores Amigos'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => showToast('Opções do post')}
                        className="text-slate-500 hover:text-white p-1"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Imagem / Mídia do Post */}
                  <div className="relative aspect-[4/3] sm:aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                    <img
                      src={post.image}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />

                    {/* Tag de Formato */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-slate-200 font-medium">
                      {post.format === 'photo' ? 'Foto RAW' : post.format === 'long' ? 'Vídeo 4K' : 'Momento'}
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
                            showToast('Link do momento copiado para a área de transferência!');
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
                        placeholder="Adicione um comentário para seu amigo..."
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
              ))}
            </div>

            {/* TRIGGER DO FEED INFINITO */}
            <div ref={observerTarget} className="py-8 flex flex-col items-center justify-center space-y-3">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-xs font-mono text-neon-cyan animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Carregando mais momentos de amigos...</span>
                </div>
              ) : (
                <button
                  onClick={loadMorePosts}
                  className="px-5 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                >
                  Carregar mais publicações do feed
                </button>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA: EXPLORAR FOTOS */}
        {/* =================================================================== */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white font-tilt-neon">Explorar Momentos de Amigos</h2>
              <span className="text-xs text-neon-cyan">FOTOS &amp; VÍDEOS REAIS</span>
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
                    <span className="text-[10px] text-neon-cyan font-bold">{post.author}</span>
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
        {/* ABA: MELHORES AMIGOS (DUNBAR / CÍRCULO ÍNTIMO) */}
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
                    <h2 className="text-xl font-bold text-white">Círculo de Melhores Amigos</h2>
                    <p className="text-xs text-slate-400">Até 15 pessoas para você compartilhar momentos com total intimidade.</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-300">
                    {currentUser.bestFriendsCount} / 15
                  </div>
                  <div className="text-[10px] text-slate-500">AMIGOS ÍNTIMOS</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                No Mesh Social, os Melhores Amigos são definidos pelo carinho e pelas conversas do dia a dia. Apenas quem compartilha uma amizade sincera tem acesso a essas memórias, fotos em família e momentos especiais.
              </div>

              {/* Lista dos Amigos no Círculo */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Amigos presentes no seu círculo íntimo:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Marina Costa (@marinacosta)', 'Lucas Amaral (@lucas_amaral)', 'Bia Nunes (@bia_nunes)', 'Diego Souza (@diego_arq)'].map((friend, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-white">{friend}</span>
                      </div>
                      <span className="text-[10px] text-purple-300 font-semibold">ÍNTIMO</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* ABA: MEU PERFIL */}
        {/* =================================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Cabeçalho do Perfil */}
            <div className="p-6 rounded-3xl bg-[#060911] border border-slate-800 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,255,245,0.3)]"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black" />
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
                    <span className="text-xs text-neon-cyan font-mono">{currentUser.handle}</span>
                    <button
                      onClick={() => showToast('Foto e informações atualizadas.')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                    >
                      Editar Perfil
                    </button>
                  </div>

                  <div className="flex justify-center sm:justify-start gap-6 text-xs">
                    <div>
                      <strong className="text-white text-sm">{currentUser.postsCount}</strong> publicações
                    </div>
                    <div>
                      <strong className="text-neon-cyan text-sm">{currentUser.friendsCount}</strong> amigos
                    </div>
                    <div>
                      <strong className="text-purple-300 text-sm">{currentUser.bestFriendsCount}</strong> melhores amigos
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
              <div className="flex justify-center gap-8 text-xs uppercase tracking-wider text-slate-400">
                <button className="flex items-center gap-2 text-neon-cyan font-bold border-t-2 border-neon-cyan pt-2 -mt-4">
                  <Grid className="w-4 h-4" />
                  <span>Publicações</span>
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
      {/* BOTTOM NAV BAR (MOBILE ONLY - ESTILO INSTAGRAM) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#05070d]/95 backdrop-blur-xl border-t border-slate-800 px-4 py-2 flex items-center justify-around text-slate-400">
        <button
          onClick={() => setActiveTab('feed')}
          className={`p-2 rounded-xl ${activeTab === 'feed' ? 'text-neon-cyan' : 'hover:text-white'}`}
        >
          <Compass className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('explore')}
          className={`p-2 rounded-xl ${activeTab === 'explore' ? 'text-neon-cyan' : 'hover:text-white'}`}
        >
          <Search className="w-6 h-6" />
        </button>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="p-2 rounded-xl text-neon-cyan"
        >
          <PlusSquare className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`p-2 rounded-xl ${activeTab === 'vault' ? 'text-purple-400' : 'hover:text-white'}`}
        >
          <Lock className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`p-2 rounded-xl ${activeTab === 'profile' ? 'text-neon-cyan' : 'hover:text-white'}`}
        >
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-6 h-6 rounded-full object-cover border border-neon-cyan"
          />
        </button>
      </nav>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CRIAR PUBLICAÇÃO (ESTILO INSTAGRAM) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#070b14] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="font-bold text-sm text-neon-cyan">Nova Publicação</span>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  O que você quer compartilhar com seus amigos?
                </label>
                <textarea
                  rows={4}
                  required
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Escreva sobre o seu dia, uma foto especial ou um pensamento sincero..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04060c] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quem pode ver essa publicação?
                </label>
                <select
                  value={newOrbit}
                  onChange={(e) => setNewOrbit(Number(e.target.value) as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04060c] border border-slate-800 text-xs text-white focus:outline-none focus:border-neon-cyan"
                >
                  <option value={1}>🌍 Público (Qualquer amigo ou visitante)</option>
                  <option value={2}>👥 Amigos (Apenas seus amigos conectados)</option>
                  <option value={3}>🛋️ Círculo Próximo (Amigos de confiança)</option>
                  <option value={4}>💎 Melhores Amigos (Até 15 pessoas íntimas)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-xs text-slate-400">
                ✨ <strong>Espaço 100% autêntico:</strong> Sem anúncios, sem filtros comerciais. Apenas você e as pessoas que realmente importam.
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
                  Compartilhar no Feed
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
              <span className="text-xs px-3 py-1 rounded-full bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan font-bold">
                {selectedStory.orbitLevel === 4 ? 'Melhores Amigos' : 'Momento Compartilhado'}
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
                  showToast(`Mensagem enviada para ${selectedStory.name}!`);
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
