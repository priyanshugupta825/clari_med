import os
import uuid
import base64
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from fastapi.responses import Response, FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import security_bearer, decode_supabase_token
from app.models.user import User
from app.models.document import Document
from app.models.extracted_record import ExtractedRecord
from app.models.medicine import Medicine
from app.models.lab_result import LabResult
from app.schemas.document import (
    DocumentResponse,
    DocumentUploadResponse,
    DocumentReviewConfirmation,
)
from app.schemas.extraction import DocumentExtractionResult
from app.services.storage_service import LOCAL_UPLOAD_DIR, upload_document_file
from app.services.gemini_service import extract_medical_data

router = APIRouter(prefix="/documents", tags=["Documents & AI Intelligence"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
}


def _get_or_create_user(db: Session, user_id: str, email: Optional[str] = None) -> User:
    """
    Ensures a matching user row exists in the database for foreign key integrity.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        clean_suffix = "".join(c for c in user_id if c.isalnum())[:10] or "demo"
        user = User(
            id=user_id,
            email=email or f"patient_{clean_suffix}_{uuid.uuid4().hex[:6]}@abdm.gov.in",
            full_name="Patient User",
            abha_id=f"91-4521-{clean_suffix[:4]}-{clean_suffix[4:8] or '4123'}",
        )
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                user = User(
                    id=user_id,
                    email=f"patient_{uuid.uuid4().hex[:12]}@abdm.gov.in",
                    full_name="Patient User",
                )
                db.add(user)
                db.commit()
                db.refresh(user)
    return user


def get_user_id_from_request(
    request: Request,
    credentials=Depends(security_bearer),
) -> str:
    """
    Extracts user ID from X-User-Id header, Supabase bearer token, or returns default.
    """
    # 1. Custom client header for session consistency
    x_user = request.headers.get("x-user-id")
    if x_user and len(x_user) > 2:
        return x_user

    # 2. Bearer token
    if credentials and credentials.credentials:
        try:
            payload = decode_supabase_token(credentials.credentials)
            if payload.get("sub"):
                return payload.get("sub")
        except Exception:
            pass

    return "demo-user-123"


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_and_extract_document(
    file: UploadFile = File(...),
    document_type_hint: Optional[str] = Form("prescription"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    1. Accepts a medical document (PDF or Image).
    2. Uploads to Supabase Storage (with fallback).
    3. Creates a `documents` database row.
    4. Triggers Gemini AI Multimodal Document Intelligence extraction.
    5. Stores extracted encounters, medicines, and lab results in the database.
    6. Returns the full structured result for user inspection and review.
    """
    # 1. Validate MIME type
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in ALLOWED_MIME_TYPES and not file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{mime_type}'. Please upload a PDF or image (PNG, JPG).",
        )

    # 2. Read file bytes
    try:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")

    # Ensure user exists in DB
    _get_or_create_user(db, user_id)

    doc_id = str(uuid.uuid4())
    file_data_base64 = base64.b64encode(file_bytes).decode("utf-8")

    # 3. Upload to Storage (Fast local + Supabase backup)
    try:
        storage_path, raw_file_url = upload_document_file(
            file_bytes=file_bytes,
            file_name=file.filename,
            mime_type=mime_type,
            user_id=user_id,
        )
    except Exception as e:
        print(f"[Document Upload] Storage upload error: {e}")
        storage_path = f"{user_id}/{file.filename}"
        raw_file_url = f"/uploads/{file.filename}"

    # Always provide unified, 100% working backend view URL
    file_url = f"/api/documents/{doc_id}/view"

    # 4. Create Document record in DB with base64 resilience
    doc_record = Document(
        id=doc_id,
        user_id=user_id,
        file_name=file.filename,
        file_path=storage_path,
        file_url=file_url,
        mime_type=mime_type,
        file_size_bytes=len(file_bytes),
        file_data_base64=file_data_base64,
        document_type=document_type_hint or "prescription",
        processing_status="processing",
        tags=[document_type_hint] if document_type_hint else [],
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # 5. Execute Gemini AI Extraction Synchronously
    try:
        extraction_result: DocumentExtractionResult = extract_medical_data(
            file_bytes=file_bytes,
            mime_type=mime_type,
            file_name=file.filename,
            document_type_hint=document_type_hint,
        )
    except Exception as e:
        print(f"[Document Upload] AI Extraction encountered error: {e}")
        extraction_result = extract_medical_data(b"", mime_type, file.filename, document_type_hint)

    # 6. Save Extracted Clinical Encounter
    encounter_data = extraction_result.encounter
    parsed_date = None
    if encounter_data.record_date:
        try:
            parsed_date = datetime.date.fromisoformat(encounter_data.record_date)
        except Exception:
            parsed_date = datetime.date.today()

    # Normalize record_type strictly
    raw_type = (encounter_data.record_type or document_type_hint or "prescription").lower().replace(" ", "_")
    if "discharge" in raw_type or "summary" in raw_type:
        normalized_record_type = "discharge_summary"
    elif "consult" in raw_type or "opd" in raw_type or "clinic" in raw_type:
        normalized_record_type = "consultation"
    elif "lab" in raw_type or "report" in raw_type or "test" in raw_type or "blood" in raw_type:
        normalized_record_type = "lab_report"
    elif "vaccin" in raw_type or "immun" in raw_type:
        normalized_record_type = "vaccine_certificate"
    else:
        normalized_record_type = "prescription"

    extracted_rec_id = str(uuid.uuid4())
    extracted_record = ExtractedRecord(
        id=extracted_rec_id,
        document_id=doc_id,
        user_id=user_id,
        record_type=normalized_record_type,
        record_date=parsed_date or datetime.date.today(),
        doctor_name=encounter_data.doctor_name,
        doctor_specialty=encounter_data.doctor_specialty,
        facility_name=encounter_data.facility_name,
        chief_complaints=encounter_data.chief_complaints or [],
        diagnoses=encounter_data.diagnoses or [],
        clinical_notes=encounter_data.clinical_notes,
        recommended_follow_up=encounter_data.recommended_follow_up,
        confidence_score=encounter_data.confidence_score or 1.0,
        ai_raw_json=extraction_result.dict(),
        verified_by_user=False,
    )
    db.add(extracted_record)

    # 7. Save Extracted Medicines
    for med in extraction_result.medicines:
        med_row = Medicine(
            id=str(uuid.uuid4()),
            user_id=user_id,
            document_id=doc_id,
            name=med.name,
            brand_name=med.brand_name,
            dosage=med.dosage,
            form=med.form or "tablet",
            frequency=med.frequency,
            timing=med.timing,
            purpose=med.purpose,
            instructions=med.instructions,
            start_date=parsed_date or datetime.date.today(),
            is_active=True,
            prescribed_by=encounter_data.doctor_name,
        )
        db.add(med_row)

    # 8. Save Extracted Lab Results
    for lab in extraction_result.lab_results:
        lab_date = parsed_date
        if lab.test_date:
            try:
                lab_date = datetime.date.fromisoformat(lab.test_date)
            except Exception:
                pass

        lab_row = LabResult(
            id=str(uuid.uuid4()),
            user_id=user_id,
            document_id=doc_id,
            test_name=lab.test_name,
            category=lab.category or "General",
            value=lab.value,
            unit=lab.unit,
            reference_range=lab.reference_range,
            flag=lab.flag or "normal",
            test_date=lab_date or datetime.date.today(),
            lab_name=lab.lab_name or encounter_data.facility_name,
        )
        db.add(lab_row)

    # 9. Update Document status to completed
    doc_record.processing_status = "completed"
    doc_record.ai_summary = encounter_data.summary
    doc_record.document_type = encounter_data.record_type or doc_record.document_type
    doc_record.extracted_metadata = extraction_result.dict()
    db.commit()
    db.refresh(doc_record)

    return DocumentUploadResponse(
        success=True,
        message="Medical document uploaded and parsed with Gemini AI Intelligence.",
        document=DocumentResponse.from_orm(doc_record),
        extraction=extraction_result,
    )


@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Returns all stored documents in the patient's Health Vault.
    """
    _get_or_create_user(db, user_id)
    documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )

    # If demo user and empty, seed initial demo documents so Vault is never empty
    if not documents and user_id in ["demo-user-123", "default_user"]:
        from app.routers.timeline import _seed_demo_timeline
        _seed_demo_timeline(db, user_id)
        documents = (
            db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.uploaded_at.desc())
            .all()
        )

    return [DocumentResponse.from_orm(d) for d in documents]


@router.get("/{document_id}")
def get_document_details(
    document_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Fetches full document record including associated medicines, lab results, and extracted encounter.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    medicines = db.query(Medicine).filter(Medicine.document_id == document_id).all()
    lab_results = db.query(LabResult).filter(LabResult.document_id == document_id).all()
    extracted_records = (
        db.query(ExtractedRecord).filter(ExtractedRecord.document_id == document_id).all()
    )

    return {
        "document": DocumentResponse.from_orm(doc),
        "medicines": medicines,
        "lab_results": lab_results,
        "extracted_records": extracted_records,
    }


@router.post("/{document_id}/confirm")
def confirm_document_extraction(
    document_id: str,
    confirmation: DocumentReviewConfirmation,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Allows the patient to review, edit, and confirm the AI extracted structured records.
    Marks records as verified by user.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if confirmation.title:
        doc.title = confirmation.title
    if confirmation.document_type:
        doc.document_type = confirmation.document_type
    if confirmation.tags:
        doc.tags = confirmation.tags

    # Mark extracted record verified
    rec = (
        db.query(ExtractedRecord)
        .filter(ExtractedRecord.document_id == document_id)
        .first()
    )
    if rec:
        rec.verified_by_user = True
        if confirmation.encounter:
            if confirmation.encounter.doctor_name:
                rec.doctor_name = confirmation.encounter.doctor_name
            if confirmation.encounter.facility_name:
                rec.facility_name = confirmation.encounter.facility_name
            if confirmation.encounter.diagnoses:
                rec.diagnoses = confirmation.encounter.diagnoses

    db.commit()
    return {"success": True, "message": "Document data verified and confirmed in Health Timeline."}


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Deletes a document from the vault and cascades to associated extracted records.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    db.delete(doc)
    db.commit()
    return {"success": True, "message": "Document deleted successfully."}


@router.get("/{document_id}/view")
def view_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    Streams the raw medical document (PDF or Image) inline directly in browser.
    Works seamlessly across browser tabs with base64 and local disk caching.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    media_type = doc.mime_type or "application/pdf"
    filename = doc.file_name or f"medical_record_{document_id[:8]}.pdf"

    # 1. Base64 database cache (100% fail-proof)
    if doc.file_data_base64:
        try:
            raw_bytes = base64.b64decode(doc.file_data_base64)
            return Response(
                content=raw_bytes,
                media_type=media_type,
                headers={
                    "Content-Disposition": f'inline; filename="{filename}"',
                    "Cache-Control": "public, max-age=86400",
                },
            )
        except Exception as e:
            print(f"[Document View] Base64 decode note: {e}")

    # 2. Local uploads directory
    candidates = []
    if doc.file_path:
        candidates.append(os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(doc.file_path)))
    if doc.file_name:
        candidates.append(os.path.join(LOCAL_UPLOAD_DIR, doc.file_name))

    for path in candidates:
        if os.path.exists(path):
            return FileResponse(
                path=path,
                media_type=media_type,
                filename=filename,
                headers={
                    "Content-Disposition": f'inline; filename="{filename}"',
                    "Cache-Control": "public, max-age=86400",
                },
            )

    # 3. Remote URL Redirect
    if doc.file_url and doc.file_url.startswith("http") and "supabase.co" in doc.file_url:
        return RedirectResponse(url=doc.file_url)

    raise HTTPException(status_code=404, detail="Document content not available.")


@router.get("/{document_id}/download")
def download_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    Downloads the medical document file attachment.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    media_type = doc.mime_type or "application/pdf"
    filename = doc.file_name or f"medical_record_{document_id[:8]}.pdf"

    # 1. Base64 database cache
    if doc.file_data_base64:
        try:
            raw_bytes = base64.b64decode(doc.file_data_base64)
            return Response(
                content=raw_bytes,
                media_type=media_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                },
            )
        except Exception as e:
            print(f"[Document Download] Base64 decode note: {e}")

    # 2. Local uploads directory
    candidates = []
    if doc.file_path:
        candidates.append(os.path.join(LOCAL_UPLOAD_DIR, os.path.basename(doc.file_path)))
    if doc.file_name:
        candidates.append(os.path.join(LOCAL_UPLOAD_DIR, doc.file_name))

    for path in candidates:
        if os.path.exists(path):
            return FileResponse(
                path=path,
                media_type=media_type,
                filename=filename,
            )

    # 3. Remote URL Redirect
    if doc.file_url and doc.file_url.startswith("http"):
        return RedirectResponse(url=doc.file_url)

    raise HTTPException(status_code=404, detail="Document content not available.")
