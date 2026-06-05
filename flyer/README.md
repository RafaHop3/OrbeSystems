# Flyer Orbe Systems

## Arquivos

| Arquivo | Uso |
|---------|-----|
| `orbe-flyer.html` | Flyer 16:9 só com CSS (abre offline, exporta via print/PDF) |
| `orbe-flyer-with-bg.html` | Mesmo layout sobre a arte IA |
| `../assets/orbe-flyer-background.png` | Fundo gerado (Midjourney/DALL-E style) |

## Exportar PNG/PDF

1. Abra `orbe-flyer.html` no Chrome.
2. `Ctrl+P` → Destino: **Salvar como PDF** ou use extensão de screenshot em 1080×608 px.

## Montar no Canva

1. Criar design **Apresentação 16:9** ou **Post Instagram** (1080×1080 se quadrado).
2. Upload de `assets/orbe-flyer-background.png` como fundo.
3. Fontes: **Inter** (títulos) + **Roboto Mono** (marca e CTA).
4. Cores:
   - Safira: `#1E6FD9`
   - Ciano: `#22D3EE`
   - Texto: `#E8EDF4`
5. Colar a estrutura de texto do brief (título em caixa alta, pilares com ícones, URL em ciano).

## Prompt da imagem (copiar)

```
Cyberpunk tech-noir promotional flyer background, high-contrast, minimalist design. A sleek, ultra-modern terminal interface screen with glowing cyan and deep sapphire blue lines of code and security log diagnostics. In the center, a subtle abstract holographic orb symbol glowing in dark neon blue, representing global systems network. Pure dark background (dark graphite and absolute black), cyber safety aesthetic, cinematic tactical neon lighting, clean composition with empty negative space in the middle for text overlay, without text, clean background, abstract technical patterns only, no letters, no watermarks, ultra-detailed, 8k, photorealistic tech corporate style.
```

## Front-end: narrativa de scroll (GSAP + Lottie + Canvas)

Stack na home (`/`):

| Camada | Tecnologia | Função |
|--------|------------|--------|
| Partículas | Canvas (`AtomParticleField`) | Átomos → símbolo Orbe → drift cap. 2 |
| Núcleo | Lottie (`orbe-coalesce.json`) | Scrub sincronizado ao scroll |
| Orquestração | GSAP ScrollTrigger | `scrub: 1.15`, capítulos hero → projetos |

Substituir `src/assets/lottie/orbe-coalesce.json` por export Bodymovin do After Effects para animação cinematográfica final.
