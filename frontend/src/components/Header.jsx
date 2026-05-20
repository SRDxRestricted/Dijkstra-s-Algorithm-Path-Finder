import React, { useState, useEffect } from 'react';
import { Shield, User, LogOut, LogIn, ChevronDown, Check, Activity } from 'lucide-react';

export default function Header({ 
  scenarios, 
  activeScenarioId, 
  onSelectScenario, 
  user, 
  onLogin, 
  onLogout,
  isAnimating 
}) {
  const [showAuthModal, setShowAuthModal] = useState(!user);
  const [username, setUsername] = useState('responder.alpha');
  const [password, setPassword] = useState('••••••••');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ name: 'Alpha Officer', id: 'RIDER-402', station: 'Alpha Station' });
    setShowAuthModal(false);
  };

  return (
    <header className="border-b border-charcoal-700 bg-charcoal-900 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-40 relative">
      {/* Branding & Status */}
      <div className="flex items-center gap-3">
        <div className="bg-medical-blue/10 border border-medical-blue/20 p-2 rounded-lg">
          <Activity className="h-6 w-6 text-medical-blue animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight font-display">
              LIFELINE NAVIGATOR
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 font-bold bg-charcoal-700 text-charcoal-300 rounded border border-charcoal-600 font-mono">
              SYSTEM v1.2
            </span>
          </div>
          <p className="text-[11px] text-charcoal-400 font-medium">
            Emergency Routing & Tactical Dispatch Console
          </p>
        </div>
      </div>

      {/* Tabbed Scenario Switcher */}
      <div className="flex bg-charcoal-950 border border-charcoal-700/80 rounded-lg p-1 self-center">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => onSelectScenario(sc.id)}
            disabled={isAnimating}
            className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeScenarioId === sc.id
                ? 'bg-charcoal-700 text-white font-bold border border-charcoal-600/50 shadow-inner'
                : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-900/40 disabled:opacity-40'
            }`}
          >
            Scenario {sc.id}
          </button>
        ))}
      </div>

      {/* Ambulance Rider Auth Control */}
      <div className="flex items-center justify-end self-center">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-charcoal-600 bg-charcoal-800 hover:bg-charcoal-700 text-xs text-white transition-all font-semibold"
            >
              <div className="h-2 w-2 rounded-full bg-medical-green animate-pulse" />
              <span>{user.name}</span>
              <span className="text-charcoal-400 text-[10px] font-mono">({user.id})</span>
              <ChevronDown className="h-3 w-3 text-charcoal-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-charcoal-800 border border-charcoal-700 rounded-lg shadow-xl py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-charcoal-700 text-[10px] text-charcoal-400 uppercase font-bold tracking-wider font-mono">
                  Active Shift Details
                </div>
                <div className="px-3 py-2 text-xs text-gray-300">
                  <div className="font-semibold">{user.station}</div>
                  <div className="text-[10px] text-charcoal-400 mt-0.5">Duty Duration: 04h 12m</div>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-charcoal-700 flex items-center gap-2 transition-colors border-t border-charcoal-700 mt-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  End Active Shift
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-medical-blue hover:bg-sky-500 text-charcoal-950 font-bold text-xs shadow-lg shadow-medical-blue/15 transition-all"
          >
            <LogIn className="h-3.5 w-3.5" />
            Rider Login
          </button>
        )}
      </div>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-charcoal-800 border border-charcoal-600 rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white font-display mb-1">
              Ambulance Rider Authentication
            </h3>
            <p className="text-xs text-charcoal-400 mb-4">
              Enter your station credentials to assign dispatches to your unit.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-charcoal-300 uppercase tracking-widest mb-1.5">
                  Responder ID / Callsign
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-charcoal-900 border border-charcoal-600 text-xs text-white focus:outline-none focus:border-medical-blue font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-charcoal-300 uppercase tracking-widest mb-1.5">
                  Shift Passcode
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-charcoal-900 border border-charcoal-600 text-xs text-white focus:outline-none focus:border-medical-blue font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-charcoal-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-medical-blue hover:bg-sky-500 text-charcoal-950 font-bold text-xs transition-colors"
                >
                  Authenticate Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
