import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Search,
  Filter,
  Pill,
  Hospital,
  FileText,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getDocumentViewUrl } from '../lib/documentUrl';
import { CDSAlertBanner } from '../components/cds/CDSAlertBanner';

const TYPE_CONFIG = {
  prescription: {
    label: 'Prescription (Rx)',
    icon: Pill,
    badgeBg: 'bg-brand-100 text-brand-900 border-brand-200',
    dotBg: 'bg-brand-600 ring-brand-200',
    borderAccent: 'border-l-brand-600',
  },
  lab_report: {
    label: 'Lab Report',
    icon: Activity,
    badgeBg: 'bg-sand-100 text-sand-800 border-sand-300',
    dotBg: 'bg-brand-500 ring-brand-100',
    borderAccent: 'border-l-brand-500',
  },
  consultation: {
    label: 'OPD Consultation',
    icon: Stethoscope,
    badgeBg: 'bg-brand-50 text-brand-800 border-brand-200',
    dotBg: 'bg-brand-700 ring-brand-100',
    borderAccent: 'border-l-brand-700',
  },
  discharge_summary: {
    label: 'Discharge Summary',
    icon: Hospital,
    badgeBg: 'bg-sand-200/80 text-sand-800 border-sand-300',
    dotBg: 'bg-sand-500 ring-sand-200',
    borderAccent: 'border-l-sand-500',
  },
  vaccine_certificate: {
    label: 'Vaccination',
    icon: ShieldCheck,
    badgeBg: 'bg-brand-200 text-brand-900 border-brand-300',
    dotBg: 'bg-brand-600 ring-brand-200',
    borderAccent: 'border-l-brand-600',
  },
};

export const Timeline = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [cdsInsights, setCdsInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter & Search states
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expandable cards state
  const [expandedMap, setExpandedMap] = useState({});

  const fetchTimeline = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/timeline', {
        params: {
          record_type: selectedType !== 'all' ? selectedType : undefined,
          search: searchQuery || undefined,
        },
      });

      if (response.data?.records) {
        setRecords(response.data.records);
        const initialExpanded = {};
        response.data.records.forEach((r, idx) => {
          initialExpanded[r.id] = idx < 2;
        });
        setExpandedMap(initialExpanded);
      }

      if (response.data?.cds_insights) {
        setCdsInsights(response.data.cds_insights);
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setError('Unable to load health timeline. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTimeline();
  };

  const toggleExpand = (id) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Group records by Month & Year
  const groupedRecords = records.reduce((acc, record) => {
    let monthYear = 'Recent Encounters';
    if (record.record_date) {
      try {
        monthYear = format(parseISO(record.record_date), 'MMMM yyyy');
      } catch {
        monthYear = 'Recent Encounters';
      }
    }
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(record);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold mb-2 border border-brand-200/80">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Longitudinal Health Record
          </div>
          <h1 className="text-2xl font-bold text-brand-950">Health Timeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            A unified chronological history of all your medical visits, lab tests, prescriptions, and discharge summaries.
          </p>
        </div>

        <button
          onClick={fetchTimeline}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-xs font-bold text-brand-800 shadow-2xs transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Multicenter Clinical Decision Support (CDS) Banner */}
      <CDSAlertBanner
        cdsInsights={cdsInsights}
        patientName={user?.full_name || user?.name || 'Patient'}
      />

      {/* Search Bar & Filter Bar */}
      <div className="bg-white rounded-3xl border border-brand-100 p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-brand-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doctor, hospital, diagnosis, medicine, or symptom..."
            className="block w-full pl-10 pr-24 py-2.5 sm:text-xs border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-brand-50/30"
          />
          <button
            type="submit"
            className="absolute inset-y-1.5 right-1.5 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            Search
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'prescription', label: 'Prescriptions' },
            { id: 'lab_report', label: 'Lab Reports' },
            { id: 'consultation', label: 'Consultations' },
            { id: 'discharge_summary', label: 'Discharge Summaries' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedType === type.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-brand-100/70 text-brand-800 hover:bg-brand-200/80 border border-brand-200/60'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16 space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Reconstructing your health journey...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && records.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-brand-100 p-8 shadow-2xs space-y-3">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No timeline records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No medical encounters matched your filter. Try clearing the search or upload a medical record to Health Vault.
          </p>
        </div>
      )}

      {/* Grouped Chronological Timeline */}
      {!loading && Object.keys(groupedRecords).length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedRecords).map(([monthYear, items]) => (
            <div key={monthYear} className="space-y-4">
              {/* Month / Year Milestone Header */}
              <div className="sticky top-20 z-10 inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-brand-100/90 border border-brand-200 backdrop-blur-xs text-brand-900 text-xs font-bold shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>{monthYear}</span>
                <span className="text-[11px] font-normal text-brand-700">({items.length} records)</span>
              </div>

              {/* Vertical Line Container */}
              <div className="relative border-l-2 border-brand-200 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
                {items.map((record) => {
                  const normalizedType =
                    (record.record_type || 'consultation').toLowerCase().replace(/[\s-]/g, '_');
                  const typeConfig =
                    TYPE_CONFIG[normalizedType] || TYPE_CONFIG.consultation;
                  const Icon = typeConfig.icon;
                  const isExpanded = !!expandedMap[record.id];

                  const formattedDate = record.record_date
                    ? format(parseISO(record.record_date), 'dd MMM yyyy')
                    : 'Unknown Date';

                  return (
                    <div key={record.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div
                        className={`absolute -left-[37px] sm:-left-[45px] top-2 w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center shadow-xs ring-4 ${typeConfig.dotBg} border-current text-white`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Timeline Card */}
                      <div
                        className={`bg-white rounded-3xl border border-brand-100 shadow-2xs hover:shadow-md transition-all overflow-hidden border-l-4 ${typeConfig.borderAccent}`}
                      >
                        {/* Header: Clickable to expand/collapse */}
                        <div
                          onClick={() => toggleExpand(record.id)}
                          className="p-5 cursor-pointer select-none flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-brand-950 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200/60">
                                {formattedDate}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${typeConfig.badgeBg}`}
                              >
                                {typeConfig.label}
                              </span>
                              {record.verified_by_user && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-800 bg-brand-100 px-2 py-0.5 rounded-lg border border-brand-200">
                                  <CheckCircle2 className="w-3 h-3 text-brand-600" /> Verified
                                </span>
                              )}
                            </div>

                            {/* Doctor & Facility */}
                            <div>
                              <h3 className="font-bold text-base text-slate-900">
                                {record.doctor_name || 'Clinical Encounter'}
                              </h3>
                              <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Hospital className="w-3.5 h-3.5 text-brand-500" />
                                <span>{record.facility_name || 'Healthcare Facility'}</span>
                                {record.doctor_specialty && (
                                  <span>• {record.doctor_specialty}</span>
                                )}
                              </p>
                            </div>

                            {/* Collapsed summary pill preview */}
                            {!isExpanded && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {record.diagnoses?.map((diag, i) => (
                                  <span
                                    key={i}
                                    className="text-[11px] font-bold bg-sand-100 text-sand-800 border border-sand-300 px-2 py-0.5 rounded-lg"
                                  >
                                    {diag}
                                  </span>
                                ))}
                                {record.medicines?.length > 0 && (
                                  <span className="text-[11px] font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-brand-200">
                                    <Pill className="w-3 h-3 text-brand-600" /> {record.medicines.length} Prescriptions
                                  </span>
                                )}
                                {record.lab_results?.length > 0 && (
                                  <span className="text-[11px] font-bold bg-brand-50 text-brand-800 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-brand-200">
                                    <Activity className="w-3 h-3 text-brand-600" /> {record.lab_results.length} Lab Biomarkers
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition mt-1"
                            aria-label={isExpanded ? 'Collapse card' : 'Expand card'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1 border-t border-brand-100 space-y-5 text-xs">
                            {/* Chief Complaints & Diagnoses */}
                            {(record.chief_complaints?.length > 0 ||
                              record.diagnoses?.length > 0) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {record.chief_complaints?.length > 0 && (
                                  <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-200/70">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 block mb-1">
                                      Chief Complaints / Symptoms
                                    </span>
                                    <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                                      {record.chief_complaints.map((c, i) => (
                                        <li key={i}>{c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {record.diagnoses?.length > 0 && (
                                  <div className="p-3.5 rounded-2xl bg-sand-100/70 border border-sand-300">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-sand-800 block mb-1">
                                      Clinical Diagnoses / Impressions
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {record.diagnoses.map((d, i) => (
                                        <span
                                          key={i}
                                          className="text-[11px] font-bold bg-white text-sand-800 border border-sand-400 px-2 py-0.5 rounded-md shadow-2xs"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Clinical Notes & Advice */}
                            {record.clinical_notes && (
                              <div className="p-3.5 rounded-2xl bg-brand-50/60 border border-brand-200/70 text-slate-700 leading-relaxed">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 block mb-1">
                                  Doctor's Advice & Observations
                                </span>
                                {record.clinical_notes}
                              </div>
                            )}

                            {/* Prescriptions List */}
                            {record.medicines?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                                  <Pill className="w-3.5 h-3.5 text-brand-600" /> Prescribed Medications ({record.medicines.length})
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {record.medicines.map((med, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-2xl bg-brand-50/70 border border-brand-200 text-slate-800 space-y-1"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{med.name}</span>
                                        <span className="font-bold text-[10px] bg-brand-200/80 text-brand-900 px-2 py-0.5 rounded-md">
                                          {med.dosage}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600">
                                        Frequency: <strong className="text-brand-800">{med.frequency}</strong> • {med.timing || 'As advised'}
                                      </p>
                                      {med.purpose && (
                                        <p className="text-[10px] text-slate-500">For: {med.purpose}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Lab Biomarkers Results */}
                            {record.lab_results?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                                  <Activity className="w-3.5 h-3.5 text-brand-600" /> Laboratory Biomarkers ({record.lab_results.length})
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                  {record.lab_results.map((lab, idx) => {
                                    const isAbnormal =
                                      lab.flag === 'high' ||
                                      lab.flag === 'low' ||
                                      lab.flag === 'critical';
                                    return (
                                      <div
                                        key={idx}
                                        className={`p-2.5 rounded-2xl border ${
                                          isAbnormal
                                            ? 'bg-sand-100/90 border-sand-300 text-sand-950'
                                            : 'bg-brand-50/50 border-brand-200 text-slate-800'
                                        }`}
                                      >
                                        <span className="text-[10px] font-semibold text-slate-600 block truncate">
                                          {lab.test_name}
                                        </span>
                                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                                          {lab.value}{' '}
                                          <span className="text-[10px] font-normal text-slate-500">
                                            {lab.unit}
                                          </span>
                                        </p>
                                        <span
                                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded inline-block mt-1 ${
                                            isAbnormal
                                              ? 'bg-sand-300 text-sand-900'
                                              : 'bg-brand-200 text-brand-900'
                                          }`}
                                        >
                                          {lab.flag}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Card Footer */}
                            <div className="pt-3 border-t border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-500 text-[11px]">
                              {record.recommended_follow_up ? (
                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                                  <span>Follow-up: {record.recommended_follow_up}</span>
                                </div>
                              ) : (
                                <span />
                              )}

                              {record.document && (
                                <a
                                  href={getDocumentViewUrl(record.document)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-brand-700 hover:text-brand-800 font-bold"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>View Original File ({record.document.file_name})</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
