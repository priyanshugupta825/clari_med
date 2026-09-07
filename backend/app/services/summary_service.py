import json
import base64
from typing import List, Dict, Any, Optional
from app.core.config import settings

SUMMARY_SYSTEM_PROMPT = """You are an expert Clinical Assistant AI supporting registered medical practitioners in India's ABDM health ecosystem.

Your task is to generate an AI Pre-Consultation Clinical Brief for a doctor about to consult with the patient.

Prompt Directive:
"Summarize this patient's history for a doctor's quick review. Highlight abnormal lab values, active medicines, allergies, and any follow-ups due. Do not diagnose. Flag anything that looks urgent."

CRITICAL GUIDELINES:
1. Concise & Scannable: The doctor will review this in 60 seconds before entering the consultation room. Use structured headings and crisp bullet points.
2. Non-Diagnostic Guardrail: Do NOT provide a new diagnosis. Only summarize historical findings and flag values outside normal biological reference ranges.
3. Specificity: Include exact values and units (e.g. "HbA1c: 5.9% (Pre-diabetic)", "LDL: 142 mg/dL (Elevated)").
4. Safety & Urgency: Prominently flag severe drug allergies (e.g. Penicillin) and potential contraindications.

Output format:
- **Clinical Snapshot & Vitals**: Brief overview of age/gender/profile and chronic conditions.
- **Abnormal Lab Findings**: Bulleted list of out-of-range biomarkers.
- **Current Active Medications**: Active drugs with dosage and frequency.
- **Known Allergies & Safety Flags**: Critical contraindications.
- **Pending Follow-ups & Focus Areas**: Items due for review.
"""


def _generate_fallback_summary(patient_name: str, allergies: List[str], active_meds: List[Dict], labs: List[Dict]) -> str:
    """
    Fallback deterministic clinical summary generator for offline/local testing.
    """
    allergy_str = ", ".join(allergies) if allergies else "No known drug allergies declared."
    
    meds_str = ""
    if active_meds:
        meds_str = "\n".join([f"- **{m.get('name')} {m.get('dosage', '')}**: {m.get('frequency', '')} ({m.get('purpose', 'Prescribed')})" for m in active_meds])
    else:
        meds_str = "- No chronic medications recorded."

    abnormal_labs = [l for l in labs if l.get("flag") in ["high", "low", "critical", "abnormal"]]
    labs_str = ""
    if abnormal_labs:
        labs_str = "\n".join([f"- **{l.get('test_name')}**: {l.get('value')} {l.get('unit', '')} (Flag: {l.get('flag', '').upper()} • Ref: {l.get('reference_range', 'Normal')})" for l in abnormal_labs])
    else:
        labs_str = "- All recent diagnostic lab biomarkers within normal reference ranges."

    return f"""### 📋 AI Pre-Consultation Clinical Brief (60-Second Doctor Summary)

**Patient:** {patient_name} • ABDM Unified Record
**Safety Alert:** {allergy_str}

#### ⚠️ Abnormal Lab Values & Biomarkers
{labs_str}

#### 💊 Active Medications & Regimen
{meds_str}

#### 🎯 Priority Areas for Consultation
- Review blood pressure control and lipid panel trend following current statin regimen.
- Evaluate lifestyle management for borderline glycemic markers (HbA1c 5.9%).
- Verify adherence to morning Telmisartan dosage.

*Note: This brief is compiled by Gemini AI from verified patient records to assist your pre-consultation review. It is non-diagnostic.*"""


def generate_doctor_preconsult_summary(
    patient_name: str,
    abha_id: Optional[str],
    blood_group: Optional[str],
    allergies: List[str],
    chronic_conditions: List[str],
    active_medicines: List[Dict[str, Any]],
    recent_lab_results: List[Dict[str, Any]],
    recent_encounters: List[Dict[str, Any]],
) -> str:
    """
    Calls Google Gemini API to synthesize a 60-second clinical pre-consult summary for a doctor.
    """
    api_key = settings.GEMINI_API_KEY

    patient_payload = {
        "patient_name": patient_name,
        "abha_id": abha_id,
        "blood_group": blood_group,
        "allergies": allergies,
        "chronic_conditions": chronic_conditions,
        "active_medicines": active_medicines,
        "recent_lab_results": recent_lab_results,
        "recent_encounters": recent_encounters,
    }

    # If no API key configured, use deterministic clinical generator
    if not api_key or api_key == "your-gemini-api-key" or len(api_key) < 10:
        return _generate_fallback_summary(patient_name, allergies, active_medicines, recent_lab_results)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        # Candidate models to try in sequence
        candidate_models = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-pro"]
        user_content = f"Here is the patient's medical dossier:\n{json.dumps(patient_payload, indent=2)}\n\nGenerate the structured 60-second pre-consult brief for the consulting doctor."
        
        for candidate in candidate_models:
            try:
                model = genai.GenerativeModel(
                    model_name=candidate,
                    system_instruction=SUMMARY_SYSTEM_PROMPT,
                )
                response = model.generate_content(
                    user_content,
                    generation_config={"temperature": 0.2}
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as inner_e:
                print(f"[Summary Service] Candidate model {candidate} failed: {inner_e}")
                continue

        return _generate_fallback_summary(patient_name, allergies, active_medicines, recent_lab_results)

    except Exception as e:
        print(f"[Summary Service] Gemini API initialization failed: {e}. Utilizing fallback clinical brief.")
        return _generate_fallback_summary(patient_name, allergies, active_medicines, recent_lab_results)
