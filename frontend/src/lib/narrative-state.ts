/**
 * Estado mutável da narrativa de scroll — lido no rAF do canvas e no scrub do Lottie.
 * Evita re-renders React a cada frame do ScrollTrigger.
 */
export type NarrativeState = {
  /** Progresso global do scroll na zona narrativa (0–1) */
  progress: number;
  /** Coalescência das partículas no símbolo Orbe (0–1) */
  cohesion: number;
  /** Capítulo 2: transição para ecossistema / projetos (0–1) */
  chapter2: number;
  /** Scrub do Lottie (0–1) */
  lottieProgress: number;
};

export const narrativeState: NarrativeState = {
  progress: 0,
  cohesion: 0,
  chapter2: 0,
  lottieProgress: 0,
};

export function updateNarrativeFromScroll(progress: number) {
  const p = Math.min(1, Math.max(0, progress));
  narrativeState.progress = p;
  narrativeState.cohesion = Math.min(1, p * 1.35);
  narrativeState.chapter2 = p <= 0.55 ? 0 : (p - 0.55) / 0.45;
  narrativeState.lottieProgress = Math.min(1, Math.max(0, (p - 0.12) / 0.88));
}
