import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, RotateCcw, SkipForward, ChevronRight } from 'lucide-react';

// ─── Graph Definition ────────────────────────────────────────────────────────
// A completely isolated example graph — NOT connected to any backend scenario.
// 8 nodes: Patient (P), 5 intersections (A-E), 2 hospitals (H1, H2)
// All nodes connected, weights represent minutes of travel time.

const NODES = [
  { id: 'P',  label: 'Patient',      type: 'patient',  x: 120,  y: 280 },
  { id: 'A',  label: 'Junction A',   type: 'road',     x: 260,  y: 160 },
  { id: 'B',  label: 'Junction B',   type: 'road',     x: 260,  y: 400 },
  { id: 'C',  label: 'Junction C',   type: 'road',     x: 420,  y: 100 },
  { id: 'D',  label: 'Junction D',   type: 'road',     x: 420,  y: 280 },
  { id: 'E',  label: 'Junction E',   type: 'road',     x: 420,  y: 460 },
  { id: 'H1', label: 'Hospital 1',   type: 'hospital', x: 580,  y: 160 },
  { id: 'H2', label: 'Hospital 2',   type: 'hospital', x: 580,  y: 380 },
];

const EDGES = [
  { from: 'P',  to: 'A',  w: 4 },
  { from: 'P',  to: 'B',  w: 2 },
  { from: 'P',  to: 'D',  w: 7 },
  { from: 'A',  to: 'C',  w: 3 },
  { from: 'A',  to: 'D',  w: 5 },
  { from: 'A',  to: 'B',  w: 1 },
  { from: 'B',  to: 'D',  w: 3 },
  { from: 'B',  to: 'E',  w: 6 },
  { from: 'C',  to: 'H1', w: 2 },
  { from: 'C',  to: 'D',  w: 4 },
  { from: 'D',  to: 'H1', w: 5 },
  { from: 'D',  to: 'H2', w: 3 },
  { from: 'E',  to: 'H2', w: 4 },
  { from: 'H1', to: 'H2', w: 6 },
];

const TARGET = 'H1'; // Shortest path destination

// Per-edge curve offsets (perpendicular pixel offset from the midpoint).
// Positive = bow downward/right, negative = bow upward/left.
// Only edges that visually overlap need an entry here.
const EDGE_CURVES = {
  'P-D': 90,   // P(120,280) → D(420,280) is perfectly horizontal — bow it down hard
  'A-D': -30,  // slight bow so it doesn't blend with B-D crossing
};

// ─── Dijkstra (runs entirely in the browser, no backend) ─────────────────────
function runDijkstra() {
  const START = 'P';
  const dist = {};
  const prev = {};
  const visited = new Set();
  const steps = [];

  NODES.forEach(n => { dist[n.id] = Infinity; prev[n.id] = null; });
  dist[START] = 0;

  const adj = {};
  NODES.forEach(n => { adj[n.id] = []; });
  EDGES.forEach(e => {
    adj[e.from].push({ to: e.to, w: e.w });
    adj[e.to].push({ to: e.from, w: e.w });
  });

  const unvisited = new Set(NODES.map(n => n.id));

  while (unvisited.size > 0) {
    // Pick minimum-distance unvisited node
    let curr = null;
    for (const id of unvisited) {
      if (curr === null || dist[id] < dist[curr]) curr = id;
    }
    if (dist[curr] === Infinity) break;

    unvisited.delete(curr);
    visited.add(curr);

    const neighbors = adj[curr].filter(e => !visited.has(e.to));

    steps.push({
      current: curr,
      dist: { ...dist },
      visited: new Set(visited),
      relaxing: neighbors.map(e => e.to),
      updated: [],
    });

    const lastStep = steps[steps.length - 1];
    for (const edge of neighbors) {
      const newDist = dist[curr] + edge.w;
      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist;
        prev[edge.to] = curr;
        lastStep.updated.push(edge.to);
        lastStep.dist = { ...dist }; // capture updated snapshot
      }
    }

    if (curr === TARGET) break;
  }

  // Reconstruct shortest path
  const path = [];
  let u = TARGET;
  while (u !== null) { path.unshift(u); u = prev[u]; }

  return { steps, path, finalDist: dist[TARGET] };
}

const { steps: STEPS, path: SHORTEST_PATH, finalDist: FINAL_DIST } = runDijkstra();

// ─── Color helpers ────────────────────────────────────────────────────────────
function nodeColor(id, step, showFinalPath) {
  if (showFinalPath && SHORTEST_PATH.includes(id)) return '#10b981'; // emerald
  if (!step) return '#1e293b';
  if (step.current === id) return '#f59e0b';               // amber = current
  if (step.visited.has(id)) return '#3b82f6';             // blue = visited
  if (step.relaxing.includes(id)) return '#8b5cf6';       // violet = being relaxed
  return '#1e293b';                                         // dark = unvisited
}

function nodeStroke(id, step, showFinalPath) {
  if (showFinalPath && SHORTEST_PATH.includes(id)) return '#34d399';
  if (!step) {
    const n = NODES.find(n => n.id === id);
    if (n.type === 'patient') return '#ef4444';
    if (n.type === 'hospital') return '#22d3ee';
    return '#334155';
  }
  if (step.current === id) return '#fbbf24';
  if (step.visited.has(id)) return '#60a5fa';
  return '#334155';
}

function edgeColor(from, to, step, showFinalPath) {
  const inPath = showFinalPath && SHORTEST_PATH.includes(from) && SHORTEST_PATH.includes(to) &&
    Math.abs(SHORTEST_PATH.indexOf(from) - SHORTEST_PATH.indexOf(to)) === 1;
  if (inPath) return '#10b981';

  if (!step) return '#1e3a5f';
  const isRelaxed = step.current === from && step.relaxing.includes(to)
    || step.current === to && step.relaxing.includes(from);
  if (isRelaxed) return '#7c3aed';
  const bothVisited = step.visited.has(from) && step.visited.has(to);
  if (bothVisited) return '#2563eb';
  return '#1e3a5f';
}

function edgeWidth(from, to, step, showFinalPath) {
  const inPath = showFinalPath && SHORTEST_PATH.includes(from) && SHORTEST_PATH.includes(to) &&
    Math.abs(SHORTEST_PATH.indexOf(from) - SHORTEST_PATH.indexOf(to)) === 1;
  if (inPath) return 4;
  if (!step) return 1.5;
  const isRelaxed = step.current === from && step.relaxing.includes(to)
    || step.current === to && step.relaxing.includes(from);
  return isRelaxed ? 3 : 1.5;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DijkstraIllustration({ onClose }) {
  const [stepIdx, setStepIdx] = useState(-1); // -1 = initial state
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFinalPath, setShowFinalPath] = useState(false);
  const intervalRef = useRef(null);

  const currentStep = stepIdx >= 0 && stepIdx < STEPS.length ? STEPS[stepIdx] : null;
  const isDone = stepIdx >= STEPS.length - 1;

  const advance = useCallback(() => {
    setStepIdx(prev => {
      const next = prev + 1;
      if (next >= STEPS.length) {
        setIsPlaying(false);
        setShowFinalPath(true);
        return STEPS.length - 1;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(advance, 1100);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, advance]);

  const handlePlay = () => {
    if (isDone) return;
    setIsPlaying(p => !p);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIdx(-1);
    setShowFinalPath(false);
  };

  const handleStep = () => {
    if (isDone) return;
    setIsPlaying(false);
    advance();
    if (stepIdx + 1 >= STEPS.length - 1) setShowFinalPath(true);
  };

  const nodeById = id => NODES.find(n => n.id === id);

  const stepLabel = () => {
    if (showFinalPath && isDone) return `✅ Done! Shortest path: ${SHORTEST_PATH.join(' → ')} = ${FINAL_DIST} min`;
    if (!currentStep) return 'Press Play or Step to begin the algorithm';
    const phase = currentStep.current === 'P' ? 'Starting at Patient'
      : currentStep.current === TARGET ? `Reached ${TARGET}!`
      : `Visiting ${currentStep.current}`;
    return `Step ${stepIdx + 1}/${STEPS.length} — ${phase}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        className="relative bg-[#0d1117] border border-[#21262d] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] bg-[#0d1117]">
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Dijkstra's Algorithm — Illustrated</h2>
            <p className="text-[#8b949e] text-xs mt-0.5">Finding the shortest path from <span className="text-red-400 font-semibold">Patient</span> to <span className="text-cyan-400 font-semibold">Hospital 1</span> · Edge weights = travel time (minutes)</p>
          </div>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white p-1.5 rounded-lg hover:bg-[#21262d] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-auto">

          {/* SVG Graph */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-[340px]">
            <svg viewBox="0 60 710 480" className="w-full max-w-[680px]" style={{ filter: 'drop-shadow(0 0 24px rgba(0,0,0,0.6))' }}>
              {/* Edges */}
              {EDGES.map((edge, i) => {
                const fn = nodeById(edge.from);
                const tn = nodeById(edge.to);
                const col = edgeColor(edge.from, edge.to, currentStep, showFinalPath);
                const wid = edgeWidth(edge.from, edge.to, currentStep, showFinalPath);
                const inFinalPath = showFinalPath && SHORTEST_PATH.includes(edge.from) && SHORTEST_PATH.includes(edge.to) &&
                  Math.abs(SHORTEST_PATH.indexOf(edge.from) - SHORTEST_PATH.indexOf(edge.to)) === 1;

                // Curve offset: perpendicular displacement from the straight midpoint.
                const curveKey1 = `${edge.from}-${edge.to}`;
                const curveKey2 = `${edge.to}-${edge.from}`;
                const offset = EDGE_CURVES[curveKey1] ?? EDGE_CURVES[curveKey2] ?? 0;

                // Compute bezier control point (perpendicular to edge direction)
                const dx = tn.x - fn.x;
                const dy = tn.y - fn.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                // Perpendicular unit vector (rotated 90°)
                const px = -dy / len;
                const py =  dx / len;
                const mx = (fn.x + tn.x) / 2 + px * offset;
                const my = (fn.y + tn.y) / 2 + py * offset;
                // Label sits at the bezier curve midpoint (t=0.5 for quadratic)
                const lx = 0.25 * fn.x + 0.5 * mx + 0.25 * tn.x;
                const ly = 0.25 * fn.y + 0.5 * my + 0.25 * tn.y;

                const pathD = `M ${fn.x} ${fn.y} Q ${mx} ${my} ${tn.x} ${tn.y}`;

                return (
                  <g key={i}>
                    <path
                      d={pathD}
                      stroke={col} strokeWidth={wid} fill="none"
                      strokeLinecap="round"
                      strokeDasharray={inFinalPath ? '8 4' : 'none'}
                      style={{ transition: 'stroke 0.4s, stroke-width 0.3s' }}
                    />
                    {/* Weight label — positioned at actual curve midpoint */}
                    <rect x={lx - 13} y={ly - 10} width={26} height={18} rx={4}
                      fill="#0d1117" stroke={col} strokeWidth={1}
                      style={{ transition: 'stroke 0.4s' }}
                    />
                    <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11}
                      fill={col} fontFamily="monospace" fontWeight="bold"
                      style={{ transition: 'fill 0.4s' }}
                    >
                      {edge.w}m
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {NODES.map(node => {
                const fill = nodeColor(node.id, currentStep, showFinalPath);
                const stroke = nodeStroke(node.id, currentStep, showFinalPath);
                const isActive = currentStep && currentStep.current === node.id;
                const inFinalPath = showFinalPath && SHORTEST_PATH.includes(node.id);
                const dist = currentStep ? currentStep.dist[node.id] : null;
                const icon = node.type === 'patient' ? '🚨' : node.type === 'hospital' ? '🏥' : '';
                return (
                  <g key={node.id} style={{ transition: 'all 0.3s' }}>
                    {/* Glow ring for active/final */}
                    {(isActive || inFinalPath) && (
                      <circle cx={node.x} cy={node.y} r={30}
                        fill="none" stroke={isActive ? '#f59e0b' : '#10b981'}
                        strokeWidth={2} opacity={0.35}
                        style={{ animation: 'dijkPulse 1s ease-in-out infinite alternate' }}
                      />
                    )}
                    <circle cx={node.x} cy={node.y} r={22}
                      fill={fill} stroke={stroke} strokeWidth={2.5}
                      style={{ transition: 'fill 0.4s, stroke 0.4s' }}
                    />
                    {/* Node ID */}
                    <text x={node.x} y={node.y + 5} textAnchor="middle"
                      fontSize={node.type === 'road' ? 13 : 11}
                      fill="white" fontWeight="bold" fontFamily="monospace"
                    >
                      {icon || node.id}
                    </text>
                    {/* Label below */}
                    <text x={node.x} y={node.y + 40} textAnchor="middle"
                      fontSize={10} fill="#8b949e" fontFamily="sans-serif"
                    >
                      {node.label}
                    </text>
                    {/* Distance badge */}
                    {dist !== null && dist !== Infinity && (
                      <text x={node.x} y={node.y - 30} textAnchor="middle"
                        fontSize={11} fill="#fbbf24" fontWeight="bold" fontFamily="monospace"
                      >
                        {dist}m
                      </text>
                    )}
                    {dist === Infinity && stepIdx >= 0 && (
                      <text x={node.x} y={node.y - 30} textAnchor="middle"
                        fontSize={11} fill="#374151" fontFamily="monospace"
                      >
                        ∞
                      </text>
                    )}
                  </g>
                );
              })}

              <style>{`
                @keyframes dijkPulse {
                  from { r: 28; opacity: 0.3; }
                  to   { r: 34; opacity: 0.6; }
                }
              `}</style>
            </svg>
          </div>

          {/* Side Panel */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-[#21262d] flex flex-col bg-[#0d1117]">

            {/* Legend */}
            <div className="px-4 pt-4 pb-3 border-b border-[#21262d]">
              <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest mb-2">Legend</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { col: '#f59e0b', label: 'Current node being processed' },
                  { col: '#8b5cf6', label: 'Neighbors being relaxed' },
                  { col: '#3b82f6', label: 'Already visited' },
                  { col: '#1e293b', label: 'Unvisited (∞ cost)' },
                  { col: '#10b981', label: 'Final shortest path' },
                ].map(({ col, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10" style={{ background: col }} />
                    <span className="text-[#8b949e] leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distance Table */}
            <div className="px-4 py-3 flex-1 overflow-y-auto">
              <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-widest mb-2">Distance Table</p>
              <div className="space-y-1">
                {NODES.map(node => {
                  const d = currentStep ? currentStep.dist[node.id] : null;
                  const inPath = showFinalPath && SHORTEST_PATH.includes(node.id);
                  return (
                    <div key={node.id}
                      className="flex items-center justify-between px-2 py-1 rounded text-xs"
                      style={{ background: inPath ? 'rgba(16,185,129,0.1)' : currentStep?.current === node.id ? 'rgba(245,158,11,0.1)' : 'transparent' }}
                    >
                      <span className="font-mono font-bold" style={{ color: inPath ? '#10b981' : currentStep?.current === node.id ? '#fbbf24' : '#8b949e' }}>
                        {node.id}
                      </span>
                      <span className="font-mono" style={{ color: d === null ? '#374151' : d === Infinity ? '#374151' : '#e2e8f0' }}>
                        {d === null ? '—' : d === Infinity ? '∞' : `${d} min`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="border-t border-[#21262d] px-6 py-4 bg-[#0d1117]">
          {/* Status */}
          <p className="text-xs text-center mb-3 font-mono" style={{ color: showFinalPath && isDone ? '#10b981' : '#fbbf24' }}>
            {stepLabel()}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] transition-all border border-[#30363d]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>

            <button
              onClick={handleStep}
              disabled={isDone}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#161b22] hover:bg-[#21262d] text-violet-400 border border-violet-800 transition-all disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" /> Step
            </button>

            <button
              onClick={handlePlay}
              disabled={isDone}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
              style={{ background: isPlaying ? '#374151' : '#f59e0b', color: isPlaying ? '#d1d5db' : '#000' }}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isPlaying ? 'Pause' : isDone ? 'Done' : 'Play'}
            </button>

            <button
              onClick={() => { setStepIdx(STEPS.length - 1); setIsPlaying(false); setShowFinalPath(true); }}
              disabled={isDone}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#161b22] hover:bg-[#21262d] text-cyan-400 border border-cyan-900 transition-all disabled:opacity-40"
            >
              <SkipForward className="h-3.5 w-3.5" /> Skip to End
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
