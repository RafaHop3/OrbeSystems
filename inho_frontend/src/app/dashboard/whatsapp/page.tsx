/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import {
    Search, MessageSquare, Phone, Send, Zap,
    FileText, Clock, UserCheck, CheckCircle2,
    MoreVertical
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { crmApi } from '@/lib/api';

export default function WhatsAppCentralPage() {
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, sender: "Sistema", text: "Você entrou no canal Omnichannel. Faça uma busca para iniciar uma comunicação (Orbe Baileys WhatsApp Proxy).", time: "--:--", isOut: false }
    ]);
    const [isSending, setIsSending] = useState(false);

    // --- DYNAMIC CONTACT LOGIC ---
    const [searchQuery, setSearchQuery] = useState("");
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [activeContact, setActiveContact] = useState<any>(null);

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
    }, []);

    // --- HISTÓRICO REAL + FILA DE LEMBRETES ---
    const [queue, setQueue] = useState<any[]>([]);

    const loadHistory = React.useCallback(async (contact: any) => {
        if (!contact?.phone) return;
        const digits = String(contact.phone).replace(/\D/g, "");
        if (digits.length < 8) return;
        try {
            const logs: any[] = await crmApi.getWhatsappHistory(digits.slice(-8));
            setMessages(logs.reverse().map((l: any) => ({
                id: l.id as any,
                sender: "Você (Omnichannel)",
                text: l.message,
                time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isOut: true
            })));
        } catch (e) { console.error("Falha ao carregar histórico:", e); }
    }, []);

    React.useEffect(() => {
        if (!activeContact) return;
        loadHistory(activeContact);
        const t = setInterval(() => loadHistory(activeContact), 8000);
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
            console.log("Sending WhatsApp message to:", activeContact.phone);
            console.log("Message content:", outMsg);
            
            const data = await crmApi.sendWhatsapp({
                phone: activeContact.phone,
                email: activeContact.email || null,
                message: outMsg
            });
            console.log("WhatsApp API response:", data);

            // Sucesso se ao menos uma variação (com ou sem 9º dígito) retornou 200
            const codes: string[] = Array.isArray(data?.whatsapp_delivery_code) ? data.whatsapp_delivery_code : [];
            const anyDelivered = codes.some((code: string) => code.endsWith(":200"));
            const waStatusAlert = codes.length === 0 || !anyDelivered;

            if (waStatusAlert) {
                alert(`⚠️ Falha no disparo E2E:\nO Container do WhatsApp Bot (Baileys) parece estar indisponível ou em crash loop no servidor.\n\nLogs API: ${JSON.stringify(data?.whatsapp_delivery_code)}`);
                // Erase the optimistic bubble
                setMessages((prev) => prev.filter(m => m.id !== newMsg.id));
            } else {
                console.log("Message sent successfully");
            }

        } catch (error: any) {
            console.error("Erro no envio omnichannel:", error);
            alert("Erro Omnichannel Proxy: " + (error?.message || error));
            // Erase the optimistic bubble on error
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
        console.log("Inserting template:", type, "for contact:", namePart);
        
        if (type === 'pix') {
            const pixTemplate = `Olá ${namePart}, segue a chave PIX para liquidar a parcela.\nChave: 45.455.513/0001-99\nEmpresa: INHO SaaS`;
            setMessageInput((prev) => prev + pixTemplate);
            console.log("PIX template inserted");
        }
        if (type === 'proposta') {
            const propostaTemplate = `Bom dia ${namePart}, a nossa proposta comercial consolidada está no ar. Clique no painel para aceitar.`;
            setMessageInput((prev) => prev + propostaTemplate);
            console.log("Proposta template inserted");
        }
        if (type === 'cobranca') {
            const cobrancaTemplate = `🚨 *AVISO DE COBRANÇA*\n\nIdentificamos uma fatura pendente no seu sistema, pronta para regularização. Em caso de dúvidas, nos responda aqui!`;
            setMessageInput((prev) => prev + cobrancaTemplate);
            console.log("Cobrança template inserted");
        }
    };

    return (
        <main className="flex-1 flex flex-col p-6 relative bg-transparent overflow-hidden h-[calc(100vh-80px)]">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5DEC9] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FDF7E2] border border-[#D4AF37]/50 rounded-lg flex items-center justify-center">
                        <MessageSquare className="text-[#8B6508]" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A] tracking-wide uppercase">Central WhatsApp</h1>
                        <p className="text-[#57606A] text-xs mt-0.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                            Online via Orbe Bot (AWS Baileys Proxy)
                        </p>
                    </div>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 flex gap-4 h-[calc(100vh-140px)]">

                {/* COLUMN 1: CONVERSATIONS */}
                <div className="w-80 flex flex-col bg-white shadow-sm border border-[#E5DEC9] rounded-xl overflow-hidden shadow-lg shrink-0">
                    <div className="p-4 border-b border-[#E5DEC9]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#57606A]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar Contatos do CRM..."
                                className="w-full bg-[#FAF8F2] border border-[#E5DEC9] rounded-md py-2 pl-9 pr-3 text-xs text-[#0F172A] focus:border-[#B8860B] outline-none transition-colors"
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
                                    className={`flex items-center gap-3 p-4 border-l-2 cursor-pointer transition-colors ${activeContact?.id === contact.id ? 'border-[#B8860B] bg-[#FAF8F2]' : 'border-transparent hover:bg-[#FAF8F2]'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37]/25 to-[#B8860B]/15 border border-[#D4AF37]/50 flex items-center justify-center shrink-0 object-cover overflow-hidden">
                                        <span className="text-xs font-bold text-[#8B6508]">{contact.name.substring(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-sm font-bold text-[#0F172A] truncate">{contact.name}</h3>
                                        </div>
                                        <p className="text-xs text-[#57606A] truncate mt-1">{contact.phone || 'Sem Telefone'}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-xs text-[#64748B] text-center">Nenhum contato encontrado.</div>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: ACTIVE CHAT */}
                <div className="flex-1 flex flex-col bg-white shadow-sm border border-[#E5DEC9] rounded-xl overflow-hidden shadow-lg">
                    {/* Chat Topbar */}
                    <div className="p-4 border-b border-[#E5DEC9] flex items-center justify-between bg-[#FAF8F2]">
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
                                            className="bg-[#FAF8F2] border border-[#D4AF37]/50 text-[#8B6508] text-xs px-2 py-0.5 rounded outline-none focus:border-[#B8860B] w-32 font-mono"
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
                            <button className="p-2 text-[#57606A] hover:bg-[#FAF8F2] hover:text-[#0F172A] rounded-md transition-colors">
                                <Phone size={16} />
                            </button>
                            <button className="p-2 text-[#57606A] hover:bg-[#FAF8F2] hover:text-[#0F172A] rounded-md transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#FAF8F2] relative">
                        {activeContact && (
                            <div className="flex justify-center mb-6">
                                <div className="flex items-center gap-2 bg-[#FAF8F2] px-4 py-1.5 rounded-lg text-xs font-semibold text-[#57606A] shadow-sm">
                                    <Zap size={14} className="text-emerald-700" /> Canal Sincronizado: WhatsApp E2E
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.isOut ? 'items-end' : 'items-start'} mb-2`}>
                                <div className={`relative px-3 py-2 rounded-lg max-w-[85%] shadow-sm ${msg.isOut
                                    ? 'bg-[#FDF7E2] border border-[#D4AF37]/50 text-[#0F172A] rounded-tr-none'
                                    : 'bg-white text-[#0F172A] rounded-tl-none'}`}>
                                    <p className="text-[14.5px] leading-snug whitespace-pre-wrap pr-12">{msg.text}</p>
                                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                        <span className="text-[10px] text-[#57606A] font-medium">{msg.time}</span>
                                        {msg.isOut && <CheckCircle2 size={12} className="text-[#B8860B]" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input & Fast Actions */}
                    <div className="bg-[#FAF8F2] border-t border-[#E5DEC9] p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <button onClick={() => insertTemplate('pix')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-md border border-emerald-300 transition-colors">
                                <Zap size={12} /> Chave Pix
                            </button>
                            <button onClick={() => insertTemplate('proposta')} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded-md border border-purple-300 transition-colors">
                                <FileText size={12} /> Link Proposta
                            </button>
                            <button onClick={() => insertTemplate('cobranca')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded-md border border-amber-300 transition-colors">
                                <Clock size={12} /> Lembrete Régua
                            </button>
                        </div>
                        <div className="flex items-end gap-3">
                            <div className="flex-1 bg-[#FAF8F2] border border-[#E5DEC9] rounded-xl overflow-hidden focus-within:border-[#D4AF37]/70 transition-colors flex">
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
                <div className="w-[300px] flex flex-col bg-white shadow-sm border border-[#E5DEC9] rounded-xl overflow-hidden shadow-lg shrink-0">
                    <div className="p-4 border-b border-[#E5DEC9] bg-[#FAF8F2]">
                        <h2 className="text-sm font-bold text-[#57606A] uppercase tracking-widest flex items-center gap-2">
                            <UserCheck size={14} /> Ficha do Lead
                        </h2>
                    </div>
                    <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                        {activeContact ? (
                            <>
                                {/* Profile Details */}
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#D4AF37]/25 to-[#B8860B]/15 border-2 border-[#E5DEC9] flex items-center justify-center mb-3">
                                        <span className="text-xl font-bold text-[#0F172A]">{activeContact.name ? activeContact.name.substring(0, 2).toUpperCase() : 'NA'}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F172A]">{activeContact.name || 'Nome não disponível'}</h3>
                                    <p className="text-xs text-[#8B6508] mt-1 relative inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full blur-[2px] absolute -left-3"></span>
                                        <span className="w-1.5 h-1.5 bg-[#B8860B] rounded-full"></span>
                                        {activeContact.category || 'Ativo'}
                                    </p>
                                </div>

                                <div className="w-full h-px bg-[#FAF8F2]"></div>

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
                                        <span className="text-[10px] text-[#64748B] uppercase block mb-1">Endereço</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[#0F172A]">{activeContact.address || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-[#57606A] text-xs">Busque e selecione um contato na lista à esquerda para carregar a Ficha CRM.</div>
                        )}

                        <div className="w-full h-px bg-[#FAF8F2]"></div>
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
        </main>
    );
}
