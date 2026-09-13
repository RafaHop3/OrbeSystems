"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, CheckCircle2, TrendingUp, Presentation, AlertCircle, XCircle } from "lucide-react";

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
    { id: "1", title: "Implantação ERP - Rede Alfa", value: 12500, stage: DealStage.PROSPECTING },
    { id: "2", title: "Consultoria Premium - BetaCorp", value: 45000, stage: DealStage.PRESENTATION },
    { id: "3", title: "Licença Anual - Gama S/A", value: 8900, stage: DealStage.NEGOTIATION },
];

export default function FunilKanban() {
    const [deals, setDeals] = useState<Deal[]>(initialDeals);
    const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedDealId(id);
        e.dataTransfer.effectAllowed = "move";
        // Slightly delay hide to allow drag image generation
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

    const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
        e.preventDefault();
        if (!draggedDealId) return;

        const dealToMove = deals.find(d => d.id === draggedDealId);
        if (!dealToMove || dealToMove.stage === targetStage) return;

        // Optimistic UI Update
        setDeals(prev => prev.map(d =>
            d.id === draggedDealId ? { ...d, stage: targetStage } : d
        ));

        // API Call
        try {
            /* 
            await fetch(`/api/v1/crm/deals/${draggedDealId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: targetStage })
            }); 
            */
            if (targetStage === DealStage.WON) {
                // Trigger Toast or Notification for Billing
                alert(`🔥 Fatura de ${formatCurrency(dealToMove.value)} gerada automaticamente no Financeiro!`);
            }
        } catch (error) {
            console.error("Erro ao mover deal", error);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-[#020406] text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0a0a0f]">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <TrendingUp className="text-[#00fff5]" />
                        Funil de Vendas Workflow
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Arraste os cards para &quot;Ganhos&quot; para faturar automaticamente via DRE.
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-[#bc13fe]/10 hover:bg-[#bc13fe]/20 text-[#D264FA] border border-[#bc13fe]/30 px-5 py-2.5 rounded-md font-semibold transition-colors duration-200 shadow-[0_0_15px_rgba(188,19,254,0.15)]">
                    <Plus size={18} /> Novo Negócio
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex gap-6 h-full items-start min-w-max">
                    {STAGES.map(stage => {
                        const stageDeals = deals.filter(d => d.stage === stage.id);
                        const StageIcon = stage.icon;

                        return (
                            <div
                                key={stage.id}
                                className="flex flex-col w-[320px] max-h-full bg-white/[0.02] border border-white/5 rounded-xl overlow-hidden backdrop-blur-xl"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {/* Column Header */}
                                <div className={`px-4 py-3 border-b flex justify-between items-center bg-black/20 ${stage.color} rounded-t-xl`}>
                                    <h3 className="font-semibold text-sm drop-shadow-md flex items-center gap-2">
                                        <StageIcon size={16} />
                                        {stage.title}
                                    </h3>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 shadow-inner">
                                        {stageDeals.length}
                                    </span>
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
                                                        <h4 className="font-medium text-slate-200 text-sm">{deal.title}</h4>
                                                        <GripVertical size={14} className="text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="flex items-end justify-between mt-4">
                                                        <div className="text-xs text-slate-500 font-medium">VR. ESTIMADO</div>
                                                        <div className="text-[#00fff5] font-mono text-sm tracking-tighter">
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
