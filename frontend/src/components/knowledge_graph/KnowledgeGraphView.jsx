import React, { useState, useMemo } from 'react';
import {
  Network,
  Activity,
  Hospital,
  Pill,
  FileText,
  AlertTriangle,
  User,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

const TYPE_COLORS = {
  patient: { bg: '#4f46e5', ring: '#818cf8', text: '#ffffff', label: 'Patient' },
  hospital: { bg: '#0284c7', ring: '#38bdf8', text: '#ffffff', label: 'Hospital / Clinic' },
  visit: { bg: '#8b5cf6', ring: '#c084fc', text: '#ffffff', label: 'Encounter / Visit' },
  lab_normal: { bg: '#059669', ring: '#34d399', text: '#ffffff', label: 'Normal Lab' },
  lab_abnormal: { bg: '#e11d48', ring: '#fb7185', text: '#ffffff', label: 'Abnormal Lab' },
  medicine: { bg: '#d97706', ring: '#fbbf24', text: '#ffffff', label: 'Medication' },
  diagnosis: { bg: '#0891b2', ring: '#22d3ee', text: '#ffffff', label: 'Clinical Finding' },
  risk_alert: { bg: '#dc2626', ring: '#f87171', text: '#ffffff', label: 'Inferred Risk Alert' },
};

export const KnowledgeGraphView = ({ data, patientName = 'Patient', onClose }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { nodes = [], links = [] } = data || {};

  // Calculate layout coordinates for SVG rendering
  const layout = useMemo(() => {
    const width = 850;
    const height = 650;
    const centerX = width / 2;
    const centerY = height / 2;

    const patientNode = nodes.find((n) => n.type === 'patient') || { id: 'p0', label: patientName, type: 'patient' };
    const hospitalNodes = nodes.filter((n) => n.type === 'hospital');
    const visitNodes = nodes.filter((n) => n.type === 'visit');
    const labNodes = nodes.filter((n) => n.type === 'lab_test');
    const medNodes = nodes.filter((n) => n.type === 'medicine');
    const diagNodes = nodes.filter((n) => n.type === 'diagnosis');
    const alertNodes = nodes.filter((n) => n.type === 'risk_alert');

    const positions = {};

    // Center patient
    positions[patientNode.id] = { x: centerX, y: centerY, node: patientNode, radius: 26 };

    // Ring 1: Hospitals & Visits (Radius 140)
    const ring1 = [...hospitalNodes, ...visitNodes];
    ring1.forEach((n, idx) => {
      const angle = (idx / (ring1.length || 1)) * 2 * Math.PI - Math.PI / 2;
      const r = 135;
      positions[n.id] = {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        node: n,
        radius: n.type === 'hospital' ? 22 : 18,
      };
    });

    // Ring 2: Labs, Meds, Diagnoses (Radius 240)
    const ring2 = [...labNodes, ...medNodes, ...diagNodes];
    ring2.forEach((n, idx) => {
      const angle = (idx / (ring2.length || 1)) * 2 * Math.PI;
      const r = 230 + (idx % 2 === 0 ? 15 : -15);
      positions[n.id] = {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        node: n,
        radius: 15,
      };
    });

    // Ring 3: Inferred Risk Alerts (Radius 310)
    alertNodes.forEach((n, idx) => {
      const angle = (idx / (alertNodes.length || 1)) * Math.PI + Math.PI / 4;
      const r = 310;
      positions[n.id] = {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        node: n,
        radius: 24,
      };
    });

    return { positions, width, height };
  }, [nodes, patientName]);

  const filteredPositions = useMemo(() => {
    if (activeFilter === 'all') return layout.positions;
    const res = {};
    Object.entries(layout.positions).forEach(([id, item]) => {
      if (item.node.type === 'patient' || item.node.type === activeFilter || item.node.group === activeFilter) {
        res[id] = item;
      }
    });
    return res;
  }, [layout.positions, activeFilter]);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-brand-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-brand-100 flex items-center justify-between bg-gradient-to-r from-brand-50/80 via-white to-sand-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-600/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Multicenter EHR Knowledge Graph & Clinical Reasoning
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  JMIR 2024 Research Aligned
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visualizing cross-hospital entity linking (Patient &rarr; Hospitals &rarr; Visits &rarr; Labs/Rx &rarr; Inferred Risks)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.6))}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-5 py-2.5 bg-slate-50/70 border-b border-brand-100/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 mr-1">Filter Nodes:</span>
            {[
              { key: 'all', label: 'All Entities' },
              { key: 'hospital', label: 'Hospitals / Clinics' },
              { key: 'visit', label: 'Encounters' },
              { key: 'lab_test', label: 'Lab Biomarkers' },
              { key: 'medicine', label: 'Medications' },
              { key: 'risk_alert', label: '⚠️ Inferred Risk Alerts' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1 rounded-xl font-bold transition ${
                  activeFilter === f.key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-3">
            <span><strong>{nodes.length}</strong> Nodes</span>
            <span>&bull;</span>
            <span><strong>{links.length}</strong> Semantic Triples</span>
          </div>
        </div>

        {/* Canvas & Detail Split */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* SVG Graph Canvas */}
          <div
            className="flex-1 bg-slate-900/95 overflow-hidden cursor-grab active:cursor-grabbing relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Grid Pattern Background */}
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              <defs>
                <pattern id="kg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
                {/* Arrow markers */}
                <marker id="kg-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker id="kg-arrow-alert" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" />
                </marker>
              </defs>

              <rect width={layout.width} height={layout.height} fill="url(#kg-grid)" />

              {/* Render Links */}
              <g className="links">
                {links.map((link, idx) => {
                  const sourcePos = filteredPositions[link.source] || layout.positions[link.source];
                  const targetPos = filteredPositions[link.target] || layout.positions[link.target];
                  if (!sourcePos || !targetPos) return null;

                  const isAlertLink = link.relation === 'INFERRED_RISK' || link.relation === 'SUPPORTS_EVIDENCE';

                  return (
                    <g key={`link-${idx}`}>
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke={isAlertLink ? '#f87171' : '#475569'}
                        strokeWidth={isAlertLink ? 2 : 1.2}
                        strokeDasharray={isAlertLink ? '4 3' : undefined}
                        opacity={0.7}
                        markerEnd={isAlertLink ? 'url(#kg-arrow-alert)' : 'url(#kg-arrow)'}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Render Nodes */}
              <g className="nodes">
                {Object.entries(filteredPositions).map(([id, item]) => {
                  const { x, y, node, radius } = item;
                  const colors = TYPE_COLORS[node.group] || TYPE_COLORS[node.type] || TYPE_COLORS.visit;
                  const isSelected = selectedNode?.id === node.id;
                  const isAlert = node.type === 'risk_alert';

                  return (
                    <g
                      key={id}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                    >
                      {/* Outer pulse for alerts */}
                      {isAlert && (
                        <circle
                          r={radius + 8}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2"
                          opacity="0.6"
                          className="animate-ping origin-center"
                        />
                      )}

                      {/* Selection Ring */}
                      <circle
                        r={radius + (isSelected ? 6 : 2)}
                        fill="none"
                        stroke={isSelected ? '#ffffff' : colors.ring}
                        strokeWidth={isSelected ? 3 : 1.5}
                        opacity={isSelected ? 1 : 0.4}
                      />

                      {/* Main Node Circle */}
                      <circle
                        r={radius}
                        fill={colors.bg}
                        className="transition duration-200 group-hover:brightness-125"
                      />

                      {/* Node Label text */}
                      <text
                        textAnchor="middle"
                        dy={radius + 14}
                        fill="#e2e8f0"
                        fontSize="10"
                        fontWeight="600"
                        className="pointer-events-none drop-shadow-md select-none"
                      >
                        {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Floating Legend */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700/60 rounded-2xl p-3 text-[11px] text-slate-300 backdrop-blur-md shadow-xl flex flex-wrap gap-x-4 gap-y-1.5 max-w-lg">
              {Object.entries(TYPE_COLORS).map(([type, c]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.bg }} />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side Inspector Panel */}
          {selectedNode ? (
            <div className="w-80 bg-white border-l border-brand-100 p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-brand-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                    Node Details
                  </span>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedNode.label}</h4>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {selectedNode.type.replace('_', ' ')}
                  </span>
                </div>

                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-brand-100 text-xs">
                    <span className="font-bold text-slate-700">Properties:</span>
                    {Object.entries(selectedNode.properties).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-slate-600 py-0.5 border-b border-slate-200/50 last:border-none">
                        <span className="text-slate-400 capitalize">{k.replace('_', ' ')}:</span>
                        <span className="font-semibold text-slate-900 text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedNode.type === 'risk_alert' && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-2xl text-xs text-red-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>Multicenter Decision Support</span>
                    </div>
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      Inferred via cross-center KDIGO/ACC clinical rules using fragmented lab biomarkers and encounters across hospitals.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-brand-100 text-[11px] text-slate-400 text-center">
                Click other nodes in the graph to inspect relationships
              </div>
            </div>
          ) : (
            <div className="w-72 bg-white/60 border-l border-brand-100 p-5 hidden lg:flex flex-col items-center justify-center text-center text-xs text-slate-400">
              <Info className="w-8 h-8 text-brand-300 mb-2" />
              <p className="font-medium text-slate-600">Select any node in the graph</p>
              <p className="text-[11px] mt-1 text-slate-400">
                Inspect multi-center encounters, laboratory biomarkers, or inferred risk alert evidence trails.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
