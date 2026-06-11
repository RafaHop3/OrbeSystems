'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Send, Trash2, Sparkles, Trophy, BookOpen, 
  Award, Terminal, Code2, RefreshCw, Lightbulb, ChevronRight, HelpCircle,
  Gamepad2, Cpu, Globe, BarChart3, Rocket
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── DATA STRUCTURES ──

interface Challenge {
  id: string;
  title: string;
  difficulty: 'Iniciante' | 'Explorador' | 'Criador';
  description: string;
  code: string;
  expected: string;
  xpReward: number;
  badge: string;
  hint: string;
}

interface LibraryDoc {
  name: string;
  description: string;
  usage: string;
}

interface Theme {
  id: string;
  name: string;
  emoji: string;
  title: string;
  intro: string;
  libraryDocs: LibraryDoc[];
  libraryCode: string;
  challenges: Challenge[];
}

const THEMES: Theme[] = [
  {
    id: "jogos",
    name: "Criação de Jogos",
    emoji: "🎮",
    title: "🎮 Desenvolvimento de Jogos e Física",
    intro: "Como funcionam os videogames? Eles rodam em um loop constante de atualização e desenho (Game Loop), controlam posições cartesianas (X, Y) e verificam se os personagens colidiram com itens ou inimigos para pontuar.",
    libraryCode: `
const EngineJogos = {
  desenharMapa: function(px, py) {
    let grid = "";
    for(let y=0; y<5; y++) {
      for(let x=0; x<10; x++) {
        if(x === px && y === py) grid += "👦 ";
        else if(x === 9 && y === 4) grid += "🏆 ";
        else grid += "░░ ";
      }
      grid += "\\n";
    }
    console.log(grid);
  },
  verificarColisao: function(x1, y1, x2, y2, alcance) {
    let dist = Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2));
    console.log("Distância calculada: " + dist.toFixed(2));
    return dist <= alcance;
  }
};
`,
    libraryDocs: [
      {
        name: "EngineJogos.desenharMapa(x, y)",
        description: "Desenha um mapa gráfico em ASCII com o jogador 👦 na coordenada (x, y). A taça 🏆 está em (9, 4).",
        usage: "EngineJogos.desenharMapa(3, 2);"
      },
      {
        name: "EngineJogos.verificarColisao(x1, y1, x2, y2, r)",
        description: "Calcula a distância e verifica se dois elementos com coordenadas (x1, y1) e (x2, y2) estão colidindo dentro do raio (r).",
        usage: "let bateu = EngineJogos.verificarColisao(1, 1, 2, 2, 1.5);"
      }
    ],
    challenges: [
      {
        id: "game_walk",
        title: "🚶 Movimento do Jogador",
        difficulty: "Iniciante",
        description: "Use a biblioteca EngineJogos para desenhar o mapa com o jogador na coordenada X=4 e Y=2!",
        code: `// Use a biblioteca EngineJogos para desenhar o jogador em X=4 e Y=2!
EngineJogos.desenharMapa(4, 2);
`,
        expected: "👦",
        xpReward: 30,
        badge: "🎮 Gamer Aprendiz",
        hint: "Basta chamar a função EngineJogos.desenharMapa passando 4 e 2 como argumentos."
      },
      {
        id: "game_collision",
        title: "💥 Detecção de Colisão",
        difficulty: "Explorador",
        description: "Use EngineJogos.verificarColisao para ver se o jogador em (9, 3) pegou a taça que está em (9, 4) com raio de colisão de 1.5!",
        code: `// Verifique se o jogador em (9, 3) está colidindo com a taça em (9, 4)
let colidiu = EngineJogos.verificarColisao(9, 3, 9, 4, 1.5);
console.log("Colisão com prêmio: " + colidiu);
`,
        expected: "Colisão com prêmio: true",
        xpReward: 40,
        badge: "💥 Mestre do Hitbox",
        hint: "A função retorna true ou false. O console.log irá imprimir o resultado final."
      }
    ]
  },
  {
    id: "ia",
    name: "Inteligência Artificial",
    emoji: "🤖",
    title: "🤖 Inteligência Artificial e Neurônios",
    intro: "Como as IAs tomam decisões? Elas utilizam 'neurônios artificiais' que multiplicam entradas por 'pesos' e verificam se ultrapassam um limite. Elas também processam sentimentos lendo palavras especiais.",
    libraryCode: `
const IA = {
  neuronioDecisao: function(entradas, pesos, limite) {
    let soma = 0;
    for(let i=0; i<entradas.length; i++) {
      soma += entradas[i] * pesos[i];
    }
    console.log("Soma ponderada da rede: " + soma.toFixed(1) + " (Limite: " + limite + ")");
    return soma >= limite;
  },
  analisarSentimento: function(texto) {
    let felizes = ["feliz", "bom", "legal", "adoro", "sim", "oba", "incrível"];
    let tristes = ["triste", "ruim", "chato", "odeio", "não", "droga", "erro"];
    let score = 0;
    let palavras = texto.toLowerCase().split(" ");
    palavras.forEach(p => {
      if(felizes.includes(p)) score++;
      if(tristes.includes(p)) score--;
    });
    console.log("Score de sentimento: " + score);
    return score > 0 ? "Alegre 😊" : score < 0 ? "Preocupado 😟" : "Neutro 😐";
  }
};
`,
    libraryDocs: [
      {
        name: "IA.neuronioDecisao(entradas, pesos, limite)",
        description: "Simula um neurônio simplificado. Multiplica as entradas pelos pesos e diz se a decisão é verdadeira (acima do limite).",
        usage: "IA.neuronioDecisao([1, 0], [0.5, 0.5], 0.4);"
      },
      {
        name: "IA.analisarSentimento(frase)",
        description: "Analisa o texto e responde se ele transmite um sentimento Alegre 😊, Preocupado 😟 ou Neutro 😐.",
        usage: "IA.analisarSentimento('Hoje é um bom dia legal!');"
      }
    ],
    challenges: [
      {
        id: "ai_neuron",
        title: "🧠 Ativando o Neurônio",
        difficulty: "Explorador",
        description: "Ajuste os pesos do neurônio para que a decisão seja VERDADEIRA. Entradas: [1, 1], Limite: 1.5. Mude os pesos para que a soma passe de 1.5!",
        code: `// Ajuste os pesos no segundo argumento para que a soma supere o limite (1.5)
let decisao = IA.neuronioDecisao([1, 1], [0.5, 0.5], 1.5);
console.log("Decisão do robô: " + decisao);
`,
        expected: "Decisão do robô: true",
        xpReward: 50,
        badge: "🧠 Treinador de Rede",
        hint: "Mude os pesos de [0.5, 0.5] para valores maiores, por exemplo, [1.0, 1.0]."
      },
      {
        id: "ai_sentiment",
        title: "😊 Sentimento Feliz",
        difficulty: "Iniciante",
        description: "Chame a função IA.analisarSentimento com uma frase que contenha palavras alegres como 'bom', 'legal' ou 'incrível'!",
        code: `// Escreva uma frase super feliz para a IA detectar!
let sentimento = IA.analisarSentimento("Este dia está incrível e muito bom!");
console.log("Resultado: " + sentimento);
`,
        expected: "Alegre",
        xpReward: 30,
        badge: "😊 Sensor de Emoção",
        hint: "Use palavras do banco de dados feliz: 'feliz', 'bom', 'legal', 'adoro', 'sim', 'oba', 'incrível'."
      }
    ]
  },
  {
    id: "web",
    name: "Web Design",
    emoji: "🌐",
    title: "🌐 Web, Cores e Design Digital",
    intro: "A internet funciona com linguagens que criam estrutura e estilos. As cores digitais são representadas por intensidades de Vermelho, Verde e Azul (RGB) de 0 a 255, ou por códigos hexadecimais de base 16.",
    libraryCode: `
const WebDesign = {
  rgbParaHex: function(r, g, b) {
    const toHex = (c) => {
      const hex = Math.max(0, Math.min(255, c)).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    let hex = "#" + toHex(r) + toHex(g) + toHex(b);
    console.log("Convertido RGB(" + r + "," + g + "," + b + ") para " + hex);
    return hex;
  },
  gerarCSSGradiente: function(cor1, cor2) {
    let css = "linear-gradient(to right, " + cor1 + ", " + cor2 + ")";
    console.log("Estilo Gradiente CSS: " + css);
    return css;
  }
};
`,
    libraryDocs: [
      {
        name: "WebDesign.rgbParaHex(r, g, b)",
        description: "Transforma valores de cor R (red), G (green), B (blue) de 0 a 255 em um código hexadecimal.",
        usage: "WebDesign.rgbParaHex(255, 255, 255);"
      },
      {
        name: "WebDesign.gerarCSSGradiente(corHex1, corHex2)",
        description: "Gera uma string de gradiente CSS moderno a partir de duas cores hexadecimais.",
        usage: "WebDesign.gerarCSSGradiente('#ff0000', '#0000ff');"
      }
    ],
    challenges: [
      {
        id: "web_hex",
        title: "🎨 Código das Cores",
        difficulty: "Iniciante",
        description: "Converta a cor verde pura RGB(0, 255, 0) para o seu código hexadecimal equivalente usando a biblioteca!",
        code: `// Converta o verde puro para hexadecimal
let hexVerde = WebDesign.rgbParaHex(0, 255, 0);
console.log("Hexadecimal: " + hexVerde);
`,
        expected: "#00ff00",
        xpReward: 35,
        badge: "🎨 Pintor Digital",
        hint: "Passe os valores 0, 255, e 0 para a função rgbParaHex."
      },
      {
        id: "web_gradient",
        title: "🌈 Gradiente Moderno",
        difficulty: "Explorador",
        description: "Gere um gradiente CSS unindo a cor roxa '#8b5cf6' e a cor ciano '#06b6d4'!",
        code: `// Gere o gradiente ligando o roxo e o ciano
let gradiente = WebDesign.gerarCSSGradiente("#8b5cf6", "#06b6d4");
`,
        expected: "linear-gradient",
        xpReward: 40,
        badge: "🌈 Designer do Amanhã",
        hint: "Chame gerarCSSGradiente com '#8b5cf6' e '#06b6d4' como parâmetros."
      }
    ]
  },
  {
    id: "dados",
    name: "Ciência de Dados",
    emoji: "📊",
    title: "📊 Ciência de Dados e Algoritmos",
    intro: "Cientistas de dados analisam informações para encontrar padrões, fazer previsões e tomar decisões. Eles organizam dados usando listas (arrays) e calculam estatísticas como médias.",
    libraryCode: `
const DataScience = {
  calcularMedia: function(lista) {
    if(!lista.length) return 0;
    let soma = lista.reduce((a,b) => a+b, 0);
    let med = soma / lista.length;
    console.log("Média calculada da lista: " + med.toFixed(1));
    return med;
  },
  filtrarAcimaDe: function(lista, limite) {
    let filtrado = lista.filter(x => x > limite);
    console.log("Itens acima de " + limite + ": [" + filtrado.join(", ") + "]");
    return filtrado;
  },
  ordenarLista: function(lista) {
    let ordenada = [...lista].sort((a,b) => a-b);
    console.log("Lista ordenada: [" + ordenada.join(", ") + "]");
    return ordenada;
  }
};
`,
    libraryDocs: [
      {
        name: "DataScience.calcularMedia(lista)",
        description: "Calcula a média aritmética simples de todos os números presentes na lista.",
        usage: "DataScience.calcularMedia([10, 8, 6]);"
      },
      {
        name: "DataScience.filtrarAcimaDe(lista, limite)",
        description: "Filtra a lista retornando apenas os elementos que forem maiores que o limite especificado.",
        usage: "DataScience.filtrarAcimaDe([1, 5, 10], 4);"
      },
      {
        name: "DataScience.ordenarLista(lista)",
        description: "Coloca a lista de números em ordem crescente (do menor para o maior).",
        usage: "DataScience.ordenarLista([9, 2, 7]);"
      }
    ],
    challenges: [
      {
        id: "ds_average",
        title: "📈 Média de Notas",
        difficulty: "Iniciante",
        description: "Calcule a média das notas da turma usando a lista [7, 8, 9, 10]!",
        code: `// Calcule a média aritmética simples da lista de notas fornecida
let media = DataScience.calcularMedia([7, 8, 9, 10]);
`,
        expected: "Média calculada da lista: 8.5",
        xpReward: 35,
        badge: "📈 Analista Júnior",
        hint: "Passe a lista de notas [7, 8, 9, 10] como argumento para calcularMedia."
      },
      {
        id: "ds_filter",
        title: "🔍 Filtro Estrito",
        difficulty: "Explorador",
        description: "Filtre a lista [12, 45, 2, 8, 99, 15] para manter somente os valores maiores que 14!",
        code: `// Filtre a lista para números maiores que 14
let filtrados = DataScience.filtrarAcimaDe([12, 45, 2, 8, 99, 15], 14);
`,
        expected: "Itens acima de 14: [45, 99, 15]",
        xpReward: 45,
        badge: "🔍 Filtro de Elite",
        hint: "O primeiro parâmetro é a lista e o segundo é o limite numérico (14)."
      }
    ]
  },
  {
    id: "espaco",
    name: "Espaço e Física",
    emoji: "🚀",
    title: "🚀 Física e Lançamento de Foguetes",
    intro: "Foguetes sobem baseados nas leis de movimento de Isaac Newton! A força dos motores (Empuxo) precisa superar o Peso do foguete (Massa x Gravidade). Se a força resultante for positiva, ele acelera e voa!",
    libraryCode: `
const FisicaEspacial = {
  simularLancamento: function(empuxo, massa, segundos) {
    let gravidade = 9.8;
    let altura = 0;
    let velocidade = 0;
    
    for(let t=1; t<=segundos; t++) {
      let peso = massa * gravidade;
      let forcaResultante = empuxo - peso;
      let aceleracao = forcaResultante / massa;
      velocidade += aceleracao;
      if(velocidade < 0) velocidade = 0;
      altura += velocidade;
      if(altura < 0) altura = 0;
      
      console.log("Tempo: " + t + "s | Velocidade: " + velocidade.toFixed(1) + " m/s | Altura: " + altura.toFixed(1) + " m");
    }
    return altura;
  },
  velocidadeEscape: function(massaPlaneta, raioPlaneta) {
    const G = 6.674e-11;
    let v = Math.sqrt((2 * G * massaPlaneta) / raioPlaneta);
    let kmh = (v * 3.6).toFixed(0);
    console.log("Velocidade de escape necessária: " + kmh + " km/h");
    return kmh;
  }
};
`,
    libraryDocs: [
      {
        name: "FisicaEspacial.simularLancamento(empuxo, massa, s)",
        description: "Simula a subida de um foguete sob gravidade terrestre (9.8m/s²) por (s) segundos. Retorna a altura final em metros.",
        usage: "FisicaEspacial.simularLancamento(20000, 1000, 5);"
      },
      {
        name: "FisicaEspacial.velocidadeEscape(massa, raio)",
        description: "Calcula e imprime a velocidade necessária em km/h para escapar da gravidade de um astro de massa (kg) e raio (m).",
        usage: "FisicaEspacial.velocidadeEscape(5.97e24, 6.37e6);"
      }
    ],
    challenges: [
      {
        id: "space_launch",
        title: "🚀 Lançamento Estelar",
        difficulty: "Criador",
        description: "Lance um foguete de massa 1200kg com um motor superpotente de 25000 Newtons por 4 segundos!",
        code: `// Faça a simulação de voo do foguete por 4 segundos
let alturaFinal = FisicaEspacial.simularLancamento(25000, 1200, 4);
`,
        expected: "Tempo: 4s",
        xpReward: 50,
        badge: "🚀 Engenheiro Aeroespacial",
        hint: "Basta passar os valores 25000 (empuxo), 1200 (massa) e 4 (segundos) para simularLancamento."
      },
      {
        id: "space_escape",
        title: "🌍 Escapando da Terra",
        difficulty: "Criador",
        description: "Calcule a velocidade de escape da Terra. Massa da Terra: 5.97e24 kg, Raio da Terra: 6371000 metros (6.371e6)!",
        code: `// Calcule a velocidade de escape para a Terra
let vEscape = FisicaEspacial.velocidadeEscape(5.972e24, 6371000);
`,
        expected: "Velocidade de escape necessária: 40268",
        xpReward: 60,
        badge: "🌍 Viajante Interplanetário",
        hint: "Passe a massa (5.972e24) como primeiro argumento e o raio (6371000) como segundo argumento."
      }
    ]
  }
];

const QUICK_CHIPS = [
  { text: "Explicar meu código!", label: "Explicar meu código! 💻" },
  { text: "Quais bibliotecas posso usar?", label: "Bibliotecas disponíveis? 📦" },
  { text: "Como escolher outro tema?", label: "Escolher Tema! 🗺️" },
  { text: "Dê um desafio acadêmico!", label: "Desafio Acadêmico! 🏆" },
  { text: "O que é um bug no código?", label: "O que é um bug? 🐛" }
];

const FUN_FACTS = [
  "O primeiro 'bug' de computador foi uma mariposa real! A cientista Grace Hopper a encontrou presa dentro do computador em 1947! 🦋",
  "Computadores não falam português ou inglês—eles só entendem 0 e 1! Isso se chama código binário. 0️⃣1️⃣",
  "Se você imprimisse todo o código do foguete que levou o homem à lua, o papel seria da altura de um arranha-céu! 🚀",
  "O primeiro videogame foi criado em 1958 e era um jogo de tênis super simples chamado 'Tennis for Two'! 🎾",
  "Minecraft foi criado por apenas uma pessoa (Notch) antes de se tornar um dos maiores jogos do mundo! ⛏️",
  "Mais de 5 bilhões de pessoas usam a internet todos os dias para conversar, aprender e jogar! 🌐"
];

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

export default function KidsStudioPage() {
  // Gamification states
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [badges, setBadges] = useState<string[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  // Theme and Challenge Selector States
  const [selectedThemeId, setSelectedThemeId] = useState<string>("jogos");
  const [currentLessonId, setCurrentLessonId] = useState<string>("game_walk");

  // IDE states
  const [code, setCode] = useState(THEMES[0].challenges[0].code);
  const [language, setLanguage] = useState<'js' | 'python'>('js');
  const [consoleLogs, setConsoleLogs] = useState<{ text: string; type: 'log' | 'error' | 'success' | 'system' }[]>([]);

  // Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userMsg, setUserMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [funFact, setFunFact] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const selectedTheme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];

  // Audio synthesize function
  const playTone = (freq: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine') => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context blocked/failed:', e);
    }
  };

  const playSuccessSound = () => {
    playTone(523.25, 0.08); // C5
    setTimeout(() => playTone(659.25, 0.08), 80); // E5
    setTimeout(() => playTone(783.99, 0.2), 160); // G5
  };

  const playErrorSound = () => {
    playTone(220, 0.15, 'sawtooth');
    setTimeout(() => playTone(180, 0.25, 'sawtooth'), 120);
  };

  const playLevelUpSound = () => {
    playTone(440, 0.08);
    setTimeout(() => playTone(554.37, 0.08), 80);
    setTimeout(() => playTone(659.25, 0.08), 160);
    setTimeout(() => playTone(880, 0.35), 240);
  };

  // Load progress and set welcome message on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem("orbe_kids_progress");
      if (raw) {
        try {
          const data = JSON.parse(raw);
          setXp(data.xp || 0);
          setLevel(data.level || 1);
          setBadges(data.badges || []);
          setQuestionsAsked(data.questionsAsked || 0);
          setCompletedLessons(data.completedLessons || []);
        } catch (e) {
          console.error("Erro ao carregar progresso", e);
        }
      }
    }

    setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    
    // Add Welcome message
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory([
      {
        sender: 'bot',
        text: `👋 **Olá, futuro desenvolvedor e cientista! Bem-vindo ao Orbe Kids Studio!** 🤖✨\n\nAqui, acreditamos na nobreza do conhecimento e no seu futuro acadêmico. Você tem total liberdade para **escolher o tema** que quer dominar hoje:\n\n🎮 **Criação de Jogos & Física**\n🤖 **Inteligência Artificial & Neurônios**\n🌐 **Web Design & Interfaces**\n📊 **Ciência de Dados & Algoritmos**\n🚀 **Espaço & Newton**\n\n1. Escolha o tema na barra lateral esquerda.\n2. Veja os conceitos de **Conhecimento Livre** e a **Biblioteca de Funções**.\n3. Digite e clique em **Executar Código ⚡**.\n4. Converse comigo no chat à direita! Qual tema de estudo você quer escolher?`,
        time: timeString
      }
    ]);
  }, []);

  // Save progress whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && level > 0) {
      const data = { xp, level, badges, questionsAsked, completedLessons };
      localStorage.setItem("orbe_kids_progress", JSON.stringify(data));
    }
  }, [xp, level, badges, questionsAsked, completedLessons]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const addXP = (amount: number) => {
    setXp(prevXp => {
      const newXp = prevXp + amount;
      const threshold = level * 100;
      if (newXp >= threshold) {
        setLevel(prevLvl => {
          const nextLvl = prevLvl + 1;
          playLevelUpSound();
          awardBadge(`⭐ Nível ${nextLvl}`);
          
          setTimeout(() => {
            appendBotMessage(`🎉 **VOCÊ SUBIU DE NÍVEL!** Parabéns, você agora é **Nível ${nextLvl}**! 🚀\n\nSeu cérebro de programador está crescendo de forma nobre! Continue assim!`);
          }, 800);
          
          return nextLvl;
        });
        return newXp - threshold;
      }
      return newXp;
    });
  };

  const awardBadge = (badgeName: string) => {
    setBadges(prev => {
      if (!prev.includes(badgeName)) {
        return [...prev, badgeName];
      }
      return prev;
    });
  };

  const appendBotMessage = (text: string) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender: 'bot', text, time: timeString }]);
  };

  // Run Code logic
  const handleRunCode = () => {
    setConsoleLogs([{ text: "[Servidor] Compilando e executando código com bibliotecas preenchidas...", type: 'system' }]);
    playTone(600, 0.05, 'triangle');

    setTimeout(() => {
      if (language === 'js') {
        runJavaScript();
      } else {
        runPythonSim();
      }
    }, 450);
  };

  const runJavaScript = () => {
    const logs: string[] = [];
    const originalLog = console.log;
    
    // Redirect console.log
    console.log = (...args) => {
      logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(" "));
    };

    try {
      // Prepend current theme library code before executing
      const libraryCode = selectedTheme ? selectedTheme.libraryCode : "";
      const fullCode = libraryCode + "\n" + code;

      // Evaluate user code in a safe boundary function
      const evalFunc = new Function(fullCode);
      evalFunc();
      console.log = originalLog;

      if (logs.length > 0) {
        setConsoleLogs(prev => [
          ...prev,
          ...logs.map(log => ({ text: log, type: 'log' as const })),
          { text: "✔ Executado com sucesso!", type: 'success' as const }
        ]);
        playSuccessSound();
        addXP(15);
        
        // Check current challenge criteria
        checkLessonCompletion(logs.join("\n"));
      } else {
        setConsoleLogs(prev => [
          ...prev,
          { text: "[Aviso] O código rodou, mas nada foi impresso no console. Use console.log(...) para escrever na tela!", type: 'system' as const }
        ]);
        playTone(300, 0.15);
      }

    } catch (err: any) {
      console.log = originalLog;
      playErrorSound();
      setConsoleLogs(prev => [
        ...prev,
        { text: `❌ Erro de Execução: ${err.message}`, type: 'error' as const }
      ]);

      // Dynamic help from tutor
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const advice = analyzeCodeError(code, err.message);
        appendBotMessage(`🤖 **Oops! Encontramos um bug no seu código!**\n\n*O erro diz:* \`${err.message}\`\n\n${advice}`);
      }, 1000);
    }
  };

  const runPythonSim = () => {
    const lines = code.split("\n");
    const variables: Record<string, any> = {};
    const outputs: string[] = [];

    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("#")) continue;

        if (line.startsWith("print(") && line.endsWith(")")) {
          const content = line.substring(6, line.length - 1).trim();
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            outputs.push(content.substring(1, content.length - 1));
          } else if (variables[content] !== undefined) {
            outputs.push(String(variables[content]));
          } else {
            try {
              const res = new Function(`return ${content}`)();
              outputs.push(String(res));
            } catch {
              outputs.push(content);
            }
          }
        } else if (line.includes("=")) {
          const parts = line.split("=");
          const varName = parts[0].trim();
          const varVal = parts[1].trim();
          if ((varVal.startsWith('"') && varVal.endsWith('"')) || (varVal.startsWith("'") && varVal.endsWith("'"))) {
            variables[varName] = varVal.substring(1, varVal.length - 1);
          } else {
            variables[varName] = Number(varVal) || varVal;
          }
        }
      }

      setConsoleLogs(prev => [
        ...prev,
        ...outputs.map(out => ({ text: out, type: 'log' as const })),
        { text: "✔ Executado com sucesso no simulador Python!", type: 'success' as const }
      ]);
      playSuccessSound();
      addXP(15);

      // Check simulated Python completion
      if (outputs.length > 0) {
        checkLessonCompletion(outputs.join("\n"));
      }

    } catch (e: any) {
      playErrorSound();
      setConsoleLogs(prev => [
        ...prev,
        { text: `❌ Erro no Python Sim: ${e.message}`, type: 'error' as const }
      ]);
    }
  };

  const checkLessonCompletion = (outputStr: string) => {
    if (!selectedTheme) return;
    const currentChallenge = selectedTheme.challenges.find(c => c.id === currentLessonId);
    if (!currentChallenge || completedLessons.includes(currentLessonId)) return;

    if (outputStr.toLowerCase().includes(currentChallenge.expected.toLowerCase())) {
      setCompletedLessons(prev => [...prev, currentLessonId]);
      addXP(currentChallenge.xpReward);
      awardBadge(currentChallenge.badge);

      setTimeout(() => {
        appendBotMessage(`🎉 **Excelente trabalho! O nobre desafio foi vencido!** Você completou: **${currentChallenge.title}**!\n\n🎖️ Emblema desbloqueado: **${currentChallenge.badge}**\n✨ Recompensa: **+${currentChallenge.xpReward} XP**!\n\nVocê está pavimentando seu futuro acadêmico na programação! 🚀`);
      }, 1000);
    }
  };

  const analyzeCodeError = (codeText: string, errMsg: string): string => {
    const err = errMsg.toLowerCase();
    if (err.includes("is not defined")) {
      const match = errMsg.match(/(\w+)\s+is not defined/);
      const varName = match ? match[1] : "variável";
      return `Você usou o nome \`${varName}\` sem criá-lo antes!\n💡 **Como consertar:** Lembre-se de usar \`let ${varName} = ...\` antes de chamá-la!`;
    }
    if (err.includes("unexpected token") || err.includes("invalid or unexpected token")) {
      if (codeText.includes('“') || codeText.includes('”') || codeText.includes('‘') || codeText.includes('’')) {
        return `Opa! Você está usando "aspas curvas" inteligentes do teclado. O computador só entende aspas retas normais.\n💡 **Como consertar:** Apague as aspas curvas e digite aspas comuns pelo teclado: \`"\` ou \`'\`.`;
      }
      return `Parece que há um caractere a mais ou um erro de digitação. Verifique se fechou todos os parênteses \`()\` ou colchetes \`{}\`!`;
    }
    if (err.includes("missing ) after argument list")) {
      return `Você esqueceu de fechar um parêntese!\n💡 **Como consertar:** Certifique-se de que cada \`(\` tem o seu par correspondente \`)\` no final do \`console.log\`.`;
    }
    return `O computador não entendeu as instruções escritas nessa linha. Revise com atenção cada palavra digitada!`;
  };

  // Chatbot tutor router (Integrates with /api/kids/chat + Fallback)
  const handleSendChat = async () => {
    if (!userMsg.trim()) return;

    const text = userMsg;
    setUserMsg("");
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to history
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text, time: timeString }];
    setChatHistory(updatedHistory);
    setIsTyping(true);

    try {
      // Map history to Gemini format (limit to last 10 messages for speed)
      const apiMessages = updatedHistory.slice(-10).map(msg => ({
        role: msg.sender === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));

      // Call the new kids chat API endpoint
      const res = await fetch('/api/kids/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!res.ok) {
        throw new Error("HTTP Error: " + res.status);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setIsTyping(false);
      appendBotMessage(data.response);
      setQuestionsAsked(q => q + 1);
      addXP(10);
      
      // Question badges
      if (questionsAsked + 1 >= 5) awardBadge("💬 Curioso");
      if (questionsAsked + 1 >= 15) awardBadge("🧠 Filósofo Dev");
    } catch (err) {
      console.warn("API tutor failed, utilizing local rule-based system:", err);
      setIsTyping(false);
      const fallbackReply = getTutorResponse(text);
      appendBotMessage(fallbackReply + "\n\n*(Nota: Rodando em modo offline)*");
      setQuestionsAsked(q => q + 1);
      addXP(10);
      
      if (questionsAsked + 1 >= 5) awardBadge("💬 Curioso");
      if (questionsAsked + 1 >= 15) awardBadge("🧠 Filósofo Dev");
    }
  };

  const handleExplainCode = () => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender: 'user', text: "Pode explicar meu código do editor? 💻", time: timeString }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      if (!code.trim()) {
        appendBotMessage("Seu editor de código está vazio! Escreva ou clique em uma lição do lado esquerdo para eu analisar.");
        return;
      }

      let exp = `🤖 **Vamos dar uma olhada no seu código!** 🔍\n\n`;
      if (code.includes("console.log")) {
        exp += `• Você usou \`console.log(...)\` que serve para **imprimir informações na tela** do console.\n`;
      }
      if (code.includes("let ") || code.includes("var ")) {
        exp += `• Detectei a criação de **variáveis**. Elas funcionam como gavetas virtuais para guardar números ou textos!\n`;
      }
      if (code.includes("for ") || code.includes("while")) {
        exp += `• Você criou uma **repetição (loop)**, muito usada para rodar o mesmo comando várias vezes sem redigitar!\n`;
      }
      if (code.includes("if ") || code.includes("else")) {
        exp += `• Vi uma **condicional (se/senão)**. Ela serve para o programa tomar decisões baseadas em regras de verdadeiro ou falso.\n`;
      }
      
      // Check library usage
      if (code.includes("EngineJogos")) {
        exp += `• Você está usando as funções de **Criação de Jogos** (\`EngineJogos\`) para renderizar mapas ou calcular colisões de física!\n`;
      }
      if (code.includes("IA")) {
        exp += `• Você está usando a biblioteca de **Inteligência Artificial** (\`IA\`) para rodar neurônios matemáticos ou classificar emoções!\n`;
      }
      if (code.includes("WebDesign")) {
        exp += `• Você está usando a biblioteca de **Web Design** (\`WebDesign\`) para converter escalas de cores e criar gradientes digitais!\n`;
      }
      if (code.includes("DataScience")) {
        exp += `• Você está usando a biblioteca de **Ciência de Dados** (\`DataScience\`) para fazer análises estatísticas, ordenar números e calcular médias!\n`;
      }
      if (code.includes("FisicaEspacial")) {
        exp += `• Você está chamando a biblioteca de **Física Espacial** (\`FisicaEspacial\`) para simular empuxos de foguetes gravitacionais!\n`;
      }

      exp += `\n💡 Clique em **Executar Código ⚡** para ver o resultado prático!`;
      appendBotMessage(exp);
      addXP(10);
    }, 800);
  };

  const getTutorResponse = (msgText: string): string => {
    const q = msgText.toLowerCase();

    if (q.includes("biblioteca") || q.includes("libraria") || q.includes("funç") || q.includes("func")) {
      return `### 📦 Bibliotecas do Orbe Kids Studio
      
Cada tema de estudo oferece bibliotecas prontas que você pode usar chamando funções diretamente no editor:
• **Criação de Jogos**: \`EngineJogos.desenharMapa(x, y)\` e \`EngineJogos.verificarColisao(x1,y1,x2,y2,r)\`
• **Inteligência Artificial**: \`IA.neuronioDecisao(entradas, pesos, limite)\` e \`IA.analisarSentimento(frase)\`
• **Web Design**: \`WebDesign.rgbParaHex(r,g,b)\` e \`WebDesign.gerarCSSGradiente(c1,c2)\`
• **Ciência de Dados**: \`DataScience.calcularMedia(lista)\`, \`DataScience.filtrarAcimaDe(lista,limite)\` e \`DataScience.ordenarLista(lista)\`
• **Espaço e Física**: \`FisicaEspacial.simularLancamento(empuxo,massa,s)\` e \`FisicaEspacial.velocidadeEscape(massa,raio)\`

Selecione um tema na barra esquerda para ver as descrições de uso detalhadas!`;
    }

    if (q.includes("tema") || q.includes("assunto") || q.includes("escolher")) {
      return `### 🗺️ Escolha o seu Tema de Estudo!
      
No Orbe Kids, incentivamos a nobreza intelectual. Você escolhe o tema de estudo clicando nos botões na barra lateral esquerda:
1. **Criação de Jogos 🎮**
2. **Inteligência Artificial 🤖**
3. **Web Design 🌐**
4. **Ciência de Dados 📊**
5. **Espaço e Física 🚀**
      
Ao mudar o tema, a biblioteca correspondente é importada automaticamente para o seu editor!`;
    }

    if (q.includes("variável") || q.includes("variavel")) {
      return `### 📦 O que é uma Variável?
      
Uma variável é como uma caixa de sapatos etiquetada. Dentro dela, você guarda uma coisa (por exemplo: \`let vidas = 3;\`).
Toda vez que você fala o nome da caixa, o computador abre e vê o valor lá dentro!`;
    }

    if (q.includes("loop") || q.includes("repeti")) {
      return `### 🔁 O que são Loops?
      
Loops repetem coisas para você. Em vez de escrever 100 vezes \`console.log("Olá");\`, você diz ao computador: *"repita isso 100 vezes"* em apenas 3 linhas de código!`;
    }

    if (q.includes("bug") || q.includes("erro")) {
      awardBadge("🐛 Caçador de Bugs");
      return `### 🐛 O que é um Bug?
      
Um \"bug\" é apenas um erro de escrita no código! O termo surgiu em 1947 quando cientistas encontraram um inseto de verdade atrapalhando o funcionamento físico de um computador valvulado.`;
    }

    if (q.includes("jogo") || q.includes("games") || q.includes("roblox") || q.includes("minecraft")) {
      return `### 🎮 Criando Jogos!
      
Jogos de computador são feitos de milhares de linhas de código organizados.
Eles usam um **Game Loop** (um laço que roda a cada milissegundo verificando se você apertou teclas, atualizando os personagens e desenhando os gráficos na tela!).`;
    }

    if (q.includes("python")) {
      return `### 🐍 Linguagem Python
      
Python é uma das linguagens mais amadas do mundo porque ela se parece muito com o inglês falado e tem poucas regras visuais.
Para escrever algo na tela em Python, você só digita:
\`print("Olá!")\`
Mude a opção de linguagem no topo do editor para **Python** para testar!`;
    }

    if (q.includes("desafio") || q.includes("quest") || q.includes("acad")) {
      return `### 🏆 Desafios Acadêmicos!
      
Cada tema de estudo tem desafios que ajudam você a desenvolver pensamento acadêmico e de engenharia!
Escolha um tema à esquerda e selecione um desafio para carregar as instruções e o código inicial!`;
    }

    if (q.includes("olá") || q.includes("ola") || q.includes("oi") || q.includes("oi techy")) {
      return `🤖 **Olá, jovem programador!** Estou animado para aprender com você. Pergunte-me algo como *"O que é uma variável?"* ou escolha um tema de estudo na lateral!`;
    }

    return `🤖 **Excelente pergunta!**
    
Para te ajudar melhor a entender sobre tecnologia:
- Clique em qualquer **Tema** à esquerda para ver o **Conhecimento Livre** e as funções da **Biblioteca**.
- Modifique o código do desafio e clique em **Executar Código ⚡**.
- Digite uma palavra chave como **Variáveis, Loops, ou Bibliotecas** para eu explicar!`;
  };

  const handleSelectTheme = (themeId: string) => {
    setSelectedThemeId(themeId);
    const theme = THEMES.find(t => t.id === themeId);
    if (theme && theme.challenges.length > 0) {
      const firstChallenge = theme.challenges[0];
      setCurrentLessonId(firstChallenge.id);
      setCode(firstChallenge.code);
      setConsoleLogs([
        { text: `[Sistema] Carregado o tema: ${theme.title}`, type: 'system' },
        { text: `[Sistema] Biblioteca '${theme.name}' importada com sucesso! Pronto para usar.`, type: 'success' },
        { text: `[Desafio] ${firstChallenge.title}: ${firstChallenge.description}`, type: 'system' }
      ]);
      playTone(587.33, 0.1, 'sine');
      
      // Update chat history with welcome to the theme
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        appendBotMessage(`📚 **Bem-vindo ao tema ${theme.name}!** ${theme.emoji}\n\n${theme.intro}\n\n💡 Seu primeiro desafio acadêmico é: **${firstChallenge.title}**!\n\nUse as funções da biblioteca descritas na lateral e clique em **Executar Código ⚡** quando terminar.`);
      }, 400);
    }
  };

  const loadChallenge = (challenge: Challenge, themeId: string) => {
    setCurrentLessonId(challenge.id);
    setSelectedThemeId(themeId);
    setCode(challenge.code);
    setLanguage('js');
    setConsoleLogs([
      { text: `[Desafio] Carregado com sucesso: ${challenge.title}`, type: 'system' },
      { text: `[Objetivo] ${challenge.description}`, type: 'system' }
    ]);
    
    // Play sound
    playTone(587.33, 0.1, 'sine');
    
    // Bot prompt
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      appendBotMessage(`📚 **Desafio Carregado:** **${challenge.title}**\n\n*Objetivo:* ${challenge.description}\n\n💡 *Dica:* ${challenge.hint}`);
    }, 400);
  };

  const getNextFact = () => {
    setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    playTone(700, 0.05);
  };

  return (
    <>
      <Header />
      
      {/* Container spacing to clear fixed navbar */}
      <div className="pt-24 min-h-screen bg-[#070311] text-gray-100 flex flex-col font-sans select-none relative overflow-hidden">
        
        {/* Colorful neon ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#06b6d4]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-6 z-10">
          
          {/* Header Panel with Level / XP */}
          <div className="bg-[#120b24]/85 border border-[#8b5cf6]/25 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🚀</div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wider font-mono">
                  Orbe Kids Studio
                </h1>
                <p className="text-xs text-purple-300 font-semibold tracking-widest uppercase">Escola de Programadores Mirins & Cientistas 🤖</p>
              </div>
            </div>

            {/* Gamification Bar */}
            <div className="flex items-center gap-4 w-full md:max-w-md bg-white/5 border border-white/10 rounded-full py-2.5 px-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-lg shrink-0">
                Lvl {level}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>EXP: {xp} / {level * 100}</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(xp / (level * 100)) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Badges Row */}
              <div className="flex gap-1">
                {badges.slice(-3).map((bg, idx) => (
                  <span 
                    key={idx} 
                    className="text-lg animate-bounce duration-500 cursor-help" 
                    title={bg}
                  >
                    {bg.split(" ")[0]}
                  </span>
                ))}
                {badges.length === 0 && (
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Sem Emblemas</span>
                )}
              </div>
            </div>
          </div>

          {/* Main workspace layout split into three sections */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
            
            {/* 1. Left sidebar: Themes & Challenges Explorer */}
            <aside className="bg-[#120b24]/55 border border-[#8b5cf6]/20 rounded-2xl p-4 flex flex-col gap-4 overflow-y-auto max-h-[85vh]">
              
              {/* Theme Selector */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 flex items-center gap-1">
                  <span>Escolha o Tema de Estudo</span>
                </h3>
                <div className="flex flex-col gap-1.5">
                  {THEMES.map(theme => {
                    const isSelected = selectedThemeId === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleSelectTheme(theme.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md' 
                            : 'bg-white/5 border-white/10 hover:border-cyan-500/30 hover:text-white text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{theme.emoji}</span>
                          <span>{theme.name}</span>
                        </div>
                        <ChevronRight size={12} className={isSelected ? 'text-cyan-400' : 'text-gray-600'} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free Knowledge summary */}
              {selectedTheme && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-1.5">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                    <HelpCircle size={11} />
                    <span>Conhecimento Livre</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    {selectedTheme.intro}
                  </p>
                </div>
              )}

              {/* Library docs */}
              {selectedTheme && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col gap-2">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <Code2 size={11} />
                    <span>Biblioteca do Tema</span>
                  </h3>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {selectedTheme.libraryDocs.map((doc, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5 border-b border-white/5 pb-1.5 last:border-none last:pb-0">
                        <span className="font-mono text-[10px] text-yellow-300 font-bold break-all">{doc.name}</span>
                        <span className="text-[10px] text-gray-400 leading-snug">{doc.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenges */}
              {selectedTheme && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400 flex items-center gap-1">
                    <Trophy size={11} />
                    <span>Desafios Acadêmicos</span>
                  </h3>
                  <div className="flex flex-col gap-2">
                    {selectedTheme.challenges.map(ch => {
                      const isActive = ch.id === currentLessonId;
                      const isDone = completedLessons.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => loadChallenge(ch, selectedTheme.id)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-1 ${
                            isActive 
                              ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-sm' 
                              : 'bg-white/5 border-white/10 hover:border-cyan-500/50 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold w-full">
                            <span className="truncate">{ch.title}</span>
                            {isDone && <span className="text-emerald-400 text-xs">✅</span>}
                          </div>
                          <div className="flex justify-between w-full text-[9px] font-extrabold uppercase tracking-wider text-purple-400">
                            <span>{ch.difficulty}</span>
                            <span>+{ch.xpReward} XP</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fun Fact card */}
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 flex flex-col gap-2 mt-auto">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400 flex items-center gap-1">
                  <Lightbulb size={12} />
                  <span>Fato Curioso</span>
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed italic border-l-2 border-yellow-500/40 pl-2">
                  "{funFact}"
                </p>
                <button 
                  onClick={getNextFact}
                  className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase self-start transition-colors"
                >
                  Outro Fato 🎲
                </button>
              </div>
            </aside>

            {/* 2. Middle Editor & Console (Colspan-2) */}
            <section className="lg:col-span-2 bg-[#0b0716] border border-[#8b5cf6]/35 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              
              {/* Header Editor Controls */}
              <div className="bg-black/40 border-b border-[#8b5cf6]/20 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-widest">
                    {language === 'js' ? '📄 script.js' : '📄 script.py'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={language}
                    onChange={(e) => {
                      const val = e.target.value as 'js' | 'python';
                      setLanguage(val);
                      if (val === 'python') {
                        setCode(`# Digite seu código Python aqui!\nnome = "DevKids"\nprint("Olá,", nome)\nprint("Simulador Python ativo!")`);
                      } else {
                        const currentTheme = THEMES.find(t => t.id === selectedThemeId);
                        const activeL = currentTheme?.challenges.find(c => c.id === currentLessonId);
                        setCode(activeL ? activeL.code : THEMES[0].challenges[0].code);
                      }
                    }}
                    className="bg-white/5 border border-[#8b5cf6]/30 text-white text-[11px] font-bold px-2 py-1 rounded-md outline-none cursor-pointer"
                  >
                    <option value="js" className="bg-[#0b0716]">JavaScript</option>
                    <option value="python" className="bg-[#0b0716]">Python (Simulado)</option>
                  </select>

                  <button
                    onClick={handleRunCode}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-[11px] font-extrabold px-3 py-1 rounded-md shadow-md hover:scale-[1.03] transition-all flex items-center gap-1"
                  >
                    <span>Executar</span>
                    <Play size={10} fill="currentColor" />
                  </button>

                  <button
                    onClick={() => {
                      const currentTheme = THEMES.find(t => t.id === selectedThemeId);
                      const activeL = currentTheme?.challenges.find(c => c.id === currentLessonId);
                      if (activeL && language === 'js') {
                        setCode(activeL.code);
                      } else {
                        setCode("");
                      }
                      setConsoleLogs([{ text: "[Editor] Limpo e reiniciado.", type: 'system' }]);
                    }}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors"
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>

              {/* Code TextArea body */}
              <div className="flex-1 flex font-mono text-sm leading-relaxed overflow-hidden min-h-[300px]">
                <div className="w-12 bg-black/30 text-right pr-2.5 py-4 text-white/20 select-none border-r border-white/5">
                  {code.split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="flex-1 bg-transparent border-none outline-none resize-none p-4 text-emerald-300 font-mono text-sm overflow-x-auto whitespace-pre leading-relaxed placeholder:opacity-20"
                  placeholder="// Escreva seu código aqui..."
                />
              </div>

              {/* Output Console */}
              <div className="h-44 bg-black border-t-2 border-[#8b5cf6]/20 flex flex-col">
                <div className="bg-white/[0.02] border-b border-white/5 px-4 py-1.5 flex items-center justify-between shrink-0">
                  <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-yellow-400 flex items-center gap-1">
                    <Terminal size={12} />
                    <span>Console de Saída</span>
                  </span>
                  <button 
                    onClick={() => setConsoleLogs([])}
                    className="text-white/40 hover:text-white text-[9px] font-bold uppercase tracking-wider bg-transparent border-none outline-none cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs flex flex-col gap-1.5 select-text">
                  {consoleLogs.map((log, idx) => (
                    <div 
                      key={idx}
                      className={`
                        ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                        ${log.type === 'success' ? 'text-emerald-400 font-bold' : ''}
                        ${log.type === 'system' ? 'text-cyan-400 italic' : 'text-gray-200'}
                      `}
                    >
                      {log.text}
                    </div>
                  ))}
                  {consoleLogs.length === 0 && (
                    <div className="text-white/20 italic text-center pt-4">
                      Aguardando execução... Clique em "Executar Código" ⚡
                    </div>
                  )}
                </div>
              </div>

            </section>

            {/* 3. Right: Chatbot Tutor Panel (Techy) */}
            <section className="bg-[#120b24]/55 border border-[#8b5cf6]/20 rounded-2xl overflow-hidden flex flex-col">
              
              {/* Chat Header */}
              <div className="bg-purple-900/10 border-b border-white/5 p-3 flex items-center gap-2.5">
                <span className="text-2xl animate-pulse">🤖</span>
                <div className="flex-grow flex flex-col">
                  <span className="text-xs font-extrabold text-white">Techy</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span>Tutor de Código Ativo</span>
                  </span>
                </div>
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scroll-smooth">
                {chatHistory.map((msg, idx) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div 
                      key={idx}
                      className={`flex gap-2 max-w-[85%] ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
                    >
                      <span className="text-base shrink-0 mt-1">{isBot ? '🤖' : '👦'}</span>
                      <div className="flex flex-col gap-1">
                        <div 
                          className={`p-3 rounded-2xl text-[12px] leading-relaxed border ${
                            isBot 
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-100 rounded-tl-sm' 
                              : 'bg-gradient-to-r from-purple-500 to-pink-500 border-none text-white rounded-tr-sm shadow-md'
                          }`}
                          style={{ whiteSpace: 'pre-wrap' }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdownText(msg.text) }}
                        />
                        <span className={`text-[9px] text-gray-500 ${!isBot ? 'text-right' : ''}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Dots */}
                {isTyping && (
                  <div className="self-start flex gap-2 items-center">
                    <span className="text-base">🤖</span>
                    <div className="flex gap-1 bg-purple-500/15 border border-purple-500/30 px-3.5 py-2 rounded-2xl rounded-tl-sm">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input & Suggestion Chips */}
              <div className="p-3 border-t border-white/5 bg-black/20 flex flex-col gap-2 shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (chip.text.includes("Explicar meu código")) {
                          handleExplainCode();
                        } else {
                          setUserMsg(chip.text);
                        }
                      }}
                      className="bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <textarea
                    value={userMsg}
                    onChange={(e) => setUserMsg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    placeholder="Pergunte ao Techy..."
                    className="flex-1 bg-white/5 border border-white/10 focus:border-[#8b5cf6] outline-none text-xs rounded-xl px-3 py-2 text-white resize-none max-h-16 h-8"
                  />
                  <button
                    onClick={handleSendChat}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-[1.05] rounded-xl px-3 flex items-center justify-center text-white transition-all shadow-md"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>

            </section>

          </div>

          {/* Quick Info Callout footer */}
          <div className="bg-[#120b24]/30 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span className="text-gray-400 leading-relaxed max-w-3xl text-center sm:text-left">
              🌐 **Estúdio de Programação Gratuito:** Servidor patrocinado por parceiros para manter a educação de tecnologia aberta, nobre e gratuita para todas as crianças do Brasil!
            </span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowHelpModal(true)}
                className="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase font-mono tracking-wider"
              >
                Quer ajuda? Clique aqui 🛡️
              </button>
              <span className="text-white/10">|</span>
              <Link 
                href="/"
                className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-gray-300 font-extrabold uppercase tracking-widest text-[10px] shrink-0 transition-colors"
              >
                Voltar ao Site Principal
              </Link>
            </div>
          </div>

        </div>

      </div>

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#120b24] border border-red-500/30 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <span>🛡️ Canal de Apoio e Segurança</span>
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Você não está sozinho! Se precisar de ajuda, conselho, estiver passando por dificuldades ou quiser denunciar alguma situação, entre em contato gratuitamente com os órgãos de proteção oficiais:
            </p>
            <div className="flex flex-col gap-2.5 my-2">
              <a 
                href="tel:100" 
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-red-400/50 rounded-xl transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white">Disque 100</span>
                  <span className="text-[10px] text-gray-400">Conselho Tutelar e Direitos Humanos</span>
                </div>
                <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">Ligar 100</span>
              </a>
              <a 
                href="tel:190" 
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-red-400/50 rounded-xl transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white">190 (Polícia Militar)</span>
                  <span className="text-[10px] text-gray-400">Emergência e socorro imediato</span>
                </div>
                <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">Ligar 190</span>
              </a>
              <a 
                href="tel:188" 
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-red-400/50 rounded-xl transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white">188 (CVV)</span>
                  <span className="text-[10px] text-gray-400">Apoio emocional gratuito</span>
                </div>
                <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-md">Ligar 188</span>
              </a>
            </div>
            <button 
              onClick={() => setShowHelpModal(false)}
              className="mt-2 w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs py-2 rounded-xl transition-colors"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

// Simple helper to parse basic markdown inside bot speech bubbles
function parseMarkdownText(text: string): string {
  let html = text;
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400 font-bold">$1</strong>');
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<div class="text-[13px] font-extrabold text-yellow-400 mb-1 border-b border-white/5 pb-1">$1</div>');
  
  // Code block
  html = html.replace(/```(js|javascript|python)?([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-2 font-mono text-[10px] text-emerald-300 overflow-x-auto my-1 border border-white/5">$2</pre>');
  
  // Inline code
  html = html.replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 rounded font-mono text-[10px] text-yellow-300">$1</code>');
  
  // Bullet points
  html = html.replace(/^\s*-\s*(.*$)/gim, '<li class="ml-3 my-0.5">$1</li>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}
