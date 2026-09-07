import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Stethoscope,
  Sparkles,
  ShieldCheck,
  Clock,
  Pill,
  Activity,
  AlertTriangle,
  Hospital,
  FileText,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Heart,
  User,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { getDocumentViewUrl } from '../lib/documentUrl';
import { CDSAlertBanner } from '../components/cds/CDSAlertBanner';

const apiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const DoctorView = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedEncounter, setExpandedEncounter] = useState({});

  useEffect(() => {
    const fetchDossier = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${apiBaseURL}/consent/access/${token}`);
        if (res.data?.success) {
          setData(res.data);
          const initialExpanded = {};
          res.data.timeline?.forEach((t, i) => {
            initialExpanded[t.id] = i < 2;
          });
          setExpandedEncounter(initialExpanded);
        } else {
          throw new Error('Could not retrieve consultation dossier.');
        }
      } catch (err) {
        console.error('Doctor access error:', err);
        setError(
          err.response?.data?.detail ||
            'Doctor access link is invalid, expired, or has been revoked by the patient.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDossier();
    }
  }, [token]);

  const toggleEncounter = (id) => {
    setExpandedEncounter((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-950 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-brand-300 animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Decentralized Health Dossier</h2>
        <p className="text-xs text-brand-200 mt-1">
          Verifying ABDM consent token & synthesizing clinical records...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-500 mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-red-400">
          Consent Access Expired or Revoked
        </h1>
        <p className="text-sm text-slate-300 max-w-md mt-2 leading-relaxed">
          {error}
        </p>
        <p className="text-xs text-slate-500 mt-6 font-mono">
          ABDM Consent Protocol • Access Audited
        </p>
      </div>
    );
  }

  const { patient, consent_meta } = data;

  return (
    <div className="min-h-screen bg-brand-50 text-slate-900 selection:bg-brand-200 selection:text-brand-900 p-3 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Bar for Consulting Doctor */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xs border border-brand-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-brand-800 bg-brand-100 px-2.5 py-0.5 rounded-md border border-brand-200 uppercase tracking-wider">
                  ABDM Authorized Doctor View
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  • {consent_meta.recipient_name}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-brand-950 tracking-tight mt-0.5">
                Clinical Consultation Dossier
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Purpose: <strong className="text-brand-900">{consent_meta.purpose}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block font-mono">CONSENT EXPIRY</span>
              <span className="text-xs font-bold text-brand-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                {consent_meta.expires_at ? format(parseISO(consent_meta.expires_at), 'dd MMM, HH:mm') : 'Active'}
              </span>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold shadow-2xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Clinical Brief</span>
            </button>
          </div>
        </div>

        {/* AI Pre-Consult Brief Hero Card */}
        <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-brand-700/50 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-300 animate-pulse" />
              <h2 className="text-base font-extrabold tracking-wide uppercase text-brand-100">
                Gemini AI Pre-Consultation Clinical Brief (60-Second Overview)
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase bg-white/10 text-brand-200 px-2.5 py-1 rounded-md border border-white/10">
              Assisted Review
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-normal">
            {data.pre_consult_summary}
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-brand-200 border-t border-white/10">
            <span>{data.disclaimer}</span>
            <span className="font-mono text-brand-300">ABDM Synced</span>
          </div>
        </div>

        {/* Multicenter Clinical Decision Support (CDS) Early Warning Banner */}
        {data.cds_insights && (
          <CDSAlertBanner
            cdsInsights={data.cds_insights}
            patientName={patient.full_name || 'Patient'}
          />
        )}

        {/* Patient Identity Demographics */}
        <div className="bg-white rounded-3xl p-5 shadow-2xs border border-brand-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Patient Name
            </span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{patient.full_name}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              ABHA ID
            </span>
            <p className="font-mono font-bold text-brand-700 mt-0.5">
              {patient.abha_id || '91-4521-8890-4123'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Blood Group
            </span>
            <p className="font-black text-rose-600 text-base mt-0.5">
              {patient.blood_group || 'O+'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Known Allergies
            </span>
            <p className="font-bold text-red-700 mt-0.5 truncate" title={patient.allergies?.join(', ')}>
              {patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None Reported'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Chronic Conditions
            </span>
            <p className="font-bold text-sand-800 mt-0.5 truncate" title={patient.chronic_conditions?.join(', ')}>
              {patient.chronic_conditions?.length > 0 ? patient.chronic_conditions.join(', ') : 'None'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Organ Donor
            </span>
            <p className="font-bold text-brand-700 mt-0.5">
              {patient.organ_donor ? 'YES (Pledged)' : 'NO'}
            </p>
          </div>
        </div>

        {/* Grid: Active Medications + Lab Biomarkers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Medications */}
          <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-brand-100 text-brand-700">
                  <Pill className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-brand-950 text-sm uppercase tracking-wider">
                  Active Medications ({data.active_medicines?.length || 0})
                </h3>
              </div>
              <span className="text-xs text-slate-400">Current Regimen</span>
            </div>

            <div className="space-y-2.5">
              {data.active_medicines?.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{med.name}</span>
                      {med.brand_name && (
                        <span className="text-slate-500 font-medium">({med.brand_name})</span>
                      )}
                    </div>
                    <p className="text-slate-600">
                      Frequency: <strong className="text-brand-800">{med.frequency}</strong> • {med.timing || 'As advised'}
                    </p>
                    {med.purpose && <p className="text-[11px] text-slate-500">For: {med.purpose}</p>}
                  </div>
                  <span className="font-bold text-brand-900 bg-brand-200/80 px-2.5 py-1 rounded-xl text-xs">
                    {med.dosage}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Lab Biomarkers */}
          <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-sand-100 text-sand-700">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-brand-950 text-sm uppercase tracking-wider">
                  Recent Lab Biomarkers ({data.lab_results?.length || 0})
                </h3>
              </div>
              <span className="text-xs text-slate-400">Diagnostic Highlights</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {data.lab_results?.map((lab, idx) => {
                const isAbnormal = lab.flag === 'high' || lab.flag === 'low' || lab.flag === 'critical';
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs ${
                      isAbnormal
                        ? 'bg-sand-100/90 border-sand-300 text-sand-950'
                        : 'bg-brand-50/60 border-brand-200 text-slate-800'
                    }`}
                  >
                    <span className="font-semibold block truncate text-[11px] text-slate-700">
                      {lab.test_name}
                    </span>
                    <p className="font-bold text-base mt-0.5">
                      {lab.value} <span className="text-xs font-normal text-slate-500">{lab.unit}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-slate-500">Ref: {lab.reference_range || 'Normal'}</span>
                      <span
                        className={`font-bold uppercase px-1.5 py-0.5 rounded ${
                          isAbnormal
                            ? 'bg-sand-300 text-sand-900'
                            : 'bg-brand-200 text-brand-900'
                        }`}
                      >
                        {lab.flag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Structured Longitudinal Clinical Timeline */}
        <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-brand-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">
              Longitudinal Clinical Encounter History
            </h3>
            <span className="text-xs text-slate-500">{data.timeline?.length || 0} Recorded Encounters</span>
          </div>

          <div className="space-y-4">
            {data.timeline?.map((enc) => {
              const isExpanded = !!expandedEncounter[enc.id];
              return (
                <div
                  key={enc.id}
                  className="rounded-2xl border border-brand-100 overflow-hidden bg-brand-50/40 hover:bg-brand-50/80 transition"
                >
                  <div
                    onClick={() => toggleEncounter(enc.id)}
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-950 bg-white px-2.5 py-0.5 rounded-lg border border-brand-200">
                          {enc.record_date || 'Encounter'}
                        </span>
                        <span className="text-xs font-bold capitalize px-2 py-0.5 rounded-lg bg-brand-100 text-brand-800 border border-brand-200">
                          {enc.record_type}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {enc.doctor_name}
                        </span>
                        <span className="text-xs text-slate-400">• {enc.facility_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {enc.diagnoses?.map((d, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-bold bg-sand-100 text-sand-800 border border-sand-300 px-2 py-0.5 rounded-md"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-brand-100 text-xs space-y-3">
                      {enc.clinical_notes && (
                        <p className="text-slate-700 leading-relaxed">
                          <strong>Doctor's Notes:</strong> {enc.clinical_notes}
                        </p>
                      )}
                      {enc.recommended_follow_up && (
                        <p className="text-slate-600">
                          <strong>Follow-up Advice:</strong> {enc.recommended_follow_up}
                        </p>
                      )}
                      {enc.document && (
                        <a
                          href={getDocumentViewUrl(enc.document)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-700 font-bold hover:underline pt-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Inspect Original Clinical Upload ({enc.document.file_name})</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
