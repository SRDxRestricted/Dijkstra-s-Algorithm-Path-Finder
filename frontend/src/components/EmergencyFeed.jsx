import React from 'react';
import { AlertCircle, ShieldAlert, HeartPulse, Activity, Navigation, Check, Clock, MapPin } from 'lucide-react';

export default function EmergencyFeed({ 
  patients = [], 
  onAcceptPatient, 
  activePatient, 
  isAnimating 
}) {
  // Sort patients so CRITICAL (level 1) comes first, then URGENT (level 2)
  const sortedPatients = [...patients].sort((a, b) => a.level - b.level);

  return (
    <div className="flex flex-col h-full bg-charcoal-900 border-r border-charcoal-700/80 overflow-hidden">
      {/* Feed Header */}
      <div className="p-5 border-b border-charcoal-700/80 bg-charcoal-900 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold tracking-widest text-charcoal-400 uppercase font-mono">
            Active Triage Feed
          </h2>
          <p className="text-[11px] text-charcoal-300 mt-1">
            Accept dispatches to calculate Dijkstra path
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-medical-red/10 text-medical-red border border-medical-red/20 rounded animate-pulse">
          <Activity className="h-3 w-3" />
          {patients.length} PENDING
        </span>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-charcoal-400">
            <Check className="h-8 w-8 text-medical-green mb-2" />
            <p className="text-xs font-semibold">Triage Queue Clear</p>
            <p className="text-[10px] text-charcoal-500 mt-0.5">No active dispatches waiting.</p>
          </div>
        ) : (
          sortedPatients.map((patient) => {
            const isCritical = patient.severity === 'CRITICAL';
            const isActive = activePatient && activePatient.id === patient.id;
            
            return (
              <div
                key={patient.id}
                className={`group rounded-xl border transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'border-medical-blue bg-charcoal-800 active-card-shadow' 
                    : 'border-charcoal-700 bg-charcoal-800/40 hover:bg-charcoal-800/80 hover:border-charcoal-500'
                }`}
              >
                {/* Visual indicator bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  isCritical ? 'bg-medical-red' : 'bg-medical-amber'
                }`} />

                <div className="p-4 pl-5">
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-charcoal-400">
                          {patient.id}
                        </span>
                        <span className="text-charcoal-600 text-[10px] font-mono">•</span>
                        <span className="text-[10px] text-charcoal-300 font-semibold font-mono">
                          {patient.age} Y/O
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1 tracking-tight">
                        {patient.name}
                      </h3>
                    </div>

                    {/* Medical Priority Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider font-mono ${
                      isCritical 
                        ? 'bg-medical-red/10 text-medical-red border border-medical-red/30' 
                        : 'bg-medical-amber/10 text-medical-amber border border-medical-amber/30'
                    }`}>
                      {isCritical ? (
                        <>
                          <HeartPulse className="h-2.5 w-2.5 animate-pulse" />
                          CRITICAL - L1
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-2.5 w-2.5" />
                          URGENT - L2
                        </>
                      )}
                    </span>
                  </div>

                  {/* Telemetry info */}
                  <div className="mt-3.5 pt-3.5 border-t border-charcoal-700/60 grid grid-cols-2 gap-3 text-[11px] text-charcoal-300">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-charcoal-400" />
                      <span>{patient.distance}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-charcoal-400" />
                      <span className="truncate">Dest: {patient.targetHospital}</span>
                    </div>
                  </div>

                  {/* Action triggers */}
                  <div className="mt-4 pt-3 border-t border-charcoal-700/40 flex items-center justify-between gap-4">
                    {isActive ? (
                      <span className="text-[10px] font-bold text-medical-blue flex items-center gap-1 font-mono tracking-wider">
                        <Navigation className="h-3.5 w-3.5 animate-pulse fill-current" />
                        ACTIVE ROUTE
                      </span>
                    ) : (
                      <span className="text-[10px] text-charcoal-400 italic">
                        Awaiting dispatch
                      </span>
                    )}

                    <button
                      onClick={() => onAcceptPatient(patient)}
                      disabled={isAnimating}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                        isActive
                          ? 'bg-medical-blue/10 text-medical-blue border-medical-blue/40 cursor-default'
                          : 'bg-charcoal-900 text-charcoal-200 border-charcoal-600 hover:bg-charcoal-700 hover:text-white disabled:opacity-40'
                      }`}
                    >
                      {isActive ? 'DISPATCHED' : 'ACCEPT DISPATCH'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
