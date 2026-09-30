from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.documents import get_user_id_from_request, _get_or_create_user
from app.models.medicine import Medicine
from app.models.lab_result import LabResult
from app.models.extracted_record import ExtractedRecord
from app.models.emergency import EmergencyInfo
from app.services.ai_assistant_service import process_patient_symptom_query

router = APIRouter(prefix="/assistant", tags=["AI Clinical Assistant"])


class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []


class AssistantChatResponse(BaseModel):
    response: str
    triage_level: str
    relevant_medications: List[str]
    suggested_actions: List[str]


@router.post("/chat", response_model=AssistantChatResponse)
def chat_with_clinical_assistant(
    payload: AssistantChatRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_request),
):
    user = _get_or_create_user(db, user_id)

    medicines = db.query(Medicine).filter(Medicine.user_id == user_id, Medicine.is_active == True).all()
    med_list = [
        {
            "name": m.name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "timing": m.timing,
            "purpose": m.purpose,
            "prescribed_by": m.prescribed_by,
        }
        for m in medicines
    ]

    labs = db.query(LabResult).filter(LabResult.user_id == user_id).order_by(LabResult.test_date.desc()).limit(10).all()
    lab_list = [
        {
            "test_name": l.test_name,
            "value": l.value,
            "unit": l.unit,
            "flag": l.flag,
            "test_date": str(l.test_date) if l.test_date else "",
        }
        for l in labs
    ]

    records = db.query(ExtractedRecord).filter(ExtractedRecord.user_id == user_id).order_by(ExtractedRecord.record_date.desc()).limit(5).all()
    enc_list = [
        {
            "doctor_name": r.doctor_name,
            "facility_name": r.facility_name,
            "diagnoses": r.diagnoses,
            "record_date": str(r.record_date) if r.record_date else "",
        }
        for r in records
    ]

    em_info = db.query(EmergencyInfo).filter(EmergencyInfo.user_id == user_id).first()
    allergies = em_info.allergies if em_info and em_info.allergies else []
    chronic = em_info.chronic_conditions if em_info and em_info.chronic_conditions else []

    history_dicts = [{"role": h.role, "content": h.content} for h in payload.chat_history] if payload.chat_history else []

    result = process_patient_symptom_query(
        user_message=payload.message,
        patient_name=user.full_name or "Patient",
        allergies=allergies,
        chronic_conditions=chronic,
        active_medicines=med_list,
        recent_labs=lab_list,
        recent_encounters=enc_list,
        chat_history=history_dicts,
    )

    return AssistantChatResponse(**result)
