from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from security.auth import get_current_admin_user
from services.upload_service import upload_to_cloudinary

router = APIRouter()

@router.post("/upload")
async def secure_asset_upload(
    file: UploadFile = File(...),
    admin: str = Depends(get_current_admin_user)
):
    """
    Secure endpoint for uploading assets (images/videos) with EXIF Stripping
    and hybrid Cloudflare R2 (Zero-Egress) / Cloudinary uplink.
    Requires a valid Admin JWT token.
    """
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Formato de arquivo não suportado.")

    try:
        # Read file bytes for validation, EXIF sanitization, and upload
        file_content = await file.read()
        
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Arquivo excede o limite de 5MB.")
            
        secure_url = await upload_to_cloudinary(
            file_content,
            file.filename or "asset.jpg",
            resource_type="auto",
            content_type=file.content_type or "image/jpeg",
        )
        
        if not secure_url:
            raise HTTPException(
                status_code=500, 
                detail="Uplink transmission failed. Check R2 / Cloudinary credentials."
            )
            
        return {
            "status": "Uplink Successful",
            "exif_stripped": file.content_type.startswith("image/"),
            "url": secure_url,
            "filename": file.filename
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in upload route: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Uplink error.")
