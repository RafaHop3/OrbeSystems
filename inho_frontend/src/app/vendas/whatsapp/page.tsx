/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import {
    Search, MessageSquare, Phone, Send, Zap,
    FileText, Clock, UserCheck, CheckCircle2,
    MoreVertical
} from 'lucide-react';

export default function WhatsAppCentralPage() {
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, sender: "Sistema", text: "Você entrou no canal Omnichannel. Faça uma busca para iniciar uma comunicação (Orbe Baileys WhatsApp Proxy).", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isOut: false }
    ]);
    const [isSending, setIsSending] = useState(false);

    // --- DYNAMIC CONTACT LOGIC ---
    const [searchQuery, setSearchQuery] = useState("");
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [activeContact, setActiveContact] = useState<any>(null);

    React.useEffect(() => {
        const fetchAllContacts = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") || "dev-bypass" : "dev-bypass";
                const res = await fetch(`https://inho-api.orbesystems.com.br/api/v1/crm/contacts/?limit=100`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setAllContacts(data); // Overrides mocks with real DB if available
                    }
                }
            } catch (error) {
                console.error("Failed to load contacts:", error);
            }
        };
        fetchAllContacts();
    }, []);

    const filteredContacts = allContacts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
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
            const token = typeof window !== "undefined" ? localStorage.getItem("token") || "dev-bypass" : "dev-bypass";
            await fetch("https://inho-api.orbesystems.com.br/api/v1/crm/whatsapp/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone: activeContact.phone,
                    email: activeContact.email || null,
                    message: outMsg
                })
            });
        } catch (error) {
            console.error("Erro no envio omnichannel:", error);
        } finally {
            setIsSending(false);
        }
    };

    const insertTemplate = (type: string) => {
        if (!activeContact) {
            alert("Selecione um contato primeiro!");
            return;
        }
        const namePart = activeContact.name.split(' ')[0];
        if (type === 'pix') setMessageInput((prev) => prev + `Olá ${namePart}, segue a chave PIX para liquidar a parcela.\nChave: 45.455.513/0001-99\nEmpresa: INHO SaaS`);
        if (type === 'proposta') setMessageInput((prev) => prev + `Bom dia ${namePart}, a nossa proposta comercial consolidada está no ar. Clique no painel para aceitar.`);
        if (type === 'cobranca') setMessageInput((prev) => prev + `🚨 *AVISO DE COBRANÇA*\n\nIdentificamos uma fatura pendente no seu sistema, pronta para regularização. Em caso de dúvidas, nos responda aqui!`);
    };

    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-[#00fff5]/30 overflow-hidden relative">
            <Sidebar />

            <main className="flex-1 flex flex-col p-6 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-[#1a1f26]/50 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#00fff5]/10 border border-[#00fff5]/30 rounded-lg flex items-center justify-center">
                            <MessageSquare className="text-[#00fff5]" size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wide uppercase">Central WhatsApp</h1>
                            <p className="text-[#8b949e] text-xs mt-0.5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#39ff14] rounded-full animate-pulse"></span>
                                Online via Orbe Bot (AWS Baileys Proxy)
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3-Column Layout */}
                <div className="flex-1 flex gap-4 h-[calc(100vh-140px)]">

                    {/* COLUMN 1: CONVERSATIONS */}
                    <div className="w-80 flex flex-col bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden shadow-lg shrink-0">
                        <div className="p-4 border-b border-[#1a1f26]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar Contatos do CRM..."
                                    className="w-full bg-[#030406] border border-[#1a1f26] rounded-md py-2 pl-9 pr-3 text-xs text-white focus:border-[#00fff5] outline-none transition-colors"
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
                                        className={`flex items-center gap-3 p-4 border-l-2 cursor-pointer transition-colors ${activeContact?.id === contact.id ? 'border-[#00fff5] bg-[#1a1f26]/60' : 'border-transparent hover:bg-[#1a1f26]/40'}`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00fff5]/20 to-[#bc13fe]/20 border border-[#00fff5]/30 flex items-center justify-center shrink-0 object-cover overflow-hidden">
                                            <span className="text-xs font-bold text-[#00fff5]">{contact.name.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-sm font-bold text-white truncate">{contact.name}</h3>
                                            </div>
                                            <p className="text-xs text-[#8b949e] truncate mt-1">{contact.phone || 'Sem Telefone'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-xs text-[#6e7681] text-center">Nenhum contato encontrado.</div>
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: ACTIVE CHAT */}
                    <div className="flex-1 flex flex-col bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden shadow-lg">
                        {/* Chat Topbar */}
                        <div className="p-4 border-b border-[#1a1f26] flex items-center justify-between bg-[#06080A]">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-base font-bold text-white">
                                        {activeContact ? activeContact.name : "Nenhum Contato Selecionado"}
                                    </h2>
                                    {activeContact ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-[#00a884] font-bold">WABA DESTINO:</span>
                                            <input
                                                type="text"
                                                value={activeContact.phone || ''}
                                                onChange={(e) => setActiveContact({ ...activeContact, phone: e.target.value })}
                                                className="bg-[#1a1f26] border border-[#00fff5]/30 text-[#00fff5] text-xs px-2 py-0.5 rounded outline-none focus:border-[#00fff5] w-32 font-mono"
                                                title="Edite este número temporariamente para testar o envio para o seu próprio WhatsApp (formato recomendado: 5511999999999)"
                                            />
                                            <span className="text-[10px] text-gray-500">(Editável p/ Teste)</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-[#00fff5]">Aguardando seleção...</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-[#8b949e] hover:bg-[#1a1f26] hover:text-white rounded-md transition-colors">
                                    <Phone size={16} />
                                </button>
                                <button className="p-2 text-[#8b949e] hover:bg-[#1a1f26] hover:text-white rounded-md transition-colors">
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#0b141a] relative" style={{ backgroundImage: "url('https://i.ibb.co/3YbnB9L/whatsapp-bg.png')", backgroundSize: "300px", backgroundRepeat: "repeat" }}>
                            {activeContact && (
                                <div className="flex justify-center mb-6">
                                    <div className="flex items-center gap-2 bg-[#182229] px-4 py-1.5 rounded-lg text-xs font-semibold text-[#8696a0] shadow-sm">
                                        <Zap size={14} className="text-[#00a884]" /> Canal Sincronizado: WhatsApp E2E
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.isOut ? 'items-end' : 'items-start'} mb-2`}>
                                    <div className={`relative px-3 py-2 rounded-lg max-w-[85%] shadow-sm ${msg.isOut
                                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'}`}>
                                        <p className="text-[14.5px] leading-snug whitespace-pre-wrap pr-12">{msg.text}</p>
                                        <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                            <span className="text-[10px] text-[#8696a0] font-medium">{msg.time}</span>
                                            {msg.isOut && <CheckCircle2 size={12} className="text-[#53bdeb]" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chat Input & Fast Actions */}
                        <div className="bg-[#06080A] border-t border-[#1a1f26] p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <button onClick={() => insertTemplate('pix')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#39ff14]/10 hover:bg-[#39ff14]/20 text-[#39ff14] text-[10px] font-bold uppercase rounded-md border border-[#39ff14]/30 transition-colors">
                                    <Zap size={12} /> Chave Pix
                                </button>
                                <button onClick={() => insertTemplate('proposta')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#bc13fe]/10 hover:bg-[#bc13fe]/20 text-[#bc13fe] text-[10px] font-bold uppercase rounded-md border border-[#bc13fe]/30 transition-colors">
                                    <FileText size={12} /> Link Proposta
                                </button>
                                <button onClick={() => insertTemplate('cobranca')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-bold uppercase rounded-md border border-[#f59e0b]/30 transition-colors">
                                    <Clock size={12} /> Lembrete Régua
                                </button>
                            </div>
                            <div className="flex items-end gap-3">
                                <div className="flex-1 bg-[#030406] border border-[#1a1f26] rounded-xl overflow-hidden focus-within:border-[#00fff5]/50 transition-colors flex">
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
                                        className="w-full bg-transparent p-3 text-sm text-white resize-none outline-none overflow-hidden h-12 custom-scrollbar disabled:opacity-50"
                                    />
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isSending || !messageInput.trim() || !activeContact}
                                    className="h-12 w-12 flex items-center justify-center bg-[#00fff5] hover:bg-[#00e5dd] disabled:opacity-50 text-[#020406] rounded-xl transition-colors shadow-[0_0_15px_rgba(0,255,245,0.4)] shrink-0">
                                    <Send size={18} className="translate-x-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: CRM PANEL */}
                    <div className="w-[300px] flex flex-col bg-[#0A0D12] border border-[#1a1f26] rounded-xl overflow-hidden shadow-lg shrink-0">
                        <div className="p-4 border-b border-[#1a1f26] bg-[#06080A]">
                            <h2 className="text-sm font-bold text-[#8b949e] uppercase tracking-widest flex items-center gap-2">
                                <UserCheck size={14} /> Ficha do Lead
                            </h2>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            {activeContact ? (
                                <>
                                    {/* Profile Details */}
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#00fff5]/20 to-[#bc13fe]/20 border-2 border-[#1a1f26] flex items-center justify-center mb-3">
                                            <span className="text-xl font-bold text-white">{activeContact.name.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">{activeContact.name}</h3>
                                        <p className="text-xs text-[#00fff5] mt-1 relative inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 bg-[#00fff5] rounded-full blur-[2px] absolute -left-3"></span>
                                            <span className="w-1.5 h-1.5 bg-[#00fff5] rounded-full"></span>
                                            {activeContact.category || 'Ativo'}
                                        </p>
                                    </div>

                                    <div className="w-full h-px bg-[#1a1f26]/50"></div>

                                    {/* Funnel Info */}
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <span className="text-[10px] text-[#6e7681] uppercase block mb-1">Documento CRM</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-white">{activeContact.document || '---'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-[#6e7681] uppercase block mb-1">E-mail Cadastrado</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-white">{activeContact.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-[#8b949e] text-xs">Busque e selecione um contato na lista à esquerda para carregar a Ficha CRM.</div>
                            )}

                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
