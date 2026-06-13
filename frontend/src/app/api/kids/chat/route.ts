import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use stable model instead of experimental
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const SYSTEM_CONTEXT = `Você é o **Techy** 🤖, o tutor de IA e cientista-parceiro do Orbe Kids Studio!
Sua missão é transformar crianças em futuros programadores, cientistas e criadores de tecnologia.

PERSONALIDADE:
- Extremamente entusiasmado, encorajador e empático. Nunca diga que algo é difícil demais.
- Celebra cada avanço do aluno como uma vitória científica real.
- Usa linguagem simples, direta, cheia de emojis e analogias do mundo real.
- Respostas são sempre em português do Brasil.
- Você é engraçado, usa gírias de jovem, mas sempre educa!
- Você NUNCA diz "modo offline" ou "fallback" — você é sempre o Techy, vivo e presente!

TEMAS QUE VOCÊ DOMINA:
🎮 Jogos — loops, colisões, física, coordenadas cartesianas, game loop, delta time
🤖 Inteligência Artificial — neurônios, pesos, sentimentos, decisões, machine learning
🌐 Web — HTML, CSS, cores RGB, gradientes, design digital, DOM, APIs
📊 Dados — arrays, médias, filtros, ordenação bubble sort, big data
🚀 Espaço — gravidade, empuxo, velocidade de escape, órbitas, astronomia
💻 Computação Geral — variáveis, funções, loops, condicionais, debugging

COMO RESPONDER:
1. Comece com um emoji de entusiasmo e um título em negrito.
2. Explique o conceito com 1 analogia simples e concreta do mundo real.
3. Dê um exemplo de código curto se pertinente (em bloco de código markdown).
4. Termine com uma frase motivadora e uma pergunta para engajar o aluno.
5. Máximo 300 palavras por resposta — seja conciso e impactante.
6. Varie SEMPRE os inícios das respostas — nunca comece igual.

QUANDO CORRIGIR ERROS:
- Elogie o esforço primeiro!
- Identifique o problema com uma analogia simples.
- Mostre a versão corrigida do código.
- Incentive a tentar de novo.

PROIBIÇÕES:
- Nunca diga "não sei", "isso é complicado demais", ou "você não vai entender ainda".
- Nunca responda fora de programação, tecnologia, ciência ou matemática.
- Nunca seja repetitivo — varie os inícios de resposta.
- Nunca mencione modo offline ou problemas técnicos internos.`;

// Rich local knowledge base — used as fallback when API is unavailable
const LOCAL_KNOWLEDGE: Record<string, string> = {
  variavel: `🎯 **Variáveis são como caixas mágicas!**

Imagine um armário cheio de gavetas com etiquetas. Cada gaveta tem um nome e guarda um valor diferente!

\`\`\`javascript
let vidas = 3;        // gaveta "vidas" guarda o número 3
let nome = "Luiza";   // gaveta "nome" guarda o texto "Luiza"
let ganhou = false;   // gaveta "ganhou" guarda verdadeiro/falso
\`\`\`

Você pode **trocar** o conteúdo da gaveta quando quiser:
\`\`\`javascript
vidas = vidas - 1;  // perdeu uma vida!
console.log(vidas); // mostra: 2
\`\`\`

💡 Variáveis são a base de TUDO em programação. Sem elas, o computador esquece tudo a cada segundo!

Que tipo de dado você quer guardar numa variável agora? 😄`,

  loop: `🔁 **Loops = o superpoder de não se repetir!**

Imagina que você precisa gritar "Vai Brasil!" 100 vezes. Você prefere escrever 100 vezes ou dizer: *"repita 100 vezes"*?

\`\`\`javascript
// Sem loop — tortura 😭
console.log("Vai Brasil!");
console.log("Vai Brasil!");
// ... 98 vezes mais...

// Com loop — inteligente! 🚀
for (let i = 1; i <= 100; i++) {
  console.log("Vai Brasil! " + i);
}
\`\`\`

O **for** tem 3 partes:
- 📌 *onde começa* (let i = 1)
- 🛑 *quando para* (i <= 100)  
- ⬆️ *como avança* (i++)

Loops são a base de jogos, animações e da IA! Quer ver como jogos usam loops? 🎮`,

  funcao: `⚡ **Funções são feitiços que você cria!**

Um feitiço tem um nome, você lança quando quiser, e ele faz a mesma coisa toda vez. Funções são exatamente isso!

\`\`\`javascript
// Criando o feitiço "atirar"
function atirar(dano, alvo) {
  console.log(alvo + " recebeu " + dano + " de dano! 💥");
  return dano * 2; // dano crítico!
}

// Lançando o feitiço!
atirar(15, "Dragão");   // Dragão recebeu 15 de dano!
atirar(30, "Goblin");   // Goblin recebeu 30 de dano!
\`\`\`

A parte legal é: você escreve o código **uma vez** e usa **infinitas vezes**!

Que feitiço (função) você quer criar hoje? 🧙‍♂️`,

  bug: `🐛 **Bugs são como palavras escritas errado — o computador fica confuso!**

A palavra "bug" tem uma história incrível: em 1947, a cientista Grace Hopper encontrou uma **mariposa de verdade** presa dentro de um computador! Ela estava causando erros no hardware! 🦋

Os bugs mais comuns:
1. 🔴 **SyntaxError** — letra errada, parêntese faltando
2. 🟡 **ReferenceError** — usando nome que não existe
3. 🟠 **TypeError** — fazendo operação errada (soma com texto!)

\`\`\`javascript
// Bug clássico! 🐛
consoel.log("Oi");  // Errado! 
console.log("Oi");  // Certo! ✅

let x = 10;
console.log(X);  // Errado! X ≠ x (maiúscula/minúscula importa!)
console.log(x);  // Certo! ✅
\`\`\`

💡 Todo programador do mundo comete bugs. Até os engenheiros da NASA! O segredo é saber **como encontrá-los** 🔍

Qual erro você está vendo no console? Manda aqui que eu te ajudo! 💪`,

  jogo: `🎮 **Jogos são código + matemática + criatividade!**

Todo jogo tem o mesmo coração: o **Game Loop** — uma repetição que roda 60 vezes por SEGUNDO!

\`\`\`javascript
// Estrutura básica de um jogo
let jogadorX = 0;
let jogadorY = 0;

function gameLoop() {
  // 1. Verifica entradas (teclado, mouse)
  // 2. Atualiza posições e física
  jogadorX += velocidade;
  
  // 3. Verifica colisões
  if (jogadorX >= inimigo.x) {
    console.log("COLISÃO! 💥");
  }
  
  // 4. Desenha tudo na tela
  // ... repete 60x por segundo!
}
\`\`\`

Minecraft, Roblox, Fortnite — todos usam esse mesmo princípio! 
O Minecraft foi criado por UMA pessoa só (o Notch) antes de virar bilionário! ⛏️

Quer fazer um mini-jogo de colisão com a biblioteca EngineJogos? 🕹️`,

  ia: `🤖 **IA é matemática que aprende a pensar!**

Sabe como seu cérebro reconhece um cachorro na foto? Ele tem **neurônios** conectados que processam cores, formas e padrões. A IA imita isso!

\`\`\`javascript
// Neurônio artificial simples
function neuronioSimples(entradas, pesos) {
  let soma = 0;
  for (let i = 0; i < entradas.length; i++) {
    soma += entradas[i] * pesos[i]; // multiplica e soma!
  }
  return soma > 0.5 ? "SIM" : "NÃO"; // decide!
}

// Detectar se está quente (1=sol, 1=calor, 0=chuva)
let resposta = neuronioSimples([1, 1, 0], [0.6, 0.4, 0.2]);
console.log(resposta); // "SIM" — tá quente!
\`\`\`

A IA do ChatGPT tem **175 bilhões** desses neurônios matemáticos! 🤯

Quer ativar o neurônio da biblioteca IA do seu tema? 🧠`,

  web: `🌐 **A Web é um superpoder que alcança bilhões de pessoas!**

Quando você acessa um site, seu computador pede arquivos para servidores do outro lado do mundo em **milissegundos**!

Cores digitais em código:
\`\`\`javascript
// RGB = Vermelho, Verde, Azul (0 a 255)
const vermelho = "rgb(255, 0, 0)";    // máximo vermelho
const azul    = "rgb(0, 0, 255)";    // máximo azul
const branco  = "rgb(255, 255, 255)"; // todos no máximo!

// Ou em hexadecimal (base 16):
const verde = "#00ff00"; // 00=sem vermelho, ff=verde máximo, 00=sem azul
\`\`\`

5 bilhões de pessoas usam a internet **todo dia**! A web que você aprende hoje pode conectar todas elas amanhã! 🚀

Quer converter cores com a biblioteca WebDesign? 🎨`,

  python: `🐍 **Python é a linguagem mais amada do planeta!**

Python foi criado por Guido van Rossum em 1991, inspirado no show de comédia **Monty Python**! Ele queria uma linguagem divertida e simples — e conseguiu!

\`\`\`python
# Python parece inglês!
nome = "DevMirim"
idade = 10

print(f"Olá, {nome}! Você tem {idade} anos.")

# Loop em Python
for estrela in range(5):
    print("⭐" * (estrela + 1))
\`\`\`

Python é usado na NASA, no YouTube, no Instagram e em quase toda IA do mundo! 🤖

Selecione Python no seletor do editor e vamos praticar! 🐍`,

  espaco: `🚀 **Foguetes voam por causa da 3ª Lei de Newton!**

*"Para toda ação há uma reação igual e oposta"* — Isaac Newton, 1687.

Quando um foguete expulsa gases quentes para baixo com força enorme, ele é empurrado para **cima** com a mesma força! É física pura! 🔥

\`\`\`javascript
function calcularEmpuxo(massa, gravidade) {
  const pesoFoguete = massa * gravidade; // kg × 9.8 m/s²
  const empuxoNecessario = pesoFoguete * 1.5; // 50% a mais que o peso
  console.log("Empuxo mínimo: " + empuxoNecessario + " Newtons");
  return empuxoNecessario;
}

calcularEmpuxo(1000, 9.8); // Foguete de 1 tonelada
\`\`\`

Para escapar da Terra, um foguete precisa atingir **40.000 km/h**! ⚡

Quer simular o lançamento com a biblioteca FisicaEspacial? 🛸`,

  dados: `📊 **Ciência de Dados = encontrar histórias escondidas em números!**

Netflix sabe qual série você vai amar. Spotify cria playlists perfeitas. Google Maps prevê trânsito. Tudo com **análise de dados**!

\`\`\`javascript
// Notas de um aluno
let notas = [7, 9, 6, 10, 8];

// Calcular média manualmente:
let soma = notas.reduce((acc, n) => acc + n, 0);
let media = soma / notas.length;
console.log("Média: " + media); // 8.0 ✅

// Filtrar só as aprovações (acima de 7):
let aprovadas = notas.filter(n => n > 7);
console.log("Notas acima de 7:", aprovadas); // [9, 10, 8]
\`\`\`

Um cientista de dados no Brasil ganha entre R$8.000 e R$25.000 por mês! 💰

Quer praticar com a biblioteca DataScience? 📈`,

  default_tema: `🤖 **Boa pergunta, futuro programador!**

Estou aqui para te ajudar a dominar tecnologia! Aqui no Orbe Kids você pode explorar:

🎮 **Criação de Jogos** — física, colisões, coordenadas
🤖 **Inteligência Artificial** — neurônios matemáticos
🌐 **Web Design** — cores, gradientes, interfaces  
📊 **Ciência de Dados** — arrays, médias, filtros
🚀 **Espaço e Física** — foguetes, gravidade, órbitas

**Como usar:**
1. Escolha um tema na lateral esquerda 👈
2. Leia o "Conhecimento Livre" e veja as funções da biblioteca
3. Clique num desafio para carregar o código
4. Execute com o botão **Executar ⚡**
5. Me pergunte qualquer coisa que eu te explico!

Me faz uma pergunta sobre programação, tecnologia ou ciência — pode ser qualquer coisa! 🚀`,
};

function getLocalResponse(messages: Array<{ role: string; content: string }>, theme?: string): string {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content?.toLowerCase() ?? '';
  
  // Pattern matching for topics
  const patterns: [RegExp, string][] = [
    [/vari[aá]vel|vari[aá]veis|let |var |const /, 'variavel'],
    [/loop|for |while|repeti[rç]|laco|laço/, 'loop'],
    [/fun[cç][aã]o|fun[cç][oõ]es|function|def |método|metodo/, 'funcao'],
    [/bug|erro|error|falha|problema|ajuda/, 'bug'],
    [/jogo|game|roblox|minecraft|fortnite|gamer|colisao|colisão/, 'jogo'],
    [/ia|intelig[eê]ncia artificial|neural|neuronio|neurônio|machine learning/, 'ia'],
    [/web|site|html|css|cor|cores|rgb|hex/, 'web'],
    [/python|py |\.py/, 'python'],
    [/espa[cç]o|foguete|nasa|planeta|gravidade|newton|órbita|orbita/, 'espaco'],
    [/dados|data|m[eé]dia|array|lista|filtro|ordenar/, 'dados'],
  ];

  for (const [regex, key] of patterns) {
    if (regex.test(lastUserMsg)) {
      return LOCAL_KNOWLEDGE[key] ?? LOCAL_KNOWLEDGE['default_tema'];
    }
  }

  // Theme-specific default responses
  if (theme) {
    const themeKey = theme.toLowerCase();
    if (themeKey.includes('jogo')) return LOCAL_KNOWLEDGE['jogo'];
    if (themeKey.includes('ia') || themeKey.includes('intelig')) return LOCAL_KNOWLEDGE['ia'];
    if (themeKey.includes('web')) return LOCAL_KNOWLEDGE['web'];
    if (themeKey.includes('dado')) return LOCAL_KNOWLEDGE['dados'];
    if (themeKey.includes('espa')) return LOCAL_KNOWLEDGE['espaco'];
  }

  // Generic encouraging response with some variety
  const generics = [
    `💡 **Boa pergunta!** Me conta mais — o que exatamente você quer aprender? Pode ser sobre **variáveis, loops, funções, bugs, jogos, IA, web** ou qualquer tema de tecnologia! Estou aqui! 🤖`,
    `🚀 **Isso é interessante!** Para te ajudar melhor, me diga: você está com algum erro no código? Quer entender um conceito? Ou quer um exemplo prático? Pode soltar! 💪`,
    `⚡ **Ótimo que você perguntou!** Tente escolher um tema na lateral e clique num desafio. Se tiver dúvida sobre o código ou conceito, me manda a pergunta específica que eu explico tudo! 🎯`,
  ];
  return generics[Math.floor(Math.random() * generics.length)];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      theme,
      editorCode,
    } = body as {
      messages: Array<{ role: string; content: string }>;
      theme?: string;
      editorCode?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensagem inválido.' }, { status: 400 });
    }

    // Attempt Gemini API if key is configured and looks valid
    const isValidKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 20 && GEMINI_API_KEY.startsWith('AIza');
    
    if (isValidKey) {
      try {
        let dynamicSystem = SYSTEM_CONTEXT;
        if (theme) {
          dynamicSystem += `\n\nCONTEXTO ATUAL DO ALUNO:\n- Tema ativo: ${theme}`;
        }
        if (editorCode) {
          dynamicSystem += `\n- Código atual no editor:\n\`\`\`javascript\n${editorCode.slice(0, 800)}\n\`\`\`\nQuando o aluno pedir ajuda, use esse código como referência direta.`;
        }

        const recent = messages.slice(-12);
        const geminiContents = recent.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));

        const payload = {
          system_instruction: { parts: [{ text: dynamicSystem }] },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.85,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        };

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000), // 15s timeout
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return NextResponse.json({ response: text });
          }
        } else {
          console.warn('[Kids/Chat] Gemini returned', response.status, '— using local engine');
        }
      } catch (apiErr: any) {
        console.warn('[Kids/Chat] Gemini API call failed:', apiErr?.message ?? apiErr);
      }
    } else {
      console.info('[Kids/Chat] No valid Gemini key — using local knowledge engine');
    }

    // Always-available local response engine
    const localReply = getLocalResponse(messages, theme);
    return NextResponse.json({ response: localReply });

  } catch (err: any) {
    console.error('[Kids/Chat] Internal error:', err?.message ?? err);
    return NextResponse.json(
      { response: '🤖 **Oops!** Tive um probleminha aqui. Tenta me perguntar de novo! O Techy está sempre aqui! 💪' },
      { status: 200 } // Return 200 so client shows the message
    );
  }
}
