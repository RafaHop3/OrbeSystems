/**
 * Pontos-alvo que formam o símbolo orbital da Orbe (escudo/rede).
 * Coordenadas normalizadas 0–1, centro em (0.5, 0.5).
 */
export function getOrbeShapePoints(): { x: number; y: number }[] {
  const cx = 0.5;
  const cy = 0.5;
  const points: { x: number; y: number }[] = [];

  const ring = (r: number, count: number, phase = 0) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + phase;
      points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };

  const ellipse = (rx: number, ry: number, count: number, rotation = 0) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      points.push({
        x: cx + x * cos - y * sin,
        y: cy + x * sin + y * cos,
      });
    }
  };

  ring(0.06, 12);
  ring(0.2, 20, Math.PI / 10);
  ring(0.38, 28);
  ellipse(0.44, 0.12, 24, 0);
  ellipse(0.12, 0.44, 24, 0);

  return points;
}
