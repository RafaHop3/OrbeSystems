'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Users, Plus, FileSpreadsheet, Search, X, Loader2,
    Phone, Mail, Landmark, Calendar, Trash2, Edit3, HeartHandshake, MapPin
} from 'lucide-react';
import {
    crmApi,
    CRMContactOut,
    CRMContactCreate,
    ContactPhoneEntry,
    ContactEmailEntry,
    ContactBankAccountEntry,
    BRAZILIAN_BANKS_CATALOG,
    resolveBankNameByCode,
    searchCepByAddress,
    CepSearchResult,
} from '@/lib/api';

const TABS = [
    { id: 'ALL', label: 'Todos' },
    { id: 'CUSTOMER', label: 'Clientes' },
    { id: 'SUPPLIER', label: 'Fornecedores' },
    { id: 'EMPLOYEE', label: 'Funcionários' },
    { id: 'COOPERADO', label: 'Cooperados' },
    { id: 'PARTNER', label: 'Sócios' },
];

const PHONE_TYPES = [
    { value: 'PROPRIO', label: 'Telefone Próprio' },
    { value: 'MAE', label: 'Telefone da Mãe' },
    { value: 'PAI', label: 'Telefone do Pai' },
    { value: 'RECADO', label: 'Telefone para Recado' },
    { value: 'WHATSAPP', label: 'WhatsApp Principal' },
    { value: 'COMERCIAL', label: 'Comercial / Trabalho' },
    { value: 'RESIDENCIAL', label: 'Residencial / Fixo' },
    { value: 'OUTRO', label: 'Outro Contato' },
];

const EMAIL_TYPES = [
    { value: 'PRINCIPAL', label: 'E-mail Principal' },
    { value: 'PESSOAL', label: 'Pessoal' },
    { value: 'FINANCEIRO', label: 'Financeiro / Cobrança' },
    { value: 'CORPORATIVO', label: 'Corporativo' },
    { value: 'SECUNDARIO', label: 'Secundário / Familiar' },
];

const BANK_ACCOUNT_TYPES = [
    { value: 'CONTA_CORRENTE', label: 'Conta Corrente' },
    { value: 'CONTA_POUPANCA', label: 'Conta Poupança' },
    { value: 'CONTA_CAPITAL_COOP', label: 'Conta Capital Cooperativa' },
    { value: 'CONTA_SALARIO', label: 'Conta Salário' },
    { value: 'CONTA_PAGAMENTO', label: 'Conta Pagamento / Digital' },
];

function formatBirthDateBR(isoOrRaw?: string): string {
    if (!isoOrRaw) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrRaw)) {
        const [y, m, d] = isoOrRaw.split('-');
        return `${d}/${m}/${y}`;
    }
    return isoOrRaw;
}

function emptyContactForm(defaultCategory: CRMContactCreate['category'] = 'CUSTOMER'): CRMContactCreate {
    return {
        name: '',
        category: defaultCategory,
        document: '',
        birth_date: '',
        identity_number: '',
        identity_issuer: '',
        filiation: '',
        mother_name: '',
        father_name: '',
        email: '',
        phone: '',
        bank_code: '',
        bank_name: '',
        bank_agency: '',
        bank_account: '',
        bank_account_type: 'CONTA_CORRENTE',
        pix_key: '',
        zip_code: '',
        address: '',
        city: '',
        state: '',
        notes: '',
        phones: [{ number: '', type: 'PROPRIO', label: 'Telefone Próprio', is_whatsapp: true, is_primary: true }],
        emails: [{ email: '', type: 'PRINCIPAL', label: 'E-mail Principal', is_primary: true }],
        bank_accounts: [
            {
                bank_code: '',
                bank_name: '',
                agency: '',
                account: '',
                account_type: 'CONTA_CORRENTE',
                pix_key: '',
                is_primary: true,
            },
        ],
    };
}

function ContactsContent() {
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category');

    const [contacts, setContacts] = useState<CRMContactOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(urlCategory || 'ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State (Novo Cadastro / Edição)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingCep, setLoadingCep] = useState(false);
    const [cepOptions, setCepOptions] = useState<CepSearchResult[]>([]);
    const [loadingCnpj, setLoadingCnpj] = useState(false);
    const [formData, setFormData] = useState<CRMContactCreate>(() => emptyContactForm('CUSTOMER'));

    useEffect(() => {
        if (urlCategory && TABS.some((t) => t.id === urlCategory)) {
            setActiveTab(urlCategory);
            if (urlCategory !== 'ALL') {
                setFormData((prev) => ({ ...prev, category: urlCategory as any }));
            }
        } else if (!urlCategory) {
            setActiveTab('ALL');
        }
    }, [urlCategory]);

    useEffect(() => {
        loadContacts();
    }, [activeTab]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await crmApi.getContacts(activeTab === 'ALL' ? undefined : activeTab);
            setContacts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        const defaultCat =
            activeTab !== 'ALL' ? (activeTab as CRMContactCreate['category']) : 'CUSTOMER';
        setEditingId(null);
        setFormData(emptyContactForm(defaultCat));
        setIsModalOpen(true);
    };

    const openEditModal = (c: CRMContactOut) => {
        setEditingId(c.id);
        const phones: ContactPhoneEntry[] =
            c.phones && c.phones.length > 0
                ? c.phones
                : [{ number: c.phone || '', type: 'PROPRIO', label: 'Telefone Próprio', is_whatsapp: true, is_primary: true }];
        const emails: ContactEmailEntry[] =
            c.emails && c.emails.length > 0
                ? c.emails
                : [{ email: c.email || '', type: 'PRINCIPAL', label: 'E-mail Principal', is_primary: true }];
        const bankAccounts: ContactBankAccountEntry[] =
            c.bank_accounts && c.bank_accounts.length > 0
                ? c.bank_accounts
                : [
                      {
                          bank_code: c.bank_code || '',
                          bank_name: c.bank_name || resolveBankNameByCode(c.bank_code),
                          agency: c.bank_agency || '',
                          account: c.bank_account || '',
                          account_type: c.bank_account_type || 'CONTA_CORRENTE',
                          pix_key: c.pix_key || '',
                          is_primary: true,
                      },
                  ];

        setFormData({
            name: c.name || '',
            category: (c.category as any) || 'CUSTOMER',
            document: c.document || '',
            birth_date: c.birth_date || '',
            identity_number: c.identity_number || '',
            identity_issuer: c.identity_issuer || '',
            filiation: c.filiation || '',
            mother_name: c.mother_name || '',
            father_name: c.father_name || '',
            email: c.email || '',
            phone: c.phone || '',
            bank_code: c.bank_code || '',
            bank_name: c.bank_name || '',
            bank_agency: c.bank_agency || '',
            bank_account: c.bank_account || '',
            bank_account_type: c.bank_account_type || 'CONTA_CORRENTE',
            pix_key: c.pix_key || '',
            bank_details: c.bank_details || '',
            zip_code: c.zip_code || '',
            address: c.address || '',
            city: c.city || '',
            state: c.state || '',
            notes: c.notes || '',
            phones,
            emails,
            bank_accounts: bankAccounts,
        });
        setIsModalOpen(true);
    };

    // Dynamic list handlers: Phones
    const addPhoneRow = () => {
        setFormData((prev) => ({
            ...prev,
            phones: [
                ...(prev.phones || []),
                { number: '', type: 'RECADO', label: '', is_whatsapp: false, is_primary: false },
            ],
        }));
    };

    const updatePhoneRow = (index: number, patch: Partial<ContactPhoneEntry>) => {
        setFormData((prev) => {
            const list = [...(prev.phones || [])];
            list[index] = { ...list[index], ...patch };
            return { ...prev, phones: list };
        });
    };

    const removePhoneRow = (index: number) => {
        setFormData((prev) => {
            const list = (prev.phones || []).filter((_, i) => i !== index);
            return {
                ...prev,
                phones: list.length > 0 ? list : [{ number: '', type: 'PROPRIO', label: '', is_primary: true }],
            };
        });
    };

    // Dynamic list handlers: Emails
    const addEmailRow = () => {
        setFormData((prev) => ({
            ...prev,
            emails: [...(prev.emails || []), { email: '', type: 'SECUNDARIO', label: '', is_primary: false }],
        }));
    };

    const updateEmailRow = (index: number, patch: Partial<ContactEmailEntry>) => {
        setFormData((prev) => {
            const list = [...(prev.emails || [])];
            list[index] = { ...list[index], ...patch };
            return { ...prev, emails: list };
        });
    };

    const removeEmailRow = (index: number) => {
        setFormData((prev) => {
            const list = (prev.emails || []).filter((_, i) => i !== index);
            return {
                ...prev,
                emails: list.length > 0 ? list : [{ email: '', type: 'PRINCIPAL', label: '', is_primary: true }],
            };
        });
    };

    // Dynamic list handlers: Bank Accounts
    const addBankAccountRow = () => {
        setFormData((prev) => ({
            ...prev,
            bank_accounts: [
                ...(prev.bank_accounts || []),
                {
                    bank_code: '',
                    bank_name: '',
                    agency: '',
                    account: '',
                    account_type: 'CONTA_CORRENTE',
                    pix_key: '',
                    is_primary: false,
                },
            ],
        }));
    };

    const updateBankAccountRow = (index: number, patch: Partial<ContactBankAccountEntry>) => {
        setFormData((prev) => {
            const list = [...(prev.bank_accounts || [])];
            const current = { ...list[index], ...patch };
            if (patch.bank_code !== undefined) {
                const autoName = resolveBankNameByCode(patch.bank_code);
                if (autoName && (!current.bank_name || BRAZILIAN_BANKS_CATALOG.some((b) => b.name === current.bank_name))) {
                    current.bank_name = autoName;
                }
            }
            list[index] = current;
            return { ...prev, bank_accounts: list };
        });
    };

    const removeBankAccountRow = (index: number) => {
        setFormData((prev) => {
            const list = (prev.bank_accounts || []).filter((_, i) => i !== index);
            return {
                ...prev,
                bank_accounts:
                    list.length > 0
                        ? list
                        : [
                              {
                                  bank_code: '',
                                  bank_name: '',
                                  agency: '',
                                  account: '',
                                  account_type: 'CONTA_CORRENTE',
                                  pix_key: '',
                                  is_primary: true,
                              },
                          ],
            };
        });
    };

    const handleLookupCnpj = async () => {
        const clean = (formData.document || '').replace(/\D/g, '');
        if (clean.length !== 14) {
            alert('Para busca automática na Receita/BrasilAPI, informe um CNPJ de 14 dígitos.');
            return;
        }
        setLoadingCnpj(true);
        try {
            const data = await crmApi.lookupCnpj(clean);
            setFormData((prev) => {
                const nextPhones = [...(prev.phones || [])];
                if (data.ddd_telefone_1 && (!nextPhones[0] || !nextPhones[0].number)) {
                    nextPhones[0] = { number: data.ddd_telefone_1, type: 'COMERCIAL', label: 'Telefone Receita', is_primary: true };
                }
                const nextEmails = [...(prev.emails || [])];
                if (data.email && (!nextEmails[0] || !nextEmails[0].email)) {
                    nextEmails[0] = { email: data.email, type: 'CORPORATIVO', label: 'E-mail Receita', is_primary: true };
                }
                return {
                    ...prev,
                    name: data.razao_social || prev.name,
                    zip_code: data.cep || prev.zip_code,
                    address: `${data.logradouro || ''} ${data.numero || ''}`.trim() || prev.address,
                    city: data.municipio || prev.city,
                    state: data.uf || prev.state,
                    phones: nextPhones,
                    emails: nextEmails,
                };
            });
        } catch (err: any) {
            alert(err?.message || 'Não foi possível consultar o CNPJ.');
        } finally {
            setLoadingCnpj(false);
        }
    };

    const applyCepOption = (o: CepSearchResult) => {
        setFormData((prev) => ({
            ...prev,
            zip_code: o.cep || prev.zip_code,
            address: [o.logradouro, o.bairro].filter(Boolean).join(', ') || prev.address,
            city: o.localidade || prev.city,
            state: o.uf || prev.state,
        }));
        setCepOptions([]);
    };

    const handleSearchCepByAddress = async () => {
        setLoadingCep(true);
        try {
            const list = await searchCepByAddress(formData.state || '', formData.city || '', formData.address || '');
            if (list.length === 1) applyCepOption(list[0]);
            else setCepOptions(list);
        } catch (err: any) {
            alert(err?.message || 'Não foi possível buscar o CEP pelo endereço.');
        } finally {
            setLoadingCep(false);
        }
    };

    const handleLookupCep = async () => {
        const clean = (formData.zip_code || '').replace(/\D/g, '');
        if (clean.length !== 8) {
            alert('Informe um CEP com 8 dígitos.');
            return;
        }
        setLoadingCep(true);
        try {
            const data = await crmApi.lookupCep(clean);
            setFormData((prev) => ({
                ...prev,
                address: data.street || prev.address,
                city: data.city || prev.city,
                state: data.state || prev.state,
            }));
        } catch (err: any) {
            alert(err?.message || 'Não foi possível consultar o CEP.');
        } finally {
            setLoadingCep(false);
        }
    };

    const handleSaveContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const validPhones = (formData.phones || []).filter((p) => (p.number || '').trim().length > 0);
            const validEmails = (formData.emails || []).filter((em) => (em.email || '').trim().length > 0);
            const validBanks = (formData.bank_accounts || []).filter((b) =>
                Boolean(
                    (b.bank_code || '').trim() ||
                        (b.bank_name || '').trim() ||
                        (b.agency || '').trim() ||
                        (b.account || '').trim() ||
                        (b.pix_key || '').trim()
                )
            );

            const primaryPhone = validPhones[0]?.number || formData.phone || undefined;
            const primaryEmail = validEmails[0]?.email || formData.email || undefined;
            const primaryBank = validBanks[0];

            const combinedFiliation =
                (formData.filiation || '').trim() ||
                [
                    formData.mother_name ? `Mãe: ${formData.mother_name.trim()}` : '',
                    formData.father_name ? `Pai: ${formData.father_name.trim()}` : '',
                ]
                    .filter(Boolean)
                    .join(' | ') ||
                undefined;

            const payload: CRMContactCreate = {
                ...formData,
                birth_date: formData.birth_date || undefined,
                identity_number: formData.identity_number || undefined,
                identity_issuer: formData.identity_issuer || undefined,
                filiation: combinedFiliation,
                mother_name: formData.mother_name || undefined,
                father_name: formData.father_name || undefined,
                phone: primaryPhone,
                email: primaryEmail,
                bank_code: primaryBank?.bank_code || formData.bank_code || undefined,
                bank_name: primaryBank?.bank_name || formData.bank_name || undefined,
                bank_agency: primaryBank?.agency || formData.bank_agency || undefined,
                bank_account: primaryBank?.account || formData.bank_account || undefined,
                bank_account_type: primaryBank?.account_type || formData.bank_account_type || undefined,
                pix_key: primaryBank?.pix_key || formData.pix_key || undefined,
                phones: validPhones,
                emails: validEmails,
                bank_accounts: validBanks,
            };

            if (editingId) {
                await crmApi.updateContact(editingId, payload);
            } else {
                await crmApi.createContact(payload);
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyContactForm('CUSTOMER'));
            await loadContacts();
        } catch (error: any) {
            console.error(error);
            alert(error?.message || 'Falha ao salvar ficha cadastral.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredContacts = contacts.filter((c) => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        const inPhones = (c.phones || []).some(
            (p) => (p.number || '').toLowerCase().includes(q) || (p.label || '').toLowerCase().includes(q)
        );
        const inEmails = (c.emails || []).some((e) => (e.email || '').toLowerCase().includes(q));
        return (
            c.name.toLowerCase().includes(q) ||
            (c.document && c.document.toLowerCase().includes(q)) ||
            (c.filiation && c.filiation.toLowerCase().includes(q)) ||
            inPhones ||
            inEmails
        );
    });

    return (
        <div className="min-h-screen bg-inho-black p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-inho-text flex items-center gap-2">
                            Gestão de Contatos & Fichas Cadastrais (CRM 360º)
                            <Users size={22} className="text-neon-cyan" />
                        </h1>
                        <p className="text-xs text-inho-muted mt-1">
                            Fichas completas com Data de Nascimento, Filiação, Múltiplos Telefones, E-mails e Contas Bancárias.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-inho-dark border border-inho-border hover:bg-inho-dark/80 text-[#0F172A] px-4 py-2 rounded-xl transition-all font-bold text-xs">
                            <FileSpreadsheet size={16} />
                            Importar CSV
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan/30 text-neon-cyan px-4 py-2 rounded-xl transition-all font-bold text-xs shadow-[0_0_15px_rgba(184,134,11,0.2)]"
                        >
                            <Plus size={16} />
                            Novo Cadastro
                        </button>
                    </div>
                </div>

                {/* Filters & Tabs */}
                <div className="glassmorphism rounded-2xl border border-inho-border p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                                        : 'text-inho-muted hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-transparent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-inho-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, CPF/CNPJ, filiação, tel ou e-mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#F1F5F9] border border-inho-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0F172A] focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-inho-muted"
                        />
                    </div>
                </div>

                {/* Table View */}
                <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-inho-text">
                            <thead className="bg-inho-dark/80 border-b border-inho-border text-inho-muted font-mono text-[10px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-5 py-4">Nome / Dados Pessoais</th>
                                    <th className="px-5 py-4">Documento</th>
                                    <th className="px-5 py-4">Telefones & E-mails</th>
                                    <th className="px-5 py-4">Dados Bancários</th>
                                    <th className="px-5 py-4">Categoria</th>
                                    <th className="px-5 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inho-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredContacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-inho-muted font-mono text-xs">
                                            Nenhum cadastro encontrado nesta visão.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredContacts.map((c) => {
                                        const phones = c.phones && c.phones.length > 0 ? c.phones : c.phone ? [{ number: c.phone, type: 'PROPRIO' }] : [];
                                        const emails = c.emails && c.emails.length > 0 ? c.emails : c.email ? [{ email: c.email, type: 'PRINCIPAL' }] : [];
                                        const banks =
                                            c.bank_accounts && c.bank_accounts.length > 0
                                                ? c.bank_accounts
                                                : c.bank_code || c.bank_name || c.bank_agency || c.bank_account
                                                ? [
                                                      {
                                                          bank_code: c.bank_code,
                                                          bank_name: c.bank_name,
                                                          agency: c.bank_agency,
                                                          account: c.bank_account,
                                                      },
                                                  ]
                                                : [];

                                        return (
                                            <tr key={c.id} className="hover:bg-inho-dark/40 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-[#0F172A] text-sm">{c.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-inho-muted">
                                                        {c.birth_date && (
                                                            <span className="inline-flex items-center gap-1 bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                                                                <Calendar size={11} className="text-neon-cyan" />
                                                                Nasc: {formatBirthDateBR(c.birth_date)}
                                                            </span>
                                                        )}
                                                        {c.filiation && (
                                                            <span className="inline-flex items-center gap-1 bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0] max-w-xs truncate">
                                                                <HeartHandshake size={11} className="text-neon-cyan" />
                                                                Filiação: {c.filiation}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-mono text-xs text-inho-muted">
                                                    {c.document || '-'}
                                                </td>
                                                <td className="px-5 py-4 text-xs space-y-1">
                                                    {phones.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <Phone size={12} className="text-neon-cyan" />
                                                            <span className="text-[#0F172A] font-medium">{phones[0].number}</span>
                                                            {phones[0].type && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                                    {phones[0].label || phones[0].type}
                                                                </span>
                                                            )}
                                                            {phones.length > 1 && (
                                                                <span
                                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                                                                    title={phones.map((p) => `${p.number} (${p.label || p.type || 'Contato'})`).join(' • ')}
                                                                >
                                                                    +{phones.length - 1} tel
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-inho-muted">Sem telefone</p>
                                                    )}

                                                    {emails.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <Mail size={12} className="text-inho-muted" />
                                                            <span className="text-inho-muted">{emails[0].email}</span>
                                                            {emails.length > 1 && (
                                                                <span
                                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/30"
                                                                    title={emails.map((e) => e.email).join(' • ')}
                                                                >
                                                                    +{emails.length - 1} e-mail
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-inho-muted text-[11px]">Sem e-mail</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    {banks.length > 0 ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                                                                <Landmark size={12} className="text-neon-cyan" />
                                                                <span>
                                                                    {banks[0].bank_code ? `${banks[0].bank_code} - ` : ''}
                                                                    {banks[0].bank_name || resolveBankNameByCode(banks[0].bank_code) || 'Banco'}
                                                                </span>
                                                                {banks.length > 1 && (
                                                                    <span
                                                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 border border-emerald-500/30"
                                                                        title={banks
                                                                            .map(
                                                                                (b) =>
                                                                                    `${b.bank_code || ''} ${b.bank_name || ''} Ag:${b.agency || '-'} Cc:${b.account || '-'}`
                                                                            )
                                                                            .join(' | ')}
                                                                    >
                                                                        +{banks.length - 1} conta(s)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-inho-muted font-mono">
                                                                Ag: {banks[0].agency || '-'} • Conta: {banks[0].account || '-'}
                                                            </div>
                                                        </div>
                                                    ) : c.bank_details ? (
                                                        <span className="text-[11px] text-inho-muted truncate block max-w-[200px]">
                                                            {c.bank_details}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-inho-muted">Não informado</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-block text-[9px] font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded border border-neon-cyan/20">
                                                        {c.category}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(c)}
                                                            className="px-2.5 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] hover:border-neon-cyan/50 hover:text-neon-cyan rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                                                        >
                                                            <Edit3 size={12} />
                                                            Editar
                                                        </button>
                                                        <Link
                                                            href={`/dashboard/contacts/${c.id}`}
                                                            className="px-3 py-1.5 bg-neon-cyan/10 border border-neon-cyan/30 hover:bg-neon-cyan/20 text-neon-cyan rounded-lg text-xs font-bold transition-all inline-block"
                                                        >
                                                            Dossiê Completo
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de Ficha Cadastral Completa (Criar / Editar) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white border border-inho-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
                        <div className="p-5 border-b border-inho-border flex items-center justify-between bg-[#F8FAFC]">
                            <div>
                                <h2 className="text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                                    <Users size={20} className="text-neon-cyan" />
                                    {editingId ? 'Editar Ficha Cadastral' : 'Nova Ficha de Cadastro Completo'}
                                </h2>
                                <p className="text-xs text-inho-muted">
                                    Dados pessoais (nascimento e filiação), múltiplos telefones, múltiplos e-mails e múltiplas contas bancárias.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-inho-muted hover:text-[#0F172A] transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveContact} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                            {/* 1. DADOS PESSOAIS & IDENTIFICAÇÃO */}
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-4">
                                <div className="font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-inho-border pb-2">
                                    <Users size={15} className="text-neon-cyan" />
                                    1. Dados Pessoais & Identificação
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">
                                            Nome Completo / Razão Social *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                            placeholder="Ex: Maria da Silva ou Empresa LTDA"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">
                                            Categoria da Ficha
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                            className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                        >
                                            <option value="CUSTOMER">Cliente</option>
                                            <option value="SUPPLIER">Fornecedor</option>
                                            <option value="EMPLOYEE">Funcionário</option>
                                            <option value="COOPERADO">Cooperado / Sócio</option>
                                            <option value="PARTNER">Sócio</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">
                                            CPF / CNPJ
                                        </label>
                                        <div className="flex bg-white border border-inho-border rounded-xl overflow-hidden">
                                            <input
                                                type="text"
                                                value={formData.document || ''}
                                                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                                                className="flex-1 px-3.5 py-2.5 text-sm text-[#0F172A] outline-none"
                                                placeholder="000.000.000-00"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleLookupCnpj}
                                                disabled={loadingCnpj}
                                                title="Consultar CNPJ na Receita / BrasilAPI"
                                                className="px-3 border-l border-inho-border text-neon-cyan hover:bg-neon-cyan/10 font-bold"
                                            >
                                                {loadingCnpj ? '...' : <Search size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">
                                            Data de Nascimento
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.birth_date || ''}
                                            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                            className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                        />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">Nº da Identidade (RG)</label>
                                      <input
                                        type="text"
                                        value={formData.identity_number || ''}
                                        onChange={(e) => setFormData({ ...formData, identity_number: e.target.value })}
                                        placeholder="Ex.: 1234567890"
                                        className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">Órgão Emissor / UF</label>
                                      <input
                                        type="text"
                                        value={formData.identity_issuer || ''}
                                        onChange={(e) => setFormData({ ...formData, identity_issuer: e.target.value })}
                                        placeholder="Ex.: SSP/RS"
                                        className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                      />
                                    </div>

                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">
                                            Nome da Mãe (Filiação Materna)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.mother_name || ''}
                                            onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                                            className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                            placeholder="Opcional — preenche a filiação automaticamente"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-inho-muted uppercase tracking-wider mb-1">
                                            Nome do Pai (Filiação Paterna)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.father_name || ''}
                                            onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                                            className="w-full bg-white border border-inho-border rounded-xl px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-neon-cyan"
                                            placeholder="Opcional — preenche a filiação automaticamente"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. MÚLTIPLOS TELEFONES */}
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                <div className="flex items-center justify-between border-b border-inho-border pb-2">
                                    <div className="font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                                        <Phone size={15} className="text-neon-cyan" />
                                        2. Telefones de Contato (Suporte a Múltiplos Números)
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addPhoneRow}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px] hover:bg-neon-cyan/25"
                                    >
                                        <Plus size={13} /> Adicionar Telefone
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {(formData.phones || []).map((ph, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-white p-2.5 rounded-xl border border-inho-border">
                                            <div className="md:col-span-4">
                                                <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                    Número #{idx + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ph.number}
                                                    onChange={(e) => updatePhoneRow(idx, { number: e.target.value })}
                                                    placeholder="(51) 99999-9999"
                                                    className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                    Tipo / Vínculo
                                                </label>
                                                <select
                                                    value={ph.type || 'PROPRIO'}
                                                    onChange={(e) => updatePhoneRow(idx, { type: e.target.value })}
                                                    className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                >
                                                    {PHONE_TYPES.map((pt) => (
                                                        <option key={pt.value} value={pt.value}>
                                                            {pt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                    Identificação / Contato
                                                </label>
                                                <input
                                                    type="text"
                                                    value={ph.label || ''}
                                                    onChange={(e) => updatePhoneRow(idx, { label: e.target.value })}
                                                    placeholder="Ex: Mãe (Dona Maria) / Recado"
                                                    className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex justify-end pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoneRow(idx)}
                                                    title="Remover telefone"
                                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. MÚLTIPLOS E-MAILS */}
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                <div className="flex items-center justify-between border-b border-inho-border pb-2">
                                    <div className="font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                                        <Mail size={15} className="text-neon-cyan" />
                                        3. Endereços de E-mail (Suporte a Múltiplos E-mails)
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addEmailRow}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px] hover:bg-neon-cyan/25"
                                    >
                                        <Plus size={13} /> Adicionar E-mail
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {(formData.emails || []).map((em, idx) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center bg-white p-2.5 rounded-xl border border-inho-border">
                                            <div className="md:col-span-5">
                                                <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                    Endereço de E-mail #{idx + 1}
                                                </label>
                                                <input
                                                    type="email"
                                                    value={em.email}
                                                    onChange={(e) => updateEmailRow(idx, { email: e.target.value })}
                                                    placeholder="contato@exemplo.com.br"
                                                    className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                    Categoria
                                                </label>
                                                <select
                                                    value={em.type || 'PRINCIPAL'}
                                                    onChange={(e) => updateEmailRow(idx, { type: e.target.value })}
                                                    className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                >
                                                    {EMAIL_TYPES.map((et) => (
                                                        <option key={et.value} value={et.value}>
                                                            {et.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                    Observação / Setor
                                                </label>
                                                <input
                                                    type="text"
                                                    value={em.label || ''}
                                                    onChange={(e) => updateEmailRow(idx, { label: e.target.value })}
                                                    placeholder="Ex: NFe / Pessoal"
                                                    className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex justify-end pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => removeEmailRow(idx)}
                                                    title="Remover e-mail"
                                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. DADOS BANCÁRIOS ESTRUTURADOS & MÚLTIPLAS CONTAS */}
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                <div className="flex items-center justify-between border-b border-inho-border pb-2">
                                    <div>
                                        <div className="font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                                            <Landmark size={15} className="text-neon-cyan" />
                                            4. Dados Bancários Estruturados (Suporte a Múltiplas Contas)
                                        </div>
                                        <p className="text-[11px] text-inho-muted">
                                            Número do banco, nome da instituição, agência e conta separados e organizados.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addBankAccountRow}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px] hover:bg-neon-cyan/25"
                                    >
                                        <Plus size={13} /> Adicionar Conta Bancária
                                    </button>
                                </div>

                                <datalist id="compe-banks-list">
                                    {BRAZILIAN_BANKS_CATALOG.map((b) => (
                                        <option key={b.code} value={b.code}>
                                            {b.code} - {b.name}
                                        </option>
                                    ))}
                                </datalist>

                                <div className="space-y-3">
                                    {(formData.bank_accounts || []).map((ba, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-white border border-inho-border space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-neon-cyan">
                                                    Conta Bancária #{idx + 1} {idx === 0 ? '(Principal)' : ''}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeBankAccountRow(idx)}
                                                    className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} /> Remover
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                        Nº do Banco
                                                    </label>
                                                    <input
                                                        type="text"
                                                        list="compe-banks-list"
                                                        value={ba.bank_code || ''}
                                                        onChange={(e) => updateBankAccountRow(idx, { bank_code: e.target.value })}
                                                        placeholder="Ex: 756, 001"
                                                        className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A] font-mono"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                        Nome do Banco
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={ba.bank_name || ''}
                                                        onChange={(e) => updateBankAccountRow(idx, { bank_name: e.target.value })}
                                                        placeholder="Ex: Sicoob, Banco do Brasil"
                                                        className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A]"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                        Agência
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={ba.agency || ''}
                                                        onChange={(e) => updateBankAccountRow(idx, { agency: e.target.value })}
                                                        placeholder="0001"
                                                        className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A] font-mono"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                        Conta e Dígito
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={ba.account || ''}
                                                        onChange={(e) => updateBankAccountRow(idx, { account: e.target.value })}
                                                        placeholder="12345-6"
                                                        className="w-full bg-[#F8FAFC] border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A] font-mono"
                                                    />
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                        Tipo / Chave PIX
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        <select
                                                            value={ba.account_type || 'CONTA_CORRENTE'}
                                                            onChange={(e) => updateBankAccountRow(idx, { account_type: e.target.value })}
                                                            className="bg-[#F8FAFC] border border-inho-border rounded-lg px-2 py-2 text-[11px] text-[#0F172A]"
                                                        >
                                                            {BANK_ACCOUNT_TYPES.map((bt) => (
                                                                <option key={bt.value} value={bt.value}>
                                                                    {bt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={ba.pix_key || ''}
                                                            onChange={(e) => updateBankAccountRow(idx, { pix_key: e.target.value })}
                                                            placeholder="Chave PIX"
                                                            className="bg-[#F8FAFC] border border-inho-border rounded-lg px-2 py-2 text-[11px] text-[#0F172A]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. ENDEREÇO & OBSERVAÇÕES */}
                            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-inho-border space-y-3">
                                <div className="font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-inho-border pb-2">
                                    <MapPin size={15} className="text-neon-cyan" />
                                    5. Endereço & Observações Gerais
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">CEP</label>
                                        <div className="flex bg-white border border-inho-border rounded-lg overflow-hidden">
                                            <input
                                                type="text"
                                                value={formData.zip_code || ''}
                                                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                                placeholder="00000-000"
                                                className="flex-1 px-2.5 py-2 text-xs text-[#0F172A] outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleLookupCep}
                                                disabled={loadingCep}
                                                className="px-2.5 border-l border-inho-border text-neon-cyan hover:bg-neon-cyan/10"
                                            >
                                                {loadingCep ? '...' : <Search size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                            Logradouro / Endereço
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address || ''}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Rua, Número, Complemento, Bairro"
                                            className="w-full bg-white border border-inho-border rounded-lg px-2.5 py-2 text-xs text-[#0F172A]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                Cidade
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.city || ''}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full bg-white border border-inho-border rounded-lg px-2 py-2 text-xs text-[#0F172A]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                                UF
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={2}
                                                value={formData.state || ''}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                                className="w-full bg-white border border-inho-border rounded-lg px-2 py-2 text-xs text-[#0F172A] uppercase"
                                            />
                                        </div>
                                    </div>
                                <button
                                    type="button"
                                    onClick={handleSearchCepByAddress}
                                    disabled={loadingCep}
                                    className="w-full px-3 py-2 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 font-bold text-[11px] inline-flex items-center justify-center gap-1.5"
                                >
                                    <Search size={13} /> Não sei o CEP — buscar pelo endereço (UF + Cidade + Logradouro)
                                </button>
                                {cepOptions.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-inho-border bg-white divide-y divide-inho-border">
                                        {cepOptions.map((o) => (
                                            <button
                                                type="button"
                                                key={o.cep + o.logradouro}
                                                onClick={() => applyCepOption(o)}
                                                className="w-full text-left px-3 py-2 hover:bg-neon-cyan/10 text-[11px] text-[#0F172A]"
                                            >
                                                <strong>{o.cep}</strong> — {o.logradouro}, {o.bairro} ({o.localidade}/{o.uf})
                                            </button>
                                        ))}
                                    </div>
                                )}
                                </div>
                                <div>
                                    <label className="block text-[10px] text-inho-muted uppercase font-bold mb-0.5">
                                        Observações da Ficha
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={formData.notes || ''}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Anotações adicionais sobre o cadastro..."
                                        className="w-full bg-white border border-inho-border rounded-lg px-3 py-2 text-xs text-[#0F172A]"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-inho-border">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-inho-border text-xs font-bold text-inho-muted hover:text-[#0F172A]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 bg-neon-cyan text-white hover:bg-neon-cyan/90 font-extrabold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-neon-cyan/20 disabled:opacity-50 uppercase tracking-wider text-xs"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={16} /> : editingId ? 'Salvar Alterações da Ficha' : 'Cadastrar e Salvar Ficha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ContactsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-inho-black p-8 text-inho-muted font-sans text-xs">Carregando fichas cadastrais...</div>}>
            <ContactsContent />
        </Suspense>
    );
}
