import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, return_url } = body;

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const origin = request.headers.get('origin') || 'https://www.orbesystems.com.br';

    const successUrl = `${origin}/ferramentas-premium/databroker-optout?unlocked=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = return_url || `${origin}/ghost-engine`;

    // ── 1. If STRIPE_SECRET_KEY is present, call Stripe REST API directly ─────
    if (stripeSecretKey) {
      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('payment_method_types[0]', 'card');
      params.append('line_items[0][price_data][currency]', 'brl');
      params.append('line_items[0][price_data][unit_amount]', '1990'); // R$ 19,90
      params.append('line_items[0][price_data][product_data][name]', 'Orbe Ghost Engine — Desindexação de 50+ Data Brokers');
      params.append('line_items[0][price_data][product_data][description]', 'Varredura massiva em 54 data brokers com notificações legais DPO (Art. 18 LGPD) e provas criptográficas SHA-256.');
      params.append('line_items[0][quantity]', '1');
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);
      if (email) params.append('customer_email', email);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const stripeData = await stripeRes.json();

      if (!stripeRes.ok) {
        return NextResponse.json(
          { error: stripeData.error?.message || 'Falha ao criar sessão do Stripe.' },
          { status: stripeRes.status }
        );
      }

      return NextResponse.json({
        status: 'success',
        checkout_url: stripeData.url,
        session_id: stripeData.id,
      });
    }

    // ── 2. Fallback / Test Sandbox when STRIPE_SECRET_KEY is being configured ─
    // Redireciona diretamente para a tela desbloqueada em ambiente de teste/preview
    return NextResponse.json({
      status: 'success',
      mode: 'sandbox_preview',
      message: 'Ambiente de teste ativo. Desbloqueando acesso ao Ghost Engine.',
      checkout_url: `${origin}/ferramentas-premium/databroker-optout?unlocked=true&plan=ghost_pass_1990`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro no gateway de pagamento Ghost Engine.', details: error.message },
      { status: 500 }
    );
  }
}
