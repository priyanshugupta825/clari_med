-- =============================================================================
-- Fragmented Health Record — Supabase PostgreSQL Schema
-- Team: Creative Tinkers (Hackathon Deployment)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    abha_id VARCHAR(50) UNIQUE,
    abha_address VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Emergency Information Table
CREATE TABLE IF NOT EXISTS public.emergency_info (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blood_group VARCHAR(10),
    allergies JSONB DEFAULT '[]'::jsonb NOT NULL,
    chronic_conditions JSONB DEFAULT '[]'::jsonb NOT NULL,
    emergency_contacts JSONB DEFAULT '[]'::jsonb NOT NULL,
    organ_donor BOOLEAN DEFAULT FALSE NOT NULL,
    critical_notes TEXT,
    is_publicly_visible_via_qr BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Documents Table (Health Vault)
CREATE TABLE IF NOT EXISTS public.documents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    document_type VARCHAR(50) DEFAULT 'prescription' NOT NULL,
    title VARCHAR(255),
    description TEXT,
    processing_status VARCHAR(30) DEFAULT 'pending' NOT NULL,
    processing_error TEXT,
    ai_summary TEXT,
    extracted_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb NOT NULL,
    uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Extracted Clinical Records Table
CREATE TABLE IF NOT EXISTS public.extracted_records (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,
    record_date DATE,
    doctor_name VARCHAR(255),
    doctor_specialty VARCHAR(150),
    facility_name VARCHAR(255),
    chief_complaints JSONB DEFAULT '[]'::jsonb NOT NULL,
    diagnoses JSONB DEFAULT '[]'::jsonb NOT NULL,
    clinical_notes TEXT,
    recommended_follow_up VARCHAR(255),
    confidence_score FLOAT DEFAULT 1.0 NOT NULL,
    ai_raw_json JSONB DEFAULT '{}'::jsonb NOT NULL,
    verified_by_user BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Medicines & Prescriptions Table
CREATE TABLE IF NOT EXISTS public.medicines (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id VARCHAR(36) REFERENCES public.documents(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    dosage VARCHAR(100) NOT NULL,
    form VARCHAR(50) DEFAULT 'tablet' NOT NULL,
    route VARCHAR(50) DEFAULT 'oral' NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    timing VARCHAR(100),
    schedule_times JSONB DEFAULT '[]'::jsonb NOT NULL,
    purpose VARCHAR(255),
    instructions TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    prescribed_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Medicine Logs Table (Adherence Tracking)
CREATE TABLE IF NOT EXISTS public.medicine_logs (
    id VARCHAR(36) PRIMARY KEY,
    medicine_id VARCHAR(36) NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    taken_time TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(30) DEFAULT 'pending' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Diagnostic Lab Results Table
CREATE TABLE IF NOT EXISTS public.lab_results (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id VARCHAR(36) REFERENCES public.documents(id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    value VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    reference_range VARCHAR(100),
    flag VARCHAR(30) DEFAULT 'normal' NOT NULL,
    test_date DATE,
    lab_name VARCHAR(255),
    clinical_interpretation TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Doctor Consent Shares Table
CREATE TABLE IF NOT EXISTS public.consent_shares (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_identifier VARCHAR(255),
    access_code VARCHAR(64) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '["timeline", "medicines", "lab_reports"]'::jsonb NOT NULL,
    purpose VARCHAR(255) DEFAULT 'Clinical Consultation' NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    revoked_at TIMESTAMP WITHOUT TIME ZONE,
    pre_consult_summary TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. ABDM Privacy Access Audit Logs Table
CREATE TABLE IF NOT EXISTS public.access_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    consent_share_id VARCHAR(36) REFERENCES public.consent_shares(id) ON DELETE SET NULL,
    accessor_name VARCHAR(255) NOT NULL,
    access_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    accessed_sections JSONB DEFAULT '[]'::jsonb NOT NULL,
    accessed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. Emergency QR Tokens Table
CREATE TABLE IF NOT EXISTS public.emergency_qr_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 0 NOT NULL,
    last_accessed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_records_user_id ON public.extracted_records(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_records_record_date ON public.extracted_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medicines_user_id ON public.medicines(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_user_id ON public.lab_results(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_shares_access_code ON public.consent_shares(access_code);
CREATE INDEX IF NOT EXISTS idx_emergency_qr_tokens_token ON public.emergency_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);

-- Storage bucket creation instruction for Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-records', 'medical-records', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Row Level Security (RLS) & Access Policies (Fixes Supabase Security Advisor)
-- =============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_qr_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Allow full access policies for application backend and authenticated users
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow full access to users" ON public.users;
    CREATE POLICY "Allow full access to users" ON public.users FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to emergency_info" ON public.emergency_info;
    CREATE POLICY "Allow full access to emergency_info" ON public.emergency_info FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to documents" ON public.documents;
    CREATE POLICY "Allow full access to documents" ON public.documents FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to extracted_records" ON public.extracted_records;
    CREATE POLICY "Allow full access to extracted_records" ON public.extracted_records FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to medicines" ON public.medicines;
    CREATE POLICY "Allow full access to medicines" ON public.medicines FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to medicine_logs" ON public.medicine_logs;
    CREATE POLICY "Allow full access to medicine_logs" ON public.medicine_logs FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to lab_results" ON public.lab_results;
    CREATE POLICY "Allow full access to lab_results" ON public.lab_results FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to consent_shares" ON public.consent_shares;
    CREATE POLICY "Allow full access to consent_shares" ON public.consent_shares FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to access_logs" ON public.access_logs;
    CREATE POLICY "Allow full access to access_logs" ON public.access_logs FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow full access to emergency_qr_tokens" ON public.emergency_qr_tokens;
    CREATE POLICY "Allow full access to emergency_qr_tokens" ON public.emergency_qr_tokens FOR ALL USING (true);
END $$;

