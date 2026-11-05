"use client";

/**
 * app/assinar/page.tsx — Planos de Assinatura INHO & Orbe Systems
 * ═══════════════════════════════════════════════════════════════
 * Nova Arquitetura de 3 Planos (05/11/2026):
 * 1. INHO Essencial (R$ 290/mês | R$ 2.900/ano)
 * 2. INHO Pro + OrBrick-IA (R$ 590/mês | R$ 5.900/ano - MAIS POPULAR)
 * 3. INHO Cooperativa & Enterprise (R$ 990/mês | R$ 9.900/ano - PADRÃO EXECUTIVO OURO)
 * Seletor de Ciclo Mensal / Anual (2 Meses Grátis) + Suporte a Ghost Engine Pass avulso.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCheckoutSessionAction } from "@/lib/auth-actions";

type BillingCycle = "monthly" | "annual";

interface PlanFeature {
  text: string;
  ok: boolean;
  highlight?: boolean;
}

interface PlanConfig {
  id: string;
  tierCode: string;
  label: string;
  subtitle: string;
  monthlyPrice: string;
  annualPrice: string;
  annualMonthlyEquivalent: string;
  color: string;
  glow: string;
  badge?: string;
  isPopular?: boolean;
  isGold?: boolean;
  features: PlanFeature[];
  cta: string;
}

const INHO_PLANS: PlanConfig[] = [
  {
    id: "inho_essencial",
    tierCode: "INHO_ESSENCIAL",
    label: "INHO ESSENCIAL",
    subtitle: "PME & Serviços Recorrentes",
    monthlyPrice: "R$ 290",
    annualPrice: "R$ 2.900",
    annualMonthlyEquivalent: "R$ 241,66/mês",
    color: "#00fff5",
    glow: "rgba(0,255,245,0.15)",
    features: [
      { text: "Até 3 operadores (1 Admin + 2 Operadores)", ok: true },
      { text: "Core ERP Completo (PDV, Pedidos, Boletos & PIX)", ok: true },
      { text: "NFS-e, DRE Caixa/Competência & Lacre SHA-256", ok: true },
      { text: "Central WhatsApp Básica (Régua D-3, D0, D+3)", ok: true },
      { text: "Disparos Manuais Nominalmente Assinados", ok: true },
      { text: "OrBrick-IA Ativa & Resposta Assistida", ok: false },
      { text: "Treinamento RAG (.PDF / .DOCX)", ok: false },
      { text: "Inteligência Preditiva CBM & RFM", ok: false },
      { text: "Módulo Cooperativismo & Open Finance", ok: false },
    ],
    cta: "Assinar Essencial",
  },
  {
    id: "inho_pro",
    tierCode: "INHO_PRO_IA",
    label: "INHO PRO + ORBRICK-IA",
    subtitle: "Operações Comerciais & Médias Empresas",
    monthlyPrice: "R$ 590",
    annualPrice: "R$ 5.900",
    annualMonthlyEquivalent: "R$ 491,66/mês",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.25)",
    badge: "MAIS POPULAR",
    isPopular: true,
    features: [
      { text: "Até 8 operadores com RBAC completo", ok: true, highlight: true },
      { text: "Core ERP Completo + Alçada Dual-Control (> R$ 5.000)", ok: true },
      { text: "Pesquisa de Clima Organizacional (PCO)", ok: true },
      { text: "OrBrick-IA Ativa c/ Handoff Humano & Kill-Switch", ok: true, highlight: true },
      { text: "Treinamento RAG (Até 25 chunks .PDF / .DOCX)", ok: true, highlight: true },
      { text: "Franquia de 2.500 inferências IA / mês", ok: true },
      { text: "CBM Preditivo Completo (RFM, Churn & LTV)", ok: true },
      { text: "Campanhas Multicanal Automatizadas", ok: true },
      { text: "Módulo Cooperativismo & Open Finance", ok: false },
    ],
    cta: "Assinar Pro + IA",
  },
  {
    id: "inho_cooperativa",
    tierCode: "INHO_COOPERATIVA_OURO",
    label: "COOPERATIVA & ENTERPRISE",
    subtitle: "Cooperativas, Associações & Grandes Contas",
    monthlyPrice: "R$ 990",
    annualPrice: "R$ 9.900",
    annualMonthlyEquivalent: "R$ 825,00/mês",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.25)",
    badge: "PADRÃO EXECUTIVO OURO",
    isGold: true,
    features: [
      { text: "10 a 25 operadores c/ Trilha de Auditoria Imutável", ok: true, highlight: true },
      { text: "Módulo Cooperativismo 100% Incluído (Quadro Social & Cotas)", ok: true, highlight: true },
      { text: "Retenções Fiscais (INSS/IRRF/FATES) & Informe IRPF/DIRF", ok: true },
      { text: "Open Finance Brasil Oficial (Sicoob, Sicredi, BB & Inter)", ok: true, highlight: true },
      { text: "OrBrick-IA Multi-Operador c/ Guardrail Zero-Trust", ok: true },
      { text: "RAG Ilimitado + Upload do Estatuto Social (.PDF/.DOCX)", ok: true, highlight: true },
      { text: "Franquia de 5.000 inferências IA / mês", ok: true },
      { text: "CBM Sócios VIP + Expurgo LGPD Art. 18", ok: true },
      { text: "Portal do Contador & Alçada Dual-Control", ok: true },
    ],
    cta: "Contratar Padrão Ouro",
  },
];

function AssinarPageContent() {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [isPending, startTransition] = useTransition();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = (tierCode: string) => {
    setError(null);
    setLoadingPlan(tierCode);
    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction(tierCode, cycle);

        if (result.error === "unauthorized") {
          router.push(`/login?redirect=/assinar`);
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.url) {
          window.location.href = result.url;
        }
      } finally {
        setLoadingPlan(null);
      }
    });
  };

  const handleGhostCheckout = () => {
    setError(null);
    setLoadingPlan("ghost_engine");
    startTransition(async () => {
      try {
        const res = await fetch("/api/v1/ghost/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ return_url: window.location.href }),
        });
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
        } else {
          setError(data.error || "Erro ao processar checkout.");
        }
      } catch {
        setError("Erro de conexão ao processar checkout do Ghost Engine.");
      } finally {
        setLoadingPlan(null);
      }
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>INHO &amp; ORBE SYSTEMS • TABELA OFICIAL 2026</div>
          <h1 style={styles.title}>Planos &amp; Soluções Empresariais</h1>
          <p style={styles.subtitle}>
            Inteligência Contábil, Central WhatsApp OrBrick-IA e Governança Multi-Tenant de Ponta a Ponta
          </p>

          {/* Selector de Ciclo (Mensal / Anual) */}
          <div style={styles.cycleWrapper}>
            <div style={styles.cycleContainer}>
              <button
                type="button"
                onClick={() => setCycle("monthly")}
                style={{
                  ...styles.cycleButton,
                  ...(cycle === "monthly" ? styles.cycleButtonActive : {}),
                }}
              >
                Faturamento Mensal
              </button>
              <button
                type="button"
                onClick={() => setCycle("annual")}
                style={{
                  ...styles.cycleButton,
                  ...(cycle === "annual" ? styles.cycleButtonActiveAnnual : {}),
                }}
              >
                Anual • 2 Meses Grátis
                <span style={styles.discountBadge}>ECONOMIZE 17%</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Grade Comparativa de Planos */}
        <div style={styles.plansGrid}>
          {INHO_PLANS.map((plan) => {
            const isLoadingThis = isPending && loadingPlan === plan.tierCode;
            const priceDisplay = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const pricePeriod = cycle === "annual" ? "/ano" : "/mês";

            return (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                style={{
                  ...styles.planCard,
                  borderColor: plan.isGold ? "#f59e0b" : plan.isPopular ? "#a855f7" : `${plan.color}44`,
                  boxShadow: `0 0 35px ${plan.glow}, 0 10px 40px rgba(0,0,0,0.5)`,
                  ...(plan.isPopular ? styles.popularCard : {}),
                  ...(plan.isGold ? styles.goldCard : {}),
                }}
              >
                {/* Badge Superior */}
                {plan.badge && (
                  <div
                    style={{
                      ...styles.planBadge,
                      background: plan.isGold
                        ? "linear-gradient(90deg, #d97706, #f59e0b)"
                        : "linear-gradient(90deg, #9333ea, #a855f7)",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Cabeçalho do Card */}
                <div style={styles.planHeader}>
                  <div style={{ ...styles.planLabel, color: plan.color }}>
                    {">"} {plan.label}
                  </div>
                  <div style={styles.planSubtitle}>{plan.subtitle}</div>

                  <div style={styles.priceRow}>
                    <span style={styles.planPrice}>{priceDisplay}</span>
                    <span style={styles.planPeriod}>{pricePeriod}</span>
                  </div>

                  {cycle === "annual" && (
                    <div style={styles.annualDetail}>
                      Equivalente a <strong>{plan.annualMonthlyEquivalent}</strong>
                    </div>
                  )}
                  {cycle === "monthly" && (
                    <div style={styles.annualDetail}>Cobrança recorrente mensal, cancele quando quiser</div>
                  )}
                </div>

                <div style={{ ...styles.divider, background: `${plan.color}22` }} />

                {/* Lista de Recursos */}
                <ul style={styles.featureList}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={styles.featureItem}>
                      <span
                        style={{
                          ...styles.featureIcon,
                          color: f.ok ? plan.color : "#4b5563",
                        }}
                      >
                        {f.ok ? "✓" : "✗"}
                      </span>
                      <span
                        style={{
                          ...styles.featureText,
                          color: f.ok
                            ? f.highlight
                              ? "#ffffff"
                              : "rgba(255,255,255,0.85)"
                            : "rgba(255,255,255,0.25)",
                          fontWeight: f.highlight ? 600 : 400,
                          textDecoration: f.ok ? "none" : "line-through",
                        }}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Botão de Ação / Checkout */}
                <button
                  id={`cta-${plan.id}`}
                  disabled={isPending}
                  style={{
                    ...styles.ctaBtn,
                    background: plan.isGold
                      ? "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,119,6,0.2))"
                      : plan.isPopular
                      ? "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(147,51,234,0.2))"
                      : "linear-gradient(135deg, rgba(0,255,245,0.2), rgba(0,255,245,0.05))",
                    border: `1px solid ${plan.color}`,
                    color: plan.color,
                    opacity: isPending ? 0.6 : 1,
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                  onClick={() => handleCheckout(plan.tierCode)}
                >
                  {isLoadingThis ? "REDIRECIONANDO..." : `[ ${plan.cta} ]`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Card Separado: Ghost Engine Pass (Avulso / Desindexação LGPD) */}
        <div style={styles.addonSection}>
          <div style={styles.addonCard}>
            <div style={styles.addonInfo}>
              <span style={styles.addonBadge}>PRODUTO COMPLEMENTAR • PRIVACIDADE PESSOAL</span>
              <h3 style={styles.addonTitle}>Ghost Engine Pass — Desindexação em 54 Data Brokers</h3>
              <p style={styles.addonDesc}>
                Varredura profunda, notificações automáticas aos DPOs fundamentadas no Art. 18 da LGPD,
                Playwright Stealth e registro imutável com hash SHA-256.
              </p>
            </div>
            <div style={styles.addonAction}>
              <div style={styles.addonPrice}>R$ 19,90 <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>taxa única</span></div>
              <button
                type="button"
                disabled={isPending}
                onClick={handleGhostCheckout}
                style={styles.addonBtn}
              >
                {loadingPlan === "ghost_engine" && isPending ? "PROCESSANDO..." : "Desbloquear Pass"}
              </button>
            </div>
          </div>
        </div>

        {/* Nota de Segurança e Garantia */}
        <p style={styles.securityNote}>
          🔒 Pagamento processado com segurança bancária criptografada pelo Stripe • Emissão automática de NFS-e • Cancele a qualquer momento
        </p>
      </div>
    </div>
  );
}

export default function AssinarPage() {
  return <AssinarPageContent />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020408 0%, #050d1a 50%, #020408 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace",
    position: "relative",
    overflow: "hidden",
    padding: "60px 24px",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(0,255,245,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,245,0.025) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  container: {
    width: "100%",
    maxWidth: "1200px",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: "48px",
  },
  badge: {
    display: "inline-block",
    border: "1px solid rgba(0,255,245,0.3)",
    background: "rgba(0,255,245,0.05)",
    color: "#00fff5",
    fontSize: "11px",
    padding: "4px 14px",
    borderRadius: "20px",
    letterSpacing: "0.15em",
    marginBottom: "16px",
  },
  title: {
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.02em",
    margin: "0 0 12px 0",
  },
  subtitle: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.65)",
    maxWidth: "650px",
    margin: "0 auto 28px auto",
    lineHeight: "1.6",
  },
  cycleWrapper: {
    display: "flex",
    justifyContent: "center",
    marginTop: "20px",
  },
  cycleContainer: {
    display: "inline-flex",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "32px",
    padding: "4px",
    gap: "4px",
  },
  cycleButton: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.6)",
    padding: "10px 22px",
    borderRadius: "28px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "inherit",
  },
  cycleButtonActive: {
    background: "rgba(0,255,245,0.15)",
    color: "#00fff5",
    boxShadow: "0 0 15px rgba(0,255,245,0.2)",
  },
  cycleButtonActiveAnnual: {
    background: "linear-gradient(90deg, rgba(168,85,247,0.25), rgba(245,158,11,0.25))",
    color: "#ffffff",
    boxShadow: "0 0 15px rgba(245,158,11,0.2)",
  },
  discountBadge: {
    background: "#10b981",
    color: "#020408",
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: "10px",
    letterSpacing: "0.05em",
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fca5a5",
    padding: "12px 20px",
    borderRadius: "8px",
    marginBottom: "32px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  plansGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
    gap: "28px",
    alignItems: "stretch",
    marginBottom: "40px",
  },
  planCard: {
    background: "rgba(10, 16, 28, 0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    borderWidth: "1px",
    borderStyle: "solid",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  popularCard: {
    background: "rgba(20, 15, 35, 0.85)",
  },
  goldCard: {
    background: "rgba(30, 22, 10, 0.85)",
  },
  planBadge: {
    position: "absolute",
    top: "-13px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: 800,
    padding: "4px 14px",
    borderRadius: "12px",
    letterSpacing: "0.1em",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  },
  planHeader: {
    marginBottom: "20px",
  },
  planLabel: {
    fontSize: "14px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    marginBottom: "6px",
  },
  planSubtitle: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.5)",
    marginBottom: "16px",
    minHeight: "18px",
  },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "4px",
    marginBottom: "4px",
  },
  planPrice: {
    fontSize: "36px",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.03em",
  },
  planPeriod: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.5)",
  },
  annualDetail: {
    fontSize: "12px",
    color: "#10b981",
    marginTop: "4px",
  },
  divider: {
    height: "1px",
    width: "100%",
    margin: "0 0 20px 0",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 28px 0",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  featureIcon: {
    fontSize: "14px",
    fontWeight: 800,
    marginTop: "-1px",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  ctaBtn: {
    width: "100%",
    padding: "14px 20px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    outline: "none",
  },
  addonSection: {
    marginBottom: "32px",
  },
  addonCard: {
    background: "rgba(10, 16, 28, 0.6)",
    border: "1px solid rgba(0, 255, 245, 0.2)",
    borderRadius: "12px",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  addonInfo: {
    flex: 1,
    minWidth: "280px",
  },
  addonBadge: {
    fontSize: "10px",
    color: "#00fff5",
    letterSpacing: "0.1em",
    display: "block",
    marginBottom: "4px",
  },
  addonTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#ffffff",
    margin: "0 0 6px 0",
  },
  addonDesc: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.6)",
    margin: 0,
    lineHeight: "1.5",
  },
  addonAction: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  addonPrice: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#ffffff",
  },
  addonBtn: {
    background: "rgba(0, 255, 245, 0.15)",
    border: "1px solid #00fff5",
    color: "#00fff5",
    padding: "10px 18px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  securityNote: {
    textAlign: "center",
    fontSize: "12px",
    color: "rgba(255,255,255,0.45)",
    margin: 0,
    lineHeight: "1.6",
  },
};
