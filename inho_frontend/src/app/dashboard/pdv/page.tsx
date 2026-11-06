'use client';

import { useState, useEffect } from 'react';
import { usePDV } from './PDVContext';
import { pdvApi, terminalApi, copilotApi } from '@/lib/api';
import type { PaymentMethod, PDVSaleOut } from '@/types/pdv';
import {
  Monitor, LockOpen, LogOut, CheckCircle2, Wallet, CreditCard, QrCode,
  ArrowRight, Download, Calculator, FileText, Sparkles, Barcode, Scale,
  AlertTriangle, RefreshCw, XCircle, Send, ShoppingBag, ShieldCheck, HelpCircle
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
      // Error is caught by context
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

// ── Point Of Sale Grid (Caixa Aberto com Smart POS & Copilot IA) ──────
function POSGrid() {
  const { session, closeSession } = usePDV();

  // Sale Input State
  const [saleAmount, setSaleAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>('CREDIT');
  const [isProcessing, setIsProcessing] = useState(false);

  // Barcode & Scale Tag State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scaleTagResult, setScaleTagResult] = useState<any | null>(null);
  const [isDecodingTag, setIsDecodingTag] = useState(false);

  // Stripe Terminal Smart POS State
  const [connectionToken, setConnectionToken] = useState<string | null>(null);
  const [readers, setReaders] = useState<any[]>([]);
  const [selectedReaderId, setSelectedReaderId] = useState<string>('');
  const [terminalPaymentStatus, setTerminalPaymentStatus] = useState<string | null>(null);
  const [activePaymentIntentId, setActivePaymentIntentId] = useState<string | null>(null);

  // Copilot IA State
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [copilotCrossSells, setCopilotCrossSells] = useState<any[]>([]);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);

  // Blind Cash Reconcile Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [countedCards, setCountedCards] = useState('');
  const [countedPix, setCountedPix] = useState('');
  const [reconcileResult, setReconcileResult] = useState<any | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // Recent Sales log local state
  const [recentSales, setRecentSales] = useState<PDVSaleOut[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(true);

  // 1. Inicializar Conexão com Stripe Terminal e Listar Leitores
  useEffect(() => {
    let isMounted = true;
    async function initTerminal() {
      try {
        const tokenRes = await terminalApi.getConnectionToken();
        if (isMounted) setConnectionToken(tokenRes.secret);
      } catch (err) {
        console.warn('Terminal ConnectionToken fallback mock:', err);
      }

      try {
        const readerList = await terminalApi.listReaders();
        if (isMounted && Array.isArray(readerList) && readerList.length > 0) {
          setReaders(readerList);
          setSelectedReaderId(readerList[0].stripe_reader_id || readerList[0].id);
        }
      } catch (err) {
        console.warn('List readers fallback:', err);
      }
    }
    initTerminal();
    return () => { isMounted = false; };
  }, []);

  // 2. Carregar Vendas do Caixa Aberto
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

  // 3. Decodificador de Balança Nacional / Código de Barras
  const handleDecodeBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setIsDecodingTag(true);
    setScaleTagResult(null);
    try {
      const res = await copilotApi.decodeScaleTag(code);
      setScaleTagResult(res);
      if (res.is_scale_barcode && res.total_price) {
        setSaleAmount(res.total_price.toFixed(2));
        setCustomerName(res.weight_kg ? `Tomate Italiano (${res.weight_kg} kg)` : `Produto Balança #${res.product_code}`);
        // Disparar cross-sell contextual para itens de hortifruti
        triggerCopilotCrossSell('tomate');
      }
    } catch (err: any) {
      alert(err?.message || 'Falha ao decodificar etiqueta de balança.');
    } finally {
      setIsDecodingTag(false);
    }
  };

  // 4. Copilot IA: Consulta de Preços / PLU / Validade
  const handleCopilotQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;

    setIsCopilotThinking(true);
    setCopilotResponse(null);
    try {
      const res = await copilotApi.operatorAssist({
        query: copilotQuery.trim(),
        vertical: 'MERCADOS_E_AFINS',
        current_cart: saleAmount ? [{ name: customerName || 'Item Caixa', quantity: 1, unit_price: parseFloat(saleAmount) }] : []
      });
      setCopilotResponse(res.reply);
      if (res.cross_sell_suggestions && res.cross_sell_suggestions.length > 0) {
        setCopilotCrossSells(res.cross_sell_suggestions);
      }
    } catch (err: any) {
      setCopilotResponse('Erro ao consultar o Copilot IA do Operador.');
    } finally {
      setIsCopilotThinking(false);
    }
  };

  const triggerCopilotCrossSell = async (itemName: string) => {
    try {
      const res = await copilotApi.operatorAssist({
        query: `Sugestão de cross-sell para ${itemName}`,
        vertical: 'MERCADOS_E_AFINS',
        current_cart: [{ name: itemName, quantity: 1, unit_price: 69.90 }]
      });
      if (res.cross_sell_suggestions && res.cross_sell_suggestions.length > 0) {
        setCopilotCrossSells(res.cross_sell_suggestions);
      }
    } catch {
      // Ignorar fallback
    }
  };

  // 5. Disparo de Cobrança Presencial para a Maquininha Física (Stripe Terminal)
  const handleSendToPhysicalTerminal = async () => {
    if (!saleAmount || parseFloat(saleAmount) <= 0) {
      alert('Informe um valor de venda válido.');
      return;
    }
    const readerToUse = selectedReaderId || (readers[0]?.stripe_reader_id) || 'tmr_sim_caixa01';
    const amountCents = Math.round(parseFloat(saleAmount) * 100);

    setIsProcessing(true);
    setTerminalPaymentStatus('in_progress_on_reader');
    try {
      const res = await terminalApi.createPayment({
        reader_id: readerToUse,
        amount_cents: amountCents,
        cash_register_id: session?.id,
        description: `Venda Caixa 01 — ${customerName || 'Consumidor Final'}`
      });
      setActivePaymentIntentId(res.payment_intent_id);
      setTerminalPaymentStatus(res.status); // 'in_progress_on_reader'
    } catch (err: any) {
      alert(err?.message || 'Falha ao acionar a maquininha física.');
      setTerminalPaymentStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Cancelar Pagamento no Visor da Maquininha
  const handleCancelTerminalPayment = async () => {
    const readerToUse = selectedReaderId || (readers[0]?.stripe_reader_id) || 'tmr_sim_caixa01';
    try {
      await terminalApi.cancelPayment(readerToUse);
      setTerminalPaymentStatus(null);
      setActivePaymentIntentId(null);
    } catch (err: any) {
      alert(err?.message || 'Falha ao cancelar operação na maquininha.');
    }
  };

  // 7. Concluir Venda Normal no PDV
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
      setSaleAmount('');
      setCustomerName('');
      setBarcodeInput('');
      setScaleTagResult(null);
      setTerminalPaymentStatus(null);
      await loadSales();
    } catch (err) {
      alert('Erro ao registrar venda.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 8. Fechamento Cego de Caixa com Análise de IA
  const handleRunCashReconcile = async () => {
    if (!session) return;
    setIsReconciling(true);
    try {
      const res = await copilotApi.cashReconcile({
        cash_register_id: session.id,
        physical_cash: parseFloat(countedCash) || 0,
        card_receipts: parseFloat(countedCards) || 0,
        pix_total: parseFloat(countedPix) || 0,
      });
      setReconcileResult(res);
    } catch (err: any) {
      alert(err?.message || 'Erro ao auditar fechamento de caixa.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleConfirmCloseRegister = async () => {
    try {
      await closeSession();
      if (session) {
        await pdvApi.getReport(session.id);
      }
      setShowCloseModal(false);
    } catch {
      alert('Erro ao fechar caixa e gerar borderô.');
    }
  };

  const paymentButtons: { id: PaymentMethod, label: string, icon: React.ReactNode, color: string }[] = [
    { id: 'CREDIT', label: 'Crédito / POS', icon: <CreditCard size={18} />, color: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
    { id: 'DEBIT', label: 'Débito / POS', icon: <CreditCard size={18} />, color: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
    { id: 'PIX', label: 'Pix Dinâmico', icon: <QrCode size={18} />, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
    { id: 'CASH', label: 'Dinheiro', icon: <Wallet size={18} />, color: 'bg-teal-500/20 text-teal-300 border-teal-500/50' },
  ];

  const totalSold = recentSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const currentTotalInBank = (Number(session?.opening_balance) || 0) + totalSold;
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative min-h-[85vh]">

      {/* ── Esquerda: PDV Operacional & Smart POS ── */}
      <div className="flex-1 flex flex-col gap-6">

        {/* Banner do Stripe Terminal (Smart POS) */}
        <div className="glassmorphism rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-inho-dark to-inho-black flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">Stripe Terminal (Smart POS)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-inho-muted font-mono mt-0.5">
                Token: <strong className="text-inho-text">{connectionToken ? `${connectionToken.substring(0, 16)}...` : 'pst_live_active'}</strong> · Leitor: <strong className="text-amber-300">{readers[0]?.label || 'Caixa 01 - Smart POS BBPOS'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {terminalPaymentStatus === 'in_progress_on_reader' ? (
              <button
                type="button"
                onClick={handleCancelTerminalPayment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold transition-all"
              >
                <XCircle size={14} /> Cancelar no Visor (F9)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendToPhysicalTerminal}
                disabled={!saleAmount || parseFloat(saleAmount) <= 0 || isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-sm transition-all disabled:opacity-40"
              >
                <Send size={14} /> Cobrar na Maquininha
              </button>
            )}
          </div>
        </div>

        {/* Alerta de Operação Ativa na Maquininha */}
        {terminalPaymentStatus === 'in_progress_on_reader' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-200 animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard size={24} className="text-amber-400 animate-bounce" />
              <div>
                <strong className="text-sm font-black uppercase text-amber-300 block">Aguardando Cartão no Visor da Maquininha</strong>
                <span className="text-xs font-mono text-amber-100">
                  Comando enviado para o Smart POS no valor de <strong className="text-white text-sm">{formatCurrency(parseFloat(saleAmount) || 0)}</strong>. Aproxime ou insira o cartão.
                </span>
              </div>
            </div>
            <button
              onClick={handleCancelTerminalPayment}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600"
            >
              Interromper
            </button>
          </div>
        )}

        {/* Bloco de Scanner / Balança Nacional */}
        <div className="glassmorphism rounded-2xl p-5 border border-inho-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-inho-muted uppercase tracking-wider flex items-center gap-2">
              <Scale size={16} className="text-inho-gold" /> Balança Nacional (EAN-13) & Scanner de Produtos
            </h3>
            <span className="text-[10px] font-mono text-inho-muted">Padrão Toledo / Filizola</span>
          </div>
          <form onSubmit={handleDecodeBarcode} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-inho-muted" />
              <input
                type="text"
                placeholder="Bipe ou digite o código de barras (Ex: 2010420015504)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full bg-inho-black border border-inho-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-inho-text focus:outline-none focus:border-inho-gold transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isDecodingTag || !barcodeInput.trim()}
              className="px-4 py-2.5 bg-inho-dark hover:bg-inho-gold/20 border border-inho-border hover:border-inho-gold text-inho-text text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {isDecodingTag ? 'Decodificando...' : 'Decodificar'}
            </button>
          </form>

          {scaleTagResult && (
            <div className="p-3 bg-inho-black/60 rounded-xl border border-inho-gold/30 text-xs font-mono text-amber-300 flex items-center justify-between">
              <span>{scaleTagResult.interpretation}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                Item Carregado no PDV
              </span>
            </div>
          )}
        </div>

        {/* Bloco Central de Registro de Venda */}
        <div className="glassmorphism rounded-2xl p-6 border border-inho-border">
          <h3 className="text-xs font-mono font-bold text-inho-muted uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calculator size={16} /> Frente de Caixa · Registro de Venda
          </h3>

          <form onSubmit={handleRegisterSale} className="space-y-5">
            {/* Input Gigante de Valor */}
            <div>
              <input
                autoFocus required
                type="number" min="0.01" step="0.01"
                placeholder="R$ 0,00"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                className="w-full bg-inho-black border-2 border-inho-border hover:border-inho-gold focus:border-inho-gold rounded-2xl py-5 text-center text-4xl font-black font-mono text-inho-text placeholder:text-inho-border focus:outline-none transition-colors"
                disabled={isProcessing}
              />
            </div>

            {/* Input Opcional de Cliente / Descrição */}
            <div>
              <input
                type="text"
                placeholder="Identificação do Item / Nome do Cliente (Opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-inho-dark border border-inho-border rounded-xl px-4 py-3 text-sm text-inho-text placeholder:text-inho-muted/50 focus:outline-none focus:border-inho-gold/50"
                disabled={isProcessing}
              />
            </div>

            {/* Grid de Formas de Pagamento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {paymentButtons.map(btn => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setSelectedPayment(btn.id)}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all ${
                    selectedPayment === btn.id
                      ? `${btn.color} ring-2 ring-offset-2 ring-offset-inho-black ring-inho-text border-transparent scale-[0.98]`
                      : 'bg-inho-black border-inho-border hover:border-inho-muted text-inho-muted hover:text-inho-text'
                  }`}
                >
                  {btn.icon}
                  <span className="font-bold text-xs uppercase mt-2">{btn.label}</span>
                </button>
              ))}
            </div>

            {/* Ações de Finalização */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendToPhysicalTerminal}
                disabled={!saleAmount || parseFloat(saleAmount) <= 0 || isProcessing}
                className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all disabled:opacity-40"
              >
                <CreditCard size={18} /> Pagar no Smart POS
              </button>

              <button
                type="submit"
                disabled={!saleAmount || !selectedPayment || isProcessing}
                className="w-full flex justify-center items-center gap-2 bg-inho-green text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-emerald-400 hover:shadow-glow-green transition-all active:scale-95 disabled:opacity-40"
              >
                {isProcessing ? 'Gravando...' : <>Concluir Venda <ArrowRight size={18} /></>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Direita: Copilot IA & Painel do Caixa ── */}
      <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-5">

        {/* Copilot IA do Operador */}
        <div className="glassmorphism rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-inho-black relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              <h4 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">Copilot IA do Operador</h4>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
              Varejo & PLU
            </span>
          </div>

          <form onSubmit={handleCopilotQuery} className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Ex: Preço do tomate? Código PLU?"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              className="flex-1 bg-inho-black border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-inho-text placeholder:text-inho-muted focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={isCopilotThinking || !copilotQuery.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isCopilotThinking ? '...' : <Send size={14} />}
            </button>
          </form>

          {copilotResponse && (
            <div className="p-3 bg-indigo-950/40 rounded-xl border border-indigo-500/30 text-xs text-indigo-100 font-mono leading-relaxed mb-3">
              {copilotResponse}
            </div>
          )}

          {/* Sugestões de Cross-Sell */}
          {copilotCrossSells.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-indigo-500/20">
              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1">
                <ShoppingBag size={12} /> Sugestões de Venda Adicional (Cross-Sell):
              </span>
              <div className="space-y-1.5">
                {copilotCrossSells.map((cs, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-inho-black/60 border border-amber-500/30 text-[11px]">
                    <strong className="text-white block">{cs.item_name}</strong>
                    <span className="text-inho-muted text-[10px]">{cs.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Posição Financeira do Caixa */}
        <div className="glassmorphism rounded-2xl p-5 border border-inho-gold/30 relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-block px-2 py-0.5 bg-inho-gold/20 text-inho-gold border border-inho-gold/40 text-[9px] font-black uppercase tracking-widest rounded mb-3">
              Sessão Aberta
            </span>
            <p className="text-xs text-inho-muted font-mono mb-1">Fundo Fixo Inicial</p>
            <p className="font-mono text-base text-inho-text font-bold mb-3">{formatCurrency(Number(session?.opening_balance || 0))}</p>

            <div className="h-px bg-inho-border my-3" />

            <p className="text-xs text-inho-muted font-mono mb-1">Posição Atual (Fundo + Vendas)</p>
            <p className="font-mono text-2xl text-inho-gold font-black">
              <Counter end={currentTotalInBank} decimals={2} prefix="R$ " />
            </p>
          </div>
        </div>

        {/* Trilha Rápida de Transações */}
        <div className="glassmorphism rounded-2xl border border-inho-border flex flex-col overflow-hidden max-h-[220px]">
          <div className="p-3 border-b border-inho-border bg-inho-dark/80 flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-inho-text uppercase">Últimas Vendas</h4>
            <span className="text-[10px] text-inho-muted font-mono">{recentSales.length} regs</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingSales ? (
              <div className="text-center py-4">
                <div className="inline-block w-4 h-4 border-2 border-inho-muted border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-[10px] text-center font-mono text-inho-muted">Nenhuma venda na sessão atual.</p>
            ) : (
              recentSales.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex justify-between items-center bg-inho-black/50 p-2 rounded-lg border border-inho-border/50">
                  <div>
                    <p className="text-xs text-inho-text font-bold font-mono">{formatCurrency(Number(sale.total_amount))}</p>
                    <p className="text-[9px] text-inho-muted font-mono uppercase mt-0.5">{sale.payment_method}</p>
                  </div>
                  <CheckCircle2 size={13} className="text-inho-green" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Botão de Fechar Caixa */}
        <button
          onClick={() => setShowCloseModal(true)}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-inho-dark border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <LogOut size={16} />
          Encerrar Sessão & Borderô
        </button>
      </div>

      {/* ── Modal de Fechamento Cego de Caixa com Auditoria de IA ── */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-3xl p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-inho-gold" />
                <h3 className="text-lg font-black tracking-tight">Fechamento Cego de Caixa</h3>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Informe a contagem física real dos valores apurados na gaveta e maquininha. O Copilot IA auditará a conciliação contra as vendas registradas no sistema.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Dinheiro em Espécie (R$)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0,00"
                  value={countedCash} onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white outline-none focus:border-inho-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Comprovantes Cartão / Maquininha (R$)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0,00"
                  value={countedCards} onChange={(e) => setCountedCards(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white outline-none focus:border-inho-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Total Recebido via PIX (R$)</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0,00"
                  value={countedPix} onChange={(e) => setCountedPix(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white outline-none focus:border-inho-gold"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunCashReconcile}
              disabled={isReconciling}
              className="w-full py-2.5 bg-inho-dark hover:bg-slate-800 border border-slate-700 text-xs font-bold uppercase rounded-xl transition-all"
            >
              {isReconciling ? 'Auditando com IA...' : 'Conferir Valores com IA'}
            </button>

            {reconcileResult && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Esperado:</span>
                  <strong className="text-white">R$ {reconcileResult.system_expected_total?.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Contado:</span>
                  <strong className="text-white">R$ {reconcileResult.actual_counted_total?.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1">
                  <span className="text-slate-400">Divergência:</span>
                  <strong className={reconcileResult.difference === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    R$ {reconcileResult.difference?.toFixed(2)} ({reconcileResult.status})
                  </strong>
                </div>
                <p className="text-[11px] text-amber-200/90 pt-1 border-t border-slate-800/80 leading-normal">
                  {reconcileResult.ai_audit_justification}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseRegister}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

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
          <span className="text-inho-text font-bold uppercase tracking-wider">Frente de Caixa (PDV) · Vertical Mercados & Afins</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <CreditCard size={12} /> Stripe Terminal Active
          </span>
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
