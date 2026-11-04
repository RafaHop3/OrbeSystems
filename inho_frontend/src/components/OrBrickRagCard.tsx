'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileText,
  ShieldCheck,
  Upload,
  FileUp,
  FileSpreadsheet,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { crmApi } from '@/lib/api';

interface KnowledgeChunk {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

interface OrBrickRagCardProps {
  className?: string;
  onUpdate?: () => void;
}

export default function OrBrickRagCard({ className = '', onUpdate }: OrBrickRagCardProps) {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // New guideline manual form state
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('REGULAMENTO_INTERNO');
  const [newContent, setNewContent] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [savingDoc, setSavingDoc] = useState(false);

  // Document upload state (.pdf, .docx, .txt)
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('REGULAMENTO_ESTATUTO');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 7000);
  };

  const loadKnowledge = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmApi.listAiKnowledge();
      setChunks(data || []);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.warn('Falha ao listar diretrizes RAG:', err);
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const data = await crmApi.seedDefaultAiKnowledge();
      setChunks(data || []);
      showBanner(
        'ok',
        '🎉 Regulamento Padrão Ativado! A OrBrick-IA foi treinada com 4 diretrizes oficiais (Estatuto, Prazos, Produtos e Atendimento).'
      );
      if (onUpdate) onUpdate();
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao ativar regulamento padrão.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      showBanner('err', 'Informe o título e o conteúdo da norma/diretriz.');
      return;
    }
    setSavingDoc(true);
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
      setShowForm(false);
      await loadKnowledge();
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao salvar diretriz na base RAG.');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteGuideline = async (id: string, title: string) => {
    if (!confirm(`Deseja remover a diretriz "${title}" da base RAG da IA?`)) return;
    try {
      await crmApi.deleteAiKnowledge(id);
      showBanner('ok', `Diretriz "${title}" removida.`);
      await loadKnowledge();
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao excluir diretriz.');
    }
  };

  // Upload handler for document parsing & auto-chunking
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
        showBanner('err', 'Formato não suportado. Por favor anexe um arquivo .pdf, .docx ou .txt.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showBanner('err', 'O arquivo excede o tamanho limite de 15MB.');
        return;
      }
      setSelectedFile(file);
      setUploadSummary(null);
    }
  };

  const handleUploadStatute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showBanner('err', 'Selecione um arquivo .pdf, .docx ou .txt para ingestão.');
      return;
    }
    setUploadingDoc(true);
    setUploadSummary(null);
    try {
      const res = await crmApi.uploadAiKnowledgeDoc(selectedFile, uploadCategory, replaceExisting);
      setUploadSummary(res);
      showBanner(
        'ok',
        `🎉 Documento "${selectedFile.name}" particionado com sucesso! ${res.chunks_created} artigos/chunks foram indexados no RAG do seu negócio.`
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadKnowledge();
    } catch (err: any) {
      showBanner('err', err?.message || 'Falha ao processar e particionar o estatuto.');
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className={`bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm ${className}`}>
      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'ok' ? (
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline ml-2 opacity-80 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Topo do Bloco RAG */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-50 to-emerald-50 text-[#8B6508] border border-amber-200">
            <Sparkles size={13} className="text-[#B8860B]" /> Base RAG Preditiva Exclusiva do Contratante (J1.2 · J2.1)
          </div>
          <h2 className="text-xl font-extrabold text-[#0F172A] mt-2 flex items-center gap-2">
            <BookOpen size={20} className="text-[#B8860B]" /> Treinamento & Regulamento da OrBrick-IA (Base RAG Multi-Tenant)
          </h2>
          <p className="text-xs text-[#64748B] mt-1 max-w-3xl">
            Cada instituição contratante possui um cofre RAG estritamente isolado por PostgreSQL RLS. Anexe estatutos integrais
            em <strong>.PDF, .DOCX ou .TXT</strong> para extração e quebra automática de artigos, ou adicione diretrizes individuais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadKnowledge}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Recarregar tópicos RAG"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Botão de Anexo de Estatuto (.pdf, .docx, .txt) */}
          <button
            onClick={() => {
              setShowUpload(!showUpload);
              if (showForm) setShowForm(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all"
            title="Anexar arquivo de estatuto para decomposição automática de artigos"
          >
            <Upload size={14} /> {showUpload ? 'Fechar Anexo' : 'Anexar Estatuto (.PDF/.DOCX)'}
          </button>

          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] to-[#9A6F0B] hover:opacity-95 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
            title="Carrega 4 tópicos padrão essenciais em 1 clique"
          >
            <Sparkles size={14} className={seeding ? 'animate-spin' : ''} />
            {seeding ? 'Ativando...' : 'Ativar Regulamento Padrão (1-Clique)'}
          </button>

          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showUpload) setShowUpload(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] border border-slate-300 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={14} /> {showForm ? 'Fechar Formulário' : '+ Novo Tópico de Regulamento'}
          </button>
        </div>
      </div>

      {/* Painel de Upload de Arquivo do Estatuto Completo (RAG Chunker Automático) */}
      {showUpload && (
        <form onSubmit={handleUploadStatute} className="mt-5 p-5 bg-[#F0FDF4] rounded-2xl border border-emerald-300 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
              <FileUp size={18} className="text-emerald-700" />
              Ingestão e Particionamento Semântico de Estatutos (.PDF, .DOCX, .TXT)
            </div>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-emerald-800 max-w-3xl leading-relaxed">
            Faça upload do estatuto social completo, regimento interno ou manual de normas da sua instituição.
            O motor RAG extrairá o texto e quebrará <strong>automaticamente cada artigo, capítulo e cláusula</strong> em chunks semânticos
            isolados por RLS na tabela <code>inho.ai_knowledge_chunks</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-extrabold uppercase text-emerald-900 mb-1">
                Arquivo do Documento * (.pdf, .docx, .txt até 15MB)
              </label>
              <div className="flex items-center gap-3 p-3 bg-white border border-emerald-200 rounded-xl">
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
              </div>
              {selectedFile && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-emerald-900">
                  <FileSpreadsheet size={13} className="text-emerald-700" />
                  <span>{selectedFile.name}</span>
                  <span className="text-slate-500 font-sans">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-emerald-900 mb-1">
                Classificação da Base
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-xs text-[#0F172A] outline-none focus:border-emerald-600"
              >
                <option value="REGULAMENTO_ESTATUTO">Estatuto Social (Artigos & Governança)</option>
                <option value="REGULAMENTO_INTERNO">Regulamento Interno & Procedimentos</option>
                <option value="POLITICA_FINANCEIRA">Políticas de Cobrança, Prazos & PIX</option>
                <option value="PRODUTOS_E_SERVICOS">Catálogo Geral de Produtos & Insumos</option>
                <option value="ATENDIMENTO_FAQ">Horários & Manual de Atendimento</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-200">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-emerald-950 font-semibold">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span>Substituir estatuto anterior desta mesma categoria no tenant</span>
            </label>

            <button
              type="submit"
              disabled={uploadingDoc || !selectedFile}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
            >
              <Upload size={14} className={uploadingDoc ? 'animate-spin' : ''} />
              {uploadingDoc ? 'Extraindo Artigos e Indexando...' : 'Processar Estatuto & Quebrar Artigos em Chunks'}
            </button>
          </div>

          {/* Resumo do Processamento do Documento */}
          {uploadSummary && (
            <div className="p-4 bg-white rounded-xl border border-emerald-300 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Estatuto Ingerido com Sucesso ({uploadSummary.filename})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  {uploadSummary.chunks_created} Chunks Gerados
                </span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Total de caracteres extraídos: <strong>{uploadSummary.total_characters_extracted?.toLocaleString('pt-BR')}</strong>.
                Todos os artigos foram particionados com títulos, categoria <code>{uploadSummary.category}</code> e palavras-chave semânticas.
              </p>
              {Array.isArray(uploadSummary.chunks) && uploadSummary.chunks.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {uploadSummary.chunks.slice(0, 8).map((c: any, i: number) => (
                    <div key={c.id || i} className="flex items-center justify-between text-[11px] text-slate-700">
                      <span className="font-bold truncate max-w-sm flex items-center gap-1">
                        <ArrowRight size={10} className="text-emerald-600 shrink-0" /> {c.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {c.keywords ? `Tags: ${c.keywords.slice(0, 30)}...` : 'Indexado'}
                      </span>
                    </div>
                  ))}
                  {uploadSummary.chunks.length > 8 && (
                    <div className="text-[10px] text-slate-500 italic text-center pt-1">
                      + {uploadSummary.chunks.length - 8} artigos adicionais indexados na base abaixo.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {/* Formulário de Nova Diretriz RAG Manual */}
      {showForm && (
        <form onSubmit={handleCreateGuideline} className="mt-5 p-5 bg-[#F8FAFC] rounded-2xl border border-amber-200/80 space-y-4">
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
                placeholder="Ex: Desconto Especial Adubo Biológico 2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                Categoria da Diretriz
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
              >
                <option value="REGULAMENTO_INTERNO">Regulamento Interno</option>
                <option value="POLITICA_FINANCEIRA">Políticas & Prazos</option>
                <option value="PRODUTOS_E_SERVICOS">Produtos & Preços</option>
                <option value="ATENDIMENTO_HUMANO">Horários & Atendimento</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
              Texto Completo da Norma / Estatuto / Política de Atendimento *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Cole aqui o artigo do estatuto, tabela de descontos, condições de entrega ou regra de escalação..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-extrabold uppercase text-[#475569] mb-1">
                Palavras-chave de Indexação Semântica (separadas por vírgula)
              </label>
              <input
                type="text"
                placeholder="Ex: desconto, adubo, entrega, cooperado, frete"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#0F172A] outline-none focus:border-[#B8860B]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-1/3 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingDoc}
                className="w-2/3 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wide transition-colors disabled:opacity-50"
              >
                {savingDoc ? 'Salvando...' : 'Salvar na Base da IA'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Diretrizes Ativas no RAG */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#475569] flex items-center gap-1.5">
            <FileText size={14} className="text-[#8B6508]" /> Diretrizes RAG Ativas no Tenant ({chunks.length})
          </span>
          <span className="text-[11px] text-[#64748B] flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" /> Isolamento Multi-Tenant por RLS Ativo
          </span>
        </div>

        {chunks.length === 0 ? (
          <div className="p-8 text-center bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-300">
            <BookOpen size={32} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-bold text-[#0F172A]">Nenhum regulamento cadastrado para esta instituição</p>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              Clique em <strong>"Anexar Estatuto (.PDF/.DOCX)"</strong> acima para importar o estatuto social da empresa ou em <strong>"Ativar Regulamento Padrão (1-Clique)"</strong> para carregar o modelo oficial da Orbe Systems.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chunks.map((chunk) => (
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
                      onClick={() => handleDeleteGuideline(chunk.id, chunk.title)}
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
  );
}
