"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, CheckCircle2, TrendingUp, Presentation, AlertCircle, XCircle, MoreVertical, MessageCircle, X } from "lucide-react";

// The Enum matching Backend DealStage
enum DealStage {
    PROSPECTING = "PROSPECTING",
    PRESENTATION = "PRESENTATION",
    NEGOTIATION = "NEGOTIATION",
    WON = "WON",
    LOST = "LOST"
}

interface Deal {
    id: string;
    title: string;
    value: number;
    stage: DealStage;
    phone?: string;
}

const STAGES = [
    { id: DealStage.PROSPECTING, title: "Prospecção", color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: TrendingUp },
    { id: DealStage.PRESENTATION, title: "Apresentação", color: "bg-purple-500/20 text-purple-400 border-purple-500/50", icon: Presentation },
    { id: DealStage.NEGOTIATION, title: "Negociação", color: "bg-orange-500/20 text-orange-400 border-orange-500/50", icon: AlertCircle },
    { id: DealStage.WON, title: "Ganhos / Faturar", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50", icon: CheckCircle2 },
    { id: DealStage.LOST, title: "Perdidos", color: "bg-rose-500/20 text-rose-400 border-rose-500/50", icon: XCircle }
];

// Mock data initially
const initialDeals: Deal[] = [
    { id: "1", title: "Implantação ERP - Rede Alfa", value: 12500, stage: DealStage.PROSPECTING, phone: "5511999999999" },
    { id: "2", title: "Consultoria Premium - BetaCorp", value: 45000, stage: DealStage.PRESENTATION, phone: "5511888888888" },
    { id: "3", title: "Licença Anual - Gama S/A", value: 8900, stage: DealStage.NEGOTIATION, phone: "5511777777777" },
];

export default function FunilKanban() {
    const [deals, setDeals] = useState<Deal[]>(initialDeals);
    const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Modals State
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [newDealForm, setNewDealForm] = useState({ title: '', value: 0, phone: '' });

    const [wonModalDealId, setWonModalDealId] = useState<string | null>(null);
    const [wonForm, setWonForm] = useState({ type: 'SINGLE', vcto: 5, targetDoc: '' });

    const [lostModalDealId, setLostModalDealId] = useState<string | null>(null);
    const [lostReason, setLostReason] = useState('price');

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedDealId(id);
        setOpenMenuId(null);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => {
            const el = document.getElementById(`deal-${id}`);
            if (el) el.style.opacity = "0.5";
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent, id: string) => {
        const el = document.getElementById(`deal-${id}`);
        if (el) el.style.opacity = "1";
        setDraggedDealId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const processMove = (dealId: string, targetStage: DealStage) => {
        const dealToMove = deals.find(d => d.id === dealId);
        if (!dealToMove || dealToMove.stage === targetStage) return;

        if (targetStage === DealStage.WON) {
            setWonModalDealId(dealId);
            return;
        }

        if (targetStage === DealStage.LOST) {
            setLostModalDealId(dealId);
            return;
        }

        setDeals(prev => prev.map(d =>
            d.id === dealId ? { ...d, stage: targetStage } : d
        ));
    };

    const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
        e.preventDefault();
        if (!draggedDealId) return;
        processMove(draggedDealId, targetStage);
        setDraggedDealId(null);
    };

    const handleMenuMove = (dealId: string, targetStage: DealStage) => {
        setOpenMenuId(null);
        processMove(dealId, targetStage);
    };

    const handleNewDealSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newDeal: Deal = {
            id: Math.random().toString(),
            title: newDealForm.title,
            value: newDealForm.value,
            phone: newDealForm.phone,
            stage: DealStage.PROSPECTING
        };
        setDeals([...deals, newDeal]);
        setIsNewModalOpen(false);
        setNewDealForm({ title: '', value: 0, phone: '' });
    };

    const confirmWon = () => {
        if (!wonModalDealId) return;
        setDeals(prev => prev.map(d =>
            d.id === wonModalDealId ? { ...d, stage: DealStage.WON } : d
        ));
        const deal = deals.find(d => d.id === wonModalDealId);
        alert(`🔥 Fatura de ${formatCurrency(deal?.value || 0)} gerada automaticamente via DRE!\nParâmetros: ${wonForm.type}, Vencimento: ${wonForm.vcto} dias`);
        setWonModalDealId(null);
    };

    const confirmLost = () => {
        if (!lostModalDealId) return;
        setDeals(prev => prev.map(d =>
            d.id === lostModalDealId ? { ...d, stage: DealStage.LOST } : d
        ));
        setLostModalDealId(null);
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#020406] text-slate-200" onClick={() => setOpenMenuId(null)}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0a0a0f]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <TrendingUp className="text-[#00fff5]" />
                        Funil de Negócios Workflow
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Gerencie leads, propostas e emita cobranças automatizadas.
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsNewModalOpen(true); }}
                    className="flex items-center gap-2 bg-[#bc13fe]/10 hover:bg-[#bc13fe]/20 text-[#D264FA] border border-[#bc13fe]/30 px-5 py-2.5 rounded-md font-semibold transition-colors duration-200 shadow-[0_0_15px_rgba(188,19,254,0.15)]"
                >
                    <Plus size={18} /> Novo Negócio
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-6 h-full items-start min-w-max">
                    {STAGES.map(stage => {
                        const stageDeals = deals.filter(d => d.stage === stage.id);
                        const stageTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);
                        const StageIcon = stage.icon;

                        return (
                            <div
                                key={stage.id}
                                className="flex flex-col w-[320px] max-h-full bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden backdrop-blur-xl"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {/* Column Header */}
                                <div className={`px-4 py-3 border-b flex flex-col gap-2 bg-black/20 ${stage.color} rounded-t-xl`}>
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-sm drop-shadow-md flex items-center gap-2 uppercase tracking-wider">
                                            <StageIcon size={16} />
                                            {stage.title}
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-black/40 shadow-inner border border-white/10">
                                            {stageDeals.length}
                                        </span>
                                    </div>
                                    <div className="text-xs font-mono font-medium drop-shadow-md">
                                        Pipeline: {formatCurrency(stageTotal)}
                                    </div>
                                </div>

                                {/* Column Cards */}
                                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                    <AnimatePresence>
                                        {stageDeals.map(deal => (
                                            <motion.div
                                                key={deal.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                            >
                                                <div
                                                    id={`deal-${deal.id}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, deal.id)}
                                                    onDragEnd={(e) => handleDragEnd(e, deal.id)}
                                                    className="group relative bg-[#0d0f14] border border-white/10 hover:border-[#00fff5]/50 rounded-lg p-4 cursor-grab active:cursor-grabbing shadow-lg hover:shadow-[0_0_20px_rgba(0,255,245,0.1)] transition-all duration-300"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="font-medium text-slate-200 text-sm leading-tight pr-6">{deal.title}</h4>

                                                        {/* Actions / Mobile Menu Button */}
                                                        <div className="absolute top-3 right-3 flex items-center gap-1">
                                                            {deal.phone && (
                                                                <button
                                                                    title="Falar no WhatsApp"
                                                                    onClick={(e) => { e.stopPropagation(); alert(`Abrindo Chat/Macro para: ${deal.phone}`); }}
                                                                    className="p-1 text-slate-500 hover:text-[#25D366] transition-colors"
                                                                >
                                                                    <MessageCircle size={15} />
                                                                </button>
                                                            )}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === deal.id ? null : deal.id); }}
                                                                    className="p-1 text-slate-600 hover:text-white transition-colors"
                                                                >
                                                                    <MoreVertical size={16} />
                                                                </button>

                                                                {/* Dropdown Menu (Touch Support) */}
                                                                {openMenuId === deal.id && (
                                                                    <div className="absolute right-0 top-6 w-44 bg-[#12161c] border border-white/10 rounded-md shadow-2xl py-1 z-50">
                                                                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 mb-1">
                                                                            Mover Para:
                                                                        </div>
                                                                        {STAGES.filter(s => s.id !== deal.stage).map(s => (
                                                                            <button
                                                                                key={s.id}
                                                                                onClick={(e) => { e.stopPropagation(); handleMenuMove(deal.id, s.id); }}
                                                                                className="w-full text-left px-4 py-2 text-xs hover:bg-white/5 flex items-center gap-2"
                                                                            >
                                                                                <s.icon size={12} /> {s.title}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-3">
                                                        <GripVertical size={12} className="opacity-40" /> Arraste ou use o menu
                                                    </div>

                                                    <div className="flex items-end justify-between mt-2 pt-2 border-t border-white/5">
                                                        <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Estimativa</div>
                                                        <div className="text-[#00fff5] font-mono text-sm font-bold tracking-tighter">
                                                            {formatCurrency(deal.value)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {stageDeals.length === 0 && (
                                        <div className="h-24 flex items-center justify-center border-2 border-dashed border-white/5 rounded-lg text-xs text-slate-500/50">
                                            Solte cards aqui
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal: Novo Deal */}
            {isNewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#0A0D12] w-full max-w-md rounded-2xl shadow-2xl border border-[#1a1f26] overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#1a1f26] flex justify-between items-center bg-[#12161c]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Plus className="text-[#bc13fe]" size={20} /> Novo Negócio</h2>
                            <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleNewDealSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lead / Empresa</label>
                                <input type="text" required value={newDealForm.title} onChange={e => setNewDealForm({ ...newDealForm, title: e.target.value })} className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#bc13fe]" placeholder="Ex: ContaAzul S/A" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp / Celular</label>
                                <input type="text" required value={newDealForm.phone} onChange={e => setNewDealForm({ ...newDealForm, phone: e.target.value })} className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#bc13fe]" placeholder="5511999999999" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Valor Estimado (R$)</label>
                                <input type="number" required min="0" step="0.01" value={newDealForm.value} onChange={e => setNewDealForm({ ...newDealForm, value: parseFloat(e.target.value) })} className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#bc13fe]" />
                            </div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="px-6 py-2.5 bg-[#bc13fe] hover:bg-[#a110d9] text-white font-bold rounded-lg shadow-lg">Criar Lead</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Gatilho de Vitória (Faturamento) */}
            {wonModalDealId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#0A0D12] w-full max-w-md rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#1a1f26] flex justify-between items-center bg-emerald-500/10">
                            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2"><CheckCircle2 size={20} /> Engatilhar Faturamento</h2>
                            <button onClick={() => setWonModalDealId(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-300">Ao confirmar, o financeiro irá emitir a fatura via DRE automaticamente.</p>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Tipo de Faturamento</label>
                                <select value={wonForm.type} onChange={e => setWonForm({ ...wonForm, type: e.target.value })} className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg">
                                    <option value="SINGLE">Pagamento Único (Pix/Boleto)</option>
                                    <option value="RECURRING">Assinatura Mensal (Régua)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Prazo do 1º Vencimento (Dias)</label>
                                <select value={wonForm.vcto} onChange={e => setWonForm({ ...wonForm, vcto: parseInt(e.target.value) })} className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg">
                                    <option value={0}>À Vista (Imediato)</option>
                                    <option value={5}>5 Dias</option>
                                    <option value={15}>15 Dias</option>
                                    <option value={30}>30 Dias</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">CPF / CNPJ do Pagador</label>
                                <input type="text" value={wonForm.targetDoc} onChange={e => setWonForm({ ...wonForm, targetDoc: e.target.value })} className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg" placeholder="Opcional se já cadastrado" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setWonModalDealId(null)} className="px-4 py-2 bg-transparent text-slate-400 hover:text-white">Cancelar</button>
                                <button onClick={confirmWon} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg">Confirmar Venda</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Motivo de Perda */}
            {lostModalDealId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#0A0D12] w-full max-w-md rounded-2xl shadow-2xl border border-rose-500/30 overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#1a1f26] flex justify-between items-center bg-rose-500/10">
                            <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2"><XCircle size={20} /> Motivo da Perda</h2>
                            <button onClick={() => setLostModalDealId(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-300">Registre por que este negócio foi arquivado para melhorar nossas métricas.</p>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Qualidade da Oportunidade</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="reason" value="price" checked={lostReason === 'price'} onChange={(e) => setLostReason(e.target.value)} className="accent-rose-500" />
                                        <span className="text-sm text-slate-200">Preço / Fora do Orçamento</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="reason" value="competitor" checked={lostReason === 'competitor'} onChange={(e) => setLostReason(e.target.value)} className="accent-rose-500" />
                                        <span className="text-sm text-slate-200">Optou pelo Concorrente</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="reason" value="no-interest" checked={lostReason === 'no-interest'} onChange={(e) => setLostReason(e.target.value)} className="accent-rose-500" />
                                        <span className="text-sm text-slate-200">Sem Interesse no Momento</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="radio" name="reason" value="ghosting" checked={lostReason === 'ghosting'} onChange={(e) => setLostReason(e.target.value)} className="accent-rose-500" />
                                        <span className="text-sm text-slate-200">Parou de Responder (Ghosting)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setLostModalDealId(null)} className="px-4 py-2 bg-transparent text-slate-400 hover:text-white">Cancelar</button>
                                <button onClick={confirmLost} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-lg">Arquivar Definitivo</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,255,245,0.3); }
            `}} />
        </div>
    );
}
