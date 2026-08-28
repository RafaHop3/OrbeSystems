import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import AsyncSessionLocal
from models.models import (
    User, Business, BusinessCategory, Cooperado, 
    CooperadoStatus, BillingInvoice, BillingStatus, PaymentMethod
)
from routers.billing import webhook_bank_boleto_b2b2c, BankWebhookPayload
import uuid
from datetime import datetime, timezone

async def run_simulation():
    print("🚀 Iniciando Simulação End-to-End: B2B2C Webhook & Cooperativa Status")
    
    async with AsyncSessionLocal() as db:
        # 1. Cria ou recicla um User Master
        user_res = await db.execute(User.__table__.select().limit(1))
        user_row = user_res.first()
        if not user_row:
            print("❌ Erro: Nenhum usuário master encontrado no BD de dev.")
            return
            
        user_id = user_row.id
        
        # 2. Simula criação de Negócio (Cooperativa)
        biz_id = uuid.uuid4()
        biz = Business(
            id=biz_id,
            user_id=user_id,
            name="Cooperativa Simulacao Ltd",
            category=BusinessCategory.COOPERATIVA
        )
        db.add(biz)
        
        # 3. Cria o Cliente (Cooperado) pendente
        mock_doc = "12345678909"
        coop = Cooperado(
            id=uuid.uuid4(),
            business_id=biz_id,
            name="João Cliente Cooperado",
            document=mock_doc,
            email="joao@teste.com",
            phone="5511999999999",
            status=CooperadoStatus.AGUARDANDO_INTEGRALIZACAO
        )
        db.add(coop)
        
        # 4. Cria a Fatura (Boleto) aguardando o pagamento baseada no CPF
        inv_id = uuid.uuid4()
        inv = BillingInvoice(
            id=inv_id,
            business_id=biz_id,
            customer_name="João Cliente Cooperado",
            customer_doc=mock_doc,
            customer_email="joao@teste.com",
            amount=500.00,
            due_date=datetime.now(timezone.utc),
            status=BillingStatus.PENDING,
            payment_method=PaymentMethod.OTHER
        )
        db.add(inv)
        
        await db.commit()
        print(f"✅ Cooperativa '{biz.name}' estabelecida.")
        print(f"✅ Cooperado '{coop.name}' aguardando taxa (Status: {coop.status.value}).")
        print(f"✅ Boleto Fatura (Status: {inv.status.value}) emitido.")
        
        # 5. SIMULA A BATIDA DO WEBHOOK DO BANCO
        print("\n⏳ [BANCO] Disparando Webhook de Boleto Pago (Via Asaas/MercadoPago)...")
        payload = BankWebhookPayload(
            event="BOLETO_PAGO",
            document=mock_doc,
            amount=500.00,
            bank_provider="Banco do Brasil Mock"
        )
        
        res = await webhook_bank_boleto_b2b2c(payload, db)
        
        # 6. Audita resultados!
        await db.refresh(inv)
        await db.refresh(coop)
        
        print("\n🔥 RESULTADOS DA RECONCILIAÇÃO B2B2C:")
        print(f"➜ Status da Fatura: {inv.status.value}")
        print(f"➜ Status do Cooperado: {coop.status.value}")
        print(f"➜ Faturas Baixadas no Log: {res.get('invoices_cleared')}")
        
        if coop.status == CooperadoStatus.ATIVO and inv.status == BillingStatus.PAID:
            print("🚀 SUCESSO ABSOLUTO! O pipeline automatizado atualizou o cliente e disparou mensagens via background.")
        
        # Cleanup
        await db.delete(inv)
        await db.delete(coop)
        await db.delete(biz)
        await db.commit()

if __name__ == "__main__":
    asyncio.run(run_simulation())
