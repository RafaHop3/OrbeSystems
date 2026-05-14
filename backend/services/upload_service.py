import cloudinary
import cloudinary.uploader
from config import settings

# Configure Cloudinary with settings from env/config
# Prioritize the full secret URL (CLOUDINARY_URL) which is easier to copy/paste
if settings.CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL, secure=True)
else:
    cloudinary.config( 
      cloud_name = settings.CLOUDINARY_CLOUD_NAME, 
      api_key = settings.CLOUDINARY_API_KEY, 
      api_secret = settings.CLOUDINARY_API_SECRET,
      secure = True
    )

async def upload_to_cloudinary(file_content, filename: str, resource_type: str = "auto"):
    """
    Uploads a file to Cloudinary.
    resource_type="auto" detects image or video.
    Returns the secure HTTPS URL or None if failed.
    """
    try:
        # We upload to a dedicated folder 'orbe_systems'
        upload_result = cloudinary.uploader.upload(
            file_content,
            folder="orbe_systems",
            resource_type=resource_type,
            unique_filename=True,
            overwrite=True
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"CRITICAL: Cloudinary Upload Failure - {str(e)}")
        return None
