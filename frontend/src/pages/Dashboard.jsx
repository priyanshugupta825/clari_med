import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import {
  UploadCloud,
  Activity,
  Pill,
  ShieldAlert,
  UserCheck,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Plus,
  Hospital,
  FolderOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [docCount, setDocCount] = useState(0);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const displayName = user?.user_metadata?.full_name || 'Patient';
  const abhaId = user?.user_metadata?.abha_id || '91-4521-8890-4123';

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch timeline records
      const timelineRes = await apiClient.get('/timeline');
      if (timelineRes.data?.records) {
        const recs = timelineRes.data.records;
        setRecords(recs);

        // Extract distinct medicines
        const allMeds = [];
        recs.forEach((r) => {
          if (r.medicines && Array.isArray(r.medicines)) {
            r.medicines.forEach((m) => {
              if (!allMeds.some((existing) => existing.name === m.name)) {
                allMeds.push(m);
              }
            });
          }
        });
        setMedicines(allMeds);
      }

      // 2. Fetch documents count
      const docsRes = await apiClient.get('/documents/');
      if (Array.isArray(docsRes.data)) {
        setDocCount(docsRes.data.length);
      } else if (docsRes.data?.documents) {
        setDocCount(docsRes.data.documents.length);
      }

      // 3. Fetch doctor shares count
      const sharesRes = await apiClient.get('/consent/shares');
      if (sharesRes.data?.shares) {
        const active = sharesRes.data.shares.filter((s) => s.is_active).length;
        setActiveSharesCount(active);
      }
    } catch (err) {
      console.warn('Dashboard data fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-900/10 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-brand-500/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" /> ABDM Connected Profile
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {displayName}
          </h1>
          <p className="text-brand-100 text-sm mt-1.5 max-w-xl leading-relaxed">
            Your unified health records across hospitals, clinics, and labs powered by Gemini AI.
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-brand-100 font-mono bg-black/20 px-3 py-1.5 rounded-xl w-fit border border-white/10">
            <span>ABHA:</span>
            <span className="font-bold text-white tracking-wider">{abhaId}</span>
          </div>
        </div>

        {/* Quick Actions in banner */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-800 font-bold text-sm hover:bg-brand-50 transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-brand-600" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={() => navigate('/emergency')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emergency-600 text-white font-bold text-sm hover:bg-emergency-700 transition shadow-sm cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency QR</span>
          </button>
        </div>
      </div>

      {/* Metrics Row - Interactive Clickable Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 1. Vault Files Card */}
        <div
          onClick={() => navigate('/upload')}
          className="bg-white p-5 rounded-3xl border border-brand-100 shadow-2xs hover:border-brand-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vault Files</span>
            <div className="p-2 rounded-2xl bg-brand-100 text-brand-700 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{docCount}</p>
          <p className="text-xs text-brand-700 font-semibold mt-1 flex items-center gap-1">
            <span>{docCount > 0 ? 'Stored in Vault' : 'Tap to upload'}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* 2. Active Meds Card */}
        <div
          onClick={() => navigate('/medicines')}
          className="bg-white p-5 rounded-3xl border border-brand-100 shadow-2xs hover:border-brand-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Meds</span>
            <div className="p-2 rounded-2xl bg-brand-100 text-brand-700 group-hover:scale-110 transition-transform">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{medicines.length}</p>
          <p className="text-xs text-brand-700 font-semibold mt-1 flex items-center gap-1">
            <span>{medicines.length > 0 ? 'Prescriptions tracked' : 'Manage dosages'}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* 3. Encounters Card */}
        <div
          onClick={() => navigate('/timeline')}
          className="bg-white p-5 rounded-3xl border border-brand-100 shadow-2xs hover:border-brand-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Encounters</span>
            <div className="p-2 rounded-2xl bg-sand-100 text-sand-700 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{records.length}</p>
          <p className="text-xs text-sand-800 font-semibold mt-1 flex items-center gap-1">
            <span>{records.length > 0 ? 'Timeline visits' : 'View timeline'}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* 4. Doctor Shares Card */}
        <div
          onClick={() => navigate('/doctor-portal')}
          className="bg-white p-5 rounded-3xl border border-brand-100 shadow-2xs hover:border-brand-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor Shares</span>
            <div className="p-2 rounded-2xl bg-brand-200/80 text-brand-800 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">{activeSharesCount}</p>
          <p className="text-xs text-brand-800 font-semibold mt-1 flex items-center gap-1">
            <span>{activeSharesCount > 0 ? 'Active grants' : 'Grant doctor access'}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Timeline & Active Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Health Journey (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-brand-100 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-brand-950">Recent Health Journey</h2>
              <p className="text-xs text-slate-500">Auto-extracted from your prescriptions & lab reports</p>
            </div>
            {records.length > 0 && (
              <button
                onClick={() => navigate('/timeline')}
                className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 cursor-pointer"
              >
                Full Timeline <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-10 space-y-2">
              <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading recent records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-10 px-4 bg-brand-50/40 rounded-2xl border border-brand-100 space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">No Medical Records Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your first prescription, lab report, or discharge summary to see your AI-extracted timeline here.
              </p>
              <button
                onClick={() => navigate('/upload')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Medical Record</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {records.slice(0, 4).map((record) => {
                const formattedDate = record.record_date
                  ? format(parseISO(record.record_date), 'dd MMM yyyy')
                  : 'Recent';

                return (
                  <div
                    key={record.id}
                    onClick={() => navigate('/timeline')}
                    className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/60 hover:border-brand-400 hover:bg-brand-50 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white border border-brand-200 text-brand-700 font-bold text-xs mt-0.5 shadow-2xs">
                          {formattedDate}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900">
                            {record.doctor_name || record.record_type || 'Clinical Record'}
                          </h3>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                            <Hospital className="w-3 h-3 text-brand-500" />
                            <span>{record.facility_name || 'Healthcare Facility'}</span>
                            {record.doctor_specialty && <span>• {record.doctor_specialty}</span>}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-brand-100 text-brand-900 font-bold uppercase border border-brand-200">
                              {record.record_type?.replace('_', ' ')}
                            </span>
                            {record.diagnoses?.map((d, i) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-0.5 rounded-lg bg-sand-200/80 text-sand-800 font-semibold border border-sand-300"
                              >
                                {d}
                              </span>
                            ))}
                            {record.medicines?.length > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-brand-100 text-brand-800 font-semibold border border-brand-200/80">
                                {record.medicines.length} Prescriptions
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Medications Quick Manager */}
        <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-brand-950">Active Medicines</h2>
                <p className="text-xs text-slate-500">Current active prescriptions</p>
              </div>
              <button
                onClick={() => navigate('/medicines')}
                className="p-1.5 rounded-xl bg-brand-100 text-brand-700 hover:bg-brand-200 transition cursor-pointer"
                title="View Medicine Manager"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 space-y-2">
                <RefreshCw className="w-5 h-5 text-brand-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading medicines...</p>
              </div>
            ) : medicines.length === 0 ? (
              <div className="text-center py-8 px-3 bg-brand-50/30 rounded-2xl border border-brand-100 space-y-2">
                <Pill className="w-8 h-8 text-brand-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No active medications</p>
                <p className="text-[11px] text-slate-400">
                  Uploaded prescriptions will auto-populate active medications here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {medicines.slice(0, 4).map((med, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/medicines')}
                    className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200/60 hover:border-brand-400 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{med.name}</h4>
                      <p className="text-xs text-slate-500">
                        {med.dosage} • {med.frequency}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded-lg border border-brand-200">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/medicines')}
            className="w-full mt-5 py-2.5 px-3 rounded-xl border border-brand-200 text-xs font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 transition text-center cursor-pointer"
          >
            Manage All Dosages & History →
          </button>
        </div>
      </div>
    </div>
  );
};
