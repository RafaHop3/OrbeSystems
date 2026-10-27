'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  Key,
  Building2,
  CreditCard,
  Shield,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Activity,
  RotateCw,
} from 'lucide-react';
import {
  businessesApi,
  settingsApi,
  ApiTokenItem,
  BankIntegrationItem,
  BusinessOut,
} from '@/lib/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'BANKS' | 'API' | 'TELEMETRY'>('COMPANY');
  const [loading, setLoading] = useState(true);

  // Company / Tenant
  const [business, setBusiness] = useState<BusinessOut | null>(null);

  // Bank Integrations
  const [banks, setBanks] = useState<BankIntegrationItem[]>([]);
  const [newBankName, setNewBankName] = useState('BANCO_INTER');
  const [newBankKey, setNewBankKey] = useState('');
  const [creatingBank, setCreatingBank] = useState(false);

  // API Tokens
  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [creatingToken, setCreatingToken] = useState(false);
  const [newlyCreatedPlainToken, setNewlyCreatedPlainToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // APM Telemetry & Secret Rotation
  const [telemetry, setTelemetry] = useState<any>(null);
  const [rotatingSecrets, setRotatingSecrets] = useState(false);
  const [rotationResult, setRotationResult] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [bizList, bankList, tokenList, apmData] = await Promise.all([
        businessesApi.list().catch(() => []),
        settingsApi.listBanks().catch(() => []),
        settingsApi.listTokens().catch(() => []),
        settingsApi.getTelemetry().catch(() => null),
      ]);
      if (Array.isArray(bizList) && bizList.length > 0) {
        setBusiness(bizList[0]);
      }
      setBanks(Array.isArray(bankList) ? bankList : []);
      setTokens(Array.isArray(tokenList) ? tokenList : []);
      setTelemetry(apmData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankKey.trim()) return;
    setCreatingBank(true);
    try {
      await settingsApi.createBank({
        bank_name: newBankName,
        api_key: newBankKey.trim(),
      });
      setNewBankKey('');
      await loadSettings();
    } catch (err: any) {
      alert(err?.message || 'Erro ao conectar integração bancária.');
    } finally {
      setCreatingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    try {
      await settingsApi.deleteBank(id);
      await loadSettings();
    } catch (err: any) {
      alert(err?.message || 'Erro ao remover integração bancária.');
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    setCreatingToken(true);
    try {
      const created = await settingsApi.createToken(newTokenName.trim());
      setNewTokenName('');
      if (created?.plain_token) {
        setNewlyCreatedPlainToken(created.plain_token);
      }
      await loadSettings();
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar chave de API.');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      await settingsApi.revokeToken(id);
      await loadSettings();
    } catch (err: any) {
      alert(err?.message || 'Erro ao revogar token.');
    }
  };

  const handleRotateSecrets = async () => {
    setRotatingSecrets(true);
    setRotationResult(null);
    try {
      const res = await settingsApi.rotateSecrets();
      setRotationResult(
        `Rotação MultiFernet concluída (${res.rotated_bank_integrations} integrações bancárias e ${res.rotated_totp_secrets} TOTP re-criptografados com bloqueio SELECT FOR UPDATE).`
      );
      await loadSettings();
    } catch (err: any) {
      alert(err?.message || 'Erro ao rotacionar chaves.');
    } finally {
      setRotatingSecrets(false);
    }
  };

  const copyPlainToken = () => {
    if (!newlyCreatedPlainToken) return;
    navigator.clipboard.writeText(newlyCreatedPlainToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="min-h-screen bg-inho-black p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-inho-border pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-inho-muted hover:text-[#0F172A] transition-colors bg-inho-dark p-2 rounded-xl"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                Configurações Globais & Governança Técnica
                <Settings size={22} className="text-[#64748B]" />
              </h1>
              <p className="text-xs text-inho-muted mt-1">
                Gerencie dados do Tenant, integrações bancárias (MultiFernet AES-256), Tokens SHA-256 e Telemetria APM.
              </p>
            </div>
          </div>
          <button
            onClick={loadSettings}
            className="bg-[#F1F5F9] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] p-2.5 rounded-xl transition-colors"
            title="Recarregar configurações"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-inho-teal' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Lateral Menu */}
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('COMPANY')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'COMPANY'
                  ? 'bg-inho-teal/10 text-inho-teal border border-inho-teal/30'
                  : 'text-inho-muted hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
            >
              <Building2 size={16} /> Dados da Empresa
            </button>
            <button
              onClick={() => setActiveTab('BANKS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'BANKS'
                  ? 'bg-inho-teal/10 text-inho-teal border border-inho-teal/30'
                  : 'text-inho-muted hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
            >
              <CreditCard size={16} /> Integrações Bancárias ({banks.length})
            </button>
            <button
              onClick={() => setActiveTab('API')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'API'
                  ? 'bg-inho-teal/10 text-inho-teal border border-inho-teal/30'
                  : 'text-inho-muted hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
            >
              <Key size={16} /> Chaves de API ({tokens.length})
            </button>
            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'TELEMETRY'
                  ? 'bg-inho-teal/10 text-inho-teal border border-inho-teal/30'
                  : 'text-inho-muted hover:bg-[#F1F5F9] hover:text-[#0F172A]'
              }`}
            >
              <Activity size={16} /> Telemetria APM & KMS
            </button>
          </div>

          {/* Content Area */}
          <div className="md:col-span-3">
            {activeTab === 'COMPANY' && (
              <div className="glassmorphism p-6 rounded-2xl border border-inho-border space-y-6 animate-fade-in">
                <h2 className="text-lg font-bold text-[#0F172A] border-b border-inho-border pb-3">
                  Perfil da Organização (Tenant Ativo)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono uppercase text-inho-muted block mb-1">
                      Razão Social / Nome da Organização
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={business?.name || 'Orbe Systems / Cooperativa INHO'}
                      className="w-full bg-inho-dark border border-inho-border rounded-lg p-2.5 text-sm text-[#0F172A] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase text-inho-muted block mb-1">CNPJ</label>
                    <input
                      type="text"
                      readOnly
                      value={business?.cnpj || 'Não informado'}
                      className="w-full bg-inho-dark border border-inho-border rounded-lg p-2.5 text-sm text-[#0F172A] font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase text-inho-muted block mb-1">
                      Categoria Operacional
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={business?.category || 'COOPERATIVA'}
                      className="w-full bg-inho-dark border border-inho-border rounded-lg p-2.5 text-sm text-inho-teal font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase text-inho-muted block mb-1">
                      Tenant ID (Isolamento Multi-Tenant)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={business?.id || 'Ativo'}
                      className="w-full bg-inho-dark border border-inho-border rounded-lg p-2.5 text-xs text-[#64748B] font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'BANKS' && (
              <div className="glassmorphism p-6 rounded-2xl border border-inho-border space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">Integrações Bancárias & Webhooks PIX/Boleto</h2>
                  <p className="text-xs text-inho-muted mt-0.5">
                    As credenciais são criptografadas com AES-256 (MultiFernet) antes de persistirem no banco.
                  </p>
                </div>

                <form
                  onSubmit={handleCreateBank}
                  className="bg-inho-dark/70 border border-inho-border p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
                >
                  <div>
                    <label className="text-[11px] font-mono uppercase text-inho-muted block mb-1">
                      Instituição Bancária
                    </label>
                    <select
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      className="w-full bg-[#F1F5F9] border border-inho-border rounded-lg p-2 text-xs text-[#0F172A] outline-none focus:border-inho-teal"
                    >
                      <option value="BANCO_INTER">Banco Inter (PIX & Boleto)</option>
                      <option value="CORA">Banco Cora</option>
                      <option value="ASAAS">Asaas Pagamentos</option>
                      <option value="SICOOB">Sicoob Cooperativo</option>
                      <option value="SICREDI">Sicredi</option>
                      <option value="ITAU">Itaú Empresas</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-inho-muted block mb-1">
                      API Key / Client Secret *
                    </label>
                    <input
                      type="password"
                      required
                      value={newBankKey}
                      onChange={(e) => setNewBankKey(e.target.value)}
                      placeholder="Cole a chave secreta da API bancária..."
                      className="w-full bg-[#F1F5F9] border border-inho-border rounded-lg p-2 text-xs text-[#0F172A] outline-none focus:border-inho-teal"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingBank}
                    className="bg-inho-teal hover:bg-[#9A6F0B] text-white font-black px-4 py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> {creatingBank ? 'Criptografando...' : 'Conectar Banco'}
                  </button>
                </form>

                <div className="space-y-3">
                  {banks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-inho-muted border border-dashed border-inho-border rounded-xl">
                      Nenhuma integração bancária configurada para esta empresa.
                    </div>
                  ) : (
                    banks.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl bg-inho-dark border border-inho-border flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-inho-teal font-black font-mono">
                            {b.bank_name.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                              {b.bank_name}
                              {b.is_active && <CheckCircle2 size={14} className="text-emerald-700" />}
                            </h3>
                            <p className="text-[11px] text-inho-muted font-mono mt-0.5">{b.webhook_url}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBank(b.id)}
                          className="text-xs text-red-700 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Desconectar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'API' && (
              <div className="glassmorphism p-6 rounded-2xl border border-inho-border space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                    <Shield size={18} className="text-inho-teal" /> Chaves de API (Personal Access Tokens)
                  </h2>
                  <p className="text-xs text-inho-muted mt-0.5">
                    Tokens autenticados via SHA-256 para integrações externas com N8N, ERPs e Webhooks.
                  </p>
                </div>

                {newlyCreatedPlainToken && (
                  <div className="p-4 rounded-xl bg-inho-teal/10 border border-inho-teal/40 space-y-2">
                    <p className="text-xs font-bold text-inho-teal">
                      Copie sua nova chave de API agora — por segurança ela não será exibida novamente:
                    </p>
                    <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-inho-teal/30">
                      <code className="text-xs font-mono text-[#0F172A] break-all">{newlyCreatedPlainToken}</code>
                      <button
                        onClick={copyPlainToken}
                        className="px-3 py-1.5 rounded bg-inho-teal text-white font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        {copiedToken ? <Check size={13} /> : <Copy size={13} />}
                        {copiedToken ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateToken} className="flex gap-3">
                  <input
                    type="text"
                    required
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="Identificação do Token (Ex: Integração N8N / Contabilidade)"
                    className="flex-1 bg-inho-dark border border-inho-border rounded-xl px-4 py-2 text-xs text-[#0F172A] outline-none focus:border-inho-teal"
                  />
                  <button
                    type="submit"
                    disabled={creatingToken}
                    className="bg-[#F1F5F9] hover:bg-white/20 text-[#0F172A] font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={14} /> {creatingToken ? 'Gerando...' : 'Gerar Novo Token'}
                  </button>
                </form>

                <div className="overflow-x-auto border border-inho-border rounded-xl">
                  <table className="w-full text-left text-sm text-inho-text">
                    <thead className="bg-inho-dark border-b border-inho-border text-inho-muted font-mono text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3">Identificação</th>
                        <th className="px-4 py-3">Hash SHA-256</th>
                        <th className="px-4 py-3">Criado em</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inho-border/40 text-xs">
                      {tokens.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-inho-muted">
                            Nenhum token de API ativo.
                          </td>
                        </tr>
                      ) : (
                        tokens.map((t) => (
                          <tr key={t.id}>
                            <td className="px-4 py-3 font-bold text-[#0F172A]">{t.name}</td>
                            <td className="px-4 py-3 font-mono text-inho-muted">
                              {t.token_hash.substring(0, 16)}...
                            </td>
                            <td className="px-4 py-3 font-mono text-inho-muted">
                              {new Date(t.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRevokeToken(t.id)}
                                className="text-red-700 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                                title="Revogar Token"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'TELEMETRY' && (
              <div className="glassmorphism p-6 rounded-2xl border border-inho-border space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-inho-border pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                      <Activity size={18} className="text-inho-teal" /> Telemetria APM & Rotação MultiFernet
                    </h2>
                    <p className="text-xs text-inho-muted mt-0.5">
                      Monitoramento de latência em tempo real (LRU Eviction max {telemetry?.max_capacity || 300} rotas) e rotação de chaves.
                    </p>
                  </div>
                  <button
                    onClick={handleRotateSecrets}
                    disabled={rotatingSecrets}
                    className="bg-inho-teal/15 hover:bg-inho-teal/25 text-inho-teal border border-inho-teal/40 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all"
                  >
                    <RotateCw size={14} className={rotatingSecrets ? 'animate-spin' : ''} />
                    {rotatingSecrets ? 'Rotacionando...' : 'Rotacionar Chaves MultiFernet'}
                  </button>
                </div>

                {rotationResult && (
                  <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-300 font-mono">
                    {rotationResult}
                  </div>
                )}

                <div className="overflow-x-auto border border-inho-border rounded-xl">
                  <table className="w-full text-left text-xs text-inho-text">
                    <thead className="bg-inho-dark border-b border-inho-border text-inho-muted font-mono text-[10px] uppercase">
                      <tr>
                        <th className="px-4 py-3">Rota Normalizada</th>
                        <th className="px-4 py-3">Req.</th>
                        <th className="px-4 py-3">Média (ms)</th>
                        <th className="px-4 py-3">Máx (ms)</th>
                        <th className="px-4 py-3">&gt;500ms</th>
                        <th className="px-4 py-3 text-right">Erros 5xx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inho-border/40 font-mono">
                      {!telemetry?.endpoints?.length ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-inho-muted">
                            Nenhuma métrica registrada ainda.
                          </td>
                        </tr>
                      ) : (
                        telemetry.endpoints.slice(0, 15).map((ep: any) => (
                          <tr key={ep.route} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 text-[#0F172A] font-bold">{ep.route}</td>
                            <td className="px-4 py-2.5 text-inho-muted">{ep.requests}</td>
                            <td className="px-4 py-2.5 text-inho-teal">{ep.avg_ms} ms</td>
                            <td className="px-4 py-2.5 text-[#0F172A]">{ep.max_ms} ms</td>
                            <td className="px-4 py-2.5 text-amber-700">{ep.slow_requests_gt_500ms}</td>
                            <td
                              className={`px-4 py-2.5 text-right font-bold ${
                                ep.errors_5xx > 0 ? 'text-red-700' : 'text-emerald-700'
                              }`}
                            >
                              {ep.errors_5xx}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
