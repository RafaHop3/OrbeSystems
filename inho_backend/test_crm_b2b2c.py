import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models.models import CRMContact, ContactCategory, PersonType, Business
import datetime
import uuid
from dotenv import load_dotenv

load_dotenv()

async def test_crm_database_insertion():
    db_url = "postgresql+asyncpg://orbe_admin:orbe_password@localhost:5432/orbesystems"
        
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Step 1: Obter um Business Válido Existente para fazer o bind
        business_resp = await session.execute(select(Business).limit(1))
        business = business_resp.scalars().first()
        
        if not business:
            print("❌ ERRO: Nenhuma Business 'Org/Empresa' mestra encontrada para linkar o test subject.")
            return
            
        print(f"✅ Usando Business Master: {business.id}")

        # Step 2: Inserir a Super-Entidade no DB testando as 15 Colunas
        fake_uuid = str(uuid.uuid4())
        
        test_contact = CRMContact(
            id=fake_uuid,
            business_id=business.id,
            category=ContactCategory.PARTNER,
            name="🤖 Morsa B2B2C Logistics S/A (Teste QA)",
            document="99.999.999/0001-99",
            email="morsa.automation@orbesystems.com",
            phone="5551984743957",
            is_active=True,
            
            # --- NOVAS COLUNAS B2B2C ---
            person_type=PersonType.LEGAL_ENTITY,
            municipal_registration="IM-88484",
            state_registration="IE-04938",
            website="https://inho.orbesystems.com.br",
            contact_person="Alexandre O.",
            nis="12345678901",
            correios_matricula="BR101340-LOG",
            
            # --- ESTRUTURA DE ENDERECO ---
            address="Avenida Principal, 00", # Legaçy
            street="Av. Borges de Medeiros",
            number="4500",
            complement="Sala 301 - Orbe Tower",
            neighborhood="Centro Histórico",
            city="Porto Alegre",
            state="RS",
            zip_code="90020-020",
            
            # --- LIQUIDAÇÃO FINANCEIRA ---
            bank_code="033", # Santander
            bank_agency="1500",
            bank_account="01014523-9",
            pix_key_type="CNPJ",
            pix_key="99.999.999/0001-99"
        )
        
        try:
            session.add(test_contact)
            await session.commit()
            print("🚀 SUCESSO ABSOLUTO: Super-Contato adicionado ao Banco sem corrupções!")
            
            # Step 3: Fetch Data de novo para conferir consistência total
            res = await session.execute(select(CRMContact).where(CRMContact.id == fake_uuid))
            saved_contact = res.scalars().first()
            
            if saved_contact:
                print(f"🔍 Consistência Aprovada!")
                print(f"-> Nome: {saved_contact.name}")
                print(f"-> NIS Salvo: {saved_contact.nis}")
                print(f"-> Chave Pix: {saved_contact.pix_key}")
                print(f"-> Rua: {saved_contact.street}")
            else:
                print("❌ Falha crítica: Inseriu mas não consegiu resgatar a instância!")
                
        except Exception as e:
            print("🔥 ERRO FATAL AO INSERIR NO BANCO:")
            print(str(e))
        finally:
            # Step 4: Limpeza do Teste
            # Para não sujar a base do ORBE
            print("🧹 Iniciando limpeza do DB (Purging Mock)...")
            await session.delete(saved_contact)
            await session.commit()
            print("✅ Limpeza de dados comitada.")

if __name__ == "__main__":
    asyncio.run(test_crm_database_insertion())
