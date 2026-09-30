import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.documents import get_user_id_from_request, _get_or_create_user
from app.models.user import User
from app.models.emergency import EmergencyInfo
from app.models.medicine import Medicine
from app.models.consent import AccessLog
from app.models.emergency_qr import EmergencyQRToken
from app.schemas.emergency import (
    EmergencyProfileUpdate,
    EmergencyTokenGenerateResponse,
    PublicEmergencyCardResponse,
    EmergencyActiveMedicine,
    EmergencyContactItem,
)

router = APIRouter(prefix="/emergency", tags=["Emergency QR Mode"])


def _get_or_seed_emergency_info(db: Session, user_id: str) -> EmergencyInfo:
    """
    Retrieves or creates clean emergency medical data for the specific patient.
    Ensures data isolation across different patients.
    """
    emg = db.query(EmergencyInfo).filter(EmergencyInfo.user_id == user_id).first()
    if not emg:
        emg = EmergencyInfo(
            id=str(uuid.uuid4()),
            user_id=user_id,
            blood_group="O+",
            allergies=[],
            chronic_conditions=[],
            emergency_contacts=[],
            organ_donor=False,
            critical_notes="",
            is_publicly_visible_via_qr=True,
        )
        try:
            db.add(emg)
            db.commit()
            db.refresh(emg)
        except Exception:
            db.rollback()
            emg = db.query(EmergencyInfo).filter(EmergencyInfo.user_id == user_id).first()
            if not emg:
                emg = EmergencyInfo(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    blood_group="O+",
                    allergies=[],
                    chronic_conditions=[],
                    emergency_contacts=[],
                    organ_donor=False,
                    critical_notes="",
                    is_publicly_visible_via_qr=True,
                )
                db.add(emg)
                db.commit()
                db.refresh(emg)
    return emg


@router.post("/generate-token", response_model=EmergencyTokenGenerateResponse)
def generate_emergency_token(
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Generates a secure, 24-hour time-limited Emergency QR access token for the logged-in patient.
    """
    user_name = request.headers.get("x-user-name")
    user_email = request.headers.get("x-user-email")
    user_abha = request.headers.get("x-user-abha")

    _get_or_create_user(db, user_id, email=user_email, full_name=user_name, abha_id=user_abha)
    _get_or_seed_emergency_info(db, user_id)

    # Deactivate older tokens for this user
    db.query(EmergencyQRToken).filter(
        EmergencyQRToken.user_id == user_id,
        EmergencyQRToken.is_active == True,
    ).update({"is_active": False})

    # Generate fresh cryptographically secure token tied to this patient
    clean_uid = "".join(c for c in user_id if c.isalnum())[:8] or "usr"
    token_str = f"emg_{clean_uid}_{secrets.token_urlsafe(16)}"
    expires_at = datetime.utcnow() + timedelta(hours=24)

    token_record = EmergencyQRToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token=token_str,
        is_active=True,
        expires_at=expires_at,
        access_count=0,
    )
    db.add(token_record)
    db.commit()
    db.refresh(token_record)

    public_url = f"/emergency-view/{token_str}"

    return EmergencyTokenGenerateResponse(
        success=True,
        token=token_str,
        expires_at=expires_at,
        public_url=public_url,
        message="24-hour Emergency QR Token generated successfully.",
    )


@router.get("/public/{token}", response_model=PublicEmergencyCardResponse)
def get_public_emergency_card(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    PUBLIC ENDPOINT (No authentication required).
    1. Validates token validity and 24-hour expiration.
    2. Logs access timestamp, IP address, and User-Agent to access_logs for patient audit trail.
    3. STRICT PRIVACY GUARD: Returns ONLY the specific patient's critical emergency data.
    """
    token_rec = (
        db.query(EmergencyQRToken)
        .filter(EmergencyQRToken.token == token, EmergencyQRToken.is_active == True)
        .first()
    )

    if not token_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or deactivated emergency QR token.",
        )

    # Check expiration
    if datetime.utcnow() > token_rec.expires_at:
        token_rec.is_active = False
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Emergency QR token has expired. Please ask the patient to generate a new QR code.",
        )

    # Log access audit
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "Unknown Device / Scanner")

    token_rec.access_count += 1
    token_rec.last_accessed_at = datetime.utcnow()

    log_entry = AccessLog(
        id=str(uuid.uuid4()),
        user_id=token_rec.user_id,
        accessor_name="First Responder / Emergency Room",
        access_type="emergency_qr",
        ip_address=client_ip,
        user_agent=user_agent[:400] if user_agent else None,
        accessed_sections=["blood_group", "allergies", "chronic_conditions", "active_medicines", "emergency_contacts"],
        accessed_at=datetime.utcnow(),
    )
    db.add(log_entry)
    db.commit()

    # Query Specific Patient Info
    user = db.query(User).filter(User.id == token_rec.user_id).first()
    emg_info = _get_or_seed_emergency_info(db, token_rec.user_id)

    # Query Active Medicines for THIS user ONLY
    active_meds = (
        db.query(Medicine)
        .filter(Medicine.user_id == token_rec.user_id, Medicine.is_active == True)
        .all()
    )

    med_list = [
        EmergencyActiveMedicine(
            name=m.name if not m.brand_name else f"{m.name} ({m.brand_name})",
            dosage=m.dosage,
            frequency=m.frequency,
        )
        for m in active_meds
    ]

    contact_list = [
        EmergencyContactItem(
            name=c.get("name", "Contact"),
            relation=c.get("relation", "Family"),
            phone=c.get("phone", ""),
        )
        for c in (emg_info.emergency_contacts or [])
    ]

    return PublicEmergencyCardResponse(
        success=True,
        patient_name=user.full_name if user else "Patient",
        abha_id=user.abha_id if user else None,
        blood_group=emg_info.blood_group or "O+",
        allergies=emg_info.allergies or [],
        chronic_conditions=emg_info.chronic_conditions or [],
        active_medicines=med_list,
        emergency_contacts=contact_list,
        organ_donor=emg_info.organ_donor or False,
        critical_notes=emg_info.critical_notes or "",
        expires_at=token_rec.expires_at,
        token_valid=True,
    )


@router.get("/profile")
def get_emergency_profile(
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Returns the patient's own emergency info profile for editing/viewing.
    Ensures an active unique QR token exists.
    """
    user_name = request.headers.get("x-user-name")
    user_email = request.headers.get("x-user-email")
    user_abha = request.headers.get("x-user-abha")

    _get_or_create_user(db, user_id, email=user_email, full_name=user_name, abha_id=user_abha)
    emg = _get_or_seed_emergency_info(db, user_id)

    active_token = (
        db.query(EmergencyQRToken)
        .filter(
            EmergencyQRToken.user_id == user_id,
            EmergencyQRToken.is_active == True,
            EmergencyQRToken.expires_at > datetime.utcnow(),
        )
        .order_by(EmergencyQRToken.created_at.desc())
        .first()
    )

    # If no active token exists, generate one automatically for this patient
    if not active_token:
        clean_uid = "".join(c for c in user_id if c.isalnum())[:8] or "usr"
        token_str = f"emg_{clean_uid}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.utcnow() + timedelta(hours=24)

        active_token = EmergencyQRToken(
            id=str(uuid.uuid4()),
            user_id=user_id,
            token=token_str,
            is_active=True,
            expires_at=expires_at,
            access_count=0,
        )
        db.add(active_token)
        db.commit()
        db.refresh(active_token)

    return {
        "emergency_info": emg,
        "active_token": active_token.token if active_token else None,
        "token_expires_at": active_token.expires_at if active_token else None,
        "access_count": active_token.access_count if active_token else 0,
    }


@router.put("/profile")
def update_emergency_profile(
    payload: EmergencyProfileUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    """
    Updates the patient's blood group, allergies, chronic conditions, and emergency contacts.
    """
    user_name = request.headers.get("x-user-name")
    user_email = request.headers.get("x-user-email")
    user_abha = request.headers.get("x-user-abha")

    _get_or_create_user(db, user_id, email=user_email, full_name=user_name, abha_id=user_abha)
    emg = _get_or_seed_emergency_info(db, user_id)

    if payload.blood_group is not None:
        emg.blood_group = payload.blood_group
    if payload.allergies is not None:
        emg.allergies = payload.allergies
    if payload.chronic_conditions is not None:
        emg.chronic_conditions = payload.chronic_conditions
    if payload.emergency_contacts is not None:
        emg.emergency_contacts = [c.dict() for c in payload.emergency_contacts]
    if payload.organ_donor is not None:
        emg.organ_donor = payload.organ_donor
    if payload.critical_notes is not None:
        emg.critical_notes = payload.critical_notes

    db.commit()
    db.refresh(emg)
    return {"success": True, "message": "Emergency profile updated successfully.", "emergency_info": emg}
