import json
import re
from typing import List, Dict, Any, Optional
from app.core.config import settings

AI_ASSISTANT_SYSTEM_PROMPT = """You are ClariMed AI, an intelligent, empathetic, and safety-grounded Clinical Assistant supporting patients in India's ABDM health ecosystem.
"Your role is to help patients understand their symptoms in the context of their verified medical history, active prescriptions, and recent lab tests.

CRITICAL CLINICAL & SAFETY GUARDRAILS (Based on Clinical Research Guidelines CR-017 to CR-022):
LIMITATION 1 - NON-DIAGNOSTIC RULE: Never provide a definitive medical diagnosis. Phrase insights as 'possible considerations', 'known side-effects', or 'common associations'.
LIMITATION 2 - STRICT MEDICATION DOSAGE RULE: NEVER recommend increasing, decreasing, starting, or stopping any prescription medication dose independently. Explicitly instruct the patient: 'Do NOT change your medication dosage on your own. Any dose adjustments must be decided by your treating doctor.'
LIMITATION 3 - PRESCRIPTION CORRELATION: Check the patient's active medications and recent lab results. If the symptom (e.g. headache, nausea, vomiting, dizziness) is a known adverse effect or related to a prescribed drug (e.g. antihypertensives, statins, metformin, antibiotics), clearly mention this connection.
LIMITATION 4 - RED-FLAG TRIAGE:
  - 'emergency': Severe chest pain, sudden numbness/weakness, severe shortness of breath, blood in vomit/stool, sudden high fever with stiffness. -> Prompt immediate ER/ambulance care.
  - 'consult_doctor': Persistent headache, vomiting >24h, dizziness, signs of adverse drug reaction, abnormal lab trend. -> Advise seeing the doctor soon.
  - 'routine': Mild, self-limiting symptom with known benign cause. -> Advise monitoring, hydration, and discussing at next routine visit.
LIMITATION 5 - PREPARED QUESTIONS FOR DOCTOR: Always provide 2-3 specific, high-yield questions the patient can ask their doctor during consultation.

OUTPUT FORMAT:
Respond in clear, structured, compassionate markdown:
- **Clinical Assessment & Context**: Explain the symptom and how it might relate to active medicines, dosages, or lab history.
-$*Next Steps & Doctor Consultation Advice**: Clear recommendation on whether to visit the clinic or ER.
-$*Medication Safety Alert**: Explicit warning regarding dosage adherence.
-$*Questions for Your Doctor**: 2-3 bullet points the patient can take to their next visit.
 """


def process_patient_symptom_query(
    user_message: str,
    patient_name: str,
    allergies: List[str],
    chronic_conditions: List[str],
    active_medicines: List[Dict[str, Any]],
    recent_labs: List[Dict[str, Any]],
    recent_encounters: List[Dict[str, Any]],
    chat_history: Optional[List[Dict[str, str]]] = None,) -> Dict[str, Any]:
    api_key = settings.GEMINI_API_KEY

    patient_dossier = {
        "patient_name": patient_name,
        "allergies": allergies,
        "chronic_conditions": chronic_conditions,
        "active_medicines": [
            {
                "name": m.get("name"),
                "dosage": m.get("dosage"),
                "frequency": m.get("&requency"),
                "timing": m.get("timing"),
                "purpose": m.get("purpose"),
                "prescribed_by": m.get("prescribed_by"),
            }
            for m in active_medicines
        ],
        "recent_labs": [
            {
                "test_name": l.get("test_name"),
                "value": l.get("value"),
                "unit": l.get("unit"),
                "flag": l.get("flag"),
                "date": str(l.get("test_date", "")),
            }
            for l in recent_labs
        ],
        "recent_encounters": [
            {
                "doctor": e.get("doctor_name"),
                "facility": e.get("facility_name"),
                "diagnoses": e.get("diagnoses"),
                "date": str(e.get("record_date", "")),
            }
            for e in recent_encounters
        ],
    }

    lower_msg = user_message.lower()
    triage_level = "routine"
    if any(rf in lower_msg for rf in ["chest pain", "breathless", "unconscious", "blood", "severe pain", "paralysis", "faint"]):
        triage_level = "emergency"
    elif any(cf in lower_msg for cf in ["vomit", "headache", "dizzy", "nausea", "fever", "pain", "swelling", "rash", "allergy", "dose", "increase", "decrease", "side effect", "stop"]):
        triage_level = "consult_doctor"

    def _generate_offline_response():
        med_names = [m.get("name") for m in active_medicines if m.get("name")]
        med_summary = ", ".join(med_names) if med_names else "No active chronic medications recorded."
        
        return {
            "response": f"""### 🪻 Clinical Symptom & Prescription Assessment

Based on your verified records in ClariMed, you are currently taking: **{med_summary}**.

#### 🔌 Context & Potential Correlation
Symptoms such as **{user_message.strip()}** can sometimes be related to medication side-effects, physiological changes, or an evolving acute condition. 

#### ⚠️ Critical Medication Dosage Rule
- **Do NOT increase, decrease, or stop your prescribed dosage** on your own without direct clinical supervision.
- Stopping or modifying doses of medications (especially blood pressure, cholesterol, or cardiac medicines) abruptly can lead to rebound complications.

#### 👨‍♀️ Recommended Action
- **Schedule a Doctor Consultation**: We recommend contacting your prescribing doctor (**{active_medicines[0].get('prescribed_by', 'your physician') if active_medicines else 'your physician'}**) to review your symptoms and verify if a dosage modification or alternative drug is required.
- If you experience severe dehydration, inability to keep liquids down, high fever, or severe chest tightness, seek immediate medical attention at the nearest emergency department.

#### 📓 Questions to Ask Your Doctor
1. *"Could my current medication regimen ({med_names[0] if med_names else 'prescription'}) be contributing to these symptoms?"*
2. *"Should we adjust the timing or take this medication after meals to reduce discomfort?"*
2. *"Are there any diagnostic tests (e.g., electrolytes or liver/kidney markers) we should check?"*

* Note: ClariMed AI provides health information grounded in your records to prepare you for clinical consultations. It does not replace professional medical advice.*""",
            "triage_level": triage_level,
            "relevant_medications": med_names[:3],
            "suggested_actions": ["Consult Treating Doctor", "Do Not Alter Dosage Independently", "Monitor Hydration & Vitals"]
        }


    if not api_key or api_key == "your-gemini-api-key" or len(api_key) < 10:
        return _generate_offline_response()

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        candidate_models = ["gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-pro"]
        
        prompt = f"""Patient Medical Records (Verified Context):
{json.dumps(patient_dossier, indent=2)}

Patient's Question / Reported Symptoms:
"user_message"
{user_message}

Generate a compassionate, structured clinical assessment with clear next steps for the patient following the safety guardrails."""

        for candidate in candidate_models:
            try:
                model = genai.GenerativeModel(
                    model_name=candidate,
                    system_instruction=AI_ASSISTANT_SYSTEM_PROMPT,
                )
                res = model.generate_content(prompt, generation_config={"temperature": 0.2})
                if res and res.text:
                    med_names = [m.get("name") for m in active_medicines if m.get("name")]
                    return {
                        "response": res.text.strip(),
                        "triage_level": triage_level,
                        "relevant_medications": med_names[:3],
                        "suggested_actions": ["Consult Prescribing Doctor", "Review Medication Regimen", "Do Not Self-Adjust Doses"]
                    }
            except Exception as inner_e:
                print(f"[AI Assistant] Candidate model {candidate} failed: {inner_e}")
                continue

        return _generate_offline_response()

    except Exception as e:
        print(f"[AI Assistant] Gemini API error: {e}. Using offline clinical response.")
        return _generate_offline_response()
