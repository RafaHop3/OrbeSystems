'use client';

import { useState } from 'react';
import { ShieldCheck, QrCode, Key, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface MFAModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MFAModal({ isOpen, onClose }: MFAModalProps) {
    const [loading, setLoading] = useState(false);
    const [mfaData, setMfaData] = useState<{ secret: string; provisioning_uri: string; backup_codes?: string[] } | null>(null);
    const [code, setCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleStartSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/auth/mfa/setup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            if (!res.ok) {
                throw new Error('Falha ao gerar credencial 2FA');
            }
            const data = await res.json();
            setMfaData(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar QR Code de 2FA');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code || code.length !== 6) {
            setError('Informe o código de 6 dígitos');
            return;
        }
        setVerifying(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
                credentials: 'include',
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Código 2FA inválido');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Código 2FA inválido ou expirado');
        } finally {
            setVerifying(false);
        }
    };

    // Quick QR Code rendering URL using standard Google Charts QR API
    const qrImageUrl = mfaData
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaData.provisioning_uri)}`
        : '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
            <div className="bg-inho-dark border border-inho-border rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-inho-muted hover:text-inho-text p-2 rounded-xl"
                >
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-inho-gold/10 border border-inho-gold/20 flex items-center justify-center text-inho-gold">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-inho-text">Autenticação 2FA</h3>
                        <p className="text-xs text-inho-muted font-mono">Google Authenticator / Authy</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-700 text-xs flex items-center gap-2 font-mono">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {success ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 bg-inho-green/10 border border-inho-green/20 text-inho-green rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={36} />
                        </div>
                        <h4 className="text-lg font-bold text-inho-text mb-2">2FA Ativado com Sucesso!</h4>
                        <p className="text-xs text-inho-muted font-mono mb-6">
                            Sua conta de Administrador está protegida contra acessos não autorizados.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-inho-green text-white font-black uppercase tracking-wider rounded-xl text-sm hover:bg-green-400 transition-colors"
                        >
                            Concluir
                        </button>
                    </div>
                ) : !mfaData ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-inho-muted mb-6 leading-relaxed">
                            Proteja sua conta mestre ativando a autenticação em duas etapas por token TOTP.
                        </p>
                        <button
                            onClick={handleStartSetup}
                            disabled={loading}
                            className="w-full py-3 bg-inho-gold text-white font-black uppercase tracking-wider rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
                            Gerar QR Code de Segurança
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* QR Code */}
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-inho-border">
                            <img src={qrImageUrl} alt="2FA QR Code" className="w-48 h-48 object-contain" />
                        </div>

                        {/* Manual Secret Key */}
                        <div className="bg-inho-black border border-inho-border rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono text-inho-muted overflow-hidden">
                                <Key size={14} className="text-inho-gold shrink-0" />
                                <span className="truncate select-all text-inho-text">{mfaData.secret}</span>
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(mfaData.secret)}
                                className="text-[10px] uppercase tracking-wider font-bold bg-inho-border px-2 py-1 rounded text-inho-text hover:bg-inho-blue transition-colors"
                            >
                                Copiar
                            </button>
                        </div>

                        {/* Backup Recovery Codes (Break Glass) */}
                        {mfaData.backup_codes && mfaData.backup_codes.length > 0 && (
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-inho-gold font-mono">
                                        Códigos de Emergência (Break Glass)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(mfaData.backup_codes?.join('\n') || '')}
                                        className="text-[9px] uppercase tracking-wider font-bold bg-inho-gold/20 text-inho-gold px-2 py-0.5 rounded hover:bg-inho-gold hover:text-[#0F172A] transition-colors"
                                    >
                                        Copiar Todos
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-[#0F172A]">
                                    {mfaData.backup_codes.map((c, idx) => (
                                        <div key={idx} className="bg-[#F1F5F9] px-2 py-1 rounded text-center border border-[#E2E8F0]">
                                            {c}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-inho-muted font-mono leading-tight pt-1">
                                    Guarde estes 8 códigos de uso único em local seguro caso perca seu celular.
                                </p>
                            </div>
                        )}

                        {/* Code Input Form */}
                        <form onSubmit={handleVerify} className="space-y-3">
                            <label className="text-xs font-mono text-inho-muted uppercase tracking-wider block">
                                Digite o Código de 6 dígitos:
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full text-center text-2xl font-mono tracking-[0.5em] font-black bg-inho-black border border-inho-border rounded-xl py-3 text-inho-gold focus:outline-none focus:border-inho-gold"
                            />
                            <button
                                type="submit"
                                disabled={verifying || code.length !== 6}
                                className="w-full py-3 bg-inho-blue text-[#0F172A] font-black uppercase tracking-wider rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-blue-400 disabled:opacity-50 transition-colors"
                            >
                                {verifying ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                Confirmar e Ativar 2FA
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
