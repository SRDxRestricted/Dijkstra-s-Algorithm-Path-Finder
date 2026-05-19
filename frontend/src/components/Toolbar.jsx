import React from 'react';
import { Activity, ShieldAlert, Award, Compass, Play, RotateCcw } from 'lucide-react';

export default function Toolbar({ 
  scenarios, 
  activeScenarioId, 
  onSelectScenario, 
  activePatient, 
  onAnimate, 
  isAnimating, 
  hasRoute,
  onReset
}) {
  return (
    <div className="glass-panel p-4 mb-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-col gap-1 max-w-xl">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-emergency-blue animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-white font-display">
            LifeLine Navigator <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-emergency-blue rounded border border-cyan-500/30">v1.2.0</span>
          </h1>
        </div>
        <p className="text-xs text-gray-400">
          Emergency Routing System & Dijkstra Algorithmic Dispatch Dashboard
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-[#121420] border border-[#2c314d] rounded-md p-1">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => onSelectScenario(sc.id)}
              disabled={isAnimating}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all duration-300 ${
                activeScenarioId === sc.id
                  ? 'bg-emergency-blue text-black font-bold shadow-md shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50 disabled:opacity-50'
              }`}
            >
              Scenario {sc.id}
            </button>
          ))}
        </div>

        {activePatient && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAnimate}
              disabled={isAnimating}
              className="bg-emergency-blue hover:bg-cyan-400 text-black text-xs font-bold px-4 py-2 rounded-md shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isAnimating ? 'Animating Exploration...' : 'Animate Pathfinding'}
            </button>

            {hasRoute && !isAnimating && (
              <button
                onClick={onReset}
                className="bg-dark-card border border-dark-border hover:border-gray-500 text-gray-300 text-xs px-3 py-2 rounded-md transition-all flex items-center gap-1"
                title="Reset Route"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
