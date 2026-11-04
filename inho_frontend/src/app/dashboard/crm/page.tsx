/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  BookOpen,
  Trash2,
  Plus,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Crown,
  Flame,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { crmApi } from '@/lib/api';

export default function CBMIntelligencePage() {
  const [insights, setInsights] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Campaign creation form
  const [campName, setCampName] = useState('Retenção Preventiva Cooperados VIP');
  const [campTrigger, setCampTrigger] = useState('CHURN_ALERT');
  const [campChannels, setCampChannels] = useState<string[]>(['WHATSAPP', 'EMAIL']);
  const [campPrompt, setCampPrompt] = useState(
    'Olá, {nome}! Aqui é a equipe de relacionamento da {empresa}. Preparamos uma condição especial para apoiar sua próxima movimentação conosco.'
  );
  const [creatingCamp, setCreatingCamp] = useState(false);
  // RAG Knowledge Base State
  const [knowledgeChunks, setKnowledgeChunks] = useState<any[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState<boolean>(false);
  const [seedingKnowledge, setSeedingKnowledge] = useState<boolean>(false);
  const [showAddDoc, setShowAddDoc] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('REGULAMENTO_INTERNO');
  const [newContent, setNewContent] = useState<string>('');
  const [newKeywords, setNewKeywords] = useState<string>('');

  const loadKnowledge = useCallback(async () => {
    setLoadingKnowledge(true);
    try {
      const data = await crmApi.listAiKnowledge();
      setKnowledgeChunks(data || []);
    } catch (err: any) {
      console.warn('Falha ao carregar RAG knowledge chunks:', err);
    } finally {
      setLoadingKnowledge(false);
    }
  }, []);

  const handleSeedDefaults = async () => {
    setSeedingKnowledge(true);
    try {
      const data = await crmApi.seedDefaultAiKnowledge();
      setKnowledgeChunks(data || []);
      showBanner('ok', '🎉 Regulamento Padrão Ativado! A OrBrick-IA foi treinada com 4 diretrizes oficiais da sua instituição.');
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao ativar regulamento padrão.');
    } finally {
      setSeedingKnowledge(false);
    }
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showBanner('err', 'Informe o título e o conteúdo da norma/diretriz.');
      return;
    }
    try {
      await crmApi.createAiKnowledge({
        title: newTitle.trim(),
        category: newCategory,
        content: newContent.trim(),
        keywords: newKeywords.trim() || undefined,
        is_active: true,
      });
      showBanner('ok', `Diretriz "${newTitle.trim()}" cadastrada com sucesso na base RAG.`);
      setNewTitle('');
      setNewContent('');
      setNewKeywords('');
      setShowAddDoc(false);
      await loadKnowledge();
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao salvar diretriz na base RAG.');
    }
  };

  const handleDeleteKnowledge = async (id: string, title: string) => {
    if (!confirm(`Deseja remover a diretriz "${title}" da base RAG da IA?`)) return;
    try {
      await crmApi.deleteAiKnowledge(id);
      showBanner('ok', `Diretriz "${title}" removida.`);
      await loadKnowledge();
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao excluir diretriz.');
    }
  };

  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 6000);
  };

  const loadAll = useCallback(async (riskFilter?: string) => {
    setLoading(true);
    try {
      const [insData, profData, campData] = await Promise.all([
        crmApi.getCbmInsights(),
        crmApi.getCbmChurnRisk(riskFilter || undefined),
        crmApi.getCbmCampaigns(),
      ]);
      setInsights(insData);
      setProfiles(profData || []);
      setCampaigns(campData || []);
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao carregar matriz comportamental CBM.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll(selectedRisk);
  }, [loadAll, selectedRisk]);

  const handleToggleChannel = (ch: string) => {
    setCampChannels((prev) =>
      prev.includes(ch) ? prev.filter((item) => item !== ch) : [...prev, ch]
    );
  };

  const handleCreateCampaign = async (autoDispatch: boolean) => {
    if (!campName.trim()) {
      showBanner('err', 'Informe o nome da campanha CBM.');
      return;
    }
    setCreatingCamp(true);
    try {
      const res = await crmApi.createCbmCampaign({
        name: campName.trim(),
        trigger_type: campTrigger,
        channels: campChannels.length > 0 ? campChannels : ['WHATSAPP'],
        ai_prompt_template: campPrompt,
        is_active: true,
        auto_dispatch: autoDispatch,
      });
      if (autoDispatch && res?.dispatch_summary) {
        showBanner(
          'ok',
          `Campanha "${res.name}" criada e disparada! (${res.dispatch_summary.dispatched_messages} envios multicanal)`
        );
      } else {
        showBanner('ok', `Campanha "${res.name}" salva com sucesso.`);
      }
      await loadAll(selectedRisk);
    } catch (err: any) {
      showBanner('err', err?.message || 'Erro ao criar campanha CBM.');
    } finally {
      setCreatingCamp(false);
    }
  };

  const handleDispatchCampaign = async (campaignId: string) => {
    setDispatchingId(campaignId);
    try {
      const res = await crmApi.dispatchCbmCampaign(campaignId);
      showBanner(
        'ok',
        `Disparo multicanal concluído: ${res.dispatched_messages} mensagens enviadas para ${res.eligible_contacts} contatos elegíveis.`
      );
      await loadAll(selectedRisk);
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha no disparo da campanha.');
    } finally {
      setDispatchingId(null);
    }
  };

  const handleOneClickRetention = async (profile: any) => {
    if (!profile?.contact_phone) {
      showBanner('err', 'Este contato não possui telefone WhatsApp cadastrado para retenção imediata.');
      return;
    }
    try {
      const res = await crmApi.triggerWhatsappAiReply({
        phone: profile.contact_phone,
        contact_id: profile.contact_id,
        incoming_message: 'Solicitação de diagnóstico e segunda via PIX de retenção preventiva',
      });
      if (res.ai_responded) {
        showBanner('ok', `Abordagem preventiva OrBrick-IA enviada para ${profile.contact_name}!`);
      } else {
        showBanner('err', res.reason || 'A IA está pausada para este contato.');
      }
      await loadAll(selectedRisk);
    } catch (err: any) {
      showBanner('err', err?.message || 'Erro ao acionar retenção 1-clique.');
    }
  };

  const handleLgpdForget = async (profile: any) => {
    try {
      const res = await crmApi.lgpdForgetContact(profile.contact_id);
      showBanner(
        'ok',
        `Direito ao Esquecimento LGPD (Art. 18) aplicado para ${profile.contact_name}: ${res.purged_cbm_profiles} perfil expurgado e ${res.anonymized_omnichannel_logs} logs anonimizados.`
      );
      await loadAll(selectedRisk);
    } catch (err: any) {
      showBanner('err', err?.message || 'Erro ao executar expurgo LGPD.');
    }
  };

  const handleToggleKillSwitch = async () => {
    const currentlyActive = Boolean(insights?.ai_orbrick_status?.kill_switch_active);
    try {
      await crmApi.toggleWhatsappKillSwitch(
        !currentlyActive,
        !currentlyActive
          ? 'Kill-Switch acionado no Painel CBM pelo gestor'
          : 'IA OrBrick reativada no Painel CBM'
      );
      showBanner(
        'ok',
        !currentlyActive
          ? 'Kill-Switch Acionado: IA OrBrick pausada em toda a instituição.'
          : 'IA OrBrick Reativada com sucesso!'
      );
      await loadAll(selectedRisk);
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao alternar Kill-Switch.');
    }
  };

  const riskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const killSwitchActive = Boolean(insights?.ai_orbrick_status?.kill_switch_active);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#B8860B]">
            <Crown size={14} /> Inteligência Comportamental & Cyber Safety
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] mt-1">
            Módulo CBM — Consumer Behavior Management & OrBrick-IA
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Análise RFM automatizada, predição de risco de churn (evasão), sazonalidade de cooperados e campanhas multicanal blindadas pela LGPD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleKillSwitch}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider border transition-all shadow-sm ${
              killSwitchActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-300'
            }`}
          >
            <ShieldAlert size={15} />
            {killSwitchActive ? 'Reativar IA OrBrick' : 'Kill-Switch IA (Pânico)'}
          </button>

          <button
            onClick={() => loadAll(selectedRisk)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-bold transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#B8860B]' : 'text-[#B8860B]'} />
            Recalcular RFM
          </button>
        </div>
      </div>

      {/* Feedback Toast Executivo */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold shadow-sm ${
            actionFeedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <span className="flex items-center gap-2">
            {actionFeedback.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {actionFeedback.text}
          </span>
          <button onClick={() => setActionFeedback(null)} className="underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* KPIs Executivos CBM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] uppercase">
            <span>Contatos Monitorados</span>
            <Users size={16} className="text-[#B8860B]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0F172A] mt-2">
            {insights?.total_monitored_contacts ?? 0}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Score Médio de Risco:{' '}
            <strong className="text-[#0F172A]">{insights?.avg_churn_risk_score ?? 0}%</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] uppercase">
            <span>Receita em Zona de Risco</span>
            <Flame size={16} className="text-red-600" />
          </div>
          <p className="text-2xl font-extrabold text-red-700 mt-2">
            R${' '}
            {Number(insights?.revenue_at_risk ?? 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Crítico: <strong>{insights?.risk_distribution?.CRITICAL ?? 0}</strong> · Alto:{' '}
            <strong>{insights?.risk_distribution?.HIGH ?? 0}</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] uppercase">
            <span>LTV Monetário (RFM)</span>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 mt-2">
            R${' '}
            {Number(insights?.total_ltv_monetary ?? 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Campanhas Ativas: <strong>{insights?.active_campaigns_count ?? 0}</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B] uppercase">
            <span>Governança IA & LGPD</span>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase border ${
                killSwitchActive
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {killSwitchActive ? 'KILL-SWITCH ATIVO' : 'ORBRICK-IA ATIVA'}
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-2">
            Opt-In LGPD: <strong>{insights?.lgpd_opt_in_rate_pct ?? 100}%</strong> · AES-256 Ativo
          </p>
        </div>
      </div>

      {/* Matriz de Risco de Churn & Hábitos RFM */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2 uppercase tracking-wide">
              <Activity size={17} className="text-[#B8860B]" /> Matriz Preditiva RFM & Risco de Evasão (Churn)
            </h2>
            <p className="text-xs text-[#64748B]">
              Isolamento Multi-Tenant ativo ({insights?.business_name || 'Instituição'}). Filtre por criticidade e acione retenção em 1 clique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'Todos', val: '' },
              { label: 'Crítico', val: 'CRITICAL' },
              { label: 'Alto', val: 'HIGH' },
              { label: 'Médio', val: 'MEDIUM' },
              { label: 'Baixo', val: 'LOW' },
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => setSelectedRisk(f.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${
                  selectedRisk === f.val
                    ? 'bg-[#B8860B] text-white border-[#B8860B]'
                    : 'bg-white text-[#475569] border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#475569] uppercase tracking-wider font-extrabold border-b border-[#E2E8F0]">
                <th className="py-3 px-4">Cliente / Cooperado</th>
                <th className="py-3 px-4">Cluster Sazonal</th>
                <th className="py-3 px-4">RFM (Recência / Freq / Valor)</th>
                <th className="py-3 px-4">Risco de Churn</th>
                <th className="py-3 px-4">Próx. Compra Prevista</th>
                <th className="py-3 px-4">Recomendação IA Orbe</th>
                <th className="py-3 px-4 text-right">Ações Executivas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#64748B]">
                    Nenhum perfil comportamental encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#0F172A]">{p.contact_name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {p.contact_phone || 'Sem WhatsApp'} · {p.contact_category}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-slate-200 font-bold text-[#0F172A] text-[11px]">
                        {p.seasonality_cluster}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#0F172A]">
                        {p.rfm_recency_days}d sem compra · Freq: {p.rfm_frequency_score}%
                      </div>
                      <div className="text-[11px] text-emerald-800 font-bold">
                        LTV: R${' '}
                        {Number(p.rfm_monetary_total || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${riskBadge(
                          p.churn_risk_level
                        )}`}
                      >
                        {p.churn_risk_level} ({p.churn_risk_score}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#475569] font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="text-[#B8860B]" />
                        {p.predicted_next_purchase_date
                          ? new Date(p.predicted_next_purchase_date).toLocaleDateString('pt-BR')
                          : '---'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-[11px] text-[#475569] line-clamp-2">{p.ai_recommended_offer}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOneClickRetention(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#B8860B] hover:bg-[#9A6F0B] text-white font-bold text-[11px] shadow-sm transition-colors"
                        title="Disparar abordagem preventiva via OrBrick-IA"
                      >
                        <Zap size={12} /> Retenção 1-Clique
                      </button>
                      <button
                        onClick={() => handleLgpdForget(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 font-bold text-[11px] transition-colors"
                        title="Direito ao Esquecimento e Opt-Out (Art. 18 LGPD)"
                      >
                        LGPD Opt-Out
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orquestrador de Campanhas Multicanal (WhatsApp, E-mail, SMS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Criador de Campanha */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#B8860B]" />
            <h3 className="text-base font-extrabold text-[#0F172A] uppercase tracking-wide">
              Nova Campanha Automatizada Multicanal
            </h3>
          </div>
          <p className="text-xs text-[#64748B]">
            Configure gatilhos comportamentais para disparo coordenado via OrBrick WhatsApp, E-mail (Resend) e SMS respeitando o consentimento LGPD.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                Nome da Campanha
              </label>
              <input
                type="text"
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] font-semibold outline-none focus:border-[#B8860B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                  Gatilho Comportamental
                </label>
                <select
                  value={campTrigger}
                  onChange={(e) => setCampTrigger(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] font-semibold outline-none focus:border-[#B8860B]"
                >
                  <option value="CHURN_ALERT">Alerta de Risco de Churn (Alto/Crítico)</option>
                  <option value="INACTIVITY_30D">Inatividade &gt; 30 Dias (Sentimos sua falta)</option>
                  <option value="SEASONAL">Ciclo Sazonal / Safra / Renovação</option>
                  <option value="BILLING_D3">Preventivo Régua Financeira (D-3)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                  Canais Ativos
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {['WHATSAPP', 'EMAIL', 'SMS'].map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleToggleChannel(ch)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold border transition-colors ${
                        campChannels.includes(ch)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-[#F8FAFC] text-slate-500 border-slate-200'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                Template Assistido por IA (Placeholders: {'{nome}'}, {'{empresa}'})
              </label>
              <textarea
                rows={3}
                value={campPrompt}
                onChange={(e) => setCampPrompt(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={creatingCamp}
                onClick={() => handleCreateCampaign(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B8860B] hover:bg-[#9A6F0B] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50"
              >
                <Send size={14} /> Criar & Disparar Agora
              </button>
              <button
                type="button"
                disabled={creatingCamp}
                onClick={() => handleCreateCampaign(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Salvar Regra
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Campanhas Criadas */}
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#0F172A] uppercase tracking-wide flex items-center gap-2">
                <Bot size={18} className="text-emerald-600" /> Campanhas CBM Configuradas
              </h3>
              <span className="text-xs font-bold text-[#64748B]">{campaigns.length} campanha(s)</span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {campaigns.length === 0 ? (
                <div className="p-6 text-center bg-[#F8FAFC] rounded-xl border border-dashed border-slate-300 text-xs text-[#64748B]">
                  Nenhuma campanha multicanal cadastrada ainda. Crie uma ao lado para automatizar a retenção.
                </div>
              ) : (
                campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-[#0F172A]">{c.name}</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Gatilho: <strong>{c.trigger_type}</strong> · Canais:{' '}
                        <strong>{(c.channels || []).join(', ')}</strong> · Envios:{' '}
                        <strong>{c.dispatched_count || 0}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDispatchCampaign(c.id)}
                      disabled={dispatchingId === c.id}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
                    >
                      <Send size={12} />
                      {dispatchingId === c.id ? 'Enviando...' : 'Disparar 1-Clique'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <UserCheck size={13} className="text-emerald-600" />
              Origem rastreável: <code>*Cooperativa&gt;OrBrick-IA&gt;*</code>
            </span>
            <span>Zero-Trust Financeiro Ativo</span>
          </div>
        </div>
      </div>

      {/* BLOCO: BASE DE CONHECIMENTO RAG DA ORBRICK-IA (ISOLAMENTO MULTI-TENANT) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-50 to-emerald-50 text-[#8B6508] border border-amber-200">
              <Sparkles size={13} className="text-[#B8860B]" /> Base RAG Preditiva Exclusiva do Contratante
            </div>
            <h2 className="text-xl font-extrabold text-[#0F172A] mt-2 flex items-center gap-2">
              <BookOpen size={20} className="text-[#B8860B]" /> Treinamento & Regulamento da OrBrick-IA
            </h2>
            <p className="text-xs text-[#64748B] mt-1 max-w-3xl">
              Cada instituição contratante possui um cofre RAG estritamente isolado por RLS. Adicione estatutos, 
              regras de cota-parte, políticas de cobrança e horários para que a IA responda exatamente segundo o regulamento do seu negócio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSeedDefaults}
              disabled={seedingKnowledge}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#9A6F0B] hover:opacity-95 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles size={14} className={seedingKnowledge ? "animate-spin" : ""} />
              {seedingKnowledge ? 'Ativando...' : 'Ativar Regulamento Padrão (1-Clique)'}
            </button>

            <button
              onClick={() => setShowAddDoc(!showAddDoc)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Plus size={14} /> {showAddDoc ? 'Fechar Formulário' : '+ Nova Diretriz'}
            </button>
          </div>
        </div>

        {/* Formulário de Nova Diretriz RAG */}
        {showAddDoc && (
          <form onSubmit={handleCreateKnowledge} className="mt-5 p-5 bg-[#F8FAFC] rounded-2xl border border-amber-200/80 space-y-4">
            <div className="font-extrabold text-sm text-[#0F172A] flex items-center gap-2">
              <Plus size={16} className="text-[#B8860B]" /> Cadastrar Nova Diretriz / Norma no RAG da Instituição
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                  Título da Norma / Diretriz *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Estatuto Social - Admissão e Cota-Parte"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                  Categoria
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
                >
                  <option value="REGULAMENTO_ESTATUTO">Estatuto & Regras Sociais</option>
                  <option value="POLITICA_FINANCEIRA">Política de Cobrança & PIX</option>
                  <option value="POLITICA_NEGOCIACAO">Acordos & Renegociação</option>
                  <option value="ATENDIMENTO_FAQ">Atendimento & FAQ Geral</option>
                  <option value="REGULAMENTO_INTERNO">Outros Regulamentos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                Conteúdo Oficial da Diretriz (Texto que a IA usará como verdade oficial) *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Insira as regras detalhadas, prazos, condições, documentos exigidos ou orientações específicas..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                Palavras-chave (Separadas por vírgula para agilizar a busca RAG)
              </label>
              <input
                type="text"
                placeholder="Ex: estatuto, cota, integralizacao, sobras, taxa, prazo"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDoc(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#B8860B] hover:bg-[#9A6F0B] text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-colors"
              >
                Salvar Diretriz RAG
              </button>
            </div>
          </form>
        )}

        {/* Lista de Diretrizes Ativas no RAG */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-[#64748B]">
            <span>Diretrizes e Regulamentos em Memória ({knowledgeChunks.length})</span>
            {loadingKnowledge && <span className="text-[#B8860B] animate-pulse">Atualizando...</span>}
          </div>

          {knowledgeChunks.length === 0 ? (
            <div className="p-8 text-center bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-300">
              <BookOpen size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-[#0F172A]">Nenhum regulamento cadastrado para esta instituição</p>
              <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
                Clique no botão <strong>"Ativar Regulamento Padrão (1-Clique)"</strong> acima para carregar o modelo oficial de Estatuto, Regras PIX e Atendimento da Orbe Systems adaptado para o seu negócio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-[#8B6508] border border-amber-200">
                        {chunk.category || 'REGULAMENTO'}
                      </span>
                      <button
                        onClick={() => handleDeleteKnowledge(chunk.id, chunk.title)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remover diretriz"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h4 className="font-extrabold text-sm text-[#0F172A] mt-2">
                      {chunk.title}
                    </h4>

                    <p className="text-xs text-[#475569] mt-1.5 line-clamp-3 leading-relaxed">
                      {chunk.content}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-mono truncate max-w-[200px]">
                      {chunk.keywords ? `Tags: ${chunk.keywords}` : 'Isolado por RLS'}
                    </span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Ativo no RAG
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
