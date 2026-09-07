import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Network,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2,
  DollarSign,
  Activity,
  CheckCircle2,
  Info,
  ArrowRight,
  Stethoscope,
} from 'lucide-react';
import { KnowledgeGraphView } from '../knowledge_graph/KnowledgeGraphView';

export const CDSAlertBanner = ({ cdsInsights, patientName = 'Patient' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [activeFootageAlertId, setActiveFootageAlertId] = useState(null);

  if (!cdsInsights || (cdsInsights.total_alerts === 0 && (!cdsInsights.alerts || cdsInsights.alerts.length === 0))) {
    return null;
  }

  const { alerts = [], duplicate_tests = [], ckd_lead_time_days, knowledge_graph } = cdsInsights;

  return (
    <>
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-red-50/90 via-amber-50/70 to-brand-50/50 border-2 border-red-200/80 shadow-lg shadow-red-500/5 overflow-hidden transition-all duration-300">
        {/* Top Notification Bar */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-100/80">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/25 flex-shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Multicenter Clinical Decision Support (CDS) Alert
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  JMIR 2024 Research Aligned
                </span>
                {ckd_lead_time_days && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    +{ckd_lead_time_days} Days Earlier Lead Time
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                AI Knowledge Graph synthesized fragmented visits across multiple clinics to detect overlooked chronic risks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {knowledge_graph && knowledge_graph.nodes && knowledge_graph.nodes.length > 0 && (
              <button
                type="button"
                onClick={() => setShowGraphModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Explore Knowledge Graph</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white/80 transition"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expandable Alert Body */}
        {isExpanded && (
          <div className="p-4 sm:p-6 space-y-4 bg-white/60 backdrop-blur-sm">
            {/* 1. Clinical Alerts List */}
            <div className="grid grid-cols-1 gap-4">
              {alerts.map((alert) => {
                const isFootageOpen = activeFootageAlertId === alert.id;
                const isCritical = alert.severity === 'critical' || alert.severity === 'high';

                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                      isCritical
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                              {alert.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                                isCritical
                                  ? 'bg-red-100 text-red-900 border-red-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {alert.severity} Risk
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                            {alert.summary}
                          </p>
                          <div className="mt-1 text-[11px] text-slate-500 font-medium">
                            Guideline: <span className="italic">{alert.guideline_source}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveFootageAlertId(isFootageOpen ? null : alert.id)}
                        className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-brand-400 text-xs font-bold text-slate-700 flex items-center gap-1 shadow-sm transition"
                      >
                        <Activity className="w-3.5 h-3.5 text-brand-600" />
                        <span>{isFootageOpen ? 'Hide Evidence Footage' : 'View Reasoning Footage'}</span>
                        {isFootageOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Reasoning Footage Step-by-Step Chain */}
                    {isFootageOpen && alert.reasoning_footage && alert.reasoning_footage.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                          <Stethoscope className="w-4 h-4 text-brand-600" />
                          <span>Explainable Cross-Hospital Evidence Trail (Reasoning Footage):</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {alert.reasoning_footage.map((node, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-extrabold text-brand-700 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {node.facility_name}
                                </span>
                                {node.record_date && (
                                  <span className="text-slate-400 font-medium">
                                    {node.record_date}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                                <span>{node.finding_type}</span>
                                {node.value && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                                    {node.value}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                {node.significance}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Clinical Recommendations */}
                        {alert.clinical_recommendations && alert.clinical_recommendations.length > 0 && (
                          <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 space-y-1.5">
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Actionable Clinical Next Steps:
                            </span>
                            <ul className="text-xs space-y-1 text-slate-300 list-disc list-inside">
                              {alert.clinical_recommendations.map((rec, rIdx) => (
                                <li key={rIdx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2. Duplicate Test Reduction Notices */}
            {duplicate_tests.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Duplicate Test Reduction & Cost Optimization Alert</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {duplicate_tests.map((dup, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-emerald-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{dup.test_name}</span>
                        <span className="text-emerald-700 font-extrabold">
                          Save ₹{dup.estimated_savings_inr}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {dup.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Knowledge Graph Modal */}
      {showGraphModal && (
        <KnowledgeGraphView
          data={knowledge_graph}
          patientName={patientName}
          onClose={() => setShowGraphModal(false)}
        />
      )}
    </>
  );
};
