import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Pill,
  Activity,
  Hospital,
  User,
  Calendar,
  Check,
  Edit3,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  Trash2,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import apiClient from '../api/client';
import { getDocumentViewUrl } from '../lib/documentUrl';

export const Upload = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docTypeHint, setDocTypeHint] = useState('prescription');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Post-extraction review state
  const [extractionResult, setExtractionResult] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Vault Gallery state
  const [vaultDocuments, setVaultDocuments] = useState([]);
  const [loadingVault, setLoadingVault] = useState(true);

  const fetchVaultDocuments = async () => {
    setLoadingVault(true);
    try {
      const res = await apiClient.get('/documents/');
      if (Array.isArray(res.data)) {
        setVaultDocuments(res.data);
      }
    } catch (err) {
      console.warn('Vault fetch note:', err);
    } finally {
      setLoadingVault(false);
    }
  };

  useEffect(() => {
    fetchVaultDocuments();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type_hint', docTypeHint);

    try {
      const response = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        setUploadedDoc(response.data.document);
        setExtractionResult(response.data.extraction);
        fetchVaultDocuments(); // refresh list
      } else {
        throw new Error(response.data?.message || 'Failed to extract medical data.');
      }
    } catch (err) {
      console.error('Upload & extraction error:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to upload and parse document. Please check the file and try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndNavigate = async (targetPath = '/timeline') => {
    if (uploadedDoc) {
      setIsConfirming(true);
      try {
        await apiClient.post(`/documents/${uploadedDoc.id}/confirm`, {
          title: uploadedDoc.title || selectedFile?.name,
          document_type: extractionResult?.encounter?.record_type || docTypeHint,
          encounter: extractionResult?.encounter,
          medicines: extractionResult?.medicines,
          lab_results: extractionResult?.lab_results,
        });
      } catch (err) {
        console.warn('Confirm note:', err);
      } finally {
        setIsConfirming(false);
      }
    }
    navigate(targetPath);
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await apiClient.delete(`/documents/${docId}`);
      fetchVaultDocuments();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setExtractionResult(null);
    setUploadedDoc(null);
    setIsConfirmed(false);
    setError('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold mb-2 border border-brand-200/80">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Multimodal Gemini AI Parser
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-950">Health Vault — Medical Document Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Upload any prescription, diagnostic lab report, discharge summary, or OPD slip. Gemini AI auto-extracts structured clinical entities, medicines, and biomarkers directly into your health record.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* State 1: Upload Form */}
      {!extractionResult && (
        <div className="bg-white rounded-3xl border border-brand-100 p-6 sm:p-8 shadow-2xs space-y-6">
          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-brand-900 uppercase tracking-wider mb-2">
                Document Category Hint
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'prescription', label: 'Prescription (Rx)' },
                  { id: 'lab_report', label: 'Lab Report' },
                  { id: 'discharge_summary', label: 'Discharge Summary' },
                  { id: 'consultation', label: 'OPD Consultation' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setDocTypeHint(type.id)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition text-center ${
                      docTypeHint === type.id
                        ? 'bg-brand-100 border-brand-600 text-brand-900 ring-2 ring-brand-500/20 shadow-2xs'
                        : 'bg-white border-brand-100 text-slate-600 hover:bg-brand-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-brand-600 bg-brand-100/50'
                  : 'border-brand-200 hover:border-brand-400 bg-brand-50/40'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="w-14 h-14 bg-white rounded-2xl border border-brand-200 shadow-sm flex items-center justify-center text-brand-600 mx-auto mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="font-bold text-brand-950 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-brand-700 mt-0.5 font-medium">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for AI extraction
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-brand-950">
                      Click to choose or drag & drop medical document
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF, PNG, JPG, JPEG medical records up to 10MB
                    </p>
                  </div>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing with Gemini AI Intelligence...</span>
                </>
              ) : (
                <>
                  <span>Upload & Auto-Extract Structured Data</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* State 2: Patient Review & Confirmation Screen */}
      {extractionResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-brand-100 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-brand-800 uppercase tracking-wider bg-brand-100 px-2.5 py-0.5 rounded-lg border border-brand-200">
                  AI Extraction Success
                </span>
                <h2 className="text-xl font-bold text-brand-950 mt-1.5">
                  Extracted Medical Entities & Clinical Insights
                </h2>
                <p className="text-xs text-slate-500">
                  Document has been uploaded and structured. Choose where you want to view it:
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 bg-brand-100 text-brand-900 border border-brand-200 rounded-xl w-fit">
                Confidence: {(extractionResult.encounter.confidence_score * 100).toFixed(0)}%
              </span>
            </div>

            {/* AI Summary */}
            {extractionResult.encounter.summary && (
              <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200 text-xs text-brand-950 leading-relaxed">
                <span className="font-bold block mb-1 flex items-center gap-1.5 text-brand-800">
                  <Sparkles className="w-4 h-4 text-brand-600" /> AI Clinical Summary
                </span>
                {extractionResult.encounter.summary}
              </div>
            )}

            {/* Encounter Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-100">
                <span className="text-brand-600 font-bold block uppercase text-[10px]">Doctor / Specialist</span>
                <p className="font-bold text-brand-950 mt-0.5">
                  {extractionResult.encounter.doctor_name || 'Medical Specialist'}
                </p>
                <p className="text-slate-500">{extractionResult.encounter.doctor_specialty || 'General Practitioner'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-100">
                <span className="text-brand-600 font-bold block uppercase text-[10px]">Facility / Clinic</span>
                <p className="font-bold text-brand-950 mt-0.5">
                  {extractionResult.encounter.facility_name || 'Healthcare Facility'}
                </p>
                <p className="text-slate-500">{extractionResult.encounter.record_type}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-50/50 border border-brand-100">
                <span className="text-brand-600 font-bold block uppercase text-[10px]">Encounter Date</span>
                <p className="font-bold text-brand-950 mt-0.5">
                  {extractionResult.encounter.record_date || 'Recent'}
                </p>
                <p className="text-slate-500">{extractionResult.encounter.recommended_follow_up || 'Follow-up as advised'}</p>
              </div>
            </div>

            {/* Extracted Diagnoses / Symptoms */}
            {(extractionResult.encounter.diagnoses?.length > 0 || extractionResult.encounter.chief_complaints?.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                  Diagnoses & Reported Symptoms
                </h3>
                <div className="flex flex-wrap gap-2">
                  {extractionResult.encounter.diagnoses?.map((diag, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl bg-sand-100 text-sand-800 border border-sand-300 text-xs font-bold">
                      {diag}
                    </span>
                  ))}
                  {extractionResult.encounter.chief_complaints?.map((sym, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl bg-brand-50 text-brand-800 border border-brand-200 text-xs font-medium">
                      Symptom: {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Medicines */}
            {extractionResult.medicines?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-2">
                  <Pill className="w-4 h-4 text-brand-600" /> Extracted Prescriptions ({extractionResult.medicines.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extractionResult.medicines.map((med, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-brand-50/70 border border-brand-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-950">{med.name}</span>
                        <span className="font-bold text-brand-900 bg-brand-200 px-2 py-0.5 rounded-md text-[10px]">
                          {med.dosage}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">Frequency: <strong className="text-brand-800">{med.frequency}</strong> • {med.timing || 'As advised'}</p>
                      {med.purpose && <p className="text-slate-500 text-[11px]">Purpose: {med.purpose}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Lab Values */}
            {extractionResult.lab_results?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-600" /> Extracted Lab Biomarkers ({extractionResult.lab_results.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {extractionResult.lab_results.map((lab, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border text-xs ${
                        lab.flag === 'high' || lab.flag === 'critical'
                          ? 'bg-sand-100 border-sand-300'
                          : 'bg-brand-50 border-brand-200'
                      }`}
                    >
                      <p className="font-semibold text-slate-700 truncate text-[11px]">{lab.test_name}</p>
                      <p className="font-bold text-sm text-slate-900 mt-1">
                        {lab.value} <span className="text-[11px] font-normal text-slate-500">{lab.unit}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Ref: {lab.reference_range || 'Standard'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation / Next Actions */}
            <div className="pt-4 border-t border-brand-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleConfirmAndNavigate('/timeline')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>View in Health Timeline →</span>
              </button>
              
              {extractionResult.medicines?.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleConfirmAndNavigate('/medicines')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs sm:text-sm shadow-sm transition cursor-pointer"
                >
                  <Pill className="w-4 h-4" />
                  <span>View in Medicine Manager →</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetUpload}
                className="px-4 py-3 rounded-2xl border border-brand-200 text-brand-800 text-xs sm:text-sm font-semibold hover:bg-brand-50"
              >
                Upload Another Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Vault Documents Gallery */}
      <div className="bg-white rounded-3xl border border-brand-100 p-6 sm:p-8 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-brand-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-950 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-brand-600" />
              <span>Stored Vault Documents</span>
            </h2>
            <p className="text-xs text-slate-500">
              All files stored securely and linked with ABDM digital health records
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-brand-100 text-brand-800 rounded-xl border border-brand-200">
            {vaultDocuments.length} Documents Stored
          </span>
        </div>

        {loadingVault && (
          <div className="text-center py-8 space-y-2">
            <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Loading documents from Health Vault...</p>
          </div>
        )}

        {!loadingVault && vaultDocuments.length === 0 && (
          <div className="text-center py-10 px-4 bg-brand-50/30 rounded-2xl border border-brand-100 space-y-2">
            <FileText className="w-8 h-8 text-brand-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No documents in your vault yet</p>
            <p className="text-[11px] text-slate-400">
              Upload your first prescription or report above to store and analyze it.
            </p>
          </div>
        )}

        {!loadingVault && vaultDocuments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaultDocuments.map((doc) => {
              const formattedDate = doc.uploaded_at
                ? format(parseISO(doc.uploaded_at), 'dd MMM yyyy, HH:mm')
                : 'Recent';

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200/70 hover:border-brand-300 transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-white border border-brand-200 text-brand-700 shadow-2xs mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 truncate max-w-[200px]">
                          {doc.title || doc.file_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {formattedDate} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                        </p>
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-100 text-brand-800 border border-brand-200 mt-1.5">
                          {doc.document_type}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {doc.ai_summary && (
                    <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-brand-100 line-clamp-2">
                      {doc.ai_summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-brand-100/60 text-xs">
                    <a
                      href={getDocumentViewUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-900"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View File</span>
                    </a>
                    <button
                      onClick={() => navigate('/timeline')}
                      className="font-bold text-brand-800 hover:text-brand-950 flex items-center gap-1"
                    >
                      <span>Timeline</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
