import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { HeartPulse, Navigation, Play, RotateCcw, Route, Truck } from 'lucide-react';

function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);

  return null;
}

const edgeKey = (from, to) => [from, to].sort().join('__');

const formatWeight = (value) => {
  if (!Number.isFinite(value)) return '--';
  return Math.round(value * 10) / 10;
};

const createNodeIcon = (type, { isOnPath = false, isVisited = false, isCurrent = false, isFrontier = false } = {}) => {
  let bg = '#27272a';
  let border = 'rgba(255,255,255,0.15)';
  let size = 10;
  let svgContent = '';
  const classes = [];

  if (type === 'Ambulance') {
    bg = '#0ea5e9';
    border = '#ffffff';
    size = 26;
    svgContent = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 22l10-6 10 6L12 2z"/></svg>`;
  } else if (type === 'Patient') {
    bg = '#ef4444';
    border = '#ffffff';
    size = 26;
    classes.push('pulse-marker');
    svgContent = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v10M7 12h10"/></svg>`;
  } else if (type === 'Hospital') {
    bg = '#10b981';
    border = '#ffffff';
    size = 26;
    svgContent = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>`;
  } else if (type === 'Intersection') {
    if (isOnPath) {
      bg = '#0ea5e9';
      border = 'rgba(14,165,233,0.65)';
      size = 12;
    } else if (isVisited) {
      bg = '#71717a';
      border = 'rgba(228,228,231,0.45)';
      size = 12;
    }
  }

  if (isFrontier) {
    border = '#f59e0b';
    size = Math.max(size, 14);
  }

  if (isCurrent) {
    bg = '#f59e0b';
    border = '#ffffff';
    size = Math.max(size, 18);
    classes.push('dijkstra-current-marker');
  }

  return L.divIcon({
    html: `<div class="${classes.join(' ')}" style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;
      background:${bg};border:2px solid ${border};border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);transition:all 0.3s ease;
    ">${svgContent}</div>`,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const ambulanceCarIcon = L.divIcon({
  html: `<div style="
    display:flex;align-items:center;justify-content:center;
    width:28px;height:28px;background:#0ea5e9;
    border:2px solid #fff;border-radius:50%;
    box-shadow:0 0 14px rgba(14,165,233,0.7),0 0 4px rgba(14,165,233,0.5);
  "><svg viewBox="0 0 24 24" width="14" height="14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="14" height="12" rx="2"/>
    <polygon points="16 6 22 10 22 16 16 16"/>
    <circle cx="6" cy="18" r="2" fill="#000"/>
    <circle cx="16" cy="18" r="2" fill="#000"/>
  </svg></div>`,
  className: 'custom-ambulance-car',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function getProgressAlongPath(coords, progress) {
  if (coords.length < 2) return { trail: coords, head: coords[0] || null };

  const segLens = [];
  let totalLen = 0;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    totalLen += len;
  }

  const targetDist = progress * totalLen;
  let accumulated = 0;
  const trail = [coords[0]];

  for (let i = 0; i < segLens.length; i += 1) {
    if (accumulated + segLens[i] >= targetDist) {
      const remaining = targetDist - accumulated;
      const t = segLens[i] > 0 ? remaining / segLens[i] : 0;
      const head = lerp(coords[i], coords[i + 1], t);
      trail.push(head);
      return { trail, head };
    }
    accumulated += segLens[i];
    trail.push(coords[i + 1]);
  }

  return { trail: coords, head: coords[coords.length - 1] };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function MapPanel({
  nodes = [],
  edges = [],
  center = [51.505, -0.09],
  zoom = 15,
  activePatient = null,
  routeResult = null,
  isAnimating = false,
  onAnimate = null,
  onReset = null,
  onAnimationComplete = null
}) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [scanStepIndex, setScanStepIndex] = useState(0);

  const phaseRef = useRef('idle');
  const onCompleteRef = useRef(onAnimationComplete);
  useEffect(() => { onCompleteRef.current = onAnimationComplete; }, [onAnimationComplete]);

  const nodeMap = {};
  nodes.forEach((node) => { nodeMap[node.id] = node; });

  const patientIdx = routeResult?.fullPath?.indexOf(activePatient?.id) ?? -1;
  const seg1Ids = routeResult && patientIdx !== -1 ? routeResult.fullPath.slice(0, patientIdx + 1) : [];
  const seg2Ids = routeResult && patientIdx !== -1 ? routeResult.fullPath.slice(patientIdx) : [];

  const toCoords = (ids) => ids.map((id) => {
    const node = nodeMap[id];
    return node ? [node.lat, node.lng] : null;
  }).filter(Boolean);

  const seg1Coords = toCoords(seg1Ids);
  const seg2Coords = toCoords(seg2Ids);
  const dijkstraSteps = routeResult?.steps || [];

  useEffect(() => {
    if (!isAnimating) {
      setProgress(0);
      setScanStepIndex(0);
      setPhase('idle');
      phaseRef.current = 'idle';
      return undefined;
    }

    if (!routeResult) return undefined;

    let cancelled = false;
    let animId = null;
    let scanTimer = null;
    let scanPause = null;
    let routePause = null;
    let start = null;

    const finish = () => {
      phaseRef.current = 'done';
      setPhase('done');
      setProgress(1);
      if (onCompleteRef.current) onCompleteRef.current();
    };

    const startRoutePhase = (nextPhase) => {
      if (cancelled) return;
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      setProgress(0);
      start = null;
      animId = requestAnimationFrame(tickRoute);
    };

    const tickRoute = (timestamp) => {
      if (cancelled) return;
      if (!start) start = timestamp;

      const elapsed = timestamp - start;
      const raw = Math.min(elapsed / 2200, 1);
      setProgress(easeInOutCubic(raw));

      if (raw < 1) {
        animId = requestAnimationFrame(tickRoute);
      } else if (phaseRef.current === 'route1') {
        routePause = setTimeout(() => startRoutePhase('route2'), 350);
      } else {
        finish();
      }
    };

    if (dijkstraSteps.length > 0) {
      phaseRef.current = 'scan';
      setPhase('scan');
      setProgress(0);
      setScanStepIndex(0);

      let nextStep = 0;
      const scanInterval = Math.max(260, Math.min(520, Math.floor(5600 / dijkstraSteps.length)));
      scanTimer = setInterval(() => {
        if (cancelled) return;
        nextStep += 1;
        if (nextStep < dijkstraSteps.length) {
          setScanStepIndex(nextStep);
        } else {
          clearInterval(scanTimer);
          scanPause = setTimeout(() => startRoutePhase('route1'), 500);
        }
      }, scanInterval);
    } else {
      startRoutePhase('route1');
    }

    return () => {
      cancelled = true;
      clearInterval(scanTimer);
      clearTimeout(scanPause);
      clearTimeout(routePause);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [dijkstraSteps.length, isAnimating, routeResult]);

  const isScanning = phase === 'scan';
  const isDriving = phase === 'route1' || phase === 'route2';
  const isActive = isScanning || isDriving;
  const activeStep = isScanning && dijkstraSteps.length > 0
    ? dijkstraSteps[Math.min(scanStepIndex, dijkstraSteps.length - 1)]
    : null;
  const scanProgress = dijkstraSteps.length > 0 ? (scanStepIndex + 1) / dijkstraSteps.length : 0;
  const displayProgress = isScanning ? scanProgress : progress;

  const seg1Progress = phase === 'route1' ? getProgressAlongPath(seg1Coords, progress) : null;
  const seg2Progress = phase === 'route2' ? getProgressAlongPath(seg2Coords, progress) : null;

  let ambulancePos = null;
  if (isScanning && seg1Coords.length > 0) ambulancePos = seg1Coords[0];
  else if (phase === 'route1' && seg1Progress?.head) ambulancePos = seg1Progress.head;
  else if (phase === 'route2' && seg2Progress?.head) ambulancePos = seg2Progress.head;
  else if (phase === 'done' && seg2Coords.length > 0) ambulancePos = seg2Coords[seg2Coords.length - 1];
  else if (!isAnimating && routeResult) {
    const lastId = routeResult.fullPath[routeResult.fullPath.length - 1];
    const lastNode = nodeMap[lastId];
    if (lastNode) ambulancePos = [lastNode.lat, lastNode.lng];
  }

  const selectedPathEdgeSet = new Set();
  if (routeResult?.fullPath) {
    for (let i = 0; i < routeResult.fullPath.length - 1; i += 1) {
      selectedPathEdgeSet.add(edgeKey(routeResult.fullPath[i], routeResult.fullPath[i + 1]));
    }
  }

  const selectedPathNodeSet = new Set(!isScanning ? routeResult?.fullPath || [] : []);
  const visitedNodeSet = new Set(activeStep?.visited || []);
  const frontierNodeSet = new Set(activeStep?.evaluatingNeighbors || []);

  const currentScanEdgeSet = new Set();
  if (activeStep?.currentNode) {
    (activeStep.evaluatingNeighbors || []).forEach((neighbor) => {
      currentScanEdgeSet.add(edgeKey(activeStep.currentNode, neighbor));
    });
  }

  const evaluatedEdgeSet = new Set();
  if (isScanning) {
    dijkstraSteps.slice(0, scanStepIndex + 1).forEach((step) => {
      (step.evaluatingNeighbors || []).forEach((neighbor) => {
        evaluatedEdgeSet.add(edgeKey(step.currentNode, neighbor));
      });
    });
  }

  const getEdgeOptions = (edge) => {
    const key = edgeKey(edge.from, edge.to);
    const isCurrentScanEdge = currentScanEdgeSet.has(key);
    const isEvaluatedScanEdge = evaluatedEdgeSet.has(key);
    const isOnSelectedPath = selectedPathEdgeSet.has(key);

    if (isCurrentScanEdge) {
      return {
        color: '#f59e0b',
        weight: 6,
        opacity: 0.95,
        dashArray: '2,8',
        lineCap: 'round',
        lineJoin: 'round',
        className: 'dijkstra-scan-edge'
      };
    }

    if (isEvaluatedScanEdge) {
      return {
        color: '#a1a1aa',
        weight: 4,
        opacity: 0.7,
        dashArray: '5,7',
        lineCap: 'round',
        lineJoin: 'round'
      };
    }

    let color = '#27272a';
    let weight = 2.5;
    let opacity = 0.35;
    let dashArray = null;
    if (edge.traffic === 'Heavy') {
      color = '#f59e0b';
      weight = 3;
      opacity = 0.55;
    } else if (edge.traffic === 'Gridlock') {
      color = '#ef4444';
      weight = 3.5;
      opacity = 0.6;
      dashArray = '4,8';
    }

    if (isOnSelectedPath && routeResult && !isActive) opacity = 0.12;
    return { color, weight, opacity, dashArray };
  };

  const phaseLabel = isScanning
    ? activeStep?.phase || 'Dijkstra Scan'
    : phase === 'route1'
      ? 'Selected: Unit -> Scene'
      : phase === 'route2'
        ? 'Selected: Scene -> Medical Center'
        : 'Complete';

  const distanceRows = Object.entries(activeStep?.distances || {})
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5);

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {activePatient && (
        <div className="absolute top-4 left-4 z-[1000] glass-panel p-5 rounded-xl max-w-sm w-full pointer-events-auto">
          <div className="flex items-center justify-between border-b border-charcoal-700/60 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-medical-blue animate-pulse" />
              <span className="text-[10px] font-bold text-charcoal-300 uppercase tracking-widest font-mono">
                Routing Telemetry
              </span>
            </div>
            {routeResult && !isActive && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-medical-green/10 text-medical-green border border-medical-green/20 font-mono">
                ROUTE OPTIMAL
              </span>
            )}
            {isScanning && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-medical-amber/10 text-medical-amber border border-medical-amber/20 font-mono">
                SCANNING
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-charcoal-400 block font-mono uppercase tracking-wider">Patient Call</span>
              <h3 className="text-sm font-bold text-white mt-0.5 font-display flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-medical-red" />
                {activePatient.name}
              </h3>
            </div>

            {routeResult ? (
              <div className="grid grid-cols-2 gap-4 bg-charcoal-900/60 border border-charcoal-800 rounded-lg p-3">
                <div>
                  <span className="text-[9px] font-mono text-charcoal-400 block uppercase">Est. Duration</span>
                  <span className="text-xl font-bold text-medical-blue font-display tracking-tight">
                    {routeResult.totalWeight} <span className="text-xs font-semibold text-charcoal-400 font-sans">MINS</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-charcoal-400 block uppercase">Distance (Est)</span>
                  <span className="text-xl font-bold text-white font-display tracking-tight">
                    {activePatient.distance}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-charcoal-400 italic bg-charcoal-900/40 p-3 rounded-lg border border-charcoal-800 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-charcoal-500 animate-spin" />
                <span>Computing Dijkstra path weights...</span>
              </div>
            )}

            {routeResult && (
              <div className="text-[11px] text-charcoal-300 space-y-1.5 border-t border-charcoal-700/40 pt-3">
                <div className="flex justify-between">
                  <span className="text-charcoal-400">{'Unit -> Scene:'}</span>
                  <span className="font-semibold text-white font-mono">{routeResult.segment1Distance} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">{'Scene -> Clinic:'}</span>
                  <span className="font-semibold text-white font-mono">{routeResult.segment2Distance} mins</span>
                </div>
              </div>
            )}

            {isActive && (
              <div className="space-y-1.5 border-t border-charcoal-700/40 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-medical-blue font-mono uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-medical-blue animate-ping shrink-0" />
                    <span className="truncate">{phaseLabel}</span>
                  </span>
                  <span className="text-[10px] font-mono text-charcoal-400 shrink-0">
                    {Math.round(displayProgress * 100)}%
                  </span>
                </div>
                <div className="w-full bg-charcoal-950 h-1.5 rounded-full overflow-hidden border border-charcoal-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-medical-blue to-medical-teal"
                    style={{ width: `${displayProgress * 100}%`, transition: 'width 120ms linear' }}
                  />
                </div>
              </div>
            )}

            {routeResult && (
              <div className="flex gap-2 pt-1 border-t border-charcoal-700/30 mt-1">
                <button
                  onClick={onAnimate}
                  disabled={isActive}
                  className="flex-1 bg-medical-blue hover:bg-sky-500 disabled:bg-charcoal-700 disabled:text-charcoal-400 text-charcoal-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-medical-blue/15"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {isScanning ? 'Scanning Graph...' : isDriving ? 'Selecting Route...' : 'Animate Pathfinding'}
                </button>
                {onReset && !isActive && (
                  <button
                    onClick={onReset}
                    className="bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-charcoal-200 text-xs p-2 rounded-lg transition-all"
                    title="Clear Route"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isScanning && activeStep && (
        <div className="absolute top-4 right-4 z-[1000] glass-panel p-4 rounded-xl max-w-xs w-full pointer-events-auto">
          <div className="flex items-center gap-2 mb-3">
            <Route className="h-4 w-4 text-medical-amber" />
            <span className="text-[10px] font-bold text-medical-amber uppercase tracking-widest font-mono">
              Dijkstra Scan Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-charcoal-900/70 border border-charcoal-800 rounded-lg p-2">
                <span className="text-[9px] text-charcoal-400 uppercase font-mono block">Current Node</span>
                <span className="font-bold text-white font-mono">{activeStep.currentNode}</span>
              </div>
              <div className="bg-charcoal-900/70 border border-charcoal-800 rounded-lg p-2">
                <span className="text-[9px] text-charcoal-400 uppercase font-mono block">Settled</span>
                <span className="font-bold text-white font-mono">{visitedNodeSet.size}/{nodes.length}</span>
              </div>
            </div>

            <div className="border-t border-charcoal-700/50 pt-2.5">
              <span className="text-[9px] text-charcoal-400 uppercase font-mono block mb-1">Candidate Roads</span>
              <p className="font-mono text-[11px] text-charcoal-200 leading-relaxed">
                {(activeStep.evaluatingNeighbors || []).length > 0
                  ? `${activeStep.currentNode} -> ${(activeStep.evaluatingNeighbors || []).join(', ')}`
                  : 'No unvisited neighbors'}
              </p>
            </div>

            <div className="border-t border-charcoal-700/50 pt-2.5">
              <span className="text-[9px] text-charcoal-400 uppercase font-mono block mb-1">Lowest Known Costs</span>
              <div className="space-y-1 font-mono text-[10px]">
                {distanceRows.map(([id, value]) => (
                  <div key={id} className="flex items-center justify-between">
                    <span className={id === activeStep.currentNode ? 'text-medical-amber font-bold' : 'text-charcoal-300'}>
                      {id}
                    </span>
                    <span className="text-white">{formatWeight(value)} mins</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 w-full h-full min-h-[400px] z-10">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapController center={center} zoom={zoom} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {edges.map((edge, idx) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;

            return (
              <Polyline
                key={`edge-${idx}`}
                positions={[[from.lat, from.lng], [to.lat, to.lng]]}
                pathOptions={getEdgeOptions(edge)}
              >
                <Tooltip sticky>
                  <div className="text-[11px] p-2 bg-charcoal-800 border border-charcoal-700 rounded-lg shadow-xl text-charcoal-200">
                    <span className="font-bold text-white font-mono">{edge.from}{' -> '}{edge.to}</span>
                    <div className="border-t border-charcoal-700/60 mt-1 pt-1 space-y-0.5">
                      <div>Weight: <span className="font-semibold text-white">{edge.weight} mins</span></div>
                      <div>Traffic: <span className={
                        edge.traffic === 'Gridlock' ? 'text-medical-red font-bold' :
                        edge.traffic === 'Heavy' ? 'text-medical-amber font-bold' : 'text-charcoal-400'
                      }>{edge.traffic}</span></div>
                    </div>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

          {phase === 'route2' && seg1Coords.length >= 2 && (
            <Polyline
              positions={seg1Coords}
              pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }}
            />
          )}

          {phase === 'route1' && seg1Progress && seg1Progress.trail.length >= 2 && (
            <>
              <Polyline
                positions={seg1Progress.trail}
                pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.7, lineCap: 'round', lineJoin: 'round', className: 'neon-path-glowing' }}
              />
              <Polyline
                positions={seg1Progress.trail}
                pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }}
              />
            </>
          )}

          {phase === 'route2' && seg2Progress && seg2Progress.trail.length >= 2 && (
            <>
              <Polyline
                positions={seg2Progress.trail}
                pathOptions={{ color: '#10b981', weight: 5, opacity: 0.7, lineCap: 'round', lineJoin: 'round', className: 'neon-path-glowing' }}
              />
              <Polyline
                positions={seg2Progress.trail}
                pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }}
              />
            </>
          )}

          {routeResult && !isActive && (() => {
            const all = toCoords(routeResult.fullPath);
            if (all.length < 2) return null;
            return (
              <>
                <Polyline
                  positions={all}
                  pathOptions={{ color: '#0ea5e9', weight: 6, opacity: 0.5, lineCap: 'round', lineJoin: 'round', className: 'neon-path-glowing' }}
                />
                <Polyline
                  positions={all}
                  pathOptions={{ color: '#ffffff', weight: 2.5, opacity: 0.85, lineCap: 'round', lineJoin: 'round', className: 'neon-path' }}
                />
              </>
            );
          })()}

          {nodes.map((node) => (
            <Marker
              key={node.id}
              position={[node.lat, node.lng]}
              icon={createNodeIcon(node.type, {
                isOnPath: selectedPathNodeSet.has(node.id),
                isVisited: visitedNodeSet.has(node.id),
                isCurrent: activeStep?.currentNode === node.id,
                isFrontier: frontierNodeSet.has(node.id)
              })}
            >
              <Popup>
                <div className="text-[11px] p-2 text-charcoal-300 font-sans">
                  <h4 className="font-bold text-white text-xs font-display">{node.name}</h4>
                  <div className="border-t border-charcoal-700/60 mt-1 pt-1 space-y-0.5 font-mono">
                    <div>Node ID: <span className="text-white">{node.id}</span></div>
                    <div>Class: <span className="text-white">{node.type}</span></div>
                    <div>Coords: {node.lat.toFixed(4)}, {node.lng.toFixed(4)}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {ambulancePos && (
            <Marker
              position={ambulancePos}
              icon={ambulanceCarIcon}
              zIndexOffset={5000}
            >
              <Popup>
                <div className="text-xs text-white">
                  <span className="font-bold text-medical-blue flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    Ambulance Alpha
                  </span>
                  <p className="text-[10px] text-charcoal-300 mt-0.5">
                    {isScanning ? 'Waiting during graph scan' : isDriving ? 'En route' : 'Stationed'}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="bg-charcoal-900 border-t border-charcoal-800 p-4 px-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-charcoal-300 font-mono">
        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-blue border border-white" />
            <span>Station Unit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-red border border-white" />
            <span>Triage Scene</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-green border border-white" />
            <span>Hospital</span>
          </div>
          <div className="h-4 w-px bg-charcoal-700 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-charcoal-600 rounded" />
            <span>Normal Road</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-medical-amber rounded" />
            <span>Heavy Traffic</span>
          </div>
          <div className="flex items-center gap-1.5 text-medical-red font-semibold">
            <span className="w-3.5 h-0.5 bg-medical-red rounded" />
            <span>Gridlock</span>
          </div>
          <div className="h-4 w-px bg-charcoal-700 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-medical-amber font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-amber border border-white" />
            <span>Dijkstra Check</span>
          </div>
        </div>

        <span className="text-[10px] text-charcoal-400 font-semibold tracking-wider uppercase">
          OpenStreetMap Wrapper Engine
        </span>
      </div>
    </div>
  );
}
