import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shield, Play, RotateCcw, Activity, Navigation, HeartPulse, HelpCircle, MapPin, Truck } from 'lucide-react';

// Controller to handle center/zoom dynamic changes
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
}

// Generate custom minimalist, crisp SVG icon based on node type and exploration state
const createNodeIcon = (type, name, isCurrent, isVisited, isPathNode) => {
  let bg = '#27272a';
  let border = 'rgba(255, 255, 255, 0.25)';
  let size = 12;
  let svgContent = '';

  if (type === 'Ambulance') {
    bg = '#0ea5e9'; // Cyan/Blue
    border = '#ffffff';
    size = 28;
    svgContent = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 22l10-6 10 6L12 2z"/></svg>`;
  } else if (type === 'Patient') {
    bg = '#ef4444'; // Red
    border = '#ffffff';
    size = 28;
    svgContent = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v10M7 12h10"/></svg>`;
  } else if (type === 'Hospital') {
    bg = '#10b981'; // Green
    border = '#ffffff';
    size = 28;
    svgContent = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8M8 12h8"/></svg>`;
  } else if (type === 'Intersection') {
    bg = isPathNode ? '#0ea5e9' : (isVisited ? '#71717a' : '#27272a');
    border = isCurrent ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)';
    size = isCurrent ? 18 : 12;
  }

  const pulseClass = (type === 'Patient') ? 'pulse-marker' : '';

  return L.divIcon({
    html: `
      <div class="${pulseClass}" style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${size}px;
        height: ${size}px;
        background: ${bg};
        border: 2px solid ${border};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transition: all 0.2s ease;
      ">
        ${svgContent}
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

// Custom Ambulance Driving Marker Icon (Clean Surgical Chevron)
const createAmbulanceCarIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        background: #0ea5e9;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(14, 165, 233, 0.7), 0 0 3px rgba(14, 165, 233, 0.5);
      ">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse">
          <rect x="2" y="4" width="14" height="12" rx="2" />
          <polygon points="16 6 22 10 22 16 16 16" />
          <circle cx="6" cy="18" r="2" fill="#000" />
          <circle cx="16" cy="18" r="2" fill="#000" />
        </svg>
      </div>
    `,
    className: 'custom-ambulance-car',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// DFS to find all simple paths
function findSimplePaths(edges, start, end, maxDepth = 5) {
  const adj = {};
  edges.forEach(e => {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    adj[e.from].push(e.to);
    adj[e.to].push(e.from);
  });

  const paths = [];
  
  function dfs(curr, target, visited, currentPath) {
    if (currentPath.length > maxDepth) return;
    if (curr === target) {
      paths.push([...currentPath]);
      return;
    }
    
    const neighbors = adj[curr] || [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        currentPath.push(n);
        dfs(n, target, visited, currentPath);
        currentPath.pop();
        visited.delete(n);
      }
    }
  }
  
  const visitedNodes = new Set([start]);
  dfs(start, end, visitedNodes, [start]);
  return paths;
}

const interpolatePoints = (p1, p2, ratio) => {
  return [
    p1[0] + (p2[0] - p1[0]) * ratio,
    p1[1] + (p2[1] - p1[1]) * ratio
  ];
};

const getPathProgress = (pathNodeIds, nodeMap, edgeWeightMap, p) => {
  const coords = pathNodeIds.map(id => {
    const node = nodeMap[id];
    return node ? [node.lat, node.lng] : null;
  }).filter(Boolean);

  if (coords.length < 2) return { coords: [], head: null, cost: 0, totalCost: 0 };
  
  const segments = [];
  let totalW = 0;
  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const from = pathNodeIds[i];
    const to = pathNodeIds[i+1];
    const w = edgeWeightMap[`${from}-${to}`] || edgeWeightMap[`${to}-${from}`] || 1;
    segments.push(w);
    totalW += w;
  }
  
  let cumulativeRatio = 0;
  let activeCoords = [coords[0]];
  let headPoint = coords[0];
  let accumulatedCost = 0;
  
  for (let i = 0; i < segments.length; i++) {
    const segmentRatio = segments[i] / totalW;
    const startRatio = cumulativeRatio;
    const endRatio = cumulativeRatio + segmentRatio;
    
    if (p <= endRatio) {
      const segmentP = (p - startRatio) / segmentRatio;
      const interp = interpolatePoints(coords[i], coords[i+1], segmentP);
      activeCoords.push(interp);
      headPoint = interp;
      accumulatedCost += segments[i] * segmentP;
      break;
    } else {
      activeCoords.push(coords[i+1]);
      headPoint = coords[i+1];
      accumulatedCost += segments[i];
      cumulativeRatio = endRatio;
    }
  }
  
  return {
    coords: activeCoords,
    head: headPoint,
    cost: accumulatedCost,
    totalCost: totalW
  };
};

export default function MapPanel({ 
  nodes = [], 
  edges = [], 
  center = [51.505, -0.09], 
  zoom = 13,
  activePatient = null,
  routeResult = null,
  isAnimating = false,
  onAnimate = null,
  onReset = null,
  onAnimationComplete = null
}) {
  const [animatedAmbulancePos, setAnimatedAmbulancePos] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('Ambulance to Patient');
  const [pathsToPatient, setPathsToPatient] = useState([]);
  const [pathsToHospital, setPathsToHospital] = useState([]);

  // Compile edge weight map
  const edgeWeightMap = {};
  edges.forEach(e => {
    edgeWeightMap[`${e.from}-${e.to}`] = e.weight;
    edgeWeightMap[`${e.to}-${e.from}`] = e.weight;
  });

  const nodeMap = {};
  nodes.forEach(n => {
    nodeMap[n.id] = n;
  });

  // Pre-calculate all simple paths for the selected patient
  useEffect(() => {
    if (!activePatient || !nodes.length || !edges.length) {
      setPathsToPatient([]);
      setPathsToHospital([]);
      return;
    }

    const startNode = nodes.find(n => n.type === 'Ambulance')?.id || 'A';
    const patientNode = activePatient.id;
    const hospitalNode = nodes.find(n => n.type === 'Hospital' && n.name.includes(activePatient.targetHospital))?.id || 
                         nodes.find(n => n.type === 'Hospital')?.id || 'H1';

    const patientPaths = findSimplePaths(edges, startNode, patientNode, 5);
    const hospitalPaths = findSimplePaths(edges, patientNode, hospitalNode, 5);

    setPathsToPatient(patientPaths);
    setPathsToHospital(hospitalPaths);
  }, [activePatient, nodes, edges]);

  // Extract optimal segments from the solver result
  const patientIndex = routeResult?.fullPath?.indexOf(activePatient?.id) ?? -1;
  const optimalSegment1 = routeResult && patientIndex !== -1 ? routeResult.fullPath.slice(0, patientIndex + 1) : [];
  const optimalSegment2 = routeResult && patientIndex !== -1 ? routeResult.fullPath.slice(patientIndex) : [];

  // Manage two-phase requestAnimationFrame animation loop
  useEffect(() => {
    if (!isAnimating) {
      setAnimationProgress(0);
      setCurrentPhase('Ambulance to Patient');
      return;
    }

    let startTimestamp = null;
    const duration = 2400; // 2.4s per phase
    let animId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const p = Math.min(elapsed / duration, 1);

      setAnimationProgress(p);

      if (p < 1) {
        animId = requestAnimationFrame(step);
      } else {
        if (currentPhase === 'Ambulance to Patient') {
          // Complete phase 1, reset timer, advance to phase 2
          setCurrentPhase('Patient to Hospital');
          setAnimationProgress(0);
          startTimestamp = null;
          animId = requestAnimationFrame(step);
        } else {
          // Finished both phases, callback to parent
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isAnimating, currentPhase, onAnimationComplete]);

  // Ambulance position coordinator
  useEffect(() => {
    if (isAnimating) {
      const startNode = nodes.find(n => n.type === 'Ambulance');
      const patientNode = activePatient ? nodeMap[activePatient.id] : null;
      if (currentPhase === 'Ambulance to Patient' && startNode) {
        setAnimatedAmbulancePos([startNode.lat, startNode.lng]);
      } else if (currentPhase === 'Patient to Hospital' && patientNode) {
        setAnimatedAmbulancePos([patientNode.lat, patientNode.lng]);
      }
      return;
    }

    if (!routeResult) {
      setAnimatedAmbulancePos(null);
      return;
    }

    const { fullPath } = routeResult;
    if (!fullPath || fullPath.length === 0) return;

    let currentIndex = 0;
    const pathCoords = fullPath.map(nodeId => {
      const node = nodeMap[nodeId];
      return node ? [node.lat, node.lng] : null;
    }).filter(Boolean);

    if (pathCoords.length === 0) return;

    setAnimatedAmbulancePos(pathCoords[0]);

    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex >= pathCoords.length) {
        currentIndex = 0;
      }
      setAnimatedAmbulancePos(pathCoords[currentIndex]);
    }, 1600);

    return () => clearInterval(interval);
  }, [routeResult, isAnimating, currentPhase, activePatient, nodes]);

  // Compile active paths coordinates and tracking
  const activePathsToDraw = [];
  const visitedDuringAnim = new Set();

  if (isAnimating) {
    if (currentPhase === 'Ambulance to Patient') {
      pathsToPatient.forEach(path => {
        const { coords, head, cost, totalCost } = getPathProgress(path, nodeMap, edgeWeightMap, animationProgress);
        activePathsToDraw.push({
          path,
          coords,
          head,
          cost,
          totalCost,
          isOptimal: path.join(',') === optimalSegment1.join(',')
        });
        
        path.forEach((nodeId, idx) => {
          if (idx < coords.length - 1) {
            visitedDuringAnim.add(nodeId);
          }
        });
      });
    } else if (currentPhase === 'Patient to Hospital') {
      pathsToHospital.forEach(path => {
        const { coords, head, cost, totalCost } = getPathProgress(path, nodeMap, edgeWeightMap, animationProgress);
        activePathsToDraw.push({
          path,
          coords,
          head,
          cost,
          totalCost,
          isOptimal: path.join(',') === optimalSegment2.join(',')
        });

        path.forEach((nodeId, idx) => {
          if (idx < coords.length - 1) {
            visitedDuringAnim.add(nodeId);
          }
        });
      });
    }
  }

  // Node status helper functions
  const isVisitedNode = (nodeId) => {
    if (!isAnimating) {
      return routeResult && routeResult.fullPath.includes(nodeId);
    }
    if (currentPhase === 'Patient to Hospital' && optimalSegment1.includes(nodeId)) {
      return true;
    }
    return visitedDuringAnim.has(nodeId);
  };

  const isCurrentNode = (nodeId) => {
    if (!isAnimating) return false;
    const activeOptimal = activePathsToDraw.find(ap => ap.isOptimal);
    const optimalPath = currentPhase === 'Ambulance to Patient' ? optimalSegment1 : optimalSegment2;
    const lastReachedIdx = activeOptimal ? activeOptimal.coords.length - 1 : 0;
    if (optimalPath && lastReachedIdx < optimalPath.length) {
      return optimalPath[lastReachedIdx] === nodeId;
    }
    return false;
  };

  const isFinalPathNode = (nodeId) => {
    if (!routeResult || isAnimating) return false;
    return routeResult.fullPath.includes(nodeId);
  };

  // Determine edge rendering options
  const getEdgeOptions = (edge) => {
    const isPathEdge = routeResult && !isAnimating && (() => {
      const { fullPath } = routeResult;
      for (let i = 0; i < fullPath.length - 1; i++) {
        if ((fullPath[i] === edge.from && fullPath[i+1] === edge.to) ||
            (fullPath[i] === edge.to && fullPath[i+1] === edge.from)) {
          return true;
        }
      }
      return false;
    })();

    let color = '#27272a'; // dark zinc default
    let weight = 3;
    let opacity = 0.4;
    let dashArray = null;

    if (edge.traffic === 'Heavy') {
      color = '#f59e0b';
      weight = 3.5;
      opacity = 0.6;
    } else if (edge.traffic === 'Gridlock') {
      color = '#ef4444';
      weight = 4;
      opacity = 0.7;
      dashArray = '4, 8';
    }

    if (isPathEdge) {
      opacity = 0.15;
    }

    return { color, weight, opacity, dashArray };
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {/* Telemetry Panel */}
      {activePatient && (
        <div className="absolute top-4 left-4 z-[1000] glass-panel p-5 rounded-xl max-w-sm w-full pointer-events-auto">
          <div className="flex items-center justify-between border-b border-charcoal-700/60 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-medical-blue animate-pulse" />
              <span className="text-[10px] font-bold text-charcoal-300 uppercase tracking-widest font-mono">
                Tactical Routing Telemetry
              </span>
            </div>
            {routeResult && !isAnimating && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-medical-green/10 text-medical-green border border-medical-green/20 font-mono">
                ROUTE OPTIMAL
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
                  <span className="text-charcoal-400">Unit → Scene:</span>
                  <span className="font-semibold text-white font-mono">{routeResult.segment1Distance} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Scene → Clinic:</span>
                  <span className="font-semibold text-white font-mono">{routeResult.segment2Distance} mins</span>
                </div>
              </div>
            )}

            {routeResult && (
              <div className="flex gap-2 pt-1 border-t border-charcoal-700/30 mt-3.5">
                <button
                  onClick={onAnimate}
                  disabled={isAnimating}
                  className="flex-1 bg-medical-blue hover:bg-sky-500 disabled:bg-charcoal-700 text-charcoal-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-medical-blue/15"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {isAnimating ? 'Analyzing Graph...' : 'Animate Pathfinding'}
                </button>
                {onReset && !isAnimating && (
                  <button
                    onClick={onReset}
                    className="bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-charcoal-200 text-xs p-2 rounded-lg transition-all"
                    title="Clear Active Route"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dijkstra Simulation Overlay Panel */}
      {isAnimating && (
        <div className="absolute top-4 right-4 z-[1000] glass-panel p-4 rounded-xl max-w-xs w-full pointer-events-auto">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="h-2 w-2 rounded-full bg-medical-blue animate-ping" />
            <span className="text-[10px] font-bold text-medical-blue uppercase tracking-widest font-mono">
              Tactical Router Active
            </span>
          </div>
          <div className="space-y-3">
            <div className="text-xs">
              <span className="text-charcoal-400 text-[10px] uppercase font-mono block">Active Scan Phase</span>
              <span className="text-white font-bold font-display mt-0.5 block">
                {currentPhase === 'Ambulance to Patient' 
                  ? 'Phase 1: Unit ➔ Triage Scene' 
                  : 'Phase 2: Scene ➔ Medical Center'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-charcoal-400">
                <span>Search Progress</span>
                <span>{Math.round(animationProgress * 100)}%</span>
              </div>
              <div className="w-full bg-charcoal-950 h-1.5 rounded-full overflow-hidden border border-charcoal-800">
                <div 
                  className="bg-medical-blue h-full transition-all duration-100"
                  style={{ width: `${animationProgress * 100}%` }}
                />
              </div>
            </div>

            <div className="border-t border-charcoal-700/50 pt-2.5 space-y-2">
              <span className="text-[9px] font-bold text-charcoal-400 uppercase tracking-widest font-mono block">
                Evaluating Branches ({currentPhase === 'Ambulance to Patient' ? pathsToPatient.length : pathsToHospital.length})
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                {(currentPhase === 'Ambulance to Patient' ? pathsToPatient : pathsToHospital).map((path, idx) => {
                  const optimalSeg = currentPhase === 'Ambulance to Patient' ? optimalSegment1 : optimalSegment2;
                  const isOptimal = path.join(',') === optimalSeg.join(',');
                  
                  let pathWeight = 0;
                  for (let i = 0; i < path.length - 1; i++) {
                    pathWeight += edgeWeightMap[`${path[i]}-${path[i+1]}`] || 1;
                  }

                  return (
                    <div key={idx} className="flex items-center justify-between py-0.5">
                      <span className="text-charcoal-300 truncate max-w-[130px]">
                        {path.join('➔')}
                      </span>
                      <span className={`font-semibold shrink-0 ${
                        isOptimal ? 'text-medical-green font-bold' : 'text-charcoal-500'
                      }`}>
                        {isOptimal ? `Optimal (${pathWeight}m)` : `Alt (${pathWeight}m)`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Canvas */}
      <div className="flex-1 w-full h-full min-h-[400px] z-10">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapController center={center} zoom={zoom} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Road Network Edges */}
          {edges.map((edge, idx) => {
            const fromNode = nodeMap[edge.from];
            const toNode = nodeMap[edge.to];
            if (!fromNode || !toNode) return null;

            return (
              <Polyline
                key={`edge-${idx}`}
                positions={[[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]]}
                pathOptions={getEdgeOptions(edge)}
              >
                <Tooltip sticky>
                  <div className="text-[11px] p-2 bg-charcoal-800 border border-charcoal-700 rounded-lg shadow-xl text-charcoal-200">
                    <span className="font-bold text-white font-mono">{edge.from} ↔ {edge.to}</span>
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

          {/* Solid solved Segment 1 while Segment 2 is scanning */}
          {isAnimating && currentPhase === 'Patient to Hospital' && optimalSegment1.length >= 2 && (() => {
            const segment1Coords = optimalSegment1.map(id => {
              const node = nodeMap[id];
              return node ? [node.lat, node.lng] : null;
            }).filter(Boolean);
            
            return (
              <Polyline
                positions={segment1Coords}
                pathOptions={{
                  color: '#0ea5e9',
                  weight: 5,
                  opacity: 0.6,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            );
          })()}

          {/* Real-time Multi-Path Dijkstra Scan Wavefronts */}
          {isAnimating && activePathsToDraw.map((ap, idx) => (
            <React.Fragment key={`anim-path-${idx}`}>
              <Polyline
                positions={ap.coords}
                pathOptions={{
                  color: ap.isOptimal ? '#0ea5e9' : '#52525b',
                  weight: ap.isOptimal ? 4.5 : 2,
                  opacity: ap.isOptimal ? 0.95 : 0.45,
                  dashArray: '3, 5'
                }}
              />
              {ap.head && (
                <Marker
                  position={ap.head}
                  icon={L.divIcon({
                    html: `
                      <div class="animate-pulse" style="
                        width: 10px;
                        height: 10px;
                        background: ${ap.isOptimal ? '#0ea5e9' : '#a1a1aa'};
                        border: 2px solid #ffffff;
                        border-radius: 50%;
                        box-shadow: 0 0 10px ${ap.isOptimal ? '#0ea5e9' : '#a1a1aa'};
                      "></div>
                    `,
                    className: 'wavefront-marker',
                    iconSize: [10, 10],
                    iconAnchor: [5, 5]
                  })}
                />
              )}
              {ap.head && (
                <Tooltip
                  position={ap.head}
                  permanent
                  direction="top"
                  className="custom-cost-tooltip"
                >
                  <div className="font-mono text-[9px] font-bold text-white bg-charcoal-900/95 px-1 py-0.5 rounded border border-charcoal-700/60 shadow-lg select-none">
                    {Math.round(ap.cost)}m
                  </div>
                </Tooltip>
              )}
            </React.Fragment>
          ))}

          {/* Final Glowing Shortest Path Polyline */}
          {routeResult && !isAnimating && (() => {
            const { fullPath } = routeResult;
            const pathCoords = fullPath.map(nodeId => {
              const node = nodeMap[nodeId];
              return node ? [node.lat, node.lng] : null;
            }).filter(Boolean);

            if (pathCoords.length < 2) return null;

            return (
              <>
                {/* Thick Blue Glow Underlay */}
                <Polyline
                  positions={pathCoords}
                  pathOptions={{
                    color: '#0ea5e9',
                    weight: 7,
                    opacity: 0.55,
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'neon-path-glowing'
                  }}
                />
                {/* Dotted Moving overlay */}
                <Polyline
                  positions={pathCoords}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2.5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'neon-path'
                  }}
                />
              </>
            );
          })()}

          {/* Map Node Markers */}
          {nodes.map((node) => {
            const isCurrent = isCurrentNode(node.id);
            const isVisited = isVisitedNode(node.id);
            const isPathNode = isFinalPathNode(node.id);

            return (
              <Marker
                key={node.id}
                position={[node.lat, node.lng]}
                icon={createNodeIcon(node.type, node.name, isCurrent, isVisited, isPathNode)}
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
            );
          })}

          {/* Moving Ambulance Driving Car Marker */}
          {animatedAmbulancePos && (
            <Marker 
              position={animatedAmbulancePos} 
              icon={createAmbulanceCarIcon()}
              zIndexOffset={5000}
            >
              <Popup>
                <div className="text-xs text-white">
                  <span className="font-bold text-medical-blue flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" />
                    Ambulance Alpha
                  </span>
                  <p className="text-[10px] text-charcoal-300 mt-0.5">En route along calculated path...</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Streamlined Bottom Legend */}
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
        </div>
        
        <span className="text-[10px] text-charcoal-400 font-semibold tracking-wider uppercase">
          OpenStreetMap Wrapper Engine
        </span>
      </div>
    </div>
  );
}
