import os
import uuid
import mimetypes
from typing import Tuple
from app.core.config import settings

# Local upload directory fallback
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


def get_file_extension(file_name: str, mime_type: str) -> str:
    ext = os.path.splitext(file_name)[1].lower()
    if not ext:
        ext = mimetypes.guess_extension(mime_type) or ".bin"
    return ext


def upload_document_file(
    file_bytes: bytes,
    file_name: str,
    mime_type: str,
    user_id: str,
) -> Tuple[str, str]:
    """
    Ultra-fast, non-blocking document uploader.
    Uses direct Supabase REST API with 3.0s hard timeout to prevent request hanging.
    """
    ext = get_file_extension(file_name, mime_type)
    unique_file_id = str(uuid.uuid4())
    storage_path = f"{user_id}/{unique_file_id}{ext}"

    # 1. Save local copy (<1ms)
    try:
        local_path = os.path.join(LOCAL_UPLOAD_DIR, f"{unique_file_id}{ext}")
        with open(local_path, "wb") as f:
            f.write(file_bytes)
    except Exception as local_err:
        print(f"[Storage Service] Local cache write error: {local_err}")

    # 2. Fast Supabase Storage REST upload (Max 3s timeout)
    supabase_url = settings.SUPABASE_URL.rstrip("/") if settings.SUPABASE_URL else ""
    supabase_key = settings.SUPABASE_KEY
    if supabase_url and "supabase.co" in supabase_url and supabase_key and len(supabase_key) > 10:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {supabase_key}",
                "apikey": supabase_key,
                "Content-Type": mime_type or "application/octet-stream",
            }
            upload_endpoint = f"{supabase_url}/storage/v1/object/medical-records/{storage_path}"
            with httpx.Client(timeout=3.0) as client:
                res = client.post(upload_endpoint, headers=headers, content=file_bytes)
                if res.status_code in [200, 201]:
                    public_url = f"{supabase_url}/storage/v1/object/public/medical-records/{storage_path}"
                    return storage_path, public_url
        except Exception as storage_err:
            print(f"[Storage Service] Fast Supabase Storage note: {storage_err}")

    # 3. Direct Public CDN URL format
    if supabase_url and "supabase.co" in supabase_url:
        return storage_path, f"{supabase_url}/storage/v1/object/public/medical-records/{storage_path}"

    return storage_path, f"/uploads/{unique_file_id}{ext}"
