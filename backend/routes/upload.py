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
    Secure endpoint for uploading assets (images/videos) to Cloudinary.
    Requires a valid Admin JWT token.
    """
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Formato de arquivo não suportado.")

    try:
        # Read file bytes for validation and upload
        file_content = await file.read()
        
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="Arquivo excede o limite de 5MB.")
            
        # Upload to Cloudinary using our service
        # 'auto' resource type handles images and videos automatically
        secure_url = await upload_to_cloudinary(file_content, file.filename, resource_type="auto")
        
        if not secure_url:
            raise HTTPException(
                status_code=500, 
                detail="Uplink transmission to Cloudinary failed. Check credentials."
            )
            
        return {
            "status": "Uplink Successful",
            "url": secure_url,
            "filename": file.filename
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in upload route: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Uplink error.")
