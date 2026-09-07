import uuid
import secrets
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.routers.documents import get_user_id_from_request, _get_or_create_user
from app.routers.emergency import _get_or_seed_emergency_info
from app.routers.timeline import _seed_demo_timeline
from app.models.user import User
from app.models.consent import ConsentShare, AccessLog
from app.models.medicine import Medicine
from app.models.lab_result import LabResult
from app.models.extracted_record import ExtractedRecord
from app.models.document import Document
from app.schemas.consent import (
    ConsentShareCreate,
    ConsentShareResponse,
    AccessLogItem,
    DoctorPatientProfile,
    DoctorAccessResponse,
)
from app.schemas.timeline import (
    TimelineItemResponse,
    TimelineMedicineItem,
    TimelineLabItem,
    TimelineDocumentMeta,
)
from app.schemas.emergency import EmergencyContactItem
from app.services.summary_service import generate_doctor_preconsult_summary
from app.services.cds_service import evaluate_cross_center_cds

router = APIRouter(prefix="/consent", tags=["Doctor Dashboard & Consent Sharing"])


@router.post("/share", response_model=ConsentShareResponse)
def create_doctor_consent_share(
    payload: ConsentShareCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Patient creates a time-limited, consent-governed access link for a doctor.
    Triggers Gemini AI to generate a 60-second pre-consult clinical brief.
    """
    user = _get_or_create_user(db, user_id)
    emg_info = _get_or_seed_emergency_info(db, user_id)

    # Seed demo encounters if user is empty
    if db.query(ExtractedRecord).filter(ExtractedRecord.user_id == user_id).count() == 0:
        _seed_demo_timeline(db, user_id)

    # Fetch patient's active records to generate summary
    active_meds = db.query(Medicine).filter(Medicine.user_id == user_id, Medicine.is_active == True).all()
    recent_labs = db.query(LabResult).filter(LabResult.user_id == user_id).order_by(desc(LabResult.test_date)).limit(10).all()
    recent_encounters = db.query(ExtractedRecord).filter(ExtractedRecord.user_id == user_id).order_by(desc(ExtractedRecord.record_date)).limit(5).all()

    # Generate AI pre-consult summary
    summary_text = generate_doctor_preconsult_summary(
        patient_name=user.full_name or "Patient",
        abha_id=user.abha_id,
        blood_group=emg_info.blood_group,
        allergies=emg_info.allergies or [],
        chronic_conditions=emg_info.chronic_conditions or [],
        active_medicines=[{"name": m.name, "dosage": m.dosage, "frequency": m.frequency, "purpose": m.purpose} for m in active_meds],
        recent_lab_results=[{"test_name": l.test_name, "value": l.value, "unit": l.unit, "flag": l.flag, "reference_range": l.reference_range} for l in recent_labs],
        recent_encounters=[{"record_type": e.record_type, "doctor_name": e.doctor_name, "diagnoses": e.diagnoses} for e in recent_encounters],
    )

    access_token = f"doc_{secrets.token_urlsafe(20)}"
    expires_at = datetime.utcnow() + timedelta(hours=payload.duration_hours)

    share_record = ConsentShare(
        id=str(uuid.uuid4()),
        user_id=user_id,
        recipient_name=payload.recipient_name,
        recipient_identifier=payload.recipient_identifier,
        access_code=access_token,
        permissions=payload.permissions,
        purpose=payload.purpose,
        expires_at=expires_at,
        is_active=True,
        pre_consult_summary=summary_text,
    )
    db.add(share_record)
    db.commit()
    db.refresh(share_record)

    public_url = f"/doctor-view/{access_token}"

    return ConsentShareResponse(
        id=share_record.id,
        recipient_name=share_record.recipient_name,
        recipient_identifier=share_record.recipient_identifier,
        access_code=share_record.access_code,
        public_url=public_url,
        purpose=share_record.purpose,
        permissions=share_record.permissions,
        expires_at=share_record.expires_at,
        is_active=share_record.is_active,
        pre_consult_summary=share_record.pre_consult_summary,
        created_at=share_record.created_at,
    )


@router.get("/access/{token}", response_model=DoctorAccessResponse)
def get_doctor_consultation_dossier(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    PUBLIC DOCTOR ACCESS ENDPOINT (No doctor login required).
    1. Validates token active status and expiry time.
    2. Logs doctor access into access_logs.
    3. Returns full clinical dossier + AI Pre-consult summary.
    """
    share = (
        db.query(ConsentShare)
        .filter(ConsentShare.access_code == token, ConsentShare.is_active == True)
        .first()
    )

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or revoked doctor access link.",
        )

    if datetime.utcnow() > share.expires_at:
        share.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Doctor consultation access has expired. Please ask the patient to generate a fresh consent link.",
        )

    # Log audit entry
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown Doctor Terminal")

    log_entry = AccessLog(
        id=str(uuid.uuid4()),
        user_id=share.user_id,
        consent_share_id=share.id,
        accessor_name=share.recipient_name,
        access_type="doctor_portal",
        ip_address=client_ip,
        user_agent=user_agent[:400] if user_agent else None,
        accessed_sections=share.permissions,
        accessed_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()

    # Query patient records
    user = db.query(User).filter(User.id == share.user_id).first()
    emg_info = _get_or_seed_emergency_info(db, share.user_id)

    patient_profile = DoctorPatientProfile(
        full_name=user.full_name if user else "Patient",
        abha_id=user.abha_id if user else None,
        abha_address=user.abha_address if user else None,
        gender=user.gender,
        date_of_birth=user.date_of_birth,
        blood_group=emg_info.blood_group,
        allergies=emg_info.allergies or [],
        chronic_conditions=emg_info.chronic_conditions or [],
        emergency_contacts=[
            EmergencyContactItem(
                name=c.get("name", ""), relation=c.get("relation", ""), phone=c.get("phone", "")
            )
            for c in (emg_info.emergency_contacts or [])
        ],
        organ_donor=emg_info.organ_donor,
        critical_notes=emg_info.critical_notes,
    )

    # Medicines
    all_meds_db = db.query(Medicine).filter(Medicine.user_id == share.user_id).order_by(desc(Medicine.created_at)).all()
    all_meds = [TimelineMedicineItem.from_orm(m) for m in all_meds_db]
    active_meds = [TimelineMedicineItem.from_orm(m) for m in all_meds_db if m.is_active]

    # Lab Results
    labs_db = db.query(LabResult).filter(LabResult.user_id == share.user_id).order_by(desc(LabResult.test_date)).all()
    labs = [TimelineLabItem.from_orm(l) for l in labs_db]

    # Timeline Encounters with Document attachments
    records_db = (
        db.query(ExtractedRecord)
        .filter(ExtractedRecord.user_id == share.user_id)
        .order_by(desc(ExtractedRecord.record_date))
        .all()
    )

    timeline_items = []
    for rec in records_db:
        doc = db.query(Document).filter(Document.id == rec.document_id).first() if rec.document_id else None
        doc_meta = None
        if doc:
            doc_meta = TimelineDocumentMeta(
                id=doc.id,
                file_name=doc.file_name,
                file_url=doc.file_url,
                mime_type=doc.mime_type,
                uploaded_at=doc.uploaded_at,
            )

        linked_meds = [TimelineMedicineItem.from_orm(m) for m in all_meds_db if m.document_id == rec.document_id]
        linked_labs = [TimelineLabItem.from_orm(l) for l in labs_db if l.document_id == rec.document_id]

        timeline_items.append(
            TimelineItemResponse(
                id=rec.id,
                document_id=rec.document_id,
                record_type=rec.record_type,
                record_date=rec.record_date,
                doctor_name=rec.doctor_name,
                doctor_specialty=rec.doctor_specialty,
                facility_name=rec.facility_name,
                chief_complaints=rec.chief_complaints or [],
                diagnoses=rec.diagnoses or [],
                clinical_notes=rec.clinical_notes,
                recommended_follow_up=rec.recommended_follow_up,
                confidence_score=rec.confidence_score or 1.0,
                verified_by_user=rec.verified_by_user,
                created_at=rec.created_at,
                document=doc_meta,
                medicines=linked_meds,
                lab_results=linked_labs,
            )
        )

    cds_insights = evaluate_cross_center_cds(
        patient_id=share.user_id,
        patient_name=user.full_name if user else "Patient",
        records=records_db,
        medicines=all_meds_db,
        labs=labs_db,
    )

    return DoctorAccessResponse(
        success=True,
        patient=patient_profile,
        pre_consult_summary=share.pre_consult_summary or "No summary available.",
        active_medicines=active_meds,
        all_medicines=all_meds,
        lab_results=labs,
        timeline=timeline_items,
        cds_insights=cds_insights,
        consent_meta={
            "recipient_name": share.recipient_name,
            "purpose": share.purpose,
            "permissions": share.permissions,
            "expires_at": share.expires_at,
            "created_at": share.created_at,
        },
    )


@router.post("/revoke/{share_id}")
def revoke_consent_share(
    share_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Allows patient to immediately revoke an active doctor consent link.
    """
    share = (
        db.query(ConsentShare)
        .filter(ConsentShare.id == share_id, ConsentShare.user_id == user_id)
        .first()
    )
    if not share:
        raise HTTPException(status_code=404, detail="Consent share not found.")

    share.is_active = False
    share.revoked_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": f"Access for '{share.recipient_name}' was successfully revoked."}


@router.get("/shares")
def list_patient_consent_shares(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Returns all active and past doctor consent shares created by the patient.
    """
    _get_or_create_user(db, user_id)
    shares = (
        db.query(ConsentShare)
        .filter(ConsentShare.user_id == user_id)
        .order_by(desc(ConsentShare.created_at))
        .all()
    )

    result = []
    for s in shares:
        logs_count = db.query(AccessLog).filter(AccessLog.consent_share_id == s.id).count()
        result.append({
            "id": s.id,
            "recipient_name": s.recipient_name,
            "recipient_identifier": s.recipient_identifier,
            "access_code": s.access_code,
            "public_url": f"/doctor-view/{s.access_code}",
            "purpose": s.purpose,
            "permissions": s.permissions,
            "expires_at": s.expires_at,
            "is_active": s.is_active and s.expires_at > datetime.utcnow(),
            "revoked_at": s.revoked_at,
            "pre_consult_summary": s.pre_consult_summary,
            "created_at": s.created_at,
            "access_count": logs_count,
        })

    return {"success": True, "shares": result}


@router.get("/logs", response_model=List[AccessLogItem])
def get_patient_access_audit_logs(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Returns full ABDM privacy audit trail of all doctor and emergency accesses.
    """
    _get_or_create_user(db, user_id)
    logs = (
        db.query(AccessLog)
        .filter(AccessLog.user_id == user_id)
        .order_by(desc(AccessLog.accessed_at))
        .limit(50)
        .all()
    )
    return [AccessLogItem.from_orm(l) for l in logs]
