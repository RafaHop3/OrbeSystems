'use client';

import { useState, useEffect } from 'react';
import {
  Users, DollarSign, Search, UserPlus, CreditCard, Receipt,
  Loader2, X, Briefcase, MapPin, Hash, ShieldCheck, CheckCircle2, Calculator,
  Plus, Trash2, Edit3, Phone, Mail, Landmark, Calendar, HeartHandshake
} from 'lucide-react';
import {
  cooperadosApi, CooperadoItem, CooperadoBalance,
  crmApi, AccountPayableOut, billingApi,
  openFinanceApi, OpenFinanceBankMeta, OpenFinanceConsentItem,
  ContactPhoneEntry, ContactEmailEntry, ContactBankAccountEntry,
  BRAZILIAN_BANKS_CATALOG, resolveBankNameByCode, searchCepByAddress, CepSearchResult
} from '@/lib/api';

type TabView = 'ASSOCIADOS' | 'COTAS_FISCAL' | 'FINANCE' | 'RATEIO_INFORMES' | 'OPEN_FINANCE';

const STATUS_META: Record<string, { label: string; style: string }> = {
  PROPOSTA_CADASTRADA: { label: 'Proposta Cadastrada', style: 'bg-neon-blue/10 text-neon-blue border-neon-blue/30' },
  ANALISE_COMITE: { label: 'Análise Comitê', style: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  COTAS_LIQUIDADAS: { label: 'Cotas Liquidadas', style: 'bg-purple-500/10 text-purple-700 border-purple-500/30' },
  ATIVO: { label: 'Sócio Ativo', style: 'bg-neon-green/10 text-neon-green border-neon-green/30' },
  DESLIGADO: { label: 'Desligado', style: 'bg-red-500/10 text-red-700 border-red-500/30' },
};

export default function CooperativaInho() {
  const [activeTab, setActiveTab] = useState<TabView>('ASSOCIADOS');
  const [cooperados, setCooperados] = useState<CooperadoItem[]>([]);
  const [payables, setPayables] = useState<AccountPayableOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal Novo / Editar Sócio (com Dados Pessoais, Filiação, Múltiplos Telefones, E-mails e Contas Bancárias)
  const [isNewSocioOpen, setIsNewSocioOpen] = useState(false);
  const [editingSocioId, setEditingSocioId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepOptions, setCepOptions] = useState<CepSearchResult[]>([]);
  const emptySocioForm = () => ({
    document: '',
    name: '',
    birth_date: '',
    identity_number: '',
    identity_issuer: '',
    filiation: '',
    mother_name: '',
    father_name: '',
    nomeFantasia: '',
    cnae: '',
    email: '',
    phone: '',
    bank_details: '',
    cep: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: '',
    nis: '',
    matricula: '',
    status: 'ATIVO',
    phones: [{ number: '', type: 'PROPRIO', label: 'Telefone Próprio', is_whatsapp: true, is_primary: true }] as ContactPhoneEntry[],
    emails: [{ email: '', type: 'PRINCIPAL', label: 'E-mail Principal', is_primary: true }] as ContactEmailEntry[],
    bank_accounts: [{ bank_code: '756', bank_name: 'Sicoob', agency: '', account: '', account_type: 'CONTA_CAPITAL_COOP', pix_key: '', is_primary: true }] as ContactBankAccountEntry[],
  });
  const [socioForm, setSocioForm] = useState(emptySocioForm);

  function openNewSocioModal() {
    setEditingSocioId(null);
    setSocioForm(emptySocioForm());
    setIsNewSocioOpen(true);
  }

  function openEditSocioModal(coop: CooperadoItem) {
    setEditingSocioId(coop.id);
    setSocioForm({
      document: coop.document || '',
      name: coop.name || '',
      birth_date: coop.birth_date || '',
      identity_number: coop.identity_number || '',
      identity_issuer: coop.identity_issuer || '',
      filiation: coop.filiation || '',
      mother_name: coop.mother_name || '',
      father_name: coop.father_name || '',
      nomeFantasia: '',
      cnae: '',
      email: coop.email || '',
      phone: coop.phone || '',
      bank_details: coop.bank_details || '',
      cep: '',
      endereco: '',
      bairro: '',
      cidade: '',
      uf: '',
      nis: '',
      matricula: '',
      status: coop.status || 'ATIVO',
      phones:
        coop.phones && coop.phones.length > 0
          ? coop.phones
          : [{ number: coop.phone || '', type: 'PROPRIO', label: 'Telefone Próprio', is_whatsapp: true, is_primary: true }],
      emails:
        coop.emails && coop.emails.length > 0
          ? coop.emails
          : [{ email: coop.email || '', type: 'PRINCIPAL', label: 'E-mail Principal', is_primary: true }],
      bank_accounts:
        coop.bank_accounts && coop.bank_accounts.length > 0
          ? coop.bank_accounts
          : [
              {
                bank_code: coop.bank_code || '756',
                bank_name: coop.bank_name || resolveBankNameByCode(coop.bank_code) || 'Sicoob',
                agency: coop.bank_agency || '',
                account: coop.bank_account || '',
                account_type: coop.bank_account_type || 'CONTA_CAPITAL_COOP',
                pix_key: coop.pix_key || '',
                is_primary: true,
              },
            ],
    });
    setIsNewSocioOpen(true);
  }

  // Modal Dossiê / Extrato de Cotas do Sócio
  const [selectedSocio, setSelectedSocio] = useState<CooperadoItem | null>(null);
  const [socioBalance, setSocioBalance] = useState<CooperadoBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Simulador / Lançador de Liquidação de Cotas & Retenção Fiscal
  const [fiscalForm, setFiscalForm] = useState({
    cooperado_id: '',
    cooperado_name: '',
    operation: 'INTEGRALIZACAO_COTA', // INTEGRALIZACAO_COTA | REPASSE_PRODUCAO
    gross_amount: '1500',
    inss_rate: '11',
    irrf_rate: '1.5',
    taxa_coop_rate: '5',
    due_date: new Date().toISOString().split('T')[0],
  });

  // Fase 2 (4C): Rateio de Sobras (AGO) & Informe de Rendimentos
  const [rateioValor, setRateioValor] = useState('50000');
  const [rateioAno, setRateioAno] = useState(new Date().getFullYear());
  const [rateioPreview, setRateioPreview] = useState<any>(null);
  const [loadingRateio, setLoadingRateio] = useState(false);
  const [applyingRateio, setApplyingRateio] = useState(false);
  const [informeSocioId, setInformeSocioId] = useState('');
  const [informeAno, setInformeAno] = useState(new Date().getFullYear());
  const [informeData, setInformeData] = useState<any>(null);
  const [loadingInforme, setLoadingInforme] = useState(false);

  // Fase 3: Open Finance Brasil (BACEN) & Conciliação Bancária Cooperativa
  const [ofBanks, setOfBanks] = useState<OpenFinanceBankMeta[]>([]);
  const [ofConsents, setOfConsents] = useState<OpenFinanceConsentItem[]>([]);
  const [ofConsentForm, setOfConsentForm] = useState({
    bank_code: '756',
    aggregator: 'PLUGGY',
    client_secret_or_token: '',
    account_branch: '0001',
    account_number: '',
  });
  const [ofAccountForm, setOfAccountForm] = useState({
    cooperado_id: '',
    bank_code: '756',
    branch: '0001',
    account_number: '',
    account_type: 'CONTA_CAPITAL_COOP',
    pix_key: '',
    pix_key_type: 'CPF_CNPJ',
  });
  const [ofSyncResult, setOfSyncResult] = useState<any>(null);
  const [loadingOf, setLoadingOf] = useState(false);

  async function loadCooperados() {
    setLoading(true);
    try {
      const list = await cooperadosApi.list({
        status: statusFilter || undefined,
      });
      setCooperados(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFinance() {
    setLoading(true);
    try {
      const p = await crmApi.getPayables();
      setPayables(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSimulateRateio() {
    setLoadingRateio(true);
    try {
      const data = await cooperadosApi.previewRateioSobras(Number(rateioValor || 0), Number(rateioAno));
      setRateioPreview(data);
    } catch (err: any) {
      alert(err?.message || 'Erro ao simular rateio de sobras');
    } finally {
      setLoadingRateio(false);
    }
  }

  async function handleApplyRateio() {
    setApplyingRateio(true);
    try {
      const idemKey = `ago-sobras-${rateioAno}-${rateioValor}`;
      const res = await cooperadosApi.applyRateioSobras(
        { valor_total_sobras: Number(rateioValor || 0), ano_exercicio: Number(rateioAno) },
        idemKey
      );
      alert(
        res.cached_replay
          ? `Rateio de Sobras já aplicado anteriormente (${res.created_payables_count} créditos gerados).`
          : `Rateio AGO homologado! ${res.created_payables_count} créditos lançados em Contas a Pagar (Total R$ ${Number(res.total_distributed || 0).toFixed(2)}).`
      );
      await handleSimulateRateio();
    } catch (err: any) {
      alert(err?.message || 'Erro ao aplicar rateio de sobras');
    } finally {
      setApplyingRateio(false);
    }
  }

  async function handleLoadInforme(coopId: string, ano?: number) {
    if (!coopId) return;
    setLoadingInforme(true);
    try {
      const data = await cooperadosApi.getInformeRendimentos(coopId, ano || informeAno);
      setInformeData(data);
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar Informe de Rendimentos');
    } finally {
      setLoadingInforme(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'ASSOCIADOS' || activeTab === 'COTAS_FISCAL' || activeTab === 'RATEIO_INFORMES') {
      loadCooperados();
      if (activeTab === 'RATEIO_INFORMES') {
        handleSimulateRateio();
      }
    } else if (activeTab === 'FINANCE') {
      loadFinance();
    } else if (activeTab === 'OPEN_FINANCE') {
      loadCooperados();
      loadOpenFinanceHub();
    }
  }, [activeTab, statusFilter]);

  async function loadOpenFinanceHub() {
    setLoadingOf(true);
    try {
      const [dirRes, consentsRes] = await Promise.all([
        openFinanceApi.getDirectory(),
        openFinanceApi.listConsents(),
      ]);
      setOfBanks(dirRes.items || []);
      setOfConsents(consentsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOf(false);
    }
  }

  async function handleCreateOfConsent(e: React.FormEvent) {
    e.preventDefault();
    if (!ofConsentForm.client_secret_or_token.trim()) return;
    setLoadingOf(true);
    try {
      await openFinanceApi.createConsent(ofConsentForm);
      setOfConsentForm({ ...ofConsentForm, client_secret_or_token: '' });
      await loadOpenFinanceHub();
      alert('Consentimento Open Finance (BACEN) criptografado com MultiFernet AES-256 e ativado!');
    } catch (err: any) {
      alert(err?.message || 'Erro ao conectar instituição Open Finance');
    } finally {
      setLoadingOf(false);
    }
  }

  async function handleLinkCooperadoAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!ofAccountForm.cooperado_id || !ofAccountForm.pix_key) {
      alert('Selecione o cooperado e informe os dados bancários/PIX.');
      return;
    }
    setLoadingOf(true);
    try {
      const res = await openFinanceApi.linkCooperadoAccount(ofAccountForm.cooperado_id, {
        bank_code: ofAccountForm.bank_code,
        branch: ofAccountForm.branch,
        account_number: ofAccountForm.account_number,
        account_type: ofAccountForm.account_type,
        pix_key: ofAccountForm.pix_key,
        pix_key_type: ofAccountForm.pix_key_type,
      });
      await loadCooperados();
      alert(`Domicílio Bancário Open Finance vinculado a ${res.cooperado_name}!`);
    } catch (err: any) {
      alert(err?.message || 'Erro ao vincular conta bancária do cooperado');
    } finally {
      setLoadingOf(false);
    }
  }

  async function handleSyncOpenFinanceStatement() {
    setLoadingOf(true);
    try {
      const res = await openFinanceApi.syncStatement({ auto_reconcile_pending_cotas: true });
      setOfSyncResult(res);
      await loadCooperados();
    } catch (err: any) {
      alert(err?.message || 'Erro ao sincronizar extrato Open Finance');
    } finally {
      setLoadingOf(false);
    }
  }

  // Auto-Fill CNPJ via Backend Cache + Fallback (BrasilAPI -> CNPJ.ws)
  async function handleLookupCnpj() {
    const clean = socioForm.document.replace(/\D/g, '');
    if (clean.length !== 14) {
      alert('Para busca automática na Receita/BrasilAPI, informe um CNPJ de 14 dígitos (ou preencha manualmente para CPF).');
      return;
    }
    setLoadingCnpj(true);
    try {
      const data = await crmApi.lookupCnpj(clean).catch(async () => {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
        if (!res.ok) throw new Error('CNPJ não localizado na BrasilAPI.');
        return res.json();
      });
      setSocioForm((prev) => ({
        ...prev,
        name: data.razao_social || prev.name,
        nomeFantasia: data.nome_fantasia || '',
        cnae: (data as any).cnae_fiscal_descricao || prev.cnae || '',
        email: data.email || prev.email,
        phone: data.ddd_telefone_1 || prev.phone,
        cep: (data.cep || '').replace(/\D/g, ''),
        endereco: `${data.logradouro || ''} ${data.numero || ''}`.trim(),
        bairro: data.bairro || '',
        cidade: data.municipio || '',
        uf: data.uf || '',
      }));
    } catch (err: any) {
      alert(err?.message || 'Erro ao consultar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  }

  // Busca reversa: UF + cidade + logradouro -> CEP
  async function handleSearchCepByAddress() {
    setLoadingCep(true);
    try {
      const list = await searchCepByAddress(socioForm.uf, socioForm.cidade, socioForm.endereco);
      if (list.length === 1) {
        applyCepOption(list[0]);
      } else {
        setCepOptions(list);
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao buscar CEP pelo endereço');
    } finally {
      setLoadingCep(false);
    }
  }

  function applyCepOption(o: CepSearchResult) {
    setSocioForm((prev) => ({
      ...prev,
      cep: (o.cep || '').replace(/\D/g, ''),
      endereco: o.logradouro || prev.endereco,
      bairro: o.bairro || prev.bairro,
      cidade: o.localidade || prev.cidade,
      uf: o.uf || prev.uf,
    }));
    setCepOptions([]);
  }

  // Auto-Fill CEP via Backend Cache + Fallback (BrasilAPI -> ViaCEP)
  async function handleLookupCep() {
    const clean = socioForm.cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      alert('Informe um CEP com 8 dígitos.');
      return;
    }
    setLoadingCep(true);
    try {
      const data = await crmApi.lookupCep(clean).catch(async () => {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${clean}`);
        if (!res.ok) throw new Error('CEP não encontrado.');
        return res.json();
      });
      setSocioForm((prev) => ({
        ...prev,
        endereco: data.street || prev.endereco,
        bairro: data.neighborhood || prev.bairro,
        cidade: data.city || prev.cidade,
        uf: data.state || prev.uf,
      }));
    } catch (err: any) {
      alert(err?.message || 'Erro ao consultar CEP');
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleCreateSocio(e: React.FormEvent) {
    e.preventDefault();
    if (!socioForm.name || !socioForm.document) {
      alert('Informe Nome/Razão Social e CPF/CNPJ do Sócio.');
      return;
    }
    setSubmitting(true);
    try {
      const validPhones = (socioForm.phones || []).filter((p) => (p.number || '').trim().length > 0);
      const validEmails = (socioForm.emails || []).filter((em) => (em.email || '').trim().length > 0);
      const validBanks = (socioForm.bank_accounts || []).filter((b) =>
        Boolean(
          (b.bank_code || '').trim() ||
            (b.bank_name || '').trim() ||
            (b.agency || '').trim() ||
            (b.account || '').trim() ||
            (b.pix_key || '').trim()
        )
      );
      const primaryBank = validBanks[0];
      const combinedFiliation =
        (socioForm.filiation || '').trim() ||
        [
          socioForm.mother_name ? `Mãe: ${socioForm.mother_name.trim()}` : '',
          socioForm.father_name ? `Pai: ${socioForm.father_name.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' | ') ||
        undefined;

      const notesParts = [
        socioForm.nis ? `NIS: ${socioForm.nis}` : '',
        socioForm.matricula ? `Matrícula: ${socioForm.matricula}` : '',
        socioForm.cnae ? `CNAE: ${socioForm.cnae}` : '',
        socioForm.endereco ? `End: ${socioForm.endereco}, ${socioForm.bairro} - ${socioForm.cidade}/${socioForm.uf}` : '',
      ].filter(Boolean);

      const payload = {
        name: socioForm.name,
        document: socioForm.document,
        birth_date: socioForm.birth_date || undefined,
        identity_number: socioForm.identity_number || undefined,
        identity_issuer: socioForm.identity_issuer || undefined,
        filiation: combinedFiliation,
        mother_name: socioForm.mother_name || undefined,
        father_name: socioForm.father_name || undefined,
        email: validEmails[0]?.email || socioForm.email || undefined,
        phone: validPhones[0]?.number || socioForm.phone || undefined,
        bank_code: primaryBank?.bank_code || undefined,
        bank_name: primaryBank?.bank_name || undefined,
        bank_agency: primaryBank?.agency || undefined,
        bank_account: primaryBank?.account || undefined,
        bank_account_type: primaryBank?.account_type || undefined,
        pix_key: primaryBank?.pix_key || undefined,
        bank_details: socioForm.bank_details || undefined,
        phones: validPhones,
        emails: validEmails,
        bank_accounts: validBanks,
        notes: notesParts.join(' | ') || undefined,
        status: socioForm.status as any,
      };

      if (editingSocioId) {
        const updated = await cooperadosApi.update(editingSocioId, payload);
        if (selectedSocio && selectedSocio.id === editingSocioId) {
          setSelectedSocio(updated);
        }
      } else {
        await cooperadosApi.create(payload);
      }

      setIsNewSocioOpen(false);
      setEditingSocioId(null);
      setSocioForm(emptySocioForm());
      await loadCooperados();
    } catch (err: any) {
      alert(err?.message || 'Erro ao registrar sócio no Master DB');
    } finally {
      setSubmitting(false);
    }
  }

  async function openDossie(coop: CooperadoItem) {
    setSelectedSocio(coop);
    setSocioBalance(null);
    setLoadingBalance(true);
    try {
      const bal = await cooperadosApi.getBalance(coop.id);
      setSocioBalance(bal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBalance(false);
    }
  }

  async function handleChangeStatus(coop: CooperadoItem, newStatus: CooperadoItem['status']) {
    try {
      const updated = await cooperadosApi.update(coop.id, { status: newStatus });
      setSelectedSocio(updated);
      await loadCooperados();
    } catch (err: any) {
      alert(err?.message || 'Erro ao atualizar status da cota');
    }
  }

  async function handleExecuteFiscalOperation(e: React.FormEvent) {
    e.preventDefault();
    const gross = Number(fiscalForm.gross_amount || 0);
    if (gross <= 0 || !fiscalForm.cooperado_name) {
      alert('Selecione ou informe o sócio e o valor bruto.');
      return;
    }
    const inss = gross * (Number(fiscalForm.inss_rate || 0) / 100);
    const irrf = gross * (Number(fiscalForm.irrf_rate || 0) / 100);
    const taxa = gross * (Number(fiscalForm.taxa_coop_rate || 0) / 100);
    const net = Math.max(0, gross - inss - irrf - taxa);

    setSubmitting(true);
    try {
      if (fiscalForm.operation === 'INTEGRALIZACAO_COTA') {
        await billingApi.create({
          customer_name: fiscalForm.cooperado_name,
          amount: gross,
          due_date: new Date(fiscalForm.due_date).toISOString(),
          description: `[COTA-PARTE] Integralização de Cota Social (${fiscalForm.cooperado_name})`,
          payment_method: 'PIX',
        });
        alert('Cobrança de Integralização de Cota gerada com sucesso e enviada para a Régua PIX/OrBrick!');
      } else {
        await crmApi.createPayable({
          cooperado_id: fiscalForm.cooperado_id || undefined,
          supplier_name: fiscalForm.cooperado_name,
          amount: Number(net.toFixed(2)),
          due_date: new Date(fiscalForm.due_date).toISOString(),
          description: `[REPASSE LÍQUIDO COOPERADO - ${fiscalForm.cooperado_name}] Bruto R$ ${gross.toFixed(2)} | Retenções: INSS R$ ${inss.toFixed(2)}, IRRF R$ ${irrf.toFixed(2)}, Taxa Coop R$ ${taxa.toFixed(2)}`,
        });
        alert(`Repasse líquido de R$ ${net.toFixed(2)} (com retenções fiscais deduzidas) lançado em Pagamentos!`);
      }
    } catch (err: any) {
      alert(err?.message || 'Falha ao registrar operação');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCooperados = cooperados.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.document && c.document.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  const grossVal = Number(fiscalForm.gross_amount || 0);
  const inssVal = grossVal * (Number(fiscalForm.inss_rate || 0) / 100);
  const irrfVal = grossVal * (Number(fiscalForm.irrf_rate || 0) / 100);
  const taxaVal = grossVal * (Number(fiscalForm.taxa_coop_rate || 0) / 100);
  const netVal = Math.max(0, grossVal - inssVal - irrfVal - taxaVal);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] min-h-screen font-sans text-[#0F172A]">
      {/* HEADER ESTILO NIBUS + ORBE */}
      <div className="border-b border-terminal-border px-8 py-6 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A]">
            Módulo Cooperativismo
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Gestão da base associada B2B/B2C, liquidação de cotas e retenção fiscal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 bg-[#F1F5F9] border border-terminal-border rounded-xl">
            {[
              { id: 'ASSOCIADOS', label: 'Base Associada (Sócios)', icon: Users },
              { id: 'COTAS_FISCAL', label: 'Liquidação de Cotas & Fiscal', icon: Calculator },
              { id: 'RATEIO_INFORMES', label: 'Rateio de Sobras & Informes', icon: Receipt },
              { id: 'OPEN_FINANCE', label: 'Open Finance & Bancos', icon: CreditCard },
              { id: 'FINANCE', label: 'Fila Financeira', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabView)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={openNewSocioModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-neon-cyan text-white font-extrabold text-xs uppercase tracking-wider rounded-xl hover:shadow-[0_0_20px_rgba(184,134,11,0.4)] transition-all"
          >
            <UserPlus size={16} /> Novo Sócio
          </button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-8 space-y-6">
        {/* ─── ABA 1: BASE DE ASSOCIADOS (SÓCIOS) ─────────────────────────── */}
        {activeTab === 'ASSOCIADOS' && (
          <div className="space-y-5">
            {/* Search & Status Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar sócio por nome, CPF/CNPJ ou NIS..."
                  className="w-full bg-white shadow-sm border border-terminal-border rounded-xl pl-11 pr-4 py-3 text-xs text-[#0F172A] placeholder-[#8C959F] focus:outline-none focus:border-neon-cyan/50 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: '', label: 'Todos' },
                  { id: 'ATIVO', label: 'Ativos' },
                  { id: 'COTAS_LIQUIDADAS', label: 'Cotas Liquidadas' },
                  { id: 'ANALISE_COMITE', label: 'Comitê' },
                  { id: 'PROPOSTA_CADASTRADA', label: 'Propostas' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase whitespace-nowrap border transition-all ${
                      statusFilter === st.id
                        ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40'
                        : 'bg-white shadow-sm text-[#64748B] border-terminal-border hover:text-[#0F172A]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table or Empty State (Idêntico à Referência NIBUS quando vazio) */}
            <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden min-h-[380px] flex flex-col">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-[#64748B] text-xs">
                  <Loader2 className="animate-spin mb-3 text-neon-cyan" size={28} />
                  Sincronizando base associada no Master DB...
                </div>
              ) : filteredCooperados.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] border border-terminal-border flex items-center justify-center mb-4">
                    <Users size={32} className="text-[#0F172A]" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A] mb-1">
                    Base de Associados Vazia
                  </h3>
                  <p className="text-xs text-[#64748B] max-w-md leading-relaxed">
                    Utilize o botão &apos;Novo Sócio&apos; acima para iniciar a submissão de entidades cooperadas para o Master DB.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Associado / Sócio Cooperado</th>
                      <th className="px-6 py-4">CPF / CNPJ</th>
                      <th className="px-6 py-4">NIS / Matrícula / Notas</th>
                      <th className="px-6 py-4">Contato (OrBrick)</th>
                      <th className="px-6 py-4">Status Societário</th>
                      <th className="px-6 py-4 text-right">Dossiê & Cotas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border">
                    {filteredCooperados.map((coop) => {
                      const st = STATUS_META[coop.status] || { label: coop.status, style: 'bg-[#F1F5F9] text-[#0F172A]' };
                      return (
                        <tr key={coop.id} className="hover:bg-[#F1F5F9] transition-colors">
                          <td className="px-6 py-4 font-bold text-[#0F172A] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan font-extrabold">
                              {coop.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div>{coop.name}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-[#64748B]">
                                {coop.birth_date && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#F1F5F9] border border-terminal-border">
                                    Nasc: {coop.birth_date.includes('-') ? coop.birth_date.split('-').reverse().join('/') : coop.birth_date}
                                  </span>
                                )}
                                {coop.filiation && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#F1F5F9] border border-terminal-border max-w-[200px] truncate">
                                    Filiação: {coop.filiation}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[#64748B] mt-0.5">
                                {coop.bank_code || coop.bank_name
                                  ? `Banco: ${coop.bank_code ? `${coop.bank_code} - ` : ''}${coop.bank_name || ''} | Ag: ${coop.bank_agency || '-'} | Cc: ${coop.bank_account || '-'}`
                                  : `PIX/Banco: ${coop.bank_details || 'Não informado'}`}
                                {coop.bank_accounts && coop.bank_accounts.length > 1 && (
                                  <span className="ml-1.5 px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 font-bold">
                                    +{coop.bank_accounts.length - 1} conta(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#64748B] font-mono">{coop.document}</td>
                          <td className="px-6 py-4 text-[#64748B] max-w-xs truncate">{coop.notes || '---'}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <span>{(coop.phones && coop.phones[0]?.number) || coop.phone || '---'}</span>
                              {coop.phones && coop.phones.length > 1 && (
                                <span
                                  className="px-1.5 py-0.2 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 text-[10px] font-bold"
                                  title={coop.phones.map((p) => `${p.number} (${p.label || p.type || 'Contato'})`).join(' • ')}
                                >
                                  +{coop.phones.length - 1} tel
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                              <span>{(coop.emails && coop.emails[0]?.email) || coop.email || ''}</span>
                              {coop.emails && coop.emails.length > 1 && (
                                <span
                                  className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] font-bold"
                                  title={coop.emails.map((e) => e.email).join(' • ')}
                                >
                                  +{coop.emails.length - 1} e-mail
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase ${st.style}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEditSocioModal(coop)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#F1F5F9] border border-terminal-border hover:border-neon-cyan/40 text-[#0F172A] font-bold text-[11px] inline-flex items-center gap-1"
                              >
                                <Edit3 size={12} /> Editar
                              </button>
                              <button
                                onClick={() => openDossie(coop)}
                                className="px-3 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 hover:bg-neon-cyan/20 text-neon-cyan font-bold text-[11px]"
                              >
                                Abrir Dossiê
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── ABA 2: LIQUIDAÇÃO DE COTAS & RETENÇÃO FISCAL ───────────────── */}
        {activeTab === 'COTAS_FISCAL' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white shadow-sm border border-terminal-border rounded-2xl p-6 space-y-5">
              <div className="border-b border-terminal-border pb-4">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-neon-cyan flex items-center gap-2">
                  <Calculator size={18} /> Motor de Liquidação de Cotas & Retenção Fiscal
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Calcule e registre integralização de cotas-partes ou repasse de produção com retenção de INSS, IRRF e Taxa Cooperativa.
                </p>
              </div>

              <form onSubmit={handleExecuteFiscalOperation} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Selecionar Associado (Master DB)</label>
                    <select
                      value={fiscalForm.cooperado_id}
                      onChange={(e) => {
                        const found = cooperados.find((c) => c.id === e.target.value);
                        setFiscalForm({
                          ...fiscalForm,
                          cooperado_id: e.target.value,
                          cooperado_name: found ? found.name : fiscalForm.cooperado_name,
                        });
                      }}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    >
                      <option value="">-- Escolher da lista ou digitar ao lado --</option>
                      {cooperados.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.document})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Nome do Cooperado / Associado</label>
                    <input
                      required
                      value={fiscalForm.cooperado_name}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, cooperado_name: e.target.value })}
                      placeholder="Nome do sócio cooperado"
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Natureza da Operação</label>
                    <select
                      value={fiscalForm.operation}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, operation: e.target.value })}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    >
                      <option value="REPASSE_PRODUCAO">Repasse de Produção (Com Retenção)</option>
                      <option value="INTEGRALIZACAO_COTA">Integralização de Cota-Parte (Cobrança PIX)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Valor Bruto da Operação (R$)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={fiscalForm.gross_amount}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, gross_amount: e.target.value })}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Data de Liquidação / Venc.</label>
                    <input
                      required
                      type="date"
                      value={fiscalForm.due_date}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, due_date: e.target.value })}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Retenção INSS (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fiscalForm.inss_rate}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, inss_rate: e.target.value })}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Retenção IRRF (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fiscalForm.irrf_rate}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, irrf_rate: e.target.value })}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Taxa Adm. / FATES (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fiscalForm.taxa_coop_rate}
                      onChange={(e) => setFiscalForm({ ...fiscalForm, taxa_coop_rate: e.target.value })}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-neon-cyan text-white font-extrabold uppercase tracking-wider mt-4"
                >
                  {submitting ? 'Processando...' : 'Confirmar Liquidação & Registrar no Financeiro'}
                </button>
              </form>
            </div>

            {/* Demonstrativo de Retenção em Tempo Real */}
            <div className="bg-white shadow-sm border border-terminal-border rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#0F172A] border-b border-terminal-border pb-3">
                  Demonstrativo de Retenção
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Valor Bruto:</span>
                    <span className="font-bold text-[#0F172A]">R$ {grossVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>(-) INSS ({fiscalForm.inss_rate}%):</span>
                    <span>- R$ {inssVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>(-) IRRF ({fiscalForm.irrf_rate}%):</span>
                    <span>- R$ {irrfVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-purple-700">
                    <span>(-) Quota/Taxa Coop ({fiscalForm.taxa_coop_rate}%):</span>
                    <span>- R$ {taxaVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-terminal-border pt-3 flex justify-between text-sm font-extrabold text-neon-green">
                    <span>Valor Líquido Cooperado:</span>
                    <span>R$ {netVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 text-[11px] text-[#64748B] mt-6">
                <ShieldCheck size={15} className="text-neon-cyan inline mr-1.5" />
                Integrado ao Contas a Receber, Contas a Pagar e Fechamento Contábil Mensal.
              </div>
            </div>
          </div>
        )}

        {/* ─── ABA 3: FILA FINANCEIRA ─────────────────────────────────────── */}
        {activeTab === 'FINANCE' && (
          <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-terminal-border flex justify-between items-center bg-[#F1F5F9]">
              <h3 className="font-bold tracking-widest uppercase text-xs text-[#0F172A]">
                Obrigações & Repasses de Cooperados
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Descrição / Associado</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border">
                {payables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[#64748B]">
                      Nenhuma obrigação financeira registrada.
                    </td>
                  </tr>
                ) : (
                  payables.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F1F5F9]">
                      <td className="px-6 py-4 text-[#64748B]">{p.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-4 font-bold">{p.description || p.supplier_name}</td>
                      <td className="px-6 py-4">{new Date(p.due_date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-neon-blue/10 text-neon-blue border border-neon-blue/30 text-[10px] font-bold">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-purple-700">
                        - R$ {Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── ABA 4: RATEIO DE SOBRAS (AGO) & INFORME DE RENDIMENTOS (IRPF/DIRF) ─── */}
        {activeTab === 'RATEIO_INFORMES' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco Esquerdo: Rateio de Sobras (AGO) */}
            <div className="bg-white shadow-sm border border-terminal-border rounded-2xl p-6 space-y-5">
              <div className="border-b border-terminal-border pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold uppercase tracking-wider text-neon-cyan flex items-center gap-2">
                    <Calculator size={18} /> Motor de Rateio de Sobras (AGO)
                  </h2>
                  <p className="text-xs text-[#64748B] mt-1">
                    Distribuição proporcional à movimentação financeira de 12 meses (Aportes + Repasses).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 text-[10px] font-bold uppercase">
                  Idempotente
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Sobras Líquidas AGO (R$)</label>
                  <input
                    type="number"
                    step="100"
                    value={rateioValor}
                    onChange={(e) => setRateioValor(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Exercício Base</label>
                  <input
                    type="number"
                    value={rateioAno}
                    onChange={(e) => setRateioAno(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateRateio}
                    disabled={loadingRateio}
                    className="flex-1 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-bold uppercase text-xs hover:bg-neon-cyan/25"
                  >
                    {loadingRateio ? 'Calculando...' : 'Simular'}
                  </button>
                </div>
              </div>

              {rateioPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-terminal-border">
                      <div className="text-[10px] text-[#64748B] uppercase">Movimentação 12M</div>
                      <div className="text-sm font-extrabold text-[#0F172A] mt-0.5">
                        R$ {Number(rateioPreview.movimentacao_global_12m || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-terminal-border">
                      <div className="text-[10px] text-[#64748B] uppercase">Sócios Elegíveis</div>
                      <div className="text-sm font-extrabold text-neon-cyan mt-0.5">
                        {rateioPreview.total_cooperados_elegiveis} sócio(s)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-terminal-border">
                      <div className="text-[10px] text-[#64748B] uppercase">Total a Ratear</div>
                      <div className="text-sm font-extrabold text-neon-green mt-0.5">
                        R$ {Number(rateioPreview.valor_total_sobras || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="border border-terminal-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Cooperado</th>
                          <th className="px-4 py-2.5 text-right">Mov. 12M</th>
                          <th className="px-4 py-2.5 text-right">% Part.</th>
                          <th className="px-4 py-2.5 text-right">Cota Sobras</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-terminal-border">
                        {(rateioPreview.itens || []).map((it: any) => (
                          <tr key={it.cooperado_id} className="hover:bg-[#F1F5F9]">
                            <td className="px-4 py-2.5 font-bold text-[#0F172A]">{it.cooperado_name}</td>
                            <td className="px-4 py-2.5 text-right text-[#64748B]">
                              R$ {Number(it.movimentacao_total_12m || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-right text-neon-cyan font-bold">
                              {Number(it.participacao_percentual || 0).toFixed(2)}%
                            </td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-neon-green">
                              R$ {Number(it.cota_sobras || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyRateio}
                    disabled={applyingRateio || (rateioPreview.itens || []).length === 0}
                    className="w-full py-3 rounded-xl bg-neon-green text-white font-extrabold uppercase tracking-wider text-xs hover:opacity-90"
                  >
                    {applyingRateio
                      ? 'Homologando Rateio AGO...'
                      : 'Homologar Assembleia (AGO) & Gerar Créditos em Contas a Pagar'}
                  </button>
                </div>
              )}
            </div>

            {/* Bloco Direito: Informe de Rendimentos Anual (IRPF/DIRF) */}
            <div className="bg-white shadow-sm border border-terminal-border rounded-2xl p-6 space-y-5">
              <div className="border-b border-terminal-border pb-4">
                <h2 className="text-base font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-2">
                  <Receipt size={18} /> Informe Anual de Rendimentos (IRPF / DIRF)
                </h2>
                <p className="text-xs text-[#64748B] mt-1">
                  Consolidação fiscal automática de Produção Cooperada, INSS, IRRF, FATES e Quotas de Capital Social.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-[#64748B] mb-1 uppercase">Selecionar Cooperado</label>
                  <select
                    value={informeSocioId}
                    onChange={(e) => {
                      setInformeSocioId(e.target.value);
                      if (e.target.value) handleLoadInforme(e.target.value, informeAno);
                    }}
                    className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                  >
                    <option value="">-- Escolha um sócio cooperado --</option>
                    {cooperados.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.document})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#64748B] mb-1 uppercase">Ano-Calendário</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={informeAno}
                      onChange={(e) => setInformeAno(Number(e.target.value))}
                      className="w-full bg-[#F8FAFC] border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    />
                    <button
                      type="button"
                      onClick={() => handleLoadInforme(informeSocioId, informeAno)}
                      disabled={!informeSocioId || loadingInforme}
                      className="px-3 rounded-xl bg-amber-400 text-black font-bold text-xs"
                    >
                      Gerar
                    </button>
                  </div>
                </div>
              </div>

              {loadingInforme ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  <Loader2 className="animate-spin mx-auto mb-2 text-amber-700" size={20} />
                  Consolidando retenções fiscais e quotas de capital...
                </div>
              ) : informeData ? (
                <div className="space-y-3 text-xs bg-[#F8FAFC] border border-terminal-border rounded-xl p-4">
                  <div className="flex justify-between items-start border-b border-terminal-border pb-3">
                    <div>
                      <div className="text-[10px] text-amber-700 font-bold uppercase">
                        Comprovante de Rendimentos Pagos e de Retenção (Ano {informeData.ano_base || informeData.ano_calendario})
                      </div>
                      <div className="font-extrabold text-[#0F172A] text-sm mt-0.5">
                        {informeData.cooperado_name || informeData.beneficiario?.nome} • Doc: {informeData.document || informeData.beneficiario?.documento}
                      </div>
                      <div className="text-[10px] text-[#64748B]">
                        Fonte Pagadora: {informeData.fonte_pagadora?.nome} ({informeData.fonte_pagadora?.cnpj})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-white/20 text-[#0F172A] font-bold text-[10px] uppercase"
                    >
                      Imprimir / PDF
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-neon-cyan">
                      3. Rendimentos Tributáveis e Retenções na Fonte
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">01. Total dos Rendimentos Brutos (Produção):</span>
                      <span className="font-bold text-[#0F172A]">
                        R$ {Number(informeData.resumo_fiscal?.rendimentos_brutos_producao ?? informeData.quadro_3_rendimentos_tributaveis?.rendimentos_brutos_producao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>02. Contribuição Previdenciária Oficial (INSS Retido):</span>
                      <span>
                        R$ {Number(informeData.resumo_fiscal?.retencao_inss ?? informeData.quadro_3_rendimentos_tributaveis?.contribuicao_previdenciaria_inss ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>03. Imposto sobre a Renda Retido na Fonte (IRRF):</span>
                      <span>
                        R$ {Number(informeData.resumo_fiscal?.retencao_irrf ?? informeData.quadro_3_rendimentos_tributaveis?.imposto_renda_retido_irrf ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-purple-700">
                      <span>04. Taxa Administrativa / FATES Cooperativa:</span>
                      <span>
                        R$ {Number(informeData.resumo_fiscal?.taxa_cooperativa_fates ?? informeData.quadro_3_rendimentos_tributaveis?.taxa_administrativa_fates ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-terminal-border pt-2.5">
                    <div className="text-[10px] font-bold uppercase text-neon-green">
                      4. Rendimentos Isentos / Sobras AGO & 7. Bens e Direitos
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Sobras Líquidas Distribuídas em Assembleia (AGO):</span>
                      <span className="font-bold text-neon-green">
                        R$ {Number(informeData.resumo_fiscal?.sobras_distribuidas_ago ?? informeData.quadro_4_rendimentos_isentos_exclusivos?.sobras_liquidas_ago_distribuicao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Saldo Acumulado de Quotas-Partes de Capital Social:</span>
                      <span className="font-bold text-neon-cyan">
                        R$ {Number(informeData.resumo_fiscal?.capital_social_integralizado ?? informeData.quadro_7_bens_e_direitos?.saldo_quotas_capital_social_acumulado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#64748B] border border-dashed border-terminal-border rounded-xl">
                  Selecione um sócio cooperado acima para emitir o Informe Anual de Rendimentos.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ABA 5: OPEN FINANCE BRASIL (BACEN) & CONCILIAÇÃO BANCÁRIA ─── */}
        {activeTab === 'OPEN_FINANCE' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Consentimentos Open Finance da Cooperativa */}
              <div className="p-6 rounded-2xl bg-white shadow-sm border border-terminal-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neon-cyan font-bold uppercase tracking-widest">
                      BACEN Fase 2 (Dados) & Fase 3 (ITP PIX)
                    </span>
                    <h2 className="text-base font-extrabold text-[#0F172A] mt-0.5">
                      1. Conexão Bancária da Cooperativa (Open Finance)
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncOpenFinanceStatement}
                    disabled={loadingOf}
                    className="px-3.5 py-2 rounded-xl bg-neon-green text-white font-extrabold text-[11px] uppercase tracking-wider hover:opacity-90"
                  >
                    {loadingOf ? 'Sincronizando...' : 'Sincronizar Extrato & Conciliar Cotas'}
                  </button>
                </div>

                {ofSyncResult && (
                  <div className="p-3 rounded-xl bg-neon-green/10 border border-neon-green/30 text-xs text-neon-green">
                    Extrato Open Finance sincronizado: <strong>{ofSyncResult.reconciled_count}</strong> fatura(s) de cota conciliada(s) e <strong>{ofSyncResult.upgraded_cooperado_ids?.length || 0}</strong> cooperado(s) ativado(s) automaticamente.
                  </div>
                )}

                <form onSubmit={handleCreateOfConsent} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Instituição Participante (COMPE/ISPB)</label>
                    <select
                      value={ofConsentForm.bank_code}
                      onChange={(e) => setOfConsentForm({ ...ofConsentForm, bank_code: e.target.value })}
                      className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    >
                      {(ofBanks.length > 0 ? ofBanks : [
                        { code: '756', name: 'SICOOB - Banco Cooperativo Sicoob (756)' },
                        { code: '748', name: 'SICREDI - Banco Cooperativo Sicredi (748)' },
                        { code: '136', name: 'UNICRED Cooperativa (136)' },
                        { code: '133', name: 'CRESOL Cooperativa (133)' },
                        { code: '085', name: 'AILOS / Viacredi (085)' },
                        { code: '001', name: 'Banco do Brasil (001)' },
                        { code: '077', name: 'Banco Inter (077)' },
                      ]).map((b: any) => (
                        <option key={b.code} value={b.code}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Provedor / Agregador Homologado</label>
                    <select
                      value={ofConsentForm.aggregator}
                      onChange={(e) => setOfConsentForm({ ...ofConsentForm, aggregator: e.target.value })}
                      className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    >
                      <option value="PLUGGY">Pluggy Open Finance</option>
                      <option value="BELVO">Belvo Open Finance</option>
                      <option value="OPEN_FINANCE_BACEN_DIRECT">API FAPI / mTLS Direta (BACEN)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[#64748B] mb-1 uppercase">Token OAuth2/FAPI ou Chave de Consentimento *</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        required
                        value={ofConsentForm.client_secret_or_token}
                        onChange={(e) => setOfConsentForm({ ...ofConsentForm, client_secret_or_token: e.target.value })}
                        placeholder="Token criptografado com MultiFernet AES-256..."
                        className="flex-1 bg-white border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                      <button
                        type="submit"
                        disabled={loadingOf}
                        className="px-4 py-2 rounded-xl bg-neon-cyan text-white font-extrabold uppercase text-xs"
                      >
                        Conectar Banco
                      </button>
                    </div>
                  </div>
                </form>

                <div className="space-y-2 pt-2">
                  {ofConsents.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-white border border-terminal-border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#0F172A] flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-neon-green" />
                          {c.compe_code} — {c.institution_full_name}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          ISPB: {c.ispb} • Consent URN: {c.consent_urn}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/30 text-[10px] font-bold">
                        ATIVO (AES-256)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Domicílio Bancário & Chave PIX do Sócio Cooperado */}
              <div className="p-6 rounded-2xl bg-white shadow-sm border border-terminal-border space-y-4">
                <div>
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">
                    Domicílio Bancário & Recebimento de Sobras/Repasses
                  </span>
                  <h2 className="text-base font-extrabold text-[#0F172A] mt-0.5">
                    2. Vincular Conta Bancária & PIX do Cooperado
                  </h2>
                </div>

                <form onSubmit={handleLinkCooperadoAccount} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Sócio Cooperado *</label>
                    <select
                      required
                      value={ofAccountForm.cooperado_id}
                      onChange={(e) => setOfAccountForm({ ...ofAccountForm, cooperado_id: e.target.value })}
                      className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2.5 text-[#0F172A]"
                    >
                      <option value="">Selecione o cooperado...</option>
                      {cooperados.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.document})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase">Banco (COMPE)</label>
                      <input
                        value={ofAccountForm.bank_code}
                        onChange={(e) => setOfAccountForm({ ...ofAccountForm, bank_code: e.target.value })}
                        placeholder="756 (Sicoob)"
                        className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase">Agência / Cooperativa</label>
                      <input
                        required
                        value={ofAccountForm.branch}
                        onChange={(e) => setOfAccountForm({ ...ofAccountForm, branch: e.target.value })}
                        placeholder="0001"
                        className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase">Conta Corrente / Capital</label>
                      <input
                        required
                        value={ofAccountForm.account_number}
                        onChange={(e) => setOfAccountForm({ ...ofAccountForm, account_number: e.target.value })}
                        placeholder="12345-6"
                        className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase">Tipo de Conta</label>
                      <select
                        value={ofAccountForm.account_type}
                        onChange={(e) => setOfAccountForm({ ...ofAccountForm, account_type: e.target.value })}
                        className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      >
                        <option value="CONTA_CAPITAL_COOP">Conta Capital Cooperativa</option>
                        <option value="CONTA_CORRENTE">Conta Corrente</option>
                        <option value="CONTA_POUPANCA">Conta Poupança</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase">Chave PIX p/ Repasses (ITP) *</label>
                      <input
                        required
                        value={ofAccountForm.pix_key}
                        onChange={(e) => setOfAccountForm({ ...ofAccountForm, pix_key: e.target.value })}
                        placeholder="CPF/CNPJ, E-mail ou Celular"
                        className="w-full bg-white border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loadingOf}
                    className="w-full py-3 rounded-xl bg-neon-cyan text-white font-extrabold uppercase tracking-wider"
                  >
                    Salvar Domicílio Bancário Open Finance no Cooperado
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL NOVO / EDITAR SÓCIO (FICHA CADASTRAL COMPLETA + MULTIPLICIDADE) ─── */}
      {isNewSocioOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white shadow-2xl border border-terminal-border rounded-2xl p-6 w-full max-w-4xl relative my-8 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setIsNewSocioOpen(false)} className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A]">
              <X size={20} />
            </button>
            <h2 className="text-lg font-extrabold text-[#0F172A] uppercase tracking-wider mb-1">
              {editingSocioId ? 'Editar Ficha Cadastral de ' : 'Dossiê de Novo '}
              <span className="text-neon-cyan">Sócio / Cooperado</span>
            </h2>
            <p className="text-xs text-[#64748B] mb-5">
              Dados pessoais (data de nascimento e filiação), múltiplos telefones, múltiplos e-mails e múltiplas contas bancárias.
            </p>

            <datalist id="coop-compe-banks">
              {BRAZILIAN_BANKS_CATALOG.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.code} - {b.name}
                </option>
              ))}
            </datalist>

            <form onSubmit={handleCreateSocio} className="space-y-5 text-xs">
              {/* Bloco 1: Identificação & Dados Pessoais (Data de Nascimento + Filiação) */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-terminal-border space-y-3">
                <div className="text-neon-cyan font-bold uppercase tracking-wider flex items-center gap-2">
                  <Briefcase size={14} /> 1. Dados Pessoais & Identificação (Data de Nascimento e Filiação)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase font-bold">CPF ou CNPJ *</label>
                    <div className="flex bg-white shadow-sm border border-terminal-border rounded-xl overflow-hidden">
                      <input
                        required
                        value={socioForm.document}
                        onChange={(e) => setSocioForm({ ...socioForm, document: e.target.value })}
                        placeholder="CPF ou CNPJ"
                        className="bg-transparent flex-1 px-3 py-2 text-[#0F172A] outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCnpj}
                        disabled={loadingCnpj}
                        className="px-3 border-l border-terminal-border text-neon-cyan hover:bg-neon-cyan/10 font-bold"
                        title="Buscar CNPJ na BrasilAPI"
                      >
                        {loadingCnpj ? '...' : <Search size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[#64748B] mb-1 uppercase font-bold">Nome Completo / Razão Social *</label>
                    <input
                      required
                      value={socioForm.name}
                      onChange={(e) => setSocioForm({ ...socioForm, name: e.target.value })}
                      placeholder="Nome do Associado ou Empresa Cooperada"
                      className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase font-bold flex items-center gap-1">
                      <Calendar size={12} className="text-neon-cyan" /> Data de Nascimento
                    </label>
                    <input
                      type="date"
                      value={socioForm.birth_date}
                      onChange={(e) => setSocioForm({ ...socioForm, birth_date: e.target.value })}
                      className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase font-bold">Nº da Identidade (RG)</label>
                    <input
                      type="text"
                      value={socioForm.identity_number || ''}
                      onChange={(e) => setSocioForm({ ...socioForm, identity_number: e.target.value })}
                      placeholder="Ex.: 1234567890"
                      className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase font-bold">Órgão Emissor / UF</label>
                    <input
                      type="text"
                      value={socioForm.identity_issuer || ''}
                      onChange={(e) => setSocioForm({ ...socioForm, identity_issuer: e.target.value })}
                      placeholder="Ex.: SSP/RS"
                      className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Nome da Mãe (Filiação Materna)</label>
                    <input
                      value={socioForm.mother_name}
                      onChange={(e) => setSocioForm({ ...socioForm, mother_name: e.target.value })}
                      placeholder="Opcional"
                      className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#64748B] mb-1 uppercase">Nome do Pai (Filiação Paterna)</label>
                    <input
                      value={socioForm.father_name}
                      onChange={(e) => setSocioForm({ ...socioForm, father_name: e.target.value })}
                      placeholder="Opcional"
                      className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2: Múltiplos Telefones & Múltiplos E-mails */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Múltiplos Telefones */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-terminal-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-neon-cyan font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={14} /> 2A. Múltiplos Telefones
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSocioForm({
                          ...socioForm,
                          phones: [...socioForm.phones, { number: '', type: 'RECADO', label: '', is_whatsapp: false }],
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[10px] inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> + Telefone
                    </button>
                  </div>

                  {socioForm.phones.map((ph, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-xl border border-terminal-border">
                      <input
                        value={ph.number}
                        onChange={(e) => {
                          const next = [...socioForm.phones];
                          next[idx] = { ...next[idx], number: e.target.value };
                          setSocioForm({ ...socioForm, phones: next });
                        }}
                        placeholder="(51) 99999-9999"
                        className="col-span-4 bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-1.5 text-[#0F172A]"
                      />
                      <select
                        value={ph.type || 'PROPRIO'}
                        onChange={(e) => {
                          const next = [...socioForm.phones];
                          next[idx] = { ...next[idx], type: e.target.value };
                          setSocioForm({ ...socioForm, phones: next });
                        }}
                        className="col-span-4 bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-1.5 text-[#0F172A]"
                      >
                        <option value="PROPRIO">Próprio</option>
                        <option value="MAE">Tel. da Mãe</option>
                        <option value="PAI">Tel. do Pai</option>
                        <option value="RECADO">Para Recado</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="COMERCIAL">Comercial</option>
                        <option value="RESIDENCIAL">Residencial</option>
                      </select>
                      <input
                        value={ph.label || ''}
                        onChange={(e) => {
                          const next = [...socioForm.phones];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setSocioForm({ ...socioForm, phones: next });
                        }}
                        placeholder="Contato/Obs"
                        className="col-span-3 bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-1.5 text-[#0F172A]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = socioForm.phones.filter((_, i) => i !== idx);
                          setSocioForm({
                            ...socioForm,
                            phones: next.length ? next : [{ number: '', type: 'PROPRIO', label: '' }],
                          });
                        }}
                        className="col-span-1 text-red-600 hover:bg-red-50 p-1 rounded flex justify-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Múltiplos E-mails */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-terminal-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-neon-cyan font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Mail size={14} /> 2B. Múltiplos E-mails
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSocioForm({
                          ...socioForm,
                          emails: [...socioForm.emails, { email: '', type: 'SECUNDARIO', label: '' }],
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[10px] inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> + E-mail
                    </button>
                  </div>

                  {socioForm.emails.map((em, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-xl border border-terminal-border">
                      <input
                        type="email"
                        value={em.email}
                        onChange={(e) => {
                          const next = [...socioForm.emails];
                          next[idx] = { ...next[idx], email: e.target.value };
                          setSocioForm({ ...socioForm, emails: next });
                        }}
                        placeholder="socio@email.com"
                        className="col-span-7 bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-1.5 text-[#0F172A]"
                      />
                      <select
                        value={em.type || 'PRINCIPAL'}
                        onChange={(e) => {
                          const next = [...socioForm.emails];
                          next[idx] = { ...next[idx], type: e.target.value };
                          setSocioForm({ ...socioForm, emails: next });
                        }}
                        className="col-span-4 bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-1.5 text-[#0F172A]"
                      >
                        <option value="PRINCIPAL">Principal</option>
                        <option value="PESSOAL">Pessoal</option>
                        <option value="FINANCEIRO">Financeiro</option>
                        <option value="CORPORATIVO">Corporativo</option>
                        <option value="SECUNDARIO">Secundário</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const next = socioForm.emails.filter((_, i) => i !== idx);
                          setSocioForm({
                            ...socioForm,
                            emails: next.length ? next : [{ email: '', type: 'PRINCIPAL' }],
                          });
                        }}
                        className="col-span-1 text-red-600 hover:bg-red-50 p-1 rounded flex justify-center"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloco 3: Dados Bancários Estruturados & Múltiplas Contas Bancárias */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-terminal-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-neon-cyan font-bold uppercase tracking-wider flex items-center gap-2">
                      <Landmark size={14} /> 3. Dados Bancários Estruturados (Suporte a Múltiplas Contas)
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Número do banco, nome da instituição, agência e conta em campos separados e organizados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSocioForm({
                        ...socioForm,
                        bank_accounts: [
                          ...socioForm.bank_accounts,
                          { bank_code: '', bank_name: '', agency: '', account: '', account_type: 'CONTA_CORRENTE', pix_key: '' },
                        ],
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px] inline-flex items-center gap-1"
                  >
                    <Plus size={13} /> Adicionar Conta Bancária
                  </button>
                </div>

                {socioForm.bank_accounts.map((ba, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-terminal-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-neon-cyan">
                        Conta Bancária #{idx + 1} {idx === 0 ? '(Domicílio Principal)' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = socioForm.bank_accounts.filter((_, i) => i !== idx);
                          setSocioForm({
                            ...socioForm,
                            bank_accounts: next.length
                              ? next
                              : [{ bank_code: '', bank_name: '', agency: '', account: '', account_type: 'CONTA_CORRENTE', pix_key: '' }],
                          });
                        }}
                        className="text-red-600 hover:bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-[#64748B] uppercase font-bold mb-0.5">Nº do Banco</label>
                        <input
                          list="coop-compe-banks"
                          value={ba.bank_code || ''}
                          onChange={(e) => {
                            const code = e.target.value;
                            const autoName = resolveBankNameByCode(code);
                            const next = [...socioForm.bank_accounts];
                            next[idx] = {
                              ...next[idx],
                              bank_code: code,
                              bank_name: autoName || next[idx].bank_name,
                            };
                            setSocioForm({ ...socioForm, bank_accounts: next });
                          }}
                          placeholder="756, 001..."
                          className="w-full bg-[#F8FAFC] border border-terminal-border rounded-lg px-2.5 py-2 text-[#0F172A] font-mono"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-[#64748B] uppercase font-bold mb-0.5">Nome do Banco</label>
                        <input
                          value={ba.bank_name || ''}
                          onChange={(e) => {
                            const next = [...socioForm.bank_accounts];
                            next[idx] = { ...next[idx], bank_name: e.target.value };
                            setSocioForm({ ...socioForm, bank_accounts: next });
                          }}
                          placeholder="Sicoob, Sicredi, BB..."
                          className="w-full bg-[#F8FAFC] border border-terminal-border rounded-lg px-2.5 py-2 text-[#0F172A]"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-[#64748B] uppercase font-bold mb-0.5">Agência</label>
                        <input
                          value={ba.agency || ''}
                          onChange={(e) => {
                            const next = [...socioForm.bank_accounts];
                            next[idx] = { ...next[idx], agency: e.target.value };
                            setSocioForm({ ...socioForm, bank_accounts: next });
                          }}
                          placeholder="0001"
                          className="w-full bg-[#F8FAFC] border border-terminal-border rounded-lg px-2.5 py-2 text-[#0F172A] font-mono"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-[#64748B] uppercase font-bold mb-0.5">Conta</label>
                        <input
                          value={ba.account || ''}
                          onChange={(e) => {
                            const next = [...socioForm.bank_accounts];
                            next[idx] = { ...next[idx], account: e.target.value };
                            setSocioForm({ ...socioForm, bank_accounts: next });
                          }}
                          placeholder="12345-6"
                          className="w-full bg-[#F8FAFC] border border-terminal-border rounded-lg px-2.5 py-2 text-[#0F172A] font-mono"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-[#64748B] uppercase font-bold mb-0.5">Tipo / Chave PIX</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={ba.account_type || 'CONTA_CAPITAL_COOP'}
                            onChange={(e) => {
                              const next = [...socioForm.bank_accounts];
                              next[idx] = { ...next[idx], account_type: e.target.value };
                              setSocioForm({ ...socioForm, bank_accounts: next });
                            }}
                            className="bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-2 text-[11px] text-[#0F172A]"
                          >
                            <option value="CONTA_CAPITAL_COOP">Conta Capital</option>
                            <option value="CONTA_CORRENTE">Corrente</option>
                            <option value="CONTA_POUPANCA">Poupança</option>
                            <option value="CONTA_SALARIO">Salário</option>
                          </select>
                          <input
                            value={ba.pix_key || ''}
                            onChange={(e) => {
                              const next = [...socioForm.bank_accounts];
                              next[idx] = { ...next[idx], pix_key: e.target.value };
                              setSocioForm({ ...socioForm, bank_accounts: next });
                            }}
                            placeholder="Chave PIX"
                            className="bg-[#F8FAFC] border border-terminal-border rounded-lg px-2 py-2 text-[11px] text-[#0F172A]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bloco 4: Endereço + Identificadores Cooperativa */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-terminal-border space-y-3">
                  <div className="text-neon-green font-bold uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={14} /> 4. Localização (Auto-Fill CEP)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <div className="flex bg-white shadow-sm border border-terminal-border rounded-xl overflow-hidden">
                        <input
                          value={socioForm.cep}
                          onChange={(e) => setSocioForm({ ...socioForm, cep: e.target.value })}
                          placeholder="CEP 00000-000"
                          className="bg-transparent flex-1 px-2.5 py-2 text-[#0F172A] outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleLookupCep}
                          disabled={loadingCep}
                          className="px-2.5 border-l border-terminal-border text-neon-green hover:bg-neon-green/10"
                        >
                          {loadingCep ? '...' : <Search size={13} />}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        value={socioForm.endereco}
                        onChange={(e) => setSocioForm({ ...socioForm, endereco: e.target.value })}
                        placeholder="Logradouro / Endereço"
                        className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <input
                      value={socioForm.bairro}
                      onChange={(e) => setSocioForm({ ...socioForm, bairro: e.target.value })}
                      placeholder="Bairro"
                      className="bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                    <input
                      value={socioForm.cidade}
                      onChange={(e) => setSocioForm({ ...socioForm, cidade: e.target.value })}
                      placeholder="Cidade"
                      className="bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                    />
                    <input
                      value={socioForm.uf}
                      onChange={(e) => setSocioForm({ ...socioForm, uf: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                      className="bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A] uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchCepByAddress}
                    disabled={loadingCep}
                    className="w-full px-3 py-2 rounded-xl bg-neon-green/15 text-neon-green border border-neon-green/40 font-bold text-[11px] inline-flex items-center justify-center gap-1.5"
                  >
                    <Search size={13} /> Não sei o CEP — buscar pelo endereço (UF + Cidade + Logradouro)
                  </button>
                  {cepOptions.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-terminal-border bg-white divide-y divide-terminal-border">
                      {cepOptions.map((o) => (
                        <button
                          type="button"
                          key={o.cep + o.logradouro}
                          onClick={() => applyCepOption(o)}
                          className="w-full text-left px-3 py-2 hover:bg-neon-green/10 text-[11px] text-[#0F172A]"
                        >
                          <strong>{o.cep}</strong> — {o.logradouro}, {o.bairro} ({o.localidade}/{o.uf})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-terminal-border space-y-3">
                  <div className="text-amber-700 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Hash size={14} /> 5. Identificadores Cooperativistas & Status
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase text-[10px]">NIS / PIS</label>
                      <input
                        value={socioForm.nis}
                        onChange={(e) => setSocioForm({ ...socioForm, nis: e.target.value })}
                        placeholder="Número NIS"
                        className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase text-[10px]">Matrícula</label>
                      <input
                        value={socioForm.matricula}
                        onChange={(e) => setSocioForm({ ...socioForm, matricula: e.target.value })}
                        placeholder="Matrícula interna"
                        className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#64748B] mb-1 uppercase text-[10px]">Status Societário</label>
                      <select
                        value={socioForm.status}
                        onChange={(e) => setSocioForm({ ...socioForm, status: e.target.value })}
                        className="w-full bg-white shadow-sm border border-terminal-border rounded-xl px-3 py-2 text-[#0F172A]"
                      >
                        <option value="ATIVO">Sócio Ativo</option>
                        <option value="COTAS_LIQUIDADAS">Cotas Liquidadas</option>
                        <option value="ANALISE_COMITE">Análise Comitê</option>
                        <option value="PROPOSTA_CADASTRADA">Proposta Cadastrada</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="sticky bottom-0 z-10 w-full py-3.5 rounded-xl bg-neon-cyan text-white font-extrabold uppercase tracking-widest hover:opacity-90 shadow-[0_-8px_16px_rgba(255,255,255,0.9)]"
              >
                {submitting
                  ? 'Submetendo ao Master DB...'
                  : editingSocioId
                  ? 'Salvar Alterações da Ficha & Sincronizar OrBrick'
                  : 'Registrar Sócio & Sincronizar OrBrick'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DOSSIÊ & EXTRATO DE COTAS DO SÓCIO ──────────────────────── */}
      {selectedSocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white shadow-2xl border border-terminal-border rounded-2xl p-6 w-full max-w-2xl relative space-y-5 text-xs my-8">
            <button onClick={() => setSelectedSocio(null)} className="absolute top-4 right-4 text-[#64748B] hover:text-[#0F172A]">
              <X size={18} />
            </button>
            <div className="flex items-start justify-between pr-8">
              <div>
                <span className="text-[10px] text-neon-cyan uppercase font-bold tracking-widest">Dossiê Individual do Associado</span>
                <h2 className="text-lg font-extrabold text-[#0F172A] mt-0.5">{selectedSocio.name}</h2>
                <p className="text-[#64748B]">Doc: {selectedSocio.document} • {selectedSocio.notes || 'Sem observações'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const coop = selectedSocio;
                  setSelectedSocio(null);
                  openEditSocioModal(coop);
                }}
                className="px-3 py-1.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Edit3 size={13} /> Editar Ficha Cadastral
              </button>
            </div>

            {/* Resumo Cadastral Completo: Nascimento, Filiação, Múltiplos Telefones, E-mails e Contas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-terminal-border">
              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Dados Pessoais</div>
                <div className="mt-1 space-y-1 text-[#0F172A]">
                  <div>
                    <strong>Data de Nascimento:</strong>{' '}
                    {selectedSocio.birth_date
                      ? selectedSocio.birth_date.includes('-')
                        ? selectedSocio.birth_date.split('-').reverse().join('/')
                        : selectedSocio.birth_date
                      : 'Não informada'}
                  </div>
                  <div>
                    <strong>Filiação:</strong> {selectedSocio.filiation || 'Não informada'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-[#64748B]">Telefones & E-mails Vinculados</div>
                <div className="mt-1 space-y-1">
                  {(selectedSocio.phones && selectedSocio.phones.length > 0
                    ? selectedSocio.phones
                    : selectedSocio.phone
                    ? [{ number: selectedSocio.phone, type: 'PROPRIO', label: 'Principal' }]
                    : []
                  ).map((p, i) => (
                    <div key={i} className="text-[#0F172A]">
                      <Phone size={11} className="inline mr-1 text-neon-cyan" />
                      {p.number}{' '}
                      <span className="text-[10px] text-[#64748B]">({p.label || p.type || 'Contato'})</span>
                    </div>
                  ))}
                  {(selectedSocio.emails && selectedSocio.emails.length > 0
                    ? selectedSocio.emails
                    : selectedSocio.email
                    ? [{ email: selectedSocio.email, type: 'PRINCIPAL' }]
                    : []
                  ).map((em, i) => (
                    <div key={i} className="text-[#0F172A]">
                      <Mail size={11} className="inline mr-1 text-neon-cyan" />
                      {em.email} <span className="text-[10px] text-[#64748B]">({em.type || 'Principal'})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 border-t border-terminal-border pt-2.5">
                <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1">
                  Contas Bancárias Vinculadas ({selectedSocio.bank_accounts?.length || (selectedSocio.bank_code ? 1 : 0)})
                </div>
                {selectedSocio.bank_accounts && selectedSocio.bank_accounts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedSocio.bank_accounts.map((ba, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white border border-terminal-border text-[11px]">
                        <div className="font-bold text-[#0F172A]">
                          <Landmark size={11} className="inline mr-1 text-neon-cyan" />
                          Banco {ba.bank_code || '-'} — {ba.bank_name || resolveBankNameByCode(ba.bank_code) || 'Instituição'}
                        </div>
                        <div className="text-[#64748B] font-mono">
                          Agência: {ba.agency || '-'} • Conta: {ba.account || '-'} ({ba.account_type || 'CORRENTE'})
                        </div>
                        {ba.pix_key && <div className="text-[10px] text-neon-cyan">PIX: {ba.pix_key}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[#64748B]">{selectedSocio.bank_details || 'Nenhuma conta estruturada cadastrada.'}</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['PROPOSTA_CADASTRADA', 'ANALISE_COMITE', 'COTAS_LIQUIDADAS', 'ATIVO', 'DESLIGADO'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => handleChangeStatus(selectedSocio, st)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase ${
                    selectedSocio.status === st
                      ? 'bg-neon-cyan text-white border-neon-cyan'
                      : 'bg-[#F1F5F9] text-[#64748B] border-terminal-border hover:text-[#0F172A]'
                  }`}
                >
                  {STATUS_META[st]?.label || st}
                </button>
              ))}
            </div>

            {loadingBalance ? (
              <div className="py-8 text-center text-[#64748B]">
                <Loader2 className="animate-spin mx-auto mb-2" size={18} /> Consultando extrato de aportes (12 meses)...
              </div>
            ) : socioBalance ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-terminal-border">
                  <div className="text-[10px] text-[#64748B] uppercase">Total Integralizado</div>
                  <div className="text-sm font-extrabold text-neon-green mt-1">
                    R$ {Number(socioBalance.total_paid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-terminal-border">
                  <div className="text-[10px] text-[#64748B] uppercase">Em Aberto</div>
                  <div className="text-sm font-extrabold text-amber-700 mt-1">
                    R$ {Number(socioBalance.total_pending).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-terminal-border">
                  <div className="text-[10px] text-[#64748B] uppercase">Saldo Líquido</div>
                  <div className="text-sm font-extrabold text-neon-cyan mt-1">
                    R$ {Number(socioBalance.net_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
