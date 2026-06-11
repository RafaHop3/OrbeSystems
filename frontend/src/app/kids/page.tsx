'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Send, Trash2, Sparkles, Trophy, BookOpen, 
  Award, Terminal, Code2, RefreshCw, Lightbulb, ChevronRight, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── DATA: LESSONS & CHALLENGES ──
interface Lesson {
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

const LESSONS: Lesson[] = [
  {
    id: "hello_world",
    title: "👋 Lição 1: Diga Olá!",
    difficulty: "Iniciante",
    description: "Aprenda a fazer o computador falar imprimindo textos na tela!",
    code: `// Lição 1: Diga Olá!
// Clique em "Executar Código" para rodar a mensagem abaixo!

console.log("Olá, Mundo! 🚀");
console.log("Estou aprendendo a programar na Orbe Systems!");
`,
    expected: "Olá, Mundo!",
    xpReward: 30,
    badge: "🐣 Iniciante do Código",
    hint: "Tente mudar o texto entre aspas para imprimir seu próprio nome!"
  },
  {
    id: "variables",
    title: "📦 Lição 2: Variáveis",
    difficulty: "Iniciante",
    description: "Variáveis são como caixas com nomes para guardar informações.",
    code: `// Lição 2: Variáveis
// Vamos criar duas caixinhas e somar seus valores!

let nivelCodigo = 5;
let pontosBonus = 10;
let totalPontos = nivelCodigo + pontosBonus;

console.log("Meu nível de código é: " + nivelCodigo);
console.log("Adicionando bônus...");
console.log("Pontos Totais: " + totalPontos);
`,
    expected: "Pontos Totais:",
    xpReward: 40,
    badge: "📦 Mestre das Caixas",
    hint: "Mude o valor de 'nivelCodigo' para um número maior, como 100!"
  },
  {
    id: "loops",
    title: "🔁 Lição 3: Repetições (Loops)",
    difficulty: "Explorador",
    description: "Loops dizem ao computador para repetir uma ação várias vezes.",
    code: `// Lição 3: Repetições
// Vamos contar de 1 até 5 usando o loop 'for'!

for (let contagem = 1; contagem <= 5; contagem++) {
  console.log("Contagem: " + contagem + " 🌟");
}

console.log("Contagem finalizada!");
`,
    expected: "Contagem: 5",
    xpReward: 50,
    badge: "🔁 Guardião do Loop",
    hint: "Você consegue mudar 'contagem <= 5' para 'contagem <= 10' para contar mais alto?"
  },
  {
    id: "conditions",
    title: "🚦 Lição 4: Condições (Se/Senão)",
    difficulty: "Explorador",
    description: "Faça o código tomar decisões inteligentes baseado em regras.",
    code: `// Lição 4: Condições
// Vamos ver se temos moedas suficientes para comprar uma varinha mágica!

let moedasDeOuro = 15;
let precoVarinha = 10;

if (moedasDeOuro >= precoVarinha) {
  console.log("Eba! Você comprou a Varinha Mágica! 🪄✨");
} else {
  console.log("Ah não! Você precisa de mais moedas de ouro. 🪙");
}
`,
    expected: "Varinha Mágica!",
    xpReward: 50,
    badge: "🚦 Explorador de Caminhos",
    hint: "Tente mudar 'moedasDeOuro' para 5 e execute o código de novo!"
  }
];

const QUICK_CHIPS = [
  "Explicar meu código! 💻",
  "O que é um bug? 🐛",
  "Como criar um jogo? 🎮",
  "Me ensine Python! 🐍",
  "Me dê um desafio! 🏆"
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
  const [currentLessonId, setCurrentLessonId] = useState<string>("hello_world");

  // IDE states
  const [code, setCode] = useState(LESSONS[0].code);
  const [language, setLanguage] = useState<'js' | 'python'>('js');
  const [consoleLogs, setConsoleLogs] = useState<{ text: string; type: 'log' | 'error' | 'success' | 'system' }[]>([]);

  // Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userMsg, setUserMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [funFact, setFunFact] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Audio synthesize function
  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
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
    // Load local storage if present
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
        text: `👋 **Olá, futuro desenvolvedor! Eu sou o Techy, seu tutor de programação!** 🤖✨\n\nAqui no espaço **Orbe Kids**, você pode aprender a programar de verdade!\n\n1. **Escolha uma lição** na barra lateral esquerda.\n2. Edite o código no centro e clique em **Executar Código ⚡**.\n3. Me pergunte qualquer coisa no chat à direita! Vamos começar?`,
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
          
          // Add Bot celebration message
          setTimeout(() => {
            appendBotMessage(`🎉 **VOCÊ SUBIU DE NÍVEL!** Parabéns, você agora é **Nível ${nextLvl}**! 🚀\n\nSeu cérebro de programador está ficando gigante! Continue assim!`);
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
    setConsoleLogs([{ text: "[Servidor] Compilando e executando código...", type: 'system' }]);
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
      // Evaluate user code in a safe boundary function
      const evalFunc = new Function(code);
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
        
        // Check current lesson criteria
        checkLessonCompletion(logs.join("\n"));
      } else {
        setConsoleLogs(prev => [
          ...prev,
          { text: "[Aviso] O código rodou, mas nada foi impresso. Use console.log(\"texto\") para escrever na tela!", type: 'system' as const }
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
          // basic evaluation of variables vs quotes
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            outputs.push(content.substring(1, content.length - 1));
          } else if (variables[content] !== undefined) {
            outputs.push(String(variables[content]));
          } else {
            // Check math inside print
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

    } catch (e: any) {
      playErrorSound();
      setConsoleLogs(prev => [
        ...prev,
        { text: `❌ Erro no Python Sim: ${e.message}`, type: 'error' as const }
      ]);
    }
  };

  const checkLessonCompletion = (outputStr: string) => {
    const currentLesson = LESSONS.find(l => l.id === currentLessonId);
    if (!currentLesson || completedLessons.includes(currentLessonId)) return;

    if (outputStr.toLowerCase().includes(currentLesson.expected.toLowerCase())) {
      setCompletedLessons(prev => [...prev, currentLessonId]);
      addXP(currentLesson.xpReward);
      awardBadge(currentLesson.badge);

      setTimeout(() => {
        appendBotMessage(`🎉 **Excelente trabalho!** Você completou a **${currentLesson.title}**!\n\n🎖️ Emblema desbloqueado: **${currentLesson.badge}**\n✨ Recompensa: **+${currentLesson.xpReward} XP**!`);
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

  // Chatbot tutor router
  const handleSendChat = () => {
    if (!userMsg.trim()) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg, time: timeString }]);
    const query = userMsg;
    setUserMsg("");

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const response = getTutorResponse(query);
      appendBotMessage(response);
      setQuestionsAsked(q => q + 1);
      addXP(10);
      
      // Question badges
      if (questionsAsked + 1 >= 5) awardBadge("💬 Curioso");
      if (questionsAsked + 1 >= 15) awardBadge("🧠 Filósofo Dev");
    }, 700 + Math.random() * 500);
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

      exp += `\n💡 Clique em **Executar Código ⚡** para ver o resultado prático!`;
      appendBotMessage(exp);
      addXP(10);
    }, 800);
  };

  const getTutorResponse = (msgText: string): string => {
    const q = msgText.toLowerCase();

    if (q.includes("variável") || q.includes("variavel")) {
      return `### 📦 O que é uma Variável?
      
Uma variável é como uma caixa de sapatos etiquetada. Dentro dela, você guarda uma coisa (por exemplo, o número de vidas de um jogo: \`let vidas = 3;\`).
Toda vez que você fala o nome da caixa, o computador abre e vê o valor lá dentro!

Em JavaScript criamos assim:
\`\`\`js
let meuNome = "Techy";
console.log(meuNome);
\`\`\``;
    }

    if (q.includes("loop") || q.includes("repeti")) {
      return `### 🔁 O que são Loops?
      
Loops repetem coisas para você. Em vez de escrever 100 vezes \`console.log("Olá");\`, você diz ao computador: *"repita isso 100 vezes"* em apenas 3 linhas de código!

Exemplo de Loop:
\`\`\`js
for (let i = 1; i <= 3; i++) {
  console.log("Pulo número " + i);
}
\`\`\``;
    }

    if (q.includes("bug") || q.includes("erro")) {
      awardBadge("🐛 Caçador de Bugs");
      return `### 🐛 O que é um Bug?
      
Um "bug" é apenas um erro de escrita no código! O termo surgiu em 1947 quando cientistas encontraram um inseto de verdade atrapalhando o funcionamento do computador.
Encontrar e corrigir bugs faz parte do dia a dia de todo programador!`;
    }

    if (q.includes("jogo") || q.includes("games") || q.includes("roblox") || q.includes("minecraft")) {
      return `### 🎮 Criando Jogos!
      
Jogos de computador como Roblox e Minecraft são feitos de milhares de linhas de código organizados.
Eles usam um **Game Loop** (um laço que roda a cada milissegundo verificando se você apertou teclas, atualizando os personagens e desenhando os gráficos na tela!).
Você pode começar criando joguinhos em blocos no **Scratch** ou no **Roblox Studio**!`;
    }

    if (q.includes("python")) {
      return `### 🐍 Linguagem Python
      
Python é uma das linguagens mais amadas do mundo porque ela se parece muito com o inglês falado e tem poucas regras visuais.
Para escrever algo na tela em Python, você só digita:
\`print("Olá!")\`

Mude a opção de linguagem no topo do editor para **Python** para testar!`;
    }

    if (q.includes("desafio") || q.includes("quest")) {
      return `### 🏆 Desafio do Techy!
      
Você consegue criar um código que conte de **10 até 1**, e no final escreva **"LANÇAMENTO! 🚀"**?
Dica: use uma repetição ou console.log para cada número. Tente fazer no editor!`;
    }

    if (q.includes("olá") || q.includes("ola") || q.includes("oi") || q.includes("oi techy")) {
      return `🤖 **Olá, jovem programador!** Estou animado para aprender com você. Pergunte-me algo como *"O que é uma variável?"* ou escolha uma lição na lateral!`;
    }

    return `🤖 **Boa pergunta!**

Para te ajudar melhor a entender sobre tecnologia:
- Clique em qualquer **Lição** à esquerda para carregar o modelo.
- Modifique e clique em **Executar Código ⚡**.
- Digite uma palavra chave como **Variáveis, Loops, ou Bugs** para eu explicar!`;
  };

  const loadLesson = (ls: Lesson) => {
    setCurrentLessonId(ls.id);
    setCode(ls.code);
    setLanguage('js');
    setConsoleLogs([{ text: `[Lição] Carregada com sucesso: ${ls.title}`, type: 'system' }]);
    
    // Play sound
    playTone(587.33, 0.1, 'sine');
    
    // Bot prompt
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      appendBotMessage(`📚 **Nova lição carregada:** **${ls.title}**\n\n*Objetivo:* ${ls.description}\n\n💡 *Dica:* ${ls.hint}`);
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
                <p className="text-xs text-purple-300 font-semibold tracking-widest uppercase">Escola de Programadores Mirins 🤖</p>
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
            
            {/* 1. Left sidebar: Lessons & Progress */}
            <aside className="bg-[#120b24]/55 border border-[#8b5cf6]/20 rounded-2xl p-4 flex flex-col gap-4">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <BookOpen size={14} />
                <span>Lições e Desafios</span>
              </h2>

              <div className="flex flex-col gap-2.5">
                {LESSONS.map(ls => {
                  const isActive = ls.id === currentLessonId;
                  const isDone = completedLessons.includes(ls.id);
                  return (
                    <button
                      key={ls.id}
                      onClick={() => loadLesson(ls)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-200 flex flex-col gap-1 ${
                        isActive 
                          ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300' 
                          : 'bg-white/5 border-white/10 hover:border-cyan-500/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{ls.title}</span>
                        {isDone && <span className="text-emerald-400 text-sm">✅</span>}
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                        {ls.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Fun Fact card */}
              <div className="mt-auto bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 flex flex-col gap-2">
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
                        const activeL = LESSONS.find(l => l.id === currentLessonId);
                        setCode(activeL ? activeL.code : LESSONS[0].code);
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
                      const activeL = LESSONS.find(l => l.id === currentLessonId);
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

              {/* Output Console Console Output */}
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
                        if (chip.includes("Explicar meu código")) {
                          handleExplainCode();
                        } else {
                          setUserMsg(chip.replace(/[^\w\s\p{P}]/gu, "").trim());
                        }
                      }}
                      className="bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
                    >
                      {chip}
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
              🌐 **Estúdio de Programação Gratuito:** Servidor patrocinado por parceiros para manter a educação de tecnologia aberta e gratuita para todas as crianças do Brasil!
            </span>
            <Link 
              href="/"
              className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-gray-300 font-extrabold uppercase tracking-widest text-[10px] shrink-0 transition-colors"
            >
              Voltar ao Site Principal
            </Link>
          </div>

        </div>

      </div>

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
