# Gabarito de Ouro: React & UI Avançada 🚀

Este é o seu roteiro de estudos e "cheat sheet" (cola) para dominar entrevistas e construir componentes de nível Sênior.

## 1. TypeScript Front-end Development (O Fiscal VIP)
Tudo aquilo sobre a Interface garantindo que as Props desçam corretamente do Pai para o Filho. Nenhuma variável "disfarçada" entra sem respeitar a tipagem estrita (nada de `any`). Protege o sistema contra bugs antes mesmo de rodar.

## 2. UI Performance Optimization (O Azulejo na Parede)
É aqui que você garante a vaga. 
* **Virtual DOM:** A melhor analogia. Em vez de quebrar a parede inteira (dar refresh na página) para colar um azulejo novo, o React olha a parede imaginária (memória), vê qual azulejo mudou, e vai na página real e troca **só ele**.
* **Escudos Anti-recálculo:** O React gosta de refazer trabalho à toa. O `useMemo` guarda resultados de cálculos. O `useCallback` guarda funções na memória. O `React.memo` diz: "Não recarregue esse componente, nada mudou". Isso salva bateria e processamento.

## 3. CSS3 + Pixel-Perfect Responsive UI
Saber usar o CSS moderno (Flexbox, Box-sizing, transições suaves com cubic-bezier) para deixar a tela milimetricamente igual ao design original, responsiva nativamente em qualquer celular.

## 4. Design Systems & Component Style Guides (O Escopo Fechado)
* **CSS Modules:** "Engaiola" o CSS. O estilo do seu card não infecta nem estraga a estilização de botões em outras páginas. Código modular de verdade.
* **Tokens (Variáveis):** O uso de variáveis (ex: `--card-bg: #1e293b;`). Se a identidade visual da empresa mudar, você troca a cor em uma única linha e o sistema inteiro obedece magicamente. Centralização de estilo.

## 5. Accessibility Standards (a11y)
Como fazer o app funcionar para quem usa leitores de tela ou apenas o teclado.
* **O Adesivo VIP (`tabIndex={0}`):** Permite que uma caixa qualquer (`<div>`) entre na fila de navegação da tecla TAB.
* **O Detetive (`:focus-visible`):** Mostra um contorno (focus-ring) para quem usa teclado, mas esconde a borda p/ quem usa mouse (mantendo o design bonito).
* **Regra de Ouro para Preguiçosos:** Nunca faça uma `<div>` atuar como botão se puder evitar (pra coisas simples, sempre use a tag semântica `<button>`). Sempre use `alt="descrição"` e atributos escondidos como `aria-expanded` para os leitores de tela.

---

### O Pitch da Vaga (Resumo Sagrado)
Tudo o que criamos num único componente se vende como "Arquitetura". 
Se tocarem no assunto na entrevista, respire fundo e diga: 

> *"Eu crio meus componentes sem vazamento de estilo usando CSS Modules. Injeto Variáveis nativas (Tokens) para aplicar pilares de um Design System. Encapsulo navegação garantindo A11Y com `tabIndex` e `:focus-visible`, e memoizo todas as passagens de Props e funções (hooks) para estressar menos o Virtual DOM. Quer que eu compartilhe a tela para mostrar o último card que eu modelei?"*

Pode contar a vaga como sua.
