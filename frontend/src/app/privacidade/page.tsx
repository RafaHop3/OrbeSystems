import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Orbe Systems',
  description: 'Como a Orbe Systems trata dados pessoais em conformidade com a LGPD (Lei nº 13.709/2018).',
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#030305] text-slate-200 px-6 py-24">
      <article className="max-w-3xl mx-auto space-y-6 leading-relaxed text-sm sm:text-base">
        <Link href="/" className="text-neon-cyan text-sm hover:underline">← Voltar ao início</Link>
        <h1 className="text-3xl font-bold text-white">Política de Privacidade e Proteção de Dados</h1>
        <p className="text-slate-400 text-xs">Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei nº 12.965/2014).</p>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">1. Controlador e canal de contato</h2>
          <p>A Orbe Systems atua como controladora nos serviços institucionais deste site e como operadora no tratamento de dados empresariais inseridos pelos clientes no INHO Business, isolados por identificador único (UUID) por empresa. Para exercer seus direitos ou tirar dúvidas, escreva para <a className="text-neon-cyan hover:underline" href="mailto:contato@orbesystems.com.br">contato@orbesystems.com.br</a>.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">2. Dados que tratamos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Navegação (somente com seu consentimento):</strong> página visitada, identificador de sessão anônimo e localização aproximada por IP, para medir uso e desempenho.</li>
            <li><strong>Conta e acesso:</strong> e-mail, nome e cookies de sessão necessários à autenticação (Orbe SSO).</li>
            <li><strong>Pagamentos:</strong> processados pela Stripe; a Orbe Systems não armazena dados completos de cartão.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">3. Bases legais (Art. 7º)</h2>
          <p>Execução de contrato, cumprimento de obrigação legal ou regulatória, legítimo interesse para segurança da infraestrutura e consentimento para telemetria não essencial.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">4. Cookies</h2>
          <p>Cookies essenciais mantêm a sessão segura e não dependem de consentimento. A telemetria de uso só é enviada se você escolher <em>Aceitar Todos</em> no aviso de privacidade. Você pode alterar a escolha limpando os dados do site no navegador.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-white">5. Seus direitos (Art. 18)</h2>
          <p>Confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação do consentimento, a qualquer momento, pelo canal acima.</p>
        </section>
      </article>
    </main>
  );
}
