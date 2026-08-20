import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Search, MousePointerClick, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Define the valid brokers we have content for
const BROKER_DATA: Record<string, { name: string; difficulty: string; type: string }> = {
    escavador: { name: 'Escavador', difficulty: 'Alta (Exige Selfie e Documento)', type: 'Processos e Profissional' },
    tudosobretodos: { name: 'TudoSobreTodos', difficulty: 'Média (Formulários escondidos)', type: 'Dados Cadastrais Básicos' },
    jusbrasil: { name: 'Jusbrasil', difficulty: 'Alta (Exige validação processual)', type: 'Processos Judiciais' },
    consultasflex: { name: 'Consultas Flex', difficulty: 'Média', type: 'Dados em Massa' },
};

// Generates correct SEO Tags dynamically before the page even renders!
export async function generateMetadata({ params }: { params: { broker: string } }): Promise<Metadata> {
    const brokerKey = params.broker?.toLowerCase() || 'escavador';
    const brokerInfo = BROKER_DATA[brokerKey] || { name: capitalize(brokerKey), difficulty: 'Variável', type: 'Exposição de Dados' };

    return {
        title: `${brokerInfo.name}: Como apagar meu nome e CPF sozinhos? (Guia 2026)`,
        description: `Descubra como remover o seu CPF do site ${brokerInfo.name} permanentemente. Faça a exclusão dos seus processos e dados públicos usando as leis da LGPD. Tutorial Completo + Automação Orbe Systems.`,
        keywords: `apagar cpf ${brokerInfo.name}, excluir processo ${brokerInfo.name}, remover nome do google de graça, lgpd ${brokerInfo.name}`,
        alternates: {
            canonical: `https://orbesystems.com.br/remover-dados-${brokerKey}`
        }
    };
}

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function SeoBrokerPage({ params }: { params: { broker: string } }) {
    const brokerKey = params.broker?.toLowerCase() || 'escavador';
    const brokerInfo = BROKER_DATA[brokerKey] || { name: capitalize(brokerKey), difficulty: 'Variável', type: 'Exposição de Dados' };

    return (
        <div className="min-h-screen bg-[#050510] text-[#c8d6e3] pt-28 font-mono overflow-x-hidden">
            <Header />

            {/* Hero Troia */}
            <section className="relative px-6 py-20 max-w-5xl mx-auto">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#00f2fe]/10 blur-[150px] rounded-full pointer-events-none"></div>
                <div className="relative z-10 text-center max-w-3xl mx-auto">

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-grotesk tracking-wide leading-tight">
                        {brokerInfo.name}: Como <span className="text-[#00f2fe]">apagar meu nome e CPF</span> sozinhos? (Guia 2026 + Automação)
                    </h1>

                    <p className="text-lg text-slate-400 mb-8 font-sans">
                        Seus dados estão abertos no {brokerInfo.name} e você quer que ninguém veja? Entenda a estratégia passo-a-passo baseada na LGPD para derrubar esses links do Google.
                    </p>
                </div>
            </section>

            {/* Tutorial Manual (O Cavalo de Troia do Marketing) */}
            <section className="px-6 py-12 max-w-4xl mx-auto space-y-12">
                <div className="bg-black/50 border border-slate-800 rounded-xl p-8 relative overflow-hidden">
                    <h2 className="text-2xl font-bold text-white mb-6 font-grotesk flex items-center gap-3">
                        <Search className="text-blue-500" /> Por que meus dados estão no {brokerInfo.name}?
                    </h2>
                    <p className="text-sm text-slate-300 font-sans leading-relaxed mb-4">
                        Plataformas como o <strong>{brokerInfo.name}</strong> atuam como motores de busca para informações públicas (como Diários Oficiais, decisões judiciais e bases de empresas).
                        Mesmo publicando dados abertos, **você ainda retém o direito absoluto** sob a nova Lei Geral de Proteção de Dados (13.709/2018) de requerer o <em>opt-out</em> imediato se essas informações não prestarem valor histórico ou bloquearem contratações.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="border border-slate-800 bg-black p-4 rounded text-center">
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Nível de Dificuldade</div>
                            <div className="font-bold text-white text-sm">{brokerInfo.difficulty}</div>
                        </div>
                        <div className="border border-slate-800 bg-black p-4 rounded text-center">
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Tipo de Dado Exposto</div>
                            <div className="font-bold text-white text-sm">{brokerInfo.type}</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-3xl font-bold text-white font-grotesk mb-8 text-center">
                        O Passo a Passo (Modo Manual e Gratuito)
                    </h2>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 shrink-0 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center font-bold text-xl text-slate-300">1</div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Google Dorking: Encontre sua página Exata</h3>
                            <p className="text-sm text-slate-400 font-sans">
                                O primeiro passo é encontrar a URL do seu perfi. Acesse o Google e digite: <code className="bg-black border border-slate-800 p-1 rounded text-orange-400">site:{brokerKey}.com.br "SEU NOME COMPLETO"</code>. Copie o endereço exato que aparecer na URL (ex: /processo/... ou /perfil/...). Nunca notifique sem ter o link do alvo, ou eles rejeitarão seu chamado.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 shrink-0 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center font-bold text-xl text-slate-300">2</div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Acesse o Fale Conosco / Remover Informação</h3>
                            <p className="text-sm text-slate-400 font-sans">
                                Nos bastidores de sites de Scraping Judicial (como o {brokerInfo.name}), existe uma aba camuflada de "Fale Conosco".
                                Normalmente, você clica sobre os "Três Pontinhos" na página ou rola até o rodapé buscando "Relate um Problema" ou "Política de Privacidade".
                                <strong>Anexe seu documento de identidade com foto!</strong> Os data brokers exigem confirmação visual de que você é a vítima do processo antes de acatar.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-10 h-10 shrink-0 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center font-bold text-xl text-slate-300">3</div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Invoque o Direito de Esquecimento (LGPD)</h3>
                            <p className="text-sm text-slate-400 font-sans">
                                Após achar a área, cole ou envie um e-mail para <code className="text-blue-400">contato@{brokerKey}.com</code> uma Notificação LGPD dizendo: "Solicito minha anonimização na Base de Dados sob termos da Lei 13.709/2018. Desejo o Opt-out de todo indexador robótico sobre o CPF supracitado." Eles tem cerca de 15 dias pra tirar se aprovarem. O Google, porém, ainda manterá em cache por meses (se não for mandado Ping Request pra eles também).
                            </p>
                        </div>
                    </div>
                </div>

            </section>

            {/* A ISCA DE CONVERSÃO - CTA ORBE SYSTEMS (O Pulo do Gato) */}
            <section className="px-6 py-16 max-w-4xl mx-auto my-12 bg-gradient-to-b from-black to-[#050510] border border-[#00f2fe]/30 rounded-2xl relative shadow-[0_0_50px_rgba(188,19,254,0.1)]">
                <div className="absolute top-0 right-0 p-8 text-[#00f2fe]/10 pointer-events-none">
                    <Lock size={120} />
                </div>

                <div className="relative z-10 max-w-2xl text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00f2fe]/10 border border-[#00f2fe]/30 rounded-full text-[10px] text-[#00f2fe] uppercase font-bold mb-6 tracking-widest">
                        <MousePointerClick size={12} /> A Orbe Faz Isso Pra Você
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 font-grotesk">
                        O Processo Manual dá muito trabalho?
                    </h2>
                    <p className="text-slate-300 font-sans text-sm leading-relaxed mb-8">
                        Fazer e-mails manuais, caçar formulários ocultos, enviar RGs e rezar pra excluírem...
                        <strong>É exaustivo e frequentemente os robôs deles copiam o processo para outra página dias depois.</strong>
                        <br /><br />
                        Para resolver o problema pela raiz, a plataforma <strong>Orbe Systems</strong> possui **Workers de IA e Web Scraping Servers** (Data Broker Opt-out Engine). Nós ajudamos a remover os seus dados das bases.
                    </p>

                    <Link
                        href="/assinar"
                        className="inline-flex items-center gap-3 bg-[#00f2fe] hover:bg-white text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(188,19,254,0.4)]"
                    >
                        Assine o Portal Premium Orbe <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}
