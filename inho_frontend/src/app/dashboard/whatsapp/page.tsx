/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import {
    Search, MessageSquare, Phone, Send, Zap,
    FileText, Clock, UserCheck, CheckCircle2,
    MoreVertical, Bot, ShieldAlert, ShieldCheck, User
} from 'lucide-react';
import { crmApi } from '@/lib/api';
import OrBrickRagCard from '@/components/OrBrickRagCard';
import OrBrickSimulatorCard from '@/components/OrBrickSimulatorCard';
import { BookOpen } from 'lucide-react';

export default function WhatsAppCentralPage() {
    const [activeTab, setActiveTab] = useState<'CHAT' | 'RAG' | 'SIMULATOR'>('CHAT');
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, sender: "Sistema", text: "Você entrou no canal Omnichannel. Faça uma busca para iniciar uma comunicação (Orbe Baileys WhatsApp Proxy).", time: "--:--", isOut: false }
    ]);
    const [isSending, setIsSending] = useState(false);

    // --- DYNAMIC CONTACT LOGIC ---
    const [searchQuery, setSearchQuery] = useState("");
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [activeContact, setActiveContact] = useState<any>(null);

    // --- ORBRICK AI STATUS, HANDOFF & KILL-SWITCH ---
    const [killSwitchActive, setKillSwitchActive] = useState<boolean>(false);
    const [contactHumanActive, setContactHumanActive] = useState<boolean>(false);
    const [aiStatusBanner, setAiStatusBanner] = useState<string | null>(null);

    const loadAiStatus = React.useCallback(async (contactId?: string) => {
        try {
            const st = await crmApi.getWhatsappAiStatus(contactId);
            setKillSwitchActive(Boolean(st.kill_switch_active));
            if (st.contact_session) {
                setContactHumanActive(Boolean(st.contact_session.human_operator_active));
            } else {
                setContactHumanActive(false);
            }
        } catch (err) {
            console.error("Falha ao consultar status da IA OrBrick:", err);
        }
    }, []);

    React.useEffect(() => {
        const fetchAllContacts = async () => {
            try {
                const data = await crmApi.getContacts();
                if (data && data.length > 0) {
                    setAllContacts(data);
                }
            } catch (error) {
                console.error("Failed to load contacts:", error);
            }
        };
        fetchAllContacts();
        loadAiStatus();
    }, [loadAiStatus]);

    // --- HISTÓRICO REAL + FILA DE LEMBRETES ---
    const [queue, setQueue] = useState<any[]>([]);

    const loadHistory = React.useCallback(async (contact: any) => {
        if (!contact?.phone) return;
        const digits = String(contact.phone).replace(/\D/g, "");
        if (digits.length < 8) return;
        try {
            const logs: any[] = await crmApi.getWhatsappHistory(digits.slice(-8));
            setMessages(logs.reverse().map((l: any) => {
                const rawMsg = String(l.message || "");
                const isClient = rawMsg.startsWith("[CLIENTE]");
                const cleanText = isClient ? rawMsg.replace("[CLIENTE]", "").trim() : rawMsg;
                const isAi = rawMsg.includes(">OrBrick-IA>*");
                const senderName = isClient
                    ? (contact?.name || "Cliente / Cooperado")
                    : (isAi ? "OrBrick-IA" : "Você (Operador)");
                return {
                    id: l.id as any,
                    sender: senderName,
                    text: cleanText,
                    time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isOut: !isClient,
                    isAi: isAi,
                    isClient: isClient,
                };
            }));
        } catch (e) { console.error("Falha ao carregar histórico:", e); }
    }, []);

    React.useEffect(() => {
        if (!activeContact) return;
        loadHistory(activeContact);
        loadAiStatus(activeContact.id);
        const t = setInterval(() => {
            loadHistory(activeContact);
            loadAiStatus(activeContact.id);
        }, 8000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeContact?.id]);

    React.useEffect(() => {
        const loadQueue = async () => {
            try {
                const qData: any[] = await crmApi.getWhatsappQueue();
                if (qData) setQueue(qData.filter((q: any) => q.state !== 'SENT').slice(0, 8));
            } catch (e) { console.error("Falha ao carregar fila:", e); }
        };
        loadQueue();
        const t = setInterval(loadQueue, 30000);
        return () => clearInterval(t);
    }, []);

    const filteredContacts = allContacts.filter(c =>
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.document && c.document.includes(searchQuery))
    );

    const handleToggleKillSwitch = async () => {
        try {
            const nextState = !killSwitchActive;
            const res = await crmApi.toggleWhatsappKillSwitch(
                nextState,
                nextState ? "Botão de Pânico acionado na Central WhatsApp" : "IA OrBrick reativada na Central WhatsApp"
            );
            setKillSwitchActive(Boolean(res.kill_switch_active));
            setAiStatusBanner(
                res.kill_switch_active
                    ? "🚨 Kill-Switch Acionado: IA OrBrick desligada imediatamente para toda a instituição."
                    : "✅ IA OrBrick Reativada para atendimento inteligente na régua."
            );
            setTimeout(() => setAiStatusBanner(null), 5000);
        } catch (err: any) {
            alert("Erro ao acionar Kill-Switch: " + (err?.message || err));
        }
    };

    const handleToggleHandoff = async () => {
        if (!activeContact?.id) return;
        try {
            const assumeHuman = !contactHumanActive;
            const res = await crmApi.toggleWhatsappHandoff(activeContact.id, assumeHuman, 24);
            setContactHumanActive(!res.ai_attendance_enabled);
            setAiStatusBanner(
                assumeHuman
                    ? `👤 Atendimento Humano assumido para ${activeContact.name} (IA pausada por 24h).`
                    : `🤖 Atendimento devolvido para a IA OrBrick em ${activeContact.name}.`
            );
            setTimeout(() => setAiStatusBanner(null), 5000);
        } catch (err: any) {
            alert("Erro ao alternar Handoff: " + (err?.message || err));
        }
    };

    const handleTriggerAiReply = async () => {
        if (!activeContact || !activeContact.phone) {
            alert("Selecione um contato com telefone WhatsApp para acionar a resposta contextual da IA.");
            return;
        }
        const promptOrQuestion = messageInput.trim() || "Solicito segunda via do código PIX da minha fatura em aberto";
        setIsSending(true);
        try {
            const res = await crmApi.triggerWhatsappAiReply({
                phone: activeContact.phone,
                contact_id: activeContact.id,
                incoming_message: promptOrQuestion,
            });
            if (!res.ai_responded) {
                setAiStatusBanner(`⚠️ IA não respondeu: ${res.reason}`);
            } else {
                setMessageInput("");
                if (res.formatted_message) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: Date.now(),
                            sender: "OrBrick-IA",
                            text: res.formatted_message || "",
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            isOut: true,
                        },
                    ]);
                }
                if (res.requires_human_handoff) {
                    setContactHumanActive(true);
                }
            }
        } catch (err: any) {
            alert("Erro na resposta assistida IA: " + (err?.message || err));
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || isSending) return;
        if (!activeContact || !activeContact.phone) {
            alert("Por favor, selecione um contato que possua número de telefone (WhatsApp) registrado no CRM.");
            return;
        }

        const outMsg = messageInput.trim();
        setMessageInput("");
        setIsSending(true);

        const newMsg = {
            id: Date.now(),
            sender: "Você (Omnichannel)",
            text: outMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isOut: true
        };
        setMessages((prev) => [...prev, newMsg]);

        try {
            const data = await crmApi.sendWhatsapp({
                phone: activeContact.phone,
                email: activeContact.email || null,
                message: outMsg
            });

            // Sucesso se ao menos uma variação (com ou sem 9º dígito) retornou 200
            const codes: string[] = Array.isArray(data?.whatsapp_delivery_code) ? data.whatsapp_delivery_code : [];
            const anyDelivered = codes.some((code: string) => code.endsWith(":200"));
            const waStatusAlert = codes.length === 0 || !anyDelivered;

            if (waStatusAlert) {
                alert(`⚠️ Falha no disparo E2E:\nO Container do WhatsApp Bot (Baileys) parece estar indisponível ou em crash loop no servidor.\n\nLogs API: ${JSON.stringify(data?.whatsapp_delivery_code)}`);
                setMessages((prev) => prev.filter(m => m.id !== newMsg.id));
            }
        } catch (error: any) {
            console.error("Erro no envio omnichannel:", error);
            alert("Erro Omnichannel Proxy: " + (error?.message || error));
            setMessages((prev) => prev.filter(m => m.id !== newMsg.id));
        } finally {
            setIsSending(false);
        }
    };

    const insertTemplate = (type: string) => {
        if (!activeContact) {
            alert("Selecione um contato primeiro!");
            return;
        }
        const namePart = activeContact.name ? activeContact.name.split(' ')[0] : "Cliente";
        
        if (type === 'boas_vindas') {
            const boasVindasTemplate = `Olá, ${namePart}! Seja muito bem-vindo(a) à nossa instituição. Seu cadastro foi concluído com sucesso e seus serviços e cotas já estão ativos na plataforma.`;
            setMessageInput((prev) => (prev ? prev + "\n\n" : "") + boasVindasTemplate);
        }
        if (type === 'pix') {
            const pixTemplate = `Olá, ${namePart}! Segue a nossa chave PIX institucional para liquidação:\n\nChave PIX: financeiro@orbesystems.com.br\nIdentificação: Cota / Fatura`;
            setMessageInput((prev) => (prev ? prev + "\n\n" : "") + pixTemplate);
        }
        if (type === 'proposta') {
            const propostaTemplate = `Olá, ${namePart}! O seu cronograma e propostas já estão disponíveis no sistema para conferência e validação. Ficamos à disposição!`;
            setMessageInput((prev) => (prev ? prev + "\n\n" : "") + propostaTemplate);
        }
        if (type === 'cobranca') {
            const cobrancaTemplate = `Lembrete de Vencimento:\n\nOlá, ${namePart}! Identificamos uma fatura com vencimento próximo para regularização. Caso já tenha realizado o pagamento, por favor desconsidere. Em caso de dúvidas, responda por aqui!`;
            setMessageInput((prev) => (prev ? prev + "\n\n" : "") + cobrancaTemplate);
        }
    };

    const effectiveAiActive = !killSwitchActive && !contactHumanActive;

    return (
        <main className="flex-1 flex flex-col p-6 relative bg-transparent overflow-hidden h-[calc(100vh-80px)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F1F5F9] border border-slate-200 rounded-lg flex items-center justify-center">
                        <MessageSquare className="text-[#8B6508]" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] tracking-wide uppercase">Central WhatsApp (OrBrick)</h1>
                        <p className="text-[#64748B] text-xs mt-0.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                            Online via Orbe Bot (AWS Baileys Proxy) · Guardrails Anti-Prompt Injection Ativos
                        </p>
                    </div>
                </div>

                {/* Abas Rápidas de Navegação */}
                <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('CHAT')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                            activeTab === 'CHAT'
                                ? 'bg-white text-[#0F172A] shadow-sm'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                    >
                        <MessageSquare size={13} /> Chat WhatsApp
                    </button>
                    <button
                        onClick={() => setActiveTab('RAG')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                            activeTab === 'RAG'
                                ? 'bg-amber-100 text-[#8B6508] shadow-sm'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                    >
                        <BookOpen size={13} /> Base RAG (Treinamento)
                    </button>
                    <button
                        onClick={() => setActiveTab('SIMULATOR')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                            activeTab === 'SIMULATOR'
                                ? 'bg-red-100 text-red-800 shadow-sm'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                        }`}
                    >
                        <ShieldAlert size={13} /> Simulador Cyber Safety
                    </button>
                </div>

                {/* Status da IA em Tempo Real + Botão de Pânico (Kill-Switch) */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                            killSwitchActive
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : contactHumanActive
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                    >
                        {killSwitchActive ? (
                            <>
                                <ShieldAlert size={14} className="text-red-700" />
                                <span>Kill-Switch Acionado (IA Desligada)</span>
                            </>
                        ) : contactHumanActive ? (
                            <>
                                <User size={14} className="text-amber-800" />
                                <span>Atendimento Humano Assumido</span>
                            </>
                        ) : (
                            <>
                                <Bot size={14} className="text-emerald-700" />
                                <span>IA Orbe Ativa (*&gt;OrBrick-IA&gt;*)</span>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleToggleKillSwitch}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all shadow-sm ${
                            killSwitchActive
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                : 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                        }`}
                        title="Botão de Pânico: Desliga ou religa imediatamente todas as respostas automáticas da IA no OrBrick para esta empresa"
                    >
                        <ShieldAlert size={14} />
                        {killSwitchActive ? 'Religar IA OrBrick' : 'Botão de Pânico (Kill-Switch)'}
                    </button>
                </div>
            </div>

            {aiStatusBanner && (
                <div className="mb-3 px-4 py-2.5 rounded-xl bg-[#F1F5F9] border border-[#B8860B] text-xs font-bold text-[#0F172A] flex items-center justify-between">
                    <span>{aiStatusBanner}</span>
                    <button onClick={() => setAiStatusBanner(null)} className="text-[#8B6508] underline ml-4">OK</button>
                </div>
            )}

            {/* Visualização de Abas Alternativas */}
            {activeTab === 'RAG' && (
                <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto space-y-6 pb-8">
                    <OrBrickRagCard />
                </div>
            )}

            {activeTab === 'SIMULATOR' && (
                <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto space-y-6 pb-8">
                    <OrBrickSimulatorCard />
                </div>
            )}

            {/* 3-Column Layout */}
            {activeTab === 'CHAT' && (
            <div className="flex-1 flex gap-4 h-[calc(100vh-140px)]">

                {/* COLUMN 1: CONVERSATIONS */}
                <div className="w-80 flex flex-col bg-white shadow-sm border border-[#E2E8F0] rounded-xl overflow-hidden shadow-lg shrink-0">
                    <div className="p-4 border-b border-[#E2E8F0]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar Contatos do CRM..."
                                className="w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded-md py-2 pl-9 pr-3 text-xs text-[#0F172A] focus:border-[#B8860B] outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredContacts.length > 0 ? (
                            filteredContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    onClick={() => {
                                        setActiveContact(contact);
                                        setMessages([]); // clear dummy messages
                                    }}
                                    className={`flex items-center gap-3 p-4 border-l-2 cursor-pointer transition-colors ${activeContact?.id === contact.id ? 'border-[#B8860B] bg-[#F1F5F9]' : 'border-transparent hover:bg-[#F1F5F9]'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37]/25 to-[#B8860B]/15 border border-slate-200 flex items-center justify-center shrink-0 object-cover overflow-hidden">
                                        <span className="text-xs font-bold text-[#8B6508]">{contact.name.substring(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-sm font-bold text-[#0F172A] truncate">{contact.name}</h3>
                                        </div>
                                        <p className="text-xs text-[#64748B] truncate mt-1">{contact.phone || 'Sem Telefone'}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-xs text-[#64748B] text-center">Nenhum contato encontrado.</div>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: ACTIVE CHAT */}
                <div className="flex-1 flex flex-col bg-white shadow-sm border border-[#E2E8F0] rounded-xl overflow-hidden shadow-lg">
                    {/* Chat Topbar */}
                    <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F1F5F9]">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-base font-bold text-[#0F172A]">
                                    {activeContact ? activeContact.name : "Nenhum Contato Selecionado"}
                                </h2>
                                {activeContact ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-emerald-700 font-bold">WABA DESTINO:</span>
                                        <input
                                            type="text"
                                            value={activeContact.phone || ''}
                                            onChange={(e) => setActiveContact({ ...activeContact, phone: e.target.value })}
                                            className="bg-[#F1F5F9] border border-slate-200 text-[#8B6508] text-xs px-2 py-0.5 rounded outline-none focus:border-[#B8860B] w-32 font-mono"
                                            title="Edite este número temporariamente para testar o envio para o seu próprio WhatsApp (formato recomendado: 5511999999999)"
                                        />
                                        <span className="text-[10px] text-gray-500">(Editável p/ Teste)</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-[#8B6508]">Aguardando seleção...</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {activeContact && (
                                <button
                                    onClick={handleToggleHandoff}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase border transition-colors shadow-sm ${
                                        contactHumanActive
                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                    }`}
                                >
                                    {contactHumanActive ? (
                                        <>
                                            <Bot size={14} /> Devolver p/ IA
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck size={14} /> Assumir Atendimento
                                        </>
                                    )}
                                </button>
                            )}
                            <button className="p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-md transition-colors">
                                <Phone size={16} />
                            </button>
                            <button className="p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-md transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#F1F5F9] relative">
                        {activeContact && (
                            <div className="flex justify-center mb-6">
                                <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] border border-[#E2E8F0] shadow-sm">
                                    <ShieldCheck size={14} className="text-emerald-700" />
                                    <span>
                                        Canal Sincronizado: WhatsApp E2E · Modo:{' '}
                                        <strong className="text-[#0F172A]">
                                            {effectiveAiActive ? 'IA Orbe Ativa' : 'Operador Humano'}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        )}

                        {messages.map((msg: any) => (
                            <div key={msg.id} className={`flex flex-col ${msg.isOut ? 'items-end' : 'items-start'} mb-3`}>
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                    {msg.isClient ? (
                                        <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                                            <User size={11} className="text-slate-500" /> {msg.sender}
                                        </span>
                                    ) : msg.isAi ? (
                                        <span className="text-[10.5px] font-extrabold text-[#8B6508] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 shadow-xs">
                                            <Bot size={11} className="text-[#8B6508]" /> OrBrick-IA
                                        </span>
                                    ) : (
                                        <span className="text-[10.5px] font-bold text-slate-600">
                                            {msg.sender}
                                        </span>
                                    )}
                                </div>
                                <div className={`relative px-3.5 py-2.5 rounded-xl max-w-[85%] shadow-sm ${msg.isOut
                                    ? msg.isAi
                                        ? 'bg-gradient-to-br from-amber-50/90 to-emerald-50/70 border border-amber-200/90 text-[#0F172A] rounded-tr-none'
                                        : 'bg-white border border-slate-200 text-[#0F172A] rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-[#0F172A] rounded-tl-none'}`}>
                                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap pr-12 text-[#0F172A]">{msg.text}</p>
                                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                        <span className="text-[10px] text-[#64748B] font-medium">{msg.time}</span>
                                        {msg.isOut && <CheckCircle2 size={12} className={msg.isAi ? "text-emerald-700" : "text-[#B8860B]"} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input & Fast Actions */}
                    <div className="bg-[#F1F5F9] border-t border-[#E2E8F0] p-4 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => insertTemplate('boas_vindas')} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold uppercase rounded-lg border border-slate-300 transition-colors shadow-sm">
                                <UserCheck size={12} className="text-emerald-600" /> Boas-vindas
                            </button>
                            <button onClick={() => insertTemplate('pix')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-lg border border-emerald-300 transition-colors shadow-sm">
                                <Zap size={12} className="text-emerald-600" /> Chave Pix
                            </button>
                            <button onClick={() => insertTemplate('cobranca')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-lg border border-amber-300 transition-colors shadow-sm">
                                <Clock size={12} className="text-amber-600" /> Lembrete Régua
                            </button>
                            <button onClick={() => insertTemplate('proposta')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold uppercase rounded-lg border border-purple-300 transition-colors shadow-sm">
                                <FileText size={12} className="text-purple-600" /> Proposta
                            </button>
                            <button
                                onClick={handleTriggerAiReply}
                                disabled={!activeContact || isSending}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B8860B]/15 hover:bg-[#B8860B]/25 text-[#8B6508] text-[10px] font-extrabold uppercase rounded-lg border border-[#B8860B]/40 transition-colors shadow-sm disabled:opacity-50"
                                title="Aciona a resposta contextual da IA OrBrick para a régua D-3/D0/D+3 ou triagem de comprovante PIX"
                            >
                                <Bot size={12} className="text-[#8B6508]" /> Resposta Assistida IA
                            </button>
                        </div>
                        <div className="flex items-end gap-3">
                            <div className="flex-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden focus-within:border-[#D4AF37]/70 transition-colors flex">
                                <textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Digite a mensagem..."
                                    disabled={!activeContact}
                                    className="w-full bg-transparent p-3 text-sm text-[#0F172A] resize-none outline-none overflow-hidden h-12 custom-scrollbar disabled:opacity-50"
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={isSending || !messageInput.trim() || !activeContact}
                                className="h-12 w-12 flex items-center justify-center bg-[#B8860B] hover:bg-[#9A6F0B] disabled:opacity-50 text-white rounded-xl transition-colors shadow-[0_0_15px_rgba(184,134,11,0.4)] shrink-0">
                                <Send size={18} className="translate-x-0.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: CRM PANEL */}
                <div className="w-[300px] flex flex-col bg-white shadow-sm border border-[#E2E8F0] rounded-xl overflow-hidden shadow-lg shrink-0">
                    <div className="p-4 border-b border-[#E2E8F0] bg-[#F1F5F9]">
                        <h2 className="text-sm font-bold text-[#64748B] uppercase tracking-widest flex items-center gap-2">
                            <UserCheck size={14} /> Ficha do Lead
                        </h2>
                    </div>
                    <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                        {activeContact ? (
                            <>
                                {/* Profile Details */}
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#D4AF37]/25 to-[#B8860B]/15 border-2 border-[#E2E8F0] flex items-center justify-center mb-3">
                                        <span className="text-xl font-bold text-[#0F172A]">{activeContact.name ? activeContact.name.substring(0, 2).toUpperCase() : 'NA'}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F172A]">{activeContact.name || 'Nome não disponível'}</h3>
                                    <p className="text-xs text-[#8B6508] mt-1 relative inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full blur-[2px] absolute -left-3"></span>
                                        <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full"></span>
                                        {activeContact.category || 'Ativo'}
                                    </p>
                                </div>

                                <div className="w-full h-px bg-[#F1F5F9]"></div>

                                {/* Funnel Info */}
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <span className="text-[10px] text-[#64748B] uppercase block mb-1">Documento CRM</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[#0F172A]">{activeContact.document || '---'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[#64748B] uppercase block mb-1">Telefone</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[#0F172A]">{activeContact.phone || '---'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[#64748B] uppercase block mb-1">E-mail Cadastrado</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[#0F172A]">{activeContact.email || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-[#64748B] uppercase block mb-1">Status Sessão IA</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[#0F172A]">
                                                {effectiveAiActive ? '🤖 IA OrBrick Ativa' : '👤 Operador Humano'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-[#64748B] text-xs">Busque e selecione um contato na lista à esquerda para carregar a Ficha CRM.</div>
                        )}

                        <div className="w-full h-px bg-[#F1F5F9]"></div>
                        <div>
                            <span className="text-[10px] text-[#64748B] uppercase block mb-2">Fila de Cobranças Automáticas</span>
                            {queue.length === 0 ? (
                                <p className="text-xs text-[#64748B]">Nenhum lembrete na fila.</p>
                            ) : queue.map((q, i) => (
                                <div key={`${q.invoice_id}-${q.step}-${i}`} className="text-xs text-[#0F172A] mb-2 flex justify-between gap-2">
                                    <span className="truncate">{q.step} · {q.customer_name}</span>
                                    <span className={q.state === 'NO_PHONE' ? 'text-amber-700' : 'text-[#8B6508]'}>
                                        {q.state === 'NO_PHONE' ? 'sem telefone' : new Date(q.scheduled_for).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

            </div>
            )}
        </main>
    );
}
