"""
Script para adicionar Ghost Engine à tabela de metadados
"""
from database import SessionLocal
from services.metadata_service import save_project_metadata

def add_ghost_engine():
    db = SessionLocal()
    try:
        # Adicionar Ghost Engine como projeto premium featured
        ghost_engine_metadata = {
            "repo_name": "Ghost-Engine",
            "custom_description": "Motor de renderização 3D com física real-time e shaders avançados para experiências imersivas",
            "image_url": None,
            "video_url": None,
            "deploy_url": "/ghost-engine",
            "is_featured": True,
            "is_premium_only": False
        }
        
        save_project_metadata("ghost-engine", ghost_engine_metadata, db)
        print("✅ Ghost Engine adicionado com sucesso à tabela de metadados")
        
        # Verificar metadados atuais
        from services.metadata_service import get_all_metadata
        all_metadata = get_all_metadata(db)
        print(f"\n📊 Metadados atuais ({len(all_metadata)} projetos):")
        for repo_id, meta in all_metadata.items():
            featured = "⭐ FEATURED" if meta.get("is_featured") else ""
            premium = "🔒 PREMIUM" if meta.get("is_premium_only") else ""
            print(f"  - {meta.get('repo_name', repo_id)}: {featured} {premium}")
            
    except Exception as e:
        print(f"❌ Erro ao adicionar Ghost Engine: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_ghost_engine()
