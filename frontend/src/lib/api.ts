/**
 * lib/api.ts — URL centralizada do backend
 * ════════════════════════════════════════
 * Única fonte de verdade para a URL base da API.
 * Em produção, NEXT_PUBLIC_API_URL deve ser definida no painel da Vercel
 * apontando para o backend Vercel: https://orbe-systems-fuc5.vercel.app
 */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-fuc5.vercel.app';
