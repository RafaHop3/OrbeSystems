"""
services/upload_service.py — Pipeline de Sanitização EXIF & Upload Zero-Egress
══════════════════════════════════════════════════════════════════════════════
Executa EXIF Stripping em memória (removendo coordenadas GPS, serial de câmera
e metadados ocultos) e direciona mídias prioritariamente para Cloudflare R2
(zero custo de egress), mantendo fallback transparente para Cloudinary.
"""

import io
import uuid
import cloudinary
import cloudinary.uploader
from config import settings

# Configure Cloudinary with settings from env/config
if settings.CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL, secure=True)
else:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def strip_exif_metadata(file_bytes: bytes, content_type: str = "") -> bytes:
    """
    Remove todos os metadados EXIF (GPS, modelo de dispositivo, timestamps)
    de imagens JPEG, PNG e WebP recodificando os pixels limpos em memória.
    Arquivos de vídeo ou imagens caso Pillow não esteja disponível retornam intactos.
    """
    if not content_type.startswith("image/"):
        return file_bytes

    try:
        from PIL import Image, ImageOps

        with Image.open(io.BytesIO(file_bytes)) as img:
            # Preserva a orientação visual correta antes de descartar a tag EXIF Orientation
            img_oriented = ImageOps.exif_transpose(img)

            # Cria uma nova imagem limpa sem dicionário info/exif
            clean_img = Image.new(img_oriented.mode, img_oriented.size)
            clean_img.putdata(list(img_oriented.getdata()))

            output = io.BytesIO()
            fmt = (img.format or "JPEG").upper()
            if fmt not in ("JPEG", "PNG", "WEBP"):
                fmt = "JPEG"

            if fmt == "JPEG" and clean_img.mode in ("RGBA", "P"):
                clean_img = clean_img.convert("RGB")

            clean_img.save(output, format=fmt, quality=90, optimize=True)
            return output.getvalue()
    except Exception as exc:
        print(f"WARNING: [EXIF Stripper] Fallback para bytes originais ({exc})")
        return file_bytes


async def upload_to_r2(file_content: bytes, filename: str, content_type: str = "application/octet-stream") -> str | None:
    """
    Realiza upload S3-compatível para o Cloudflare R2 (Zero Egress) se configurado.
    """
    if not (settings.R2_ENDPOINT_URL and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY):
        return None

    try:
        import boto3
        from botocore.config import Config

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        object_key = f"orbe_mesh/{uuid.uuid4().hex}.{ext}"

        s3_client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
        s3_client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=object_key,
            Body=file_content,
            ContentType=content_type,
        )

        if settings.R2_PUBLIC_DOMAIN:
            base_domain = settings.R2_PUBLIC_DOMAIN.rstrip("/")
            return f"{base_domain}/{object_key}"
        return f"{settings.R2_ENDPOINT_URL.rstrip('/')}/{settings.R2_BUCKET_NAME}/{object_key}"
    except Exception as exc:
        print(f"WARNING: [Cloudflare R2] Falha no upload R2, acionando fallback Cloudinary: {exc}")
        return None


async def upload_to_cloudinary(
    file_content: bytes,
    filename: str,
    resource_type: str = "auto",
    content_type: str = "image/jpeg",
):
    """
    Executa EXIF Stripping em imagens e envia prioritariamente ao Cloudflare R2
    (se configurado no ambiente) ou ao Cloudinary (fallback padrão).
    """
    sanitized_bytes = strip_exif_metadata(file_content, content_type)

    # 1. Tenta Cloudflare R2 (Egress Zero) se as credenciais estiverem presentes
    r2_url = await upload_to_r2(sanitized_bytes, filename, content_type=content_type)
    if r2_url:
        return r2_url

    # 2. Fallback para Cloudinary
    try:
        upload_result = cloudinary.uploader.upload(
            sanitized_bytes,
            folder="orbe_systems",
            resource_type=resource_type,
            unique_filename=True,
            overwrite=True,
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"CRITICAL: Cloudinary Upload Failure - {str(e)}")
        return None
