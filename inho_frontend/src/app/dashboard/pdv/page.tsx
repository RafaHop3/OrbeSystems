'use client';

import { useState, useEffect } from 'react';
import { usePDV } from './PDVContext';
import { pdvApi } from '@/lib/api';
import type { PaymentMethod, PDVSaleOut } from '@/types/pdv';
import {
  Monitor, LockOpen, LogOut, CheckCircle2, Wallet, CreditCard, QrCode,
  ArrowRight, Download, Calculator, FileText
} from 'lucide-react';
import Counter from '@/components/Counter';

// ── Gatekeeper Form (Caixa Fechado) ──────────────────────────────────
function OpenRegisterGate() {
  const { openSession, isLoading, error } = usePDV();
  const [balanceInput, setBalanceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await openSession({ opening_balance: parseFloat(balanceInput) || 0 });
    } catch {
      // Error is caught by the context and accessible via `error` ctx property
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-fade-in relative">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="glassmorphism max-w-md w-full p-8 rounded-3xl border border-inho-gold/20 shadow-2xl relative z-10 text-center">
        <div className="w-16 h-16 bg-inho-gold/10 border border-inho-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-inho-gold">
          <Monitor size={32} />
        </div>
        <h2 className="text-2xl font-black text-inho-text mb-2">Caixa Fechado</h2>
        <p className="text-sm text-inho-muted mb-8">Nenhuma sessão de caixa ativa vinculada ao seu usuário. Abra o caixa para iniciar as operações.</p>

        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-500/30 rounded-xl text-xs font-mono text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleOpen} className="text-left space-y-5">
          <div>
            <label className="block text-[10px] font-mono text-inho-muted uppercase tracking-wider mb-2">Fundo Fixo / Troco Inicial (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-inho-muted font-mono">R$</span>
              <input
                required min="0" step="0.01" type="number" autoFocus
                value={balanceInput} onChange={e => setBalanceInput(e.target.value)}
                placeholder="0,00"
                className="w-full bg-inho-black border border-inho-border rounded-xl pl-10 pr-4 py-3 text-inho-text font-mono text-lg focus:outline-none focus:border-inho-gold/50 transition-colors"
                disabled={isLoading || submitting}
              />
            </div>
          </div>
          <button
            type="submit" disabled={isLoading || submitting}
            className="w-full flex items-center justify-center gap-2 py-4 bg-inho-gold text-white rounded-xl font-black uppercase text-sm tracking-wider hover:bg-inho-gold-light hover:shadow-glow-gold transition-all active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Abrindo...' : <><LockOpen size={18} /> Abrir Sessão de Caixa</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Point Of Sale Grid (Caixa Aberto) ────────────────────────────────
function POSGrid() {
  const { session, closeSession } = usePDV();

  // Sale Input State
  const [saleAmount, setSaleAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Recent Sales log local state (just for visual feedback)
  const [recentSales, setRecentSales] = useState<PDVSaleOut[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(true);

  const loadSales = async () => {
    if (!session) return;
    try {
      const data = await pdvApi.listSales(session.id);
      setRecentSales(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSales(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [session]);

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !saleAmount || !selectedPayment) return;

    setIsProcessing(true);
    try {
      await pdvApi.registerSale(session.id, {
        total_amount: parseFloat(saleAmount),
        payment_method: selectedPayment,
        customer_name: customerName || undefined
      });
      // Reset POS inputs
      setSaleAmount('');
      setCustomerName('');
      setSelectedPayment(null);
      // Refresh local list
      await loadSales();
    } catch (err) {
      alert('Erro ao registrar venda.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!confirm('Deseja realmente encerrar a sessão de caixa? Esta ação é irreversível.')) return;
    try {
      await closeSession();
      // O Contexto vai limpar o `session`, a tela vai voltar para OpenRegisterGate
      // Mas antes podemos disparar o download automático da rotina #4
      if (session) {
        await pdvApi.getReport(session.id);
      }
    } catch {
      alert('Erro ao fechar caixa e gerar borderô.');
    }
  };

  const paymentButtons: { id: PaymentMethod, label: string, icon: React.ReactNode, color: string }[] = [
    { id: 'PIX', label: 'Pix', icon: <QrCode size={18} />, color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    { id: 'CREDIT', label: 'Crédito', icon: <CreditCard size={18} />, color: 'bg-inho-blue/20 text-inho-blue border-inho-blue/40' },
    { id: 'DEBIT', label: 'Débito', icon: <CreditCard size={18} />, color: 'bg-purple-500/20 text-purple-700 border-purple-500/40' },
    { id: 'CASH', label: 'Dinheiro', icon: <Wallet size={18} />, color: 'bg-inho-green/20 text-inho-green border-inho-green/40' },
  ];

  const totalSold = recentSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const currentTotalInBank = (Number(session?.opening_balance) || 0) + totalSold;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex gap-6 relative min-h-[85vh]">

      {/* ── Esquerda: Interface Operacional (Numpad + Payment) ── */}
      <div className="flex-1 flex flex-col gap-6 max-w-3xl">
        <div className="glassmorphism rounded-2xl p-6 border border-inho-border animate-slide-up">
          <h3 className="text-xs font-mono font-bold text-inho-muted uppercase tracking-wider mb-6 flex items-center gap-2">
            <Calculator size={16} /> Registro Expresso
          </h3>

          <form onSubmit={handleRegisterSale} className="space-y-6">

            {/* Input Gigante de Valor */}
            <div>
              <input
                autoFocus required
                type="number" min="0.01" step="0.01"
                placeholder="R$ 0,00"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                className="w-full bg-inho-black border-2 border-inho-border hover:border-inho-gold focus:border-inho-gold rounded-2xl py-6 text-center text-4xl font-black font-mono text-inho-text placeholder:text-inho-border focus:outline-none transition-colors"
                disabled={isProcessing}
              />
            </div>

            {/* Input Opcional de Cliente */}
            <div>
              <input
                type="text"
                placeholder="Nome do Cliente (Opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text placeholder:text-inho-muted/50 focus:outline-none focus:border-inho-blue/50"
                disabled={isProcessing}
              />
            </div>

            {/* Grid de Formas de Pagamento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {paymentButtons.map(btn => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedPayment(btn.id)}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${selectedPayment === btn.id
                      ? `${btn.color} ring-2 ring-offset-2 ring-offset-inho-black ring-inho-text border-transparent scale-[0.98]`
                      : 'bg-inho-black border-inho-border hover:border-inho-muted text-inho-muted hover:text-inho-text'
                    }`}
                >
                  {btn.icon}
                  <span className="font-bold text-xs uppercase mt-2">{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Botão Gigante de Finalizar */}
            <button
              type="submit"
              disabled={!saleAmount || !selectedPayment || isProcessing}
              className="w-full flex justify-center items-center gap-3 bg-inho-green text-white py-5 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-emerald-400 hover:shadow-glow-green transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isProcessing ? 'Processando Autenticação...' : (
                <>Finalizar Recebimento <ArrowRight size={20} /></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Direita: Auditoria, Resumo e Encerramento ── */}
      <div className="w-[320px] flex-shrink-0 flex flex-col gap-5 animate-slide-left">

        {/* Painel de Sessão de Caixa */}
        <div className="glassmorphism rounded-2xl p-5 border border-inho-gold/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Monitor size={64} className="text-inho-gold" />
          </div>
          <div className="relative z-10">
            <span className="inline-block px-2 py-1 bg-inho-gold/20 text-inho-gold border border-inho-gold/40 text-[9px] font-black uppercase tracking-widest rounded mb-4">
              Sessão Aberta
            </span>
            <p className="text-xs text-inho-muted font-mono mb-1">Fundo Fixo (Início)</p>
            <p className="font-mono text-lg text-inho-text font-bold mb-4">{formatCurrency(Number(session?.opening_balance || 0))}</p>

            <div className="h-px bg-inho-border my-4" />

            <p className="text-xs text-inho-muted font-mono mb-1">Posição Atual (Fundo + Vendas)</p>
            <p className="font-mono text-2xl text-inho-gold font-black">
              <Counter end={currentTotalInBank} decimals={2} prefix="R$ " />
            </p>
          </div>
        </div>

        {/* Trilha Rápida de Transações */}
        <div className="flex-1 glassmorphism rounded-2xl border border-inho-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-inho-border bg-inho-dark/80">
            <h4 className="text-xs font-mono font-bold text-inho-text uppercase">Últimos Registros</h4>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
            {isLoadingSales ? (
              <div className="text-center py-6">
                <div className="inline-block w-4 h-4 border-2 border-inho-muted border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-[10px] text-center font-mono text-inho-muted">Nenhuma venda na sessão atual.</p>
            ) : (
              recentSales.map(sale => (
                <div key={sale.id} className="flex justify-between items-center bg-inho-black/50 p-2.5 rounded-lg border border-inho-border/50">
                  <div>
                    <p className="text-xs text-inho-text font-bold font-mono">{formatCurrency(Number(sale.total_amount))}</p>
                    <p className="text-[9px] text-inho-muted font-mono uppercase mt-0.5">{sale.payment_method}</p>
                  </div>
                  <CheckCircle2 size={14} className="text-inho-green" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Button: Fechar Caixa */}
        <button
          onClick={handleCloseRegister}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-inho-dark border border-red-500/30 text-red-700 hover:bg-red-500/10 hover:border-red-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors group"
        >
          <LogOut size={16} />
          Encerrar Sessão & Borderô
        </button>

      </div>
    </div>
  );
}

// ── Master Component ──────────────────────────────────────────────────
export default function PDVPage() {
  const { session, isLoading } = usePDV();

  return (
    <div className="min-h-screen bg-inho-black pb-12">
      <header className="sticky top-0 z-20 glassmorphism border-b border-inho-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-inho-muted">INHO</span>
          <span className="text-inho-muted">/</span>
          <span className="text-inho-text font-bold uppercase tracking-wider">Frente de Caixa (PDV)</span>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8 pt-10">
        {isLoading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-inho-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !session ? (
          <OpenRegisterGate />
        ) : (
          <POSGrid />
        )}
      </main>
    </div>
  );
}
