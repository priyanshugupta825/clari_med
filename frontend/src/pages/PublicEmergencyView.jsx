import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Heart,
  Phone,
  Pill,
  Clock,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  ExternalLink,
  Lock,
} from 'lucide-react';
import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const PublicEmergencyView = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmergencyData = async () => {
      setLoading(true);
      setError('');

      // 1. Try Backend API
      try {
        const res = await axios.get(`${apiBaseURL}/emergency/public/${token}`, { timeout: 10000 });
        if (res.data?.success) {
          setData(res.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Public emergency API fetch note:', err);
      }

      // 2. Try Token-Specific Local Storage Cache Fallback (for instant offline / client-side isolation)
      try {
        const cached = localStorage.getItem(`clarimed_token_${token}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.patient_name) {
            setData(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Token cache read note:', e);
      }

      // 3. Fallback error if token could not be verified
      setError(
        'Emergency QR Token has expired or is invalid. Please request a new QR scan from the patient.'
      );
      setLoading(false);
    };

    if (token) {
      fetchEmergencyData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-red-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-tight">Decryption & Verification...</h2>
        <p className="text-xs text-slate-400 mt-1">Retrieving verified emergency medical parameters</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-600 flex items-center justify-center text-red-500 mb-4">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-red-400">
          Emergency Token Expired / Invalid
        </h1>
        <p className="text-sm text-slate-300 max-w-md mt-2 leading-relaxed">
          {error}
        </p>
        <p className="text-xs text-slate-500 mt-6 font-mono">
          ABDM Emergency Protocol • Access Logged
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-500 selection:text-white p-3 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Emergency First Responder Banner */}
        <div className="bg-red-600 text-white rounded-2xl p-4 sm:p-5 shadow-2xl flex items-center justify-between border-2 border-red-500 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-base sm:text-lg tracking-wider uppercase">
                EMERGENCY MEDICAL CARD
              </h1>
              <p className="text-xs text-red-100 font-medium">
                Verified Patient Identity • First Responder Access
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-black/30 px-2.5 py-1 rounded-md uppercase tracking-widest">
            ACTIVE
          </span>
        </div>

        {/* Primary Identification & Blood Group Hero Card */}
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-7 border-2 border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400">
                PATIENT NAME
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                {data.patient_name}
              </h2>
              {data.abha_id && (
                <p className="text-xs text-brand-400 font-mono font-semibold mt-1">
                  ABHA: {data.abha_id}
                </p>
              )}
            </div>

            {/* Large High-Contrast Blood Type */}
            <div className="bg-red-950/90 border-2 border-red-600 rounded-2xl p-3 sm:p-4 text-center min-w-[90px] shadow-lg shadow-red-950/50">
              <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest block">
                BLOOD
              </span>
              <span className={`font-black text-white tracking-tighter block mt-0.5 ${data.blood_group ? 'text-3xl sm:text-4xl' : 'text-xs text-red-200'}`}>
                {data.blood_group || 'Not Set'}
              </span>
            </div>
          </div>

          {/* Critical Allergies Warning (High Priority) */}
          <div className="bg-red-950/40 border-2 border-red-500/70 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>CRITICAL ALLERGIES & DRUG CONTRAINDICATIONS</span>
            </div>
            {data.allergies?.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {data.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md"
                  >
                    ⚠️ {allergy}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No known drug allergies reported.</p>
            )}
          </div>

          {/* Chronic Conditions & Critical Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Chronic Medical Conditions</span>
              </div>
              {data.chronic_conditions?.length > 0 ? (
                <ul className="text-xs text-slate-200 font-medium space-y-1.5 list-disc list-inside">
                  {data.chronic_conditions.map((cond, idx) => (
                    <li key={idx}>{cond}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">None declared.</p>
              )}
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Critical Implant / Notes</span>
              </div>
              <p className="text-xs text-slate-200 font-medium leading-relaxed">
                {data.critical_notes || 'No implants or special alerts noted.'}
              </p>
              {data.organ_donor && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50">
                    PLEDGED ORGAN DONOR: YES
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Medications (Vital for Emergency Doctors & Drug Interactions) */}
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                <Pill className="w-4 h-4 text-emerald-400" />
                <span>Current Active Prescriptions</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {data.active_medicines?.length || 0} active
              </span>
            </div>

            {data.active_medicines?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.active_medicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-white text-xs">{med.name}</p>
                      <p className="text-[11px] text-slate-400">{med.frequency || 'Regular dose'}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {med.dosage}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No active chronic prescriptions logged.</p>
            )}
          </div>

          {/* One-Tap Emergency Contact Call Buttons */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Direct Emergency Contacts (Tap to Call)
            </span>
            {data.emergency_contacts?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.emergency_contacts.map((contact, idx) => (
                  <a
                    key={idx}
                    href={`tel:${contact.phone?.replace(/\s+/g, '')}`}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition active:scale-98"
                  >
                    <div>
                      <p className="font-black text-sm">{contact.name}</p>
                      <p className="text-xs text-emerald-100 font-medium">
                        {contact.relation} • {contact.phone}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
                      <Phone className="w-4 h-4" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No direct emergency contacts saved.</p>
            )}
          </div>
        </div>

        {/* Security & Protocol Notice */}
        <div className="text-center p-4 text-xs text-slate-500 space-y-1">
          <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-slate-400">
            <Lock className="w-3 text-emerald-500" />
            <span>ABDM Emergency QR Protocol • Time-Limited Token</span>
          </div>
          <p className="text-[10px] text-slate-600">
            Full clinical consultation history is restricted. Access is permanently logged in the patient's audit log.
          </p>
        </div>
      </div>
    </div>
  );
};
