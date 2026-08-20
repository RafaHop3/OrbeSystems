-- ====================================================================
-- INHO Platform — Supabase / PostgreSQL pg_cron Automated Audit Rotation
-- Agendamento automático noturno (03:00 AM) para limpeza de logs INFO antigos
-- ====================================================================

-- 1. Habilitar a extensão pg_cron (caso não esteja ativa no projeto Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Função SQL de rotação de logs de auditoria
CREATE OR REPLACE FUNCTION rotate_audit_logs_nightly()
RETURNS void AS $$
BEGIN
    -- Excluir registros informativos com mais de 90 dias
    DELETE FROM audit_logs
    WHERE timestamp < (NOW() - INTERVAL '90 days')
      AND action NOT ILIKE '%fail%'
      AND action NOT ILIKE '%lockout%'
      AND action NOT ILIKE '%unauthorized%'
      AND action NOT ILIKE '%critical%';

    RAISE NOTICE 'pg_cron: Rotação noturna de logs de auditoria concluída com sucesso.';
END;
$$ LANGUAGE plpgsql;

-- 3. Agendar a função para rodar diariamente às 03:00 AM (UTC)
SELECT cron.schedule(
    'nightly-audit-log-rotation',
    '0 3 * * *',
    'SELECT rotate_audit_logs_nightly();'
);
