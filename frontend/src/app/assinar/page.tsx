"use client";

/**
 * app/assinar/page.tsx — OrbeSystems Premium Upgrade Page
 * ════════════════════════════════════════════════════════
 * Landing page de planos com comparativo GUEST / USER / PREMIUM.
 * O botão "Assinar" chama POST /api/users/checkout e redireciona
 * para a página de checkout seguro do Stripe.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCheckoutSessionAction } from "@/lib/auth-actions";

const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://orbe-systems-api.onrender.com";
const API_URL = rawUrl.trim().replace(/\/$/, "");

const PLANS = [
  {
    id: "guest",
    label: "GUEST",
    price: "Grátis",
    color: "#6b7280",
    glow: "rgba(107,114,128,0.2)",
    features: [
      { text: "Portfólio público", ok: true },
      { text: "Leitura de projetos", ok: true },
      { text: "Blog & categorias", ok: true },
      { text: "Ferramentas premium", ok: false },
      { text: "Prioridade de suporte", ok: false },
      { text: "API rate limit aumentado", ok: false },
    ],
    cta: null,
  },
  {
    id: "user",
    label: "USER",
    price: "Grátis",
    color: "#00fff5",
    glow: "rgba(0,255,245,0.15)",
    features: [
      { text: "Portfólio público", ok: true },
      { text: "Leitura de projetos", ok: true },
      { text: "Blog & categorias", ok: true },
      { text: "Perfil pessoal", ok: true },
      { text: "Ferramentas premium", ok: false },
      { text: "API rate limit aumentado", ok: false },
    ],
    cta: "Criar Conta",
    ctaHref: "/login?mode=register",
  },
  {
    id: "premium",
    label: "PREMIUM",
    price: "R$ 29/mês",
    color: "#bc13fe",
    glow: "rgba(188,19,254,0.2)",
    badge: "MAIS POPULAR",
    features: [
      { text: "Portfólio público", ok: true },
      { text: "Leitura de projetos", ok: true },
      { text: "Blog & categorias", ok: true },
      { text: "Perfil pessoal", ok: true },
      { text: "Ferramentas premium", ok: true },
      { text: "API rate limit aumentado", ok: true },
    ],
    cta: "Assinar Premium",
    isStripe: true,
  },
];

export default function AssinarPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStripeCheckout = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction();

      if (result.error === "unauthorized") {
        router.push("/login?redirect=/assinar");
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>UPGRADE_SYSTEM</div>
          <h1 style={styles.title}>Escolha seu Plano</h1>
          <p style={styles.subtitle}>
            Acesso completo às ferramentas de Data Architecture &amp; Engineering
          </p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Plans grid */}
        <div style={styles.plansGrid}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              style={{
                ...styles.planCard,
                border: `1px solid ${plan.color}33`,
                boxShadow: `0 0 30px ${plan.glow}, 0 10px 40px rgba(0,0,0,0.4)`,
                ...(plan.id === "premium" ? styles.premiumCard : {}),
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{ ...styles.planBadge, background: plan.color }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div style={styles.planHeader}>
                <div style={{ ...styles.planLabel, color: plan.color }}>
                  {">"} {plan.label}
                </div>
                <div style={styles.planPrice}>{plan.price}</div>
                {plan.id === "premium" && (
                  <div style={styles.planBilling}>por mês, cancele quando quiser</div>
                )}
              </div>

              {/* Divider */}
              <div style={{ ...styles.divider, background: `${plan.color}22` }} />

              {/* Features */}
              <ul style={styles.featureList}>
                {plan.features.map((f, i) => (
                  <li key={i} style={styles.featureItem}>
                    <span
                      style={{
                        ...styles.featureIcon,
                        color: f.ok ? plan.color : "#374151",
                      }}
                    >
                      {f.ok ? "✓" : "✗"}
                    </span>
                    <span
                      style={{
                        ...styles.featureText,
                        color: f.ok ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                        textDecoration: f.ok ? "none" : "line-through",
                      }}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.cta && (
                <button
                  id={`cta-${plan.id}`}
                  disabled={plan.isStripe && isPending}
                  style={{
                    ...styles.ctaBtn,
                    background: plan.isStripe
                      ? `linear-gradient(135deg, ${plan.color}33, ${plan.color}22)`
                      : "transparent",
                    border: `1px solid ${plan.color}66`,
                    color: plan.color,
                    opacity: plan.isStripe && isPending ? 0.6 : 1,
                    cursor: plan.isStripe && isPending ? "not-allowed" : "pointer",
                  }}
                  onClick={() => {
                    if (plan.isStripe) {
                      handleStripeCheckout();
                    } else if (plan.ctaHref) {
                      router.push(plan.ctaHref);
                    }
                  }}
                >
                  {plan.isStripe && isPending ? "REDIRECIONANDO..." : `[ ${plan.cta} ]`}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Security note */}
        <p style={styles.securityNote}>
          🔒 Pagamento processado com segurança pelo Stripe • PCI DSS Level 1 • Cancele a qualquer momento
        </p>
      </div>
    </div>
  );
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
    maxWidth: "1100px",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: "56px",
  },
  badge: {
    display: "inline-block",
    border: "1px solid rgba(0,255,245,0.3)",
    color: "#00fff5",
    fontSize: "11px",
    letterSpacing: "0.15em",
    padding: "6px 16px",
    borderRadius: "4px",
    marginBottom: "20px",
  },
  title: {
    color: "#fff",
    fontSize: "clamp(28px, 5vw, 48px)",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: "0 0 16px",
  },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "15px",
    lineHeight: 1.6,
    margin: 0,
  },
  errorBanner: {
    background: "rgba(255,60,60,0.08)",
    border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: "8px",
    padding: "12px 20px",
    color: "#ff6b6b",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "32px",
  },
  plansGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    alignItems: "start",
  },
  planCard: {
    background: "rgba(5, 15, 30, 0.85)",
    borderRadius: "16px",
    padding: "32px",
    position: "relative",
    transition: "transform 0.2s",
  },
  premiumCard: {
    transform: "scale(1.03)",
    background: "rgba(8, 5, 20, 0.9)",
  },
  planBadge: {
    position: "absolute",
    top: "-14px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "10px",
    letterSpacing: "0.15em",
    color: "#fff",
    padding: "4px 16px",
    borderRadius: "20px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  planHeader: {
    marginBottom: "20px",
  },
  planLabel: {
    fontSize: "12px",
    letterSpacing: "0.15em",
    marginBottom: "12px",
  },
  planPrice: {
    color: "#fff",
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  planBilling: {
    color: "rgba(255,255,255,0.3)",
    fontSize: "11px",
    marginTop: "4px",
  },
  divider: {
    height: "1px",
    marginBottom: "20px",
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 28px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  featureIcon: {
    fontSize: "14px",
    width: "16px",
    flexShrink: 0,
  },
  featureText: {
    fontSize: "13px",
  },
  ctaBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "13px",
    letterSpacing: "0.1em",
    transition: "all 0.2s",
  },
  securityNote: {
    textAlign: "center",
    color: "rgba(255,255,255,0.2)",
    fontSize: "12px",
    marginTop: "48px",
    lineHeight: 1.6,
  },
};
