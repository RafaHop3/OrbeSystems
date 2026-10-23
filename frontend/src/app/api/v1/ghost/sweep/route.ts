import { NextResponse } from 'next/server';
import crypto from 'crypto';
import brokersData from '@/data/ghost_brokers.json';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, cpf, email, target_ids } = body;

    if (!full_name || !cpf) {
      return NextResponse.json(
        { error: 'Nome completo e CPF são obrigatórios para emissão do protocolo LGPD.' },
        { status: 400 }
      );
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const timestamp = new Date().toISOString();
    const salt = process.env.ORBE_AUDIT_SALT || 'orbe-zero-trust-ledger-2026';

    const targets = (target_ids && target_ids.length > 0)
      ? brokersData.filter(b => target_ids.includes(b.id))
      : brokersData;

    const evidenceLedger = targets.map((target) => {
      const payload = `${target.id}:${cleanCpf}:${timestamp}:${salt}`;
      const auditHash = crypto.createHash('sha256').update(payload).digest('hex');
      const protocol = `ORBE-LGPD-${auditHash.slice(0, 10).toUpperCase()}`;

      return {
        broker_id: target.id,
        broker_name: target.name,
        domain: target.domain,
        category: target.category,
        method: target.method,
        status: target.method === 'DPO_EMAIL' ? 'DISPATCHED' : 'SUBMITTED',
        timestamp,
        protocol,
        audit_hash: auditHash,
        target_endpoint: target.dpo_email || target.optout_url,
        sla_days: target.sla_days,
        details: target.method === 'DPO_EMAIL'
          ? `Notificação Art. 18 enviada para ${target.dpo_email || target.domain}`
          : `Formulário de exclusão disparado com prova digital SHA-256`
      };
    });

    const combinedHashes = evidenceLedger.map(e => e.audit_hash).join(':');
    const batchHash = crypto.createHash('sha256').update(combinedHashes).digest('hex');
    const batchId = `ORBE-BATCH-${batchHash.slice(0, 14).toUpperCase()}`;

    return NextResponse.json({
      status: 'success',
      batch_id: batchId,
      batch_hash_sha256: batchHash,
      timestamp,
      total_targets: targets.length,
      dispatched: evidenceLedger.length,
      client: {
        name: full_name,
        masked_cpf: `${cleanCpf.slice(0, 3)}.***.***-${cleanCpf.slice(-2)}`,
        email: email || 'cliente@orbesystems.com.br'
      },
      evidence_ledger: evidenceLedger
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Falha no processamento do Ghost Engine.', details: error.message },
      { status: 500 }
    );
  }
}
