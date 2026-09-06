import React, { useState, useEffect } from 'react';
import {
  Pill,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  Sparkles,
  RefreshCw,
  FolderOpen,
  FileText,
  ExternalLink,
  Sun,
  Sunset,
  Moon,
  Stethoscope,
  Hospital,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getDocumentViewUrl } from '../lib/documentUrl';

export const MedicineManager = () => {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user-123';
  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = `clarimed_med_adherence_${userId}_${todayKey}`;

  const [medicines, setMedicines] = useState([]);
  const [takenMap, setTakenMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load saved adherence map from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setTakenMap(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load local adherence:', e);
    }
  }, [storageKey]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/timeline');
      if (res.data?.records) {
        const extractedMeds = [];
        res.data.records.forEach((r) => {
          if (r.medicines && Array.isArray(r.medicines)) {
            r.medicines.forEach((m, idx) => {
              const medId = `${r.id}-${m.name.toLowerCase().replace(/\s+/g, '_')}`;
              if (!extractedMeds.some((existing) => existing.name.toLowerCase() === m.name.toLowerCase())) {
                extractedMeds.push({
                  id: medId,
                  name: m.name,
                  brand: m.brand_name || '',
                  dosage: m.dosage || 'Standard Dosage',
                  form: m.form || 'tablet',
                  frequency: m.frequency || '1-0-1 (Twice daily)',
                  timing: m.timing || 'After meals',
                  duration: m.duration || 'As advised',
                  purpose: m.purpose || 'Therapeutic Treatment',
                  instructions: m.instructions || '',
                  prescribedBy: r.doctor_name || 'Consulting Physician',
                  facilityName: r.facility_name || 'Healthcare Clinic',
                  recordDate: r.record_date,
                  sourceDocUrl: getDocumentViewUrl(r.document),
                  sourceDocName: r.document?.file_name || 'Prescription',
                });
              }
            });
          }
        });
        setMedicines(extractedMeds);
      }
    } catch (err) {
      console.warn('Medicine fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const toggleStatus = (medId) => {
    setTakenMap((prev) => {
      const updated = {
        ...prev,
        [medId]: !prev[medId],
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save adherence:', e);
      }
      return updated;
    });
  };

  // Calculate adherence percentage
  const totalMeds = medicines.length;
  const takenCount = medicines.filter((m) => !!takenMap[m.id]).length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 0;

  // Helper to parse frequency into morning/afternoon/night badges
  const parseDoseSlots = (freq = '') => {
    const f = freq.toLowerCase();
    const isMorning = f.includes('1-0-0') || f.includes('1-0-1') || f.includes('1-1-1') || f.includes('morning') || f.includes('once daily');
    const isAfternoon = f.includes('1-1-1') || f.includes('0-1-0') || f.includes('afternoon') || f.includes('thrice');
    const isNight = f.includes('0-0-1') || f.includes('1-0-1') || f.includes('1-1-1') || f.includes('night') || f.includes('bedtime') || f.includes('hs');
    const isSOS = f.includes('sos') || f.includes('prn') || f.includes('as needed');

    return { isMorning, isAfternoon, isNight, isSOS };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold mb-2 border border-brand-200/80">
            <Pill className="w-3.5 h-3.5 text-brand-600" /> Active Prescriptions & Adherence Tracker
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-950">Medicine Manager</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Auto-extracted prescriptions from your uploaded doctor slips with persistent daily dose logging and Indian schedule tracker (`1-0-1`).
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Prescription</span>
        </button>
      </div>

      {/* Adherence Summary Bar */}
      <div className="bg-white rounded-3xl border border-brand-100 p-6 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl border transition-all ${
            adherencePercent === 100 && totalMeds > 0
              ? 'bg-brand-600 text-white border-brand-700 shadow-md shadow-brand-600/20'
              : adherencePercent > 0
              ? 'bg-brand-100 text-brand-900 border-brand-300'
              : 'bg-sand-100 text-sand-800 border-sand-300'
          }`}>
            {adherencePercent}%
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Today's Medication Adherence</h3>
              <span className="text-[11px] font-mono text-slate-400">({todayKey})</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalMeds > 0
                ? `${takenCount} of ${totalMeds} doses logged as taken today`
                : 'Upload prescriptions in Health Vault to track active medications'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-800 bg-brand-50 px-3.5 py-2 rounded-xl border border-brand-200">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span>Saved Persistently</span>
          </div>
          <button
            onClick={fetchMedicines}
            className="p-2 rounded-xl border border-brand-200 hover:bg-brand-50 text-brand-700 transition"
            title="Refresh medicines"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading your prescribed medications...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && medicines.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-brand-100 p-8 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-brand-100 rounded-3xl flex items-center justify-center text-brand-600 mx-auto">
            <Pill className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Active Prescriptions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload any prescription image or PDF in Health Vault, and Gemini AI will extract medications and dosage timings automatically.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-2xs transition mt-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload First Prescription</span>
          </button>
        </div>
      )}

      {/* Active Medicine Cards */}
      {!loading && medicines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medicines.map((med) => {
            const isTaken = !!takenMap[med.id];
            const slots = parseDoseSlots(med.frequency);

            return (
              <div
                key={med.id}
                className={`bg-white rounded-3xl border transition-all p-5 shadow-2xs flex flex-col justify-between space-y-4 ${
                  isTaken
                    ? 'border-brand-300 ring-2 ring-brand-500/20 bg-brand-50/20'
                    : 'border-brand-100 hover:border-brand-300 hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top: Medicine Name & Form Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base truncate">
                          {med.name}
                        </h3>
                        {med.brand && med.brand !== 'Generic' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-100 text-brand-800 border border-brand-200">
                            {med.brand}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-700 font-bold mt-0.5">{med.dosage}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border shrink-0 transition-colors ${
                        isTaken
                          ? 'bg-brand-600 text-white border-brand-700 shadow-2xs'
                          : 'bg-sand-100 text-sand-800 border-sand-300'
                      }`}
                    >
                      {isTaken ? '✓ Taken Today' : 'Scheduled'}
                    </span>
                  </div>

                  {/* Dose Timing Slots */}
                  <div className="flex items-center gap-1.5 my-3">
                    {slots.isSOS ? (
                      <span className="px-2.5 py-1 rounded-lg bg-sand-100 text-sand-800 font-bold text-[10px] border border-sand-300">
                        SOS (As needed)
                      </span>
                    ) : (
                      <>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          slots.isMorning ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                        }`}>
                          <Sun className="w-3 h-3 text-amber-600" /> Morning
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          slots.isAfternoon ? 'bg-orange-100 text-orange-900 border-orange-300' : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                        }`}>
                          <Sunset className="w-3 h-3 text-orange-600" /> Noon
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          slots.isNight ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                        }`}>
                          <Moon className="w-3 h-3 text-indigo-600" /> Night
                        </span>
                      </>
                    )}
                  </div>

                  {/* Schedule Details Table */}
                  <div className="space-y-1.5 py-3 border-y border-brand-100/70 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Frequency:</span>
                      <span className="font-bold text-brand-950">{med.frequency}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium">Timing:</span>
                      <span className="font-semibold text-slate-800">{med.timing}</span>
                    </div>
                    {med.purpose && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 font-medium">Purpose:</span>
                        <span className="font-semibold text-slate-800">{med.purpose}</span>
                      </div>
                    )}
                    {med.instructions && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 font-medium">Advice:</span>
                        <span className="text-slate-700 italic">{med.instructions}</span>
                      </div>
                    )}
                  </div>

                  {/* Prescribing Doctor & Prescription Source */}
                  <div className="pt-3 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Stethoscope className="w-3.5 h-3.5 text-brand-600" />
                      <span>{med.prescribedBy}</span>
                    </div>
                    {med.sourceDocUrl && (
                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={med.sourceDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 hover:text-brand-900 font-bold inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Original Prescription</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mark as Taken Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => toggleStatus(med.id)}
                    className={`w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      isTaken
                        ? 'bg-brand-100 text-brand-900 hover:bg-brand-200 border border-brand-300'
                        : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-600/15'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isTaken ? 'Dose Logged (Click to Undo)' : 'Mark Dose as Taken'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
