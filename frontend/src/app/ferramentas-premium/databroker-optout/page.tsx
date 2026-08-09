"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, ShieldAlert, FileText, Send, RefreshCw, Printer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface OptOutTicket {
    id: string;
    target_broker: string;
    status: string;
    logs: string;
    created_at: string;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://api.orbesystems.com.br").replace(/\/$/, "");

export default function DataBrokerOptOutPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [tickets, setTickets] = useState<OptOutTicket[]>([]);
    const [loading, setLoading] = useState(false);

    // Formulario procuração
    const [fullName, setFullName] = useState("");
    const [cpf, setCpf] = useState("");
    const [targetBroker, setTargetBroker] = useState("Escavador / Consultas Flex");
    const [acceptLgpd, setAcceptLgpd] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (user.role !== "premium") {
            router.push("/assinar?from=databroker");
        } else {
            fetchTickets();
        }
    }, [user, router]);

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem("orbe_access_token");
            const res = await fetch(`${API_URL}/api/optout/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (e) {
            console.error("Erro listando tickets", e);
        }
    };

    const submitOptOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptLgpd) return alert("Você deve aceitar a Procuração Digital para prosseguirmos.");

        setLoading(true);
        const token = localStorage.getItem("orbe_access_token");

        try {
            const res = await fetch(`${API_URL}/api/optout/request`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    full_name: fullName,
                    cpf: cpf,
                    target_broker: targetBroker
                })
            });

            if (res.ok) {
                alert("Procuração Eletrônica Gerada! Seu pedido de remoção foi enviado para o Hub de IA da Orbe.");
                setFullName("");
                setCpf("");
                setAcceptLgpd(false);
                fetchTickets();
            } else {
                const data = await res.json();
                alert(data.detail || "Falha ao requisitar automação.");
            }
        } catch (error) {
            alert("Erro de Conexão com o Backbone.");
        } finally {
            setLoading(false);
        }
    };

    const printPdf = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-[#050510] text-[#c8d6e3] pt-28 pb-20 px-6 font-mono no-print-bg">
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .no-print-bg { background: white !important; color: black !important; }
                    body { margin: 0; padding: 2cm; }
                }
            `}</style>

            <div className="max-w-5xl mx-auto space-y-10">
                {/* Cabeçalho */}
                <div className="no-print">
                    <h1 className="text-3xl font-bold text-[#bc13fe] flex items-center gap-3">
                        <ShieldAlert size={32} />
                        Data Broker Demolition
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm border-l-2 border-[#bc13fe] pl-4">
                        Motor automatizado de <strong>Opt-Out e Remoção de Dados</strong> em plataformas públicas. <br />
                        Nossos robôs Serverless invadem os corretores de dados (Data Brokers) e emitem uma ordem legal baseada na LGPD para excluir registros associados ao seu CPF. Tudo em Background.
                    </p>
                </div>

                {/* Procuração Digital e Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print">

                    {/* Painel do Robô */}
                    <div className="border border-[#bc13fe]/30 bg-black/60 p-6 rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#bc13fe] to-[#bc13fe]/20"></div>

                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Send size={18} className="text-[#bc13fe]" /> Deflaglar Varredura
                        </h2>

                        <form onSubmit={submitOptOut} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Nome Completo</label>
                                <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-800 text-white p-3 rounded focus:outline-none focus:border-[#bc13fe] transition-colors"
                                    placeholder="Ex: Rafael Hop..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">CPF (Sede Protegido via AES-256)</label>
                                <input required type="text" value={cpf} onChange={e => setCpf(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-800 text-white p-3 rounded focus:outline-none focus:border-[#bc13fe] transition-colors font-sans"
                                    placeholder="000.000.000-00"
                                />
                                <span className="text-[10px] text-green-500/60 mt-1 flex gap-1 items-center">
                                    <Shield size={10} /> LGPD Seguro: Nossos bancos não armazenam CPFs expostos.
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 mb-1">Alvo Data Broker</label>
                                <select value={targetBroker} onChange={e => setTargetBroker(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-800 text-white p-3 rounded focus:outline-none focus:border-[#bc13fe] transition-colors"
                                >
                                    <option value="Escavador / Consultas Flex">Escavador / Consultas Flex (ALVO PILOTO)</option>
                                    <option value="TudoSobreTodos">TudoSobreTodos (Em Breve)</option>
                                </select>
                            </div>

                            <label className="flex items-start gap-3 mt-4 mb-6 cursor-pointer">
                                <input type="checkbox" required checked={acceptLgpd} onChange={e => setAcceptLgpd(e.target.checked)} className="mt-1 accent-[#bc13fe]" />
                                <span className="text-xs text-gray-400">
                                    Eu dou Procuração Legal à Orbe Systems para atuar em meu nome perante os Data Brokers e solicitar a exclusão de meus dados baseados na Lei Geral de Proteção de Dados Pessoais (LGPD).
                                </span>
                            </label>

                            <button disabled={loading} type="submit"
                                className="w-full bg-[#bc13fe]/20 border border-[#bc13fe] hover:bg-[#bc13fe] text-white p-3 font-bold transition-all disabled:opacity-50">
                                {loading ? "CONFIGURANDO ROTA PARA O GITHUB_ACTIONS..." : "INICIAR VARREDURA E DEMOLIÇÃO"}
                            </button>
                        </form>
                    </div>

                    {/* Exibição da Procuração */}
                    <div className="border border-gray-800 bg-gray-900/50 p-6 rounded-xl relative">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                            <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                                <FileText size={16} /> Espelho da Procuração Digital LGPD
                            </h2>
                            <button onClick={printPdf} className="text-gray-400 hover:text-white transition-colors" title="Imprimir PDF">
                                <Printer size={16} />
                            </button>
                        </div>

                        <div className="bg-white text-black p-6 rounded shadow-inner text-xs font-sans whitespace-pre-wrap min-h-[300px]">
                            <h3 className="font-bold text-center underline mb-4 text-sm">PROCURAÇÃO ESPECÍFICA - LGPD</h3>
                            Outorgante: <b>{fullName || "[Nome Vazio]"}</b><br />
                            CPF: <b>{cpf ? "***.***.***-** (Protegido)" : "[CPF Vazio]"}</b><br /><br />

                            Pelo presente instrumento particular, constituo meu bastante procurador a plataforma digital <b>Orbe Systems Tools</b>, conferindo-lhe os poderes específicos para requerer a exclusão e Opt-out de meus dados pessoais publicamente expostos no portal: <b>{targetBroker}</b>,
                            vedando o repasse e armazenamento dos mesmos, invocando para isso as estipulações da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).
                            <br /><br />
                            Este documento é dinâmico e tem a assinatura criptográfica autenticada eletronicamente pelos logs da Plataforma (Orbe Hub).<br /><br />

                            Data do Requerimento: <b>{new Date().toLocaleDateString("pt-BR")}</b>
                        </div>
                    </div>
                </div>

                {/* Dashboard de Filas em Tempo Real */}
                <div className="no-print mt-10">
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold text-white uppercase flex items-center gap-2">
                            Trilhas de Auditoria (GitHub Actions Status)
                        </h2>
                        <button onClick={fetchTickets} className="text-xs border border-gray-700 hover:border-gray-400 px-3 py-1 rounded flex items-center gap-2 transition-colors">
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left bg-black border border-gray-800 text-sm">
                            <thead className="bg-gray-900 border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                                <tr>
                                    <th className="p-4">Ticket ID</th>
                                    <th className="p-4">Data / Hora</th>
                                    <th className="p-4">Alvo</th>
                                    <th className="p-4">Status Github</th>
                                    <th className="p-4">Logs Consolidados</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-6 text-center text-gray-600">Nenhum protocolo encontrado. Envie um robô acima.</td>
                                    </tr>
                                ) : tickets.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-900/50 transition-colors">
                                        <td className="p-4 text-xs font-mono text-gray-500">{t.id.split("-")[0]}...</td>
                                        <td className="p-4 text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                                        <td className="p-4">{t.target_broker}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded ${t.status === "PENDING" ? "bg-yellow-500/20 text-yellow-500" :
                                                t.status === "SUCCESS" ? "bg-[#bc13fe]/20 text-[#bc13fe]" :
                                                    "bg-red-500/20 text-red-500"
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-pre-wrap text-[10px] text-gray-500 max-w-xs truncate" title={t.logs}>
                                            {t.logs || "Aguardando instanciamento do contêiner Microsoft..."}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Área exclusiva visível na impressão da Procuração (Modo janela invisível) */}
                <div className="hidden print-only text-black font-sans bg-white p-8">
                    {/* É renderizado pelo css global quando chamamos o window.print() para ocultar todo resto */}
                    <h2 className="text-2xl font-bold text-center underline mb-8">PROCURAÇÃO ESPECÍFICA - LGPD</h2>
                    <p className="mb-4">Outorgante: <b>{fullName || "[Nome não preenchido]"}</b></p>
                    <p className="mb-8">CPF: <b>{cpf ? "***.***.***-** (Protegido por Criptografia do Servidor)" : "[CPF não preenchido]"}</b></p>

                    <p className="mb-8 text-justify leading-relaxed">
                        Pelo presente instrumento particular, constituo meu bastante procurador a plataforma digital <b>Orbe Systems Tools</b>, conferindo-lhe os poderes específicos para requerer a exclusão, apagamento e Opt-out de meus dados pessoais publicamente expostos no portal: <b>{targetBroker}</b>,
                        vedando o repasse e armazenamento dos mesmos, invocando para isso as estipulações da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).
                    </p>

                    <p className="mb-12">
                        Este documento é dinâmico e tem a assinatura criptográfica autenticada eletronicamente pelos logs da Plataforma (Orbe Hub).
                    </p>
                    <p className="text-right">_____________________________, ____ de __________________ de ______.</p>
                </div>

            </div>
        </div>
    );
}
