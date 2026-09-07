import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.core.database import get_db
from app.routers.documents import get_user_id_from_request, _get_or_create_user
from app.models.user import User
from app.models.document import Document
from app.models.extracted_record import ExtractedRecord
from app.models.medicine import Medicine
from app.models.lab_result import LabResult
from app.schemas.timeline import (
    TimelineResponse,
    TimelineItemResponse,
    TimelineMedicineItem,
    TimelineLabItem,
    TimelineDocumentMeta,
    CDSInsightsResponse,
)
from app.services.cds_service import evaluate_cross_center_cds

router = APIRouter(prefix="/timeline", tags=["Health Timeline"])


def _seed_demo_timeline(db: Session, user_id: str):
    """
    Seeds initial realistic Indian clinical records if user has an empty timeline.
    Ensures seamless hackathon review and demonstration out-of-the-box.
    """
    today = date.today()
    
    # 1. Cardiology Encounter & Prescription
    doc1_id = str(uuid.uuid4())
    doc1 = Document(
        id=doc1_id,
        user_id=user_id,
        file_name="Max_Cardiology_Rx_Aug2024.pdf",
        file_path=f"{user_id}/cardio_rx.pdf",
        file_url="/uploads/demo_cardiology_rx.pdf",
        mime_type="application/pdf",
        document_type="prescription",
        title="Cardiology OPD Prescription",
        processing_status="completed",
        ai_summary="Cardiology OPD follow-up for blood pressure and lipid management.",
        tags=["Cardiology", "Max Healthcare", "Prescription"],
        uploaded_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(doc1)

    rec1 = ExtractedRecord(
        id=str(uuid.uuid4()),
        document_id=doc1_id,
        user_id=user_id,
        record_type="prescription",
        record_date=today - timedelta(days=2),
        doctor_name="Dr. Arun Sharma",
        doctor_specialty="MD DM (Cardiology)",
        facility_name="Max Super Speciality Hospital, New Delhi",
        chief_complaints=["Occasional palpitations", "Mild exertional breathlessness"],
        diagnoses=["Essential Hypertension (Stage 1)", "Mild Dyslipidemia"],
        clinical_notes="Advised low sodium DASH diet and 30 minutes daily aerobic walking. Recheck lipid panel in 4 weeks.",
        recommended_follow_up="After 4 weeks with lipid profile",
        confidence_score=0.96,
        verified_by_user=True,
        ai_raw_json={},
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(rec1)

    med1 = Medicine(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc1_id,
        name="Telmisartan",
        brand_name="Telma 40",
        dosage="40 mg",
        form="tablet",
        frequency="1-0-0 (Once daily)",
        timing="Morning after breakfast",
        purpose="Hypertension Control",
        instructions="Take with a full glass of water",
        start_date=today - timedelta(days=2),
        is_active=True,
        prescribed_by="Dr. Arun Sharma",
    )
    med2 = Medicine(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc1_id,
        name="Atorvastatin",
        brand_name="Atorva 10",
        dosage="10 mg",
        form="tablet",
        frequency="0-0-1 (Once daily)",
        timing="Night before sleep",
        purpose="Cholesterol Regulation",
        instructions="Avoid grapefruit juice",
        start_date=today - timedelta(days=2),
        is_active=True,
        prescribed_by="Dr. Arun Sharma",
    )
    db.add_all([med1, med2])

    # 2. Lab Report - Comprehensive Metabolic & Lipid Panel
    doc2_id = str(uuid.uuid4())
    doc2 = Document(
        id=doc2_id,
        user_id=user_id,
        file_name="DrLal_Lipid_Panel_Report.pdf",
        file_path=f"{user_id}/lab_report.pdf",
        file_url="/uploads/demo_lipid_panel.pdf",
        mime_type="application/pdf",
        document_type="lab_report",
        title="Comprehensive Metabolic & Lipid Diagnostic Panel",
        processing_status="completed",
        ai_summary="Diagnostic blood work showing elevated Total Cholesterol and pre-diabetic HbA1c.",
        tags=["Lab Report", "Lipid Profile", "Pathology"],
        uploaded_at=datetime.utcnow() - timedelta(days=16),
    )
    db.add(doc2)

    rec2 = ExtractedRecord(
        id=str(uuid.uuid4()),
        document_id=doc2_id,
        user_id=user_id,
        record_type="lab_report",
        record_date=today - timedelta(days=17),
        doctor_name="Dr. S. K. Gupta",
        doctor_specialty="MD (Pathology)",
        facility_name="Dr Lal PathLabs & Diagnostics",
        chief_complaints=["Routine Annual Preventative Health Screening"],
        diagnoses=["Pre-diabetes (Borderline HbA1c)", "Elevated LDL & Triglycerides"],
        clinical_notes="Specimen processed in NABL accredited central reference laboratory.",
        recommended_follow_up="Repeat HbA1c in 3 months",
        confidence_score=0.94,
        verified_by_user=True,
        ai_raw_json={},
        created_at=datetime.utcnow() - timedelta(days=16),
    )
    db.add(rec2)

    lab1 = LabResult(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc2_id,
        test_name="HbA1c (Glycated Hemoglobin)",
        category="Diabetes Panel",
        value="5.9",
        unit="%",
        reference_range="< 5.7",
        flag="high",
        test_date=today - timedelta(days=17),
        lab_name="Dr Lal PathLabs",
    )
    lab2 = LabResult(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc2_id,
        test_name="Total Cholesterol",
        category="Lipid Profile",
        value="218",
        unit="mg/dL",
        reference_range="< 200",
        flag="high",
        test_date=today - timedelta(days=17),
        lab_name="Dr Lal PathLabs",
    )
    lab3 = LabResult(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc2_id,
        test_name="LDL Cholesterol",
        category="Lipid Profile",
        value="142",
        unit="mg/dL",
        reference_range="< 100",
        flag="high",
        test_date=today - timedelta(days=17),
        lab_name="Dr Lal PathLabs",
    )
    lab4 = LabResult(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc2_id,
        test_name="Serum Creatinine",
        category="Renal Panel",
        value="0.9",
        unit="mg/dL",
        reference_range="0.7 - 1.2",
        flag="normal",
        test_date=today - timedelta(days=17),
        lab_name="Dr Lal PathLabs",
    )
    db.add_all([lab1, lab2, lab3, lab4])

    # 3. Earlier Consultation & Prescription - General OPD
    doc3_id = str(uuid.uuid4())
    doc3 = Document(
        id=doc3_id,
        user_id=user_id,
        file_name="Apollo_OPD_Consultation.jpg",
        file_path=f"{user_id}/apollo_opd.jpg",
        file_url="/uploads/demo_apollo_opd.jpg",
        mime_type="image/jpeg",
        document_type="consultation",
        title="Acute Bronchitis Consultation Slip",
        processing_status="completed",
        ai_summary="OPD consultation for seasonal viral bronchitis.",
        tags=["Consultation", "Apollo Clinic", "Respiratory"],
        uploaded_at=datetime.utcnow() - timedelta(days=90),
    )
    db.add(doc3)

    rec3 = ExtractedRecord(
        id=str(uuid.uuid4()),
        document_id=doc3_id,
        user_id=user_id,
        record_type="consultation",
        record_date=today - timedelta(days=92),
        doctor_name="Dr. Neha Verma",
        doctor_specialty="MBBS, DNB (General Medicine)",
        facility_name="Apollo Clinic, Indirapuram",
        chief_complaints=["Dry cough with throat irritation", "Mild low-grade evening fever"],
        diagnoses=["Acute Viral Bronchitis", "Seasonal Allergies"],
        clinical_notes="Chest clear on auscultation. Warm saline gargles and steam inhalation advised twice daily.",
        recommended_follow_up="SOS if fever persists beyond 3 days",
        confidence_score=0.91,
        verified_by_user=True,
        ai_raw_json={},
        created_at=datetime.utcnow() - timedelta(days=90),
    )
    db.add(rec3)

    med3 = Medicine(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc3_id,
        name="Amoxicillin + Potassium Clavulanate",
        brand_name="Augmentin 625 Duo",
        dosage="625 mg",
        form="tablet",
        frequency="1-0-1 (Twice daily)",
        timing="After food",
        purpose="Bacterial Respiratory Infection",
        instructions="Complete full 5 days course",
        start_date=today - timedelta(days=92),
        is_active=False,
        prescribed_by="Dr. Neha Verma",
    )
    med4 = Medicine(
        id=str(uuid.uuid4()),
        user_id=user_id,
        document_id=doc3_id,
        name="Levocetirizine + Montelukast",
        brand_name="Montair-LC",
        dosage="5mg + 10mg",
        form="tablet",
        frequency="0-0-1 (Once daily at night)",
        timing="Before bed",
        purpose="Allergy & Bronchospasm Relief",
        instructions="May cause mild drowsiness",
        start_date=today - timedelta(days=92),
        is_active=False,
        prescribed_by="Dr. Neha Verma",
    )
    db.add_all([med3, med4])

    db.commit()


@router.get("", response_model=TimelineResponse)
@router.get("/", response_model=TimelineResponse)
def get_health_timeline(
    user_id: Optional[str] = Query(None, description="Optional target patient User ID"),
    record_type: Optional[str] = Query(None, description="Filter by record_type (prescription, lab_report, consultation, discharge_summary)"),
    search: Optional[str] = Query(None, description="Search keyword for doctor, facility, diagnosis, medicine, or complaints"),
    db: Session = Depends(get_db),
    auth_user_id: str = Depends(get_user_id_from_request),
):
    """
    Returns the chronological Health Timeline of extracted clinical encounters,
    complete with nested prescriptions, lab results, and source document references.
    """
    target_user_id = user_id or auth_user_id
    _get_or_create_user(db, target_user_id)

    # Base query sorted chronologically descending
    query = (
        db.query(ExtractedRecord)
        .filter(ExtractedRecord.user_id == target_user_id)
        .order_by(desc(ExtractedRecord.record_date), desc(ExtractedRecord.created_at))
    )

    if record_type and record_type.lower() != "all":
        query = query.filter(ExtractedRecord.record_type == record_type.lower())

    records = query.all()

    # Pre-fetch medicines, lab results, and documents
    document_ids = [r.document_id for r in records if r.document_id]
    
    docs_map = {}
    if document_ids:
        docs = db.query(Document).filter(Document.id.in_(document_ids)).all()
        docs_map = {d.id: d for d in docs}

    meds_by_doc = {}
    if document_ids:
        meds = db.query(Medicine).filter(Medicine.document_id.in_(document_ids)).all()
        for m in meds:
            meds_by_doc.setdefault(m.document_id, []).append(m)

    labs_by_doc = {}
    if document_ids:
        labs = db.query(LabResult).filter(LabResult.document_id.in_(document_ids)).all()
        for l in labs:
            labs_by_doc.setdefault(l.document_id, []).append(l)

    timeline_items = []
    for rec in records:
        doc = docs_map.get(rec.document_id)
        doc_meta = None
        if doc:
            doc_meta = TimelineDocumentMeta(
                id=doc.id,
                file_name=doc.file_name,
                file_url=doc.file_url,
                mime_type=doc.mime_type,
                uploaded_at=doc.uploaded_at,
            )

        linked_meds = [TimelineMedicineItem.from_orm(m) for m in meds_by_doc.get(rec.document_id, [])]
        linked_labs = [TimelineLabItem.from_orm(l) for l in labs_by_doc.get(rec.document_id, [])]

        # Apply search filtering in memory across fields if search param provided
        if search:
            s = search.lower()
            match_doctor = rec.doctor_name and s in rec.doctor_name.lower()
            match_facility = rec.facility_name and s in rec.facility_name.lower()
            match_notes = rec.clinical_notes and s in rec.clinical_notes.lower()
            match_diag = any(s in d.lower() for d in (rec.diagnoses or []))
            match_comp = any(s in c.lower() for c in (rec.chief_complaints or []))
            match_med = any(s in m.name.lower() or (m.brand_name and s in m.brand_name.lower()) for m in linked_meds)
            match_lab = any(s in l.test_name.lower() for l in linked_labs)

            if not (match_doctor or match_facility or match_notes or match_diag or match_comp or match_med or match_lab):
                continue

        item = TimelineItemResponse(
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
        timeline_items.append(item)

    # Evaluate Multicenter Clinical Decision Support (CDS) & Knowledge Graph
    user_obj = db.query(User).filter(User.id == target_user_id).first()
    all_meds_flat = [m for sublist in meds_by_doc.values() for m in sublist]
    all_labs_flat = [l for sublist in labs_by_doc.values() for l in sublist]

    cds_insights = evaluate_cross_center_cds(
        patient_id=target_user_id,
        patient_name=user_obj.full_name if user_obj else "Patient",
        records=records,
        medicines=all_meds_flat,
        labs=all_labs_flat,
    )

    return TimelineResponse(
        success=True,
        total_records=len(timeline_items),
        records=timeline_items,
        cds_insights=cds_insights,
    )
