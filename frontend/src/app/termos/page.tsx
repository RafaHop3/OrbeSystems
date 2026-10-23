import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Orbe Systems',
  description: 'Termos de uso e governança do ecossistema Orbe Systems.',
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#030305] text-slate-200 px-6 py-24">
      <article className="max-w-3xl mx-auto space-y-6 leading-relaxed text-sm sm:text-base">
        <Link href="/" className="text-neon-cyan text-sm hover:underline">← Voltar ao início</Link>
        <h1 className="text-3xl font-bold text-white">Termos de Uso e Governança</h1>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">1. Acesso e contas</h2>
          <p>O acesso ao INHO Business é restrito a contas provisionadas por assinatura ativa (Stripe) ou por homologação administrativa no Orbe SSO Hub. Não há cadastro público aberto.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">2. Segurança</h2>
          <p>A comunicação entre serviços utiliza criptografia de chaves (MultiFernet), validação de assinatura (HMAC-SHA256) em webhooks e isolamento transacional dos dados por empresa. Você é responsável por manter suas credenciais em sigilo.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">3. Uso adequado e propriedade intelectual</h2>
          <p>É vedado usar as ferramentas para violar direitos autorais (Lei nº 9.610/98), a privacidade de terceiros ou a legislação vigente. O download de conteúdo de terceiros só é permitido quando houver autorização ou licença que o permita.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">4. Convivência</h2>
          <p>Não há tolerância para hostilidade ou assédio no ambiente corporativo e social do ecossistema Orbe Systems.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">5. Contato e dados pessoais</h2>
          <p>Dúvidas: <a className="text-neon-cyan hover:underline" href="mailto:contato@orbesystems.com.br">contato@orbesystems.com.br</a>. O tratamento de dados pessoais está descrito na <Link className="text-neon-cyan hover:underline" href="/privacidade">Política de Privacidade</Link>.</p>
        </section>
      </article>
    </main>
  );
}
