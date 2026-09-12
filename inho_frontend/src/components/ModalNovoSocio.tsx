'use client';
import React, { useState } from 'react';
import { X, Search, DollarSign } from 'lucide-react';

type TabType = 'CONTATO' | 'ENDERECO' | 'BANCARIO';
type PersonType = 'PESSOA_JURIDICA' | 'PESSOA_FISICA' | 'EXTERIOR';

export default function ModalNovoSocio({ onClose, category = 'PARTNER' }: { onClose: () => void, category?: 'PARTNER' | 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' }) {
    const [activeTab, setActiveTab] = useState<TabType>('CONTATO');
    const [personType, setPersonType] = useState<PersonType>('PESSOA_FISICA');

    // Generic state to simulate the huge amount of data
    const [formData, setFormData] = useState({
        documento: '', nome: '', inscricaoMunicipal: '', email: '', telefone: '', celular: '',
        pessoaContato: '', website: '', nis: '', correios: '',
        cep: '', rua: '', numero: '', comp: '', bairro: '', cidade: '', estado: '',
        banco: '', agencia: '', conta: '', pixChave: '', pixTipo: ''
    });

    const hCh = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const payload = {
            name: formData.nome || 'Entidade Sem Nome',
            document: formData.documento,
            email: formData.email,
            category: category,
            person_type: personType,
            phone: formData.celular,
            municipal_registration: formData.inscricaoMunicipal,
            nis: formData.nis,
            correios_matricula: formData.correios,
            zip_code: formData.cep,
            street: formData.rua,
            number: formData.numero,
            complement: formData.comp,
            neighborhood: formData.bairro,
            city: formData.cidade,
            state: formData.estado,
            bank_code: formData.banco,
            bank_agency: formData.agencia,
            bank_account: formData.conta,
            pix_key_type: formData.pixTipo,
            pix_key: formData.pixChave,
            is_active: true
        };

        try {
            const token = localStorage.getItem('orbe_token') || localStorage.getItem('token') || 'dev-bypass';
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://inho-api.orbesystems.com.br';
            const res = await fetch(`${API_URL}/api/v1/crm/contacts/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('🚀 Entidade registrada com sucesso e Telefone formatado no Backend!');
                onClose();
            } else {
                const err = await res.json();
                alert('Erro ao salvar no DB AWS: ' + JSON.stringify(err));
            }
        } catch (error) {
            console.error(error);
            alert('Falha na conexão com a API.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#161b22]">
                    <h2 className="text-lg font-semibold text-[#e6edf3]">
                        {category === 'PARTNER' ? 'Novo Sócio / Cooperado' :
                            category === 'CUSTOMER' ? 'Novo Cliente' :
                                category === 'SUPPLIER' ? 'Novo Fornecedor' : 'Novo Funcionário'}
                    </h2>
                    <button onClick={onClose} className="text-[#8b949e] hover:text-red-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto max-h-[75vh]">
                    {/* Person Type Selector */}
                    <div className="mb-6">
                        <span className="block text-xs font-semibold text-[#8b949e] mb-2 uppercase tracking-wider">Tipo de Cliente</span>
                        <div className="flex gap-4">
                            {[
                                { id: 'PESSOA_JURIDICA', label: '🏢 Pessoa Jurídica' },
                                { id: 'PESSOA_FISICA', label: '👤 Pessoa Física' },
                                { id: 'EXTERIOR', label: '🌎 Exterior' },
                            ].map(tp => (
                                <button
                                    key={tp.id}
                                    onClick={() => setPersonType(tp.id as PersonType)}
                                    className={`px-4 py-3 border rounded-md font-medium text-sm transition-all flexitems-center gap-2 ${personType === tp.id
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                        : 'border-[#30363d] text-[#c9d1d9] hover:border-gray-500 hover:bg-[#161b22]'
                                        }`}
                                >
                                    {tp.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs text-[#8b949e] mb-1">CPF / CNPJ</label>
                            <div className="flex">
                                <input
                                    type="text" name="documento" value={formData.documento} onChange={hCh}
                                    className="flex-1 bg-[#161b22] border border-[#30363d] border-r-0 rounded-l-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                                <button className="bg-[#21262d] border border-[#30363d] rounded-r-md px-3 text-sm text-blue-400 hover:bg-[#30363d] transition-colors flex items-center gap-1">
                                    Buscar <Search size={14} />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-[#8b949e] mb-1">Nome Completo / Razão Social</label>
                            <input type="text" name="nome" value={formData.nome} onChange={hCh} className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>

                    {/* Abas */}
                    <div className="flex border-b border-[#30363d] mb-4">
                        {(['CONTATO', 'ENDERECO', 'BANCARIO'] as TabType[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-blue-500 text-blue-400 tracking-wide'
                                    : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
                                    }`}
                            >
                                {tab === 'CONTATO' ? 'Dados de contato' : tab === 'ENDERECO' ? 'Endereço Fiscal' : 'Dados Financeiros'}
                            </button>
                        ))}
                    </div>

                    {/* Tab Views */}
                    <div className="bg-[#161b22]/50 border border-[#30363d] rounded-md p-4 min-h-[220px]">
                        {activeTab === 'CONTATO' && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-in fade-in">
                                <div className="col-span-2">
                                    <label className="block text-xs text-[#8b949e] mb-1">E-mail(s) para envio</label>
                                    <input type="email" name="email" value={formData.email} onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">Inscrição Municipal</label>
                                    <input type="text" name="inscricaoMunicipal" value={formData.inscricaoMunicipal} onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">Celular / WhatsApp</label>
                                    <input type="text" name="celular" value={formData.celular} onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">NIS (Societário)</label>
                                    <input type="text" name="nis" value={formData.nis} onChange={hCh} className="w-full bg-[#0d1117] border border-blue-500/50 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.1)]" placeholder="Cadastro Social" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">Matrícula Logística Correios</label>
                                    <input type="text" name="correios" value={formData.correios} onChange={hCh} className="w-full bg-[#0d1117] border border-blue-500/50 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.1)]" placeholder="BR101340" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'ENDERECO' && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-right-2">
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">CEP</label>
                                    <input type="text" name="cep" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-[#8b949e] mb-1">Rua / Logradouro</label>
                                    <input type="text" name="rua" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">Número</label>
                                    <input type="text" name="numero" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs text-[#8b949e] mb-1">Bairro</label>
                                    <input type="text" name="bairro" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">Cidade</label>
                                    <input type="text" name="cidade" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-[#8b949e] mb-1">Estado (UF)</label>
                                    <input type="text" name="estado" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'BANCARIO' && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in slide-in-from-left-2">
                                <div className="bg-[#0a0c10] p-4 rounded-md border border-[#30363d] col-span-2">
                                    <h3 className="text-sm text-white font-medium mb-3 flexitems-center gap-2"><DollarSign size={16} className="text-green-400 inline" /> Liquidação Principal (Bancária)</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-[#8b949e] mb-1">Banco / Código</label>
                                            <input type="text" name="banco" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" placeholder="033" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#8b949e] mb-1">Agência</label>
                                            <input type="text" name="agencia" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs text-[#8b949e] mb-1">Conta com Dígito</label>
                                            <input type="text" name="conta" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0a0c10] p-4 rounded-md border border-[#30363d] col-span-2 md:col-span-1">
                                    <h3 className="text-sm text-white font-medium mb-3 flexitems-center gap-2"><DollarSign size={16} className="text-cyan-400 inline" /> Pix (Repasses Imediatos)</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="block text-xs text-[#8b949e] mb-1">Tipo de Chave</label>
                                            <select name="pixTipo" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white">
                                                <option value="CPF">CPF/CNPJ</option>
                                                <option value="PHONE">Celular</option>
                                                <option value="EMAIL">E-mail</option>
                                                <option value="RANDOM">Chave Aleatória</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[#8b949e] mb-1">Chave Pix</label>
                                            <input type="text" name="pixChave" onChange={hCh} className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-white font-mono" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-[#161b22] px-6 py-4 border-t border-[#30363d] flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#c9d1d9] border border-[#30363d] rounded-md hover:bg-[#21262d] transition-colors" disabled={isSaving}>
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? 'Salvando...' : 'Cadastrar no Master DB'}
                    </button>
                </div>
            </div>
        </div>
    );
}
