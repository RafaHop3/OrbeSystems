'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Users, ShieldAlert, Award, Smile, ArrowRight, MessageSquare, Send, CheckCircle
} from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PcoDashboardPage() {
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [responsesCount, setResponsesCount] = useState(124);
  const [npsScore, setNpsScore] = useState(72);

  // Survey responses state
  const [answers, setAnswers] = useState({
    lideranca: 4,
    comunicacao: 3,
    ambiente: 5,
    motivacao: 4,
    feedback: ''
  });

  // Mock indicators data
  const [indicatorsData, setIndicatorsData] = useState([
    { name: 'Liderança', score: 82 },
    { name: 'Comunicação', score: 68 },
    { name: 'Ambiente', score: 90 },
    { name: 'Motivação', score: 78 },
    { name: 'Benefícios', score: 70 },
  ]);

  // Mock trend data
  const trendData = [
    { name: 'Jan', nps: 65 },
    { name: 'Fev', nps: 68 },
    { name: 'Mar', nps: 70 },
    { name: 'Abr', nps: 69 },
    { name: 'Mai', nps: 71 },
    { name: 'Jun', nps: 72 },
  ];

  const handleAnswerChange = (field: string, val: number | string) => {
    setAnswers(prev => ({ ...prev, [field]: val }));
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSurveySubmitted(true);
    setTimeout(() => {
      // Simulate real-time data update
      setResponsesCount(prev => prev + 1);

      // Calculate new NPS based on answers
      const newScore = Math.round((answers.lideranca + answers.comunicacao + answers.ambiente + answers.motivacao) * 5);
      setNpsScore(prev => Math.round((prev * 124 + newScore) / 125));

      // Update indicators
      setIndicatorsData(prev => prev.map(item => {
        if (item.name === 'Liderança') return { ...item, score: Math.min(100, Math.round((item.score * 124 + answers.lideranca * 20) / 125)) };
        if (item.name === 'Comunicação') return { ...item, score: Math.min(100, Math.round((item.score * 124 + answers.comunicacao * 20) / 125)) };
        if (item.name === 'Ambiente') return { ...item, score: Math.min(100, Math.round((item.score * 124 + answers.ambiente * 20) / 125)) };
        if (item.name === 'Motivação') return { ...item, score: Math.min(100, Math.round((item.score * 124 + answers.motivacao * 20) / 125)) };
        return item;
      }));

      setShowSurveyModal(false);
      setSurveySubmitted(false);
      // Reset form
      setAnswers({ lideranca: 4, comunicacao: 3, ambiente: 5, motivacao: 4, feedback: '' });
      alert('Pesquisa enviada com sucesso! Obrigado por colaborar.');
    }, 1500);
  };

  return (
    <div className="p-8 min-h-screen bg-inho-black text-inho-text">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">

        {/* Header Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-inho-muted hover:text-inho-text transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-inho-muted">INHO</span>
            <span className="text-inho-muted">/</span>
            <span className="text-purple-700 font-bold uppercase tracking-wider">Gestão Organizacional (PCO)</span>
          </div>
        </div>

        {/* Welcome and Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Pesquisa de <span className="text-shimmer">Clima</span></h1>
            <p className="text-inho-muted text-sm mt-1">Análise de sentimentos, NPS interno e engajamento dos colaboradores.</p>
          </div>
          <button
            onClick={() => setShowSurveyModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-inho-text px-5 py-3 rounded-xl font-bold font-mono text-xs hover:-translate-y-0.5 transition-all shadow-lg shadow-purple-500/20 border border-purple-400/20"
          >
            <MessageSquare size={14} />
            Responder Pesquisa Ativa
          </button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* NPS Score Card */}
          <div className="glassmorphism rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/40 hover:shadow-inho-card transition-all">
            <div>
              <p className="text-inho-muted text-xs font-mono font-bold uppercase tracking-wider">NPS do Clima</p>
              <p className="text-3xl font-black font-mono text-purple-700 mt-2 flex items-baseline gap-1">
                +{npsScore}
                <span className="text-xs text-inho-muted font-normal font-sans">/ 100</span>
              </p>
            </div>
            <p className="text-[10px] text-inho-muted font-mono mt-4">Classificação: Excelente</p>
          </div>

          {/* Participation Card */}
          <div className="glassmorphism rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/40 hover:shadow-inho-card transition-all">
            <div>
              <p className="text-inho-muted text-xs font-mono font-bold uppercase tracking-wider">Taxa de Adesão</p>
              <p className="text-3xl font-black font-mono text-purple-700 mt-2">87.5%</p>
            </div>
            <p className="text-[10px] text-inho-muted font-mono mt-4">Meta interna: 80%</p>
          </div>

          {/* Responses Count Card */}
          <div className="glassmorphism rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/40 hover:shadow-inho-card transition-all">
            <div>
              <p className="text-inho-muted text-xs font-mono font-bold uppercase tracking-wider">Total de Respostas</p>
              <p className="text-3xl font-black font-mono text-purple-700 mt-2 flex items-center gap-2">
                <Users size={24} />
                {responsesCount}
              </p>
            </div>
            <p className="text-[10px] text-inho-muted font-mono mt-4">Acumulado do ciclo atual</p>
          </div>

          {/* Retention Risk Card */}
          <div className="glassmorphism rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between hover:border-purple-500/40 hover:shadow-inho-card transition-all">
            <div>
              <p className="text-inho-muted text-xs font-mono font-bold uppercase tracking-wider">Turnover Risk</p>
              <p className="text-3xl font-black font-mono text-inho-green mt-2 flex items-center gap-2">
                <ShieldAlert size={24} className="text-inho-green" />
                Baixo
              </p>
            </div>
            <p className="text-[10px] text-inho-muted font-mono mt-4">Calculado via desengajamento</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NPS Indicators Bar */}
          <div className="glassmorphism rounded-2xl p-6 border border-inho-border">
            <h3 className="text-sm font-mono font-bold text-inho-text uppercase tracking-wider mb-4">NPS Consolidado por Pilar</h3>
            <div className="h-[260px] w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={indicatorsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid #1e2d40' }} />
                  <Bar dataKey="score" name="Pontuação" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Climate Trend Area */}
          <div className="glassmorphism rounded-2xl p-6 border border-inho-border">
            <h3 className="text-sm font-mono font-bold text-inho-text uppercase tracking-wider mb-4">Evolução Histórica do Clima (NPS)</h3>
            <div className="h-[260px] w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorNps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} domain={[50, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid #1e2d40' }} />
                  <Area type="monotone" dataKey="nps" name="NPS Clima" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorNps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Survey list */}
        <div className="glassmorphism rounded-2xl p-6 border border-inho-border">
          <h3 className="text-sm font-mono font-bold text-inho-text uppercase tracking-wider mb-4">Ciclos de Pesquisas de Clima</h3>
          <div className="space-y-3">
            {[
              { id: '1', title: 'Pesquisa de Clima Q2 2026', desc: 'Avaliação trimestral de comunicação e liderança', status: 'ACTIVE', responses: `${responsesCount} respondidas` },
              { id: '2', title: 'NPS Semanal de Operação', desc: 'Acompanhamento rápido de estresse e bem-estar', status: 'ACTIVE', responses: '89 respondidas' },
              { id: '3', title: 'Avaliação de Benefícios & Ergonomia', desc: 'Ciclo anual para melhorias no plano de saúde e infraestrutura', status: 'DRAFT', responses: 'Rascunho' },
            ].map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-inho-dark/50 border border-inho-border/30 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h4 className="text-sm font-bold text-inho-text">{item.title}</h4>
                    {item.status === 'ACTIVE' ? (
                      <span className="text-[9px] bg-purple-500/10 text-purple-700 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold">Ativa</span>
                    ) : (
                      <span className="text-[9px] bg-inho-dark text-inho-muted border border-inho-border px-2 py-0.5 rounded-full font-mono uppercase font-bold text-xs">Rascunho</span>
                    )}
                  </div>
                  <p className="text-xs text-inho-muted">{item.desc}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <span className="text-xs font-mono text-inho-muted">{item.responses}</span>
                  {item.status === 'ACTIVE' && (
                    <button
                      onClick={() => setShowSurveyModal(true)}
                      className="flex items-center gap-1 text-purple-700 hover:text-purple-300 font-mono text-xs font-bold transition-colors hover:underline"
                    >
                      Responder <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Survey Modal */}
        {showSurveyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white backdrop-blur-sm" onClick={() => setShowSurveyModal(false)} />
            <div className="relative bg-inho-dark border border-inho-border w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-slide-up z-10 max-h-[90vh] overflow-y-auto">

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Smile className="text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-inho-text">Questionário de Clima</h3>
                  <p className="text-xs text-inho-muted font-mono">Pesquisa Anônima</p>
                </div>
              </div>

              <form onSubmit={handleSurveySubmit} className="space-y-5">
                {[
                  { key: 'lideranca', label: '1. Como você avalia o suporte e alinhamento de sua liderança direta?', low: 'Ruim', high: 'Excelente' },
                  { key: 'comunicacao', label: '2. A comunicação interna da empresa é clara e transparente?', low: 'Confusa', high: 'Clara' },
                  { key: 'ambiente', label: '3. O ambiente de trabalho físico ou virtual é propício à produtividade?', low: 'Ruim', high: 'Excelente' },
                  { key: 'motivacao', label: '4. Qual é o seu nível geral de motivação e satisfação no dia a dia?', low: 'Baixo', high: 'Alto' }
                ].map(q => (
                  <div key={q.key} className="space-y-2">
                    <label className="text-xs font-bold text-inho-text block">{q.label}</label>
                    <div className="flex items-center justify-between gap-2 bg-inho-black/40 border border-inho-border/30 p-2.5 rounded-xl">
                      <span className="text-[10px] text-inho-muted font-mono">{q.low}</span>
                      <div className="flex gap-2.5">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleAnswerChange(q.key, val)}
                            className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all border ${(answers as any)[q.key] === val
                                ? 'bg-purple-600 border-purple-400 text-inho-text scale-110'
                                : 'bg-inho-dark/80 border-inho-border text-inho-muted hover:border-purple-500/50 hover:text-purple-700'
                              }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-inho-muted font-mono">{q.high}</span>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-inho-text block">5. Algum feedback aberto ou sugestão de melhoria? (Opcional)</label>
                  <textarea
                    rows={3}
                    value={answers.feedback}
                    onChange={(e) => handleAnswerChange('feedback', e.target.value)}
                    placeholder="Seu texto aqui..."
                    className="w-full bg-inho-black/40 border border-inho-border/30 p-3 rounded-xl text-xs text-inho-text focus:border-purple-500 outline-none resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-inho-border flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSurveyModal(false)}
                    className="flex-1 bg-inho-dark hover:bg-inho-border text-inho-muted hover:text-inho-text py-3 rounded-xl font-bold font-mono text-xs transition-colors border border-inho-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={surveySubmitted}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-inho-text py-3 rounded-xl font-bold font-mono text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {surveySubmitted ? (
                      <div className="w-4 h-4 border-2 border-inho-text border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={12} />
                        Enviar Pesquisa
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
