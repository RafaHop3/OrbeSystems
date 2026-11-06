import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      plan_tier = 'INHO_PRO_IA',
      billing_cycle = 'monthly',
      business_name = 'Minha Empresa',
      email = '',
      phone = '',
    } = body;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const isAnnual = String(billing_cycle).toLowerCase() === 'annual';

    // Normalização do Tier
    const normTier = String(plan_tier).toUpperCase().replace('-', '_');
    let planName = 'INHO Pro + OrBrick-IA';
    let unitAmount = isAnnual ? 590000 : 59000;
    let description = 'Até 8 operadores, OrBrick-IA Ativa, CBM Preditivo, RAG Multi-Tenant e Maquininhas Stripe Terminal.';

    if (normTier.includes('ESSENCIAL')) {
      planName = 'INHO Essencial';
      unitAmount = isAnnual ? 290000 : 29000;
      description = 'Core ERP Completo, até 3 operadores, PDV Rápido, Pedidos, Boletos/PIX dinâmico e Central WhatsApp.';
    } else if (normTier.includes('ENTERPRISE') || normTier.includes('COOPERATIVA') || normTier.includes('OURO')) {
      planName = 'INHO Enterprise & Corporativo (Padrão Ouro)';
      unitAmount = isAnnual ? 990000 : 99000;
      description = 'Padrão Ouro: Governança Corporativa Completa (Multi-Empresas, Quadro Societário, Auditoria Imutável), Open Finance Oficial e até 25 operadores.';
    }

    const successUrl = `https://inho.orbesystems.com.br/bem-vindo?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `https://www.orbesystems.com.br/assinar`;

    // ── 1. If STRIPE_SECRET_KEY is configured, call Stripe API directly ──────
    if (stripeSecretKey) {
      const params = new URLSearchParams();
      params.append('mode', 'subscription');
      params.append('payment_method_types[0]', 'card');
      params.append('line_items[0][price_data][currency]', 'brl');
      params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
      params.append('line_items[0][price_data][product_data][name]', `${planName} — ${isAnnual ? 'Anual (2 Meses Grátis)' : 'Mensal'}`);
      params.append('line_items[0][price_data][product_data][description]', description);
      params.append('line_items[0][price_data][recurring][interval]', isAnnual ? 'year' : 'month');
      params.append('line_items[0][quantity]', '1');
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);

      if (email) {
        params.append('customer_email', email.trim().toLowerCase());
      }

      // Metadata para provisionamento
      params.append('metadata[business_name]', business_name.trim().slice(0, 100));
      params.append('metadata[phone]', phone.trim().slice(0, 30));
      params.append('metadata[email]', email.trim().toLowerCase());
      params.append('metadata[plan_tier]', normTier);
      params.append('metadata[billing_cycle]', isAnnual ? 'ANNUAL' : 'MONTHLY');

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const stripeData = await stripeRes.json();

      if (!stripeRes.ok) {
        return NextResponse.json(
          { error: stripeData.error?.message || 'Falha ao iniciar checkout Stripe.' },
          { status: stripeRes.status }
        );
      }

      return NextResponse.json({
        status: 'success',
        checkout_url: stripeData.url,
        session_id: stripeData.id,
      });
    }

    // ── 2. Fallback Sandbox / Dev ──────────────────────────────────────────
    const mockSessionId = `cs_test_mock_${Date.now()}`;
    const fallbackUrl = `https://inho.orbesystems.com.br/bem-vindo?session_id=${mockSessionId}&email=${encodeURIComponent(email)}&business=${encodeURIComponent(business_name)}&plan=${encodeURIComponent(normTier)}`;

    return NextResponse.json({
      status: 'success',
      mode: 'sandbox_preview',
      checkout_url: fallbackUrl,
      session_id: mockSessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro no gateway de assinatura INHO.', details: error.message },
      { status: 500 }
    );
  }
}
