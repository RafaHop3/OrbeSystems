import sys
import os
import asyncio

# Setup path for imports
sys.path.append(os.path.join(os.path.dirname(__file__)))

from db.session import get_db, SessionLocal
from models.models import CRMContact
from schemas.crm_schemas import CRMContactCreate, ContactCategory

async def test_db_persistence():
    db = SessionLocal()
    try:
        # Create a payload dict mimicking the frontend POST request
        payload = {
            "name": "Teste Direto Consistency DB",
            "email": "teste_direto@aws.com",
            "category": "CUSTOMER",
            "phone": "5551984743957",  # Numero problemático (Nono Dígito Meta)
            "person_type": "PESSOA_JURIDICA",
            "municipal_registration": "123456",
            "address": "Rua do Teste B2B2C, 123",
            "is_active": True
        }

        # Validate with the Pydantic Schema we patched (This triggers the @field_validator for the WhatsApp hook!)
        validated_schema = CRMContactCreate(**payload)
        
        # Verify the RegEx ran
        if validated_schema.phone == "555184743957":
            print("✅ Sucesso Pydantic: O Sanitizador de WhatsApp decapitou o Nono Dígito com sucesso (12 digitos)!")
        else:
            print(f"❌ Falha Pydantic: Regex não funcionou. Telefone atual: {validated_schema.phone}")

        # Map to SQLAlchemy Model and save to AWS DB
        # The Pydantic model dump() extracts all the 15 new corporate fields automatically
        contact_dict = validated_schema.model_dump(exclude_unset=True)
        
        # We need a dummy tenant_id for the direct database insert since Orbe systems is Multi-tenant
        contact_dict['tenant_id'] = "00000000-0000-0000-0000-000000000000"
        
        new_contact = CRMContact(**contact_dict)
        db.add(new_contact)
        db.commit()
        db.refresh(new_contact)

        print(f"✅ SUCESSO DB AWS: Contrato e Entidade inseridos na Tabela. ID do Contato: {new_contact.id}")
        print(f"👉 Nome: {new_contact.name} | Telefone Sanitizado: {new_contact.phone} | Categoria: {new_contact.category}")
        
    except Exception as e:
        print(f"❌ ERRO GRAVE DE INSERCAO: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_db_persistence())
