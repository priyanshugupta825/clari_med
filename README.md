# ?? ClariMed — Unified AI-Powered Personal Health Record & Clinical Intelligence Platform
> **Global Design Thinking Alliance Hackathon 2026 — Phase 2 Prototype Submission**  
> **Team:** Creative Tinkers  
> **Live Web App:** [https://clarimed-s1a7.vercel.app/](https://clarimed-s1a7.vercel.app/)  
> **API Swagger Docs:** [https://fragmented-health-record-backend-y18r.onrender.com/docs](https://fragmented-health-record-backend-y18r.onrender.com/docs)  
> **GitHub Repository:** [https://github.com/priyanshugupta825/fragmented-health-record](https://github.com/priyanshugupta825/fragmented-health-record)  

---

## ?? Hackathon Documentation & Research Foundation

* ?? **[Visual Prototype Pitch Deck (9 Slides)](./docs/PROTOTYPE_PITCH_DECK.md)** — Complete visual walkthrough with UI screenshots, user journey, and design thinking flow.
* ?? **[Clinical & Technical Research Foundation (43-Page Spec)](./docs/CLINICAL_AND_TECHNICAL_RESEARCH_FOUNDATION.md)** — Clinical requirements (CR-001 to CR-037), HL7 FHIR data schemas, JMIR 2024 literature validation, and AI safety guardrails.

---

## ?? Core Innovations & Built Features

```
+-------------------------------------------------------------------------------------------------+
¦ 1. HEALTH VAULT & GEMINI MULTIMODAL AI DOCUMENT PARSER                                          ¦
¦    • Ingests noisy prescriptions, lab PDFs, discharge summaries & OPD slips.                    ¦
¦    • Converts images/PDFs into structured tables (Medicines, Dosages, Diagnoses, Biomarkers).   ¦
¦    • Includes confidence scoring & human-in-the-loop review before finalizing.                  ¦
+-------------------------------------------------------------------------------------------------¦
¦ 2. UNIFIED LONGITUDINAL HEALTH TIMELINE & TRACEABILITY                                          ¦
¦    • Chronological health history with smart filtering (Consultations, Labs, Prescriptions).    ¦
¦    • HARVEST precedent: Every timeline entry links back to the original verified source file.   ¦
+-------------------------------------------------------------------------------------------------¦
¦ 3. CROSS-CENTER CLINICAL DECISION SUPPORT & KNOWLEDGE GRAPH (JMIR 2024 BREAKTHROUGH)           ¦
¦    • Detects overlooked chronic diseases (KDIGO Stage 3 CKD) across multi-hospital visits       ¦
¦      up to 434 days earlier before single institutions notice.                                  ¦
¦    • Interactive SVG Knowledge Graph with step-by-step explainable "Reasoning Footage".        ¦
¦    • Duplicate Diagnostic Test Alert (flags tests = 30 days to prevent repeat venipunctures).   ¦
+-------------------------------------------------------------------------------------------------¦
¦ 4. ACTIVE MEDICINE MANAGER & ADHERENCE ORGANIZER                                                ¦
¦    • Converts prescription text into active daily dosage schedules (Morning/Afternoon/Night).   ¦
¦    • Tracks missed doses, active vs past regimens, and direct links to original signed Rx.      ¦
+-------------------------------------------------------------------------------------------------¦
¦ 5. LIFE-SAVING EMERGENCY MEDICAL QR PASS (GOLDEN-HOUR TRIAGE)                                   ¦
¦    • 1-Click printable/lockscreen QR pass for bystanders, ambulances, and ER doctors.           ¦
¦    • Instant scan (Zero App Download Required): Blood Group, Severe Allergies & SOS Contacts.  ¦
+-------------------------------------------------------------------------------------------------¦
¦ 6. CONTEXT-AWARE AI SYMPTOM ASSISTANT (RAG GROUNDED)                                            ¦
¦    • Floating AI chatbot cross-referencing patient active prescriptions and lab history.        ¦
¦    • Strict safety guardrails: Non-diagnostic, strictly prohibits self-adjusting medication     ¦
¦      dosages, red-flag emergency triage, and prepares smart questions for the doctor.           ¦
+-------------------------------------------------------------------------------------------------¦
¦ 7. PRIVACY-FIRST ABDM DOCTOR DOSSIER & CONSENT SHARING                                          ¦
¦    • 15-Minute PIN-protected temporary access links for consulting doctors.                     ¦
¦    • 60-Second AI Pre-Consult Clinical Summary (Abnormal Labs, Active Meds, Safety Alerts).    ¦
¦    • DPDP Act (2023) compliant with patient-visible access audit logs and instant revocation.  ¦
+-------------------------------------------------------------------------------------------------+
```

---

## ??? Technology Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, Lucide Icons, Date-fns, Axios |
| **Backend API** | FastAPI (Python 3.11+), Uvicorn, Pydantic v2, SQLAlchemy ORM |
| **Database & Auth** | Supabase PostgreSQL (IPv4 Connection Pooler), Row Level Security (RLS) |
| **AI / Multimodal** | Google Gemini Multimodal Document Intelligence (`gemini-flash-lite-latest`, `gemini-2.5-flash`) |
| **Clinical Standards** | HL7 FHIR (Patient, Encounter, Condition, MedicationRequest, Observation, Consent) |
| **Hosting & Deploy** | Vercel (Frontend CI/CD) + Render (Backend Web Service) |

---

## ?? Quick Local Development Setup

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run development server
uvicorn app.main:app --reload --port 8000
```
* **API Documentation**: `http://localhost:8000/docs`
* **Health Check**: `http://localhost:8000/api/health`

### 2. Frontend Setup (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
* **Local Web Application**: `http://localhost:5173`

---

## ?? Hackathon Submission Links
* **Live App**: [https://clarimed-s1a7.vercel.app/](https://clarimed-s1a7.vercel.app/)
* **Backend Docs**: [https://fragmented-health-record-backend-y18r.onrender.com/docs](https://fragmented-health-record-backend-y18r.onrender.com/docs)
* **Team**: Creative Tinkers — GDTA Hackathon 2026
