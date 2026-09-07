from typing import List, Optional, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field
from app.schemas.timeline import (
    TimelineItemResponse,
    TimelineMedicineItem,
    TimelineLabItem,
    CDSInsightsResponse,
)
from app.schemas.emergency import EmergencyContactItem


class ConsentShareCreate(BaseModel):
    recipient_name: str = Field(..., description="Doctor name e.g. Dr. Arun Sharma or Hospital Name")
    recipient_identifier: Optional[str] = Field(None, description="Doctor email, phone, or medical license number")
    purpose: str = Field("Clinical Consultation & Second Opinion", description="Reason for sharing medical records")
    permissions: List[str] = Field(
        default=["timeline", "medicines", "lab_reports", "emergency_info"],
        description="Access scopes granted"
    )
    duration_hours: int = Field(24, ge=1, le=720, description="Duration in hours before access expires")


class ConsentShareResponse(BaseModel):
    id: str
    recipient_name: str
    recipient_identifier: Optional[str] = None
    access_code: str
    public_url: str
    purpose: str
    permissions: List[str]
    expires_at: datetime
    is_active: bool
    revoked_at: Optional[datetime] = None
    pre_consult_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AccessLogItem(BaseModel):
    id: str
    accessor_name: str
    access_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    accessed_sections: List[str] = []
    accessed_at: datetime

    class Config:
        from_attributes = True


class DoctorPatientProfile(BaseModel):
    full_name: str
    abha_id: Optional[str] = None
    abha_address: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contacts: List[EmergencyContactItem] = []
    organ_donor: bool = False
    critical_notes: Optional[str] = None


class DoctorAccessResponse(BaseModel):
    success: bool = True
    patient: DoctorPatientProfile
    pre_consult_summary: str
    active_medicines: List[TimelineMedicineItem]
    all_medicines: List[TimelineMedicineItem]
    lab_results: List[TimelineLabItem]
    timeline: List[TimelineItemResponse]
    cds_insights: Optional[CDSInsightsResponse] = None
    consent_meta: Dict[str, Any]
    disclaimer: str = (
        "AI pre-consult brief is assistive and non-diagnostic. Always perform direct clinical examination."
    )
