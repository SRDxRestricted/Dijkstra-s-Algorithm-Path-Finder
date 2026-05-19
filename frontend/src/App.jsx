import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import EmergencyFeed from './components/EmergencyFeed';
import MapPanel from './components/MapPanel';
import { fetchScenarios, fetchScenarioDetails, calculateRoute } from './utils/api';
import { AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  const [scenarios, setScenarios] = useState([]);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [activeScenario, setActiveScenario] = useState(null);
  const [activePatient, setActivePatient] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  
  // Shift Rider Auth State
  const [user, setUser] = useState({ name: 'Officer Sterling', id: 'RIDER-402', station: 'Alpha Station' });
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStep, setAnimationStep] = useState(null);
  
  // Loading & error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial list of scenarios
  useEffect(() => {
    async function loadInitial() {
      try {
        const data = await fetchScenarios();
        setScenarios(data);
        if (data.length > 0) {
          setActiveScenarioId(data[0].id);
        }
      } catch (err) {
        console.error("Error loading scenarios:", err);
        setError("API connection failed. Please ensure the backend server is running.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Fetch scenario details when active scenario ID changes
  useEffect(() => {
    if (!activeScenarioId) return;

    async function loadScenarioDetails() {
      setIsLoading(true);
      try {
        // Clear old routing states
        setActivePatient(null);
        setRouteResult(null);
        setIsAnimating(false);
        setAnimationStep(null);

        const details = await fetchScenarioDetails(activeScenarioId);
        setActiveScenario(details);
      } catch (err) {
        console.error("Error loading scenario details:", err);
        setError("Failed to load scenario details.");
      } finally {
        setIsLoading(false);
      }
    }
    loadScenarioDetails();
  }, [activeScenarioId]);

  // Handle patient card click / Acceptance
  const handleAcceptPatient = async (patient) => {
    if (isAnimating) return;
    
    // Reset routing states
    setRouteResult(null);
    setAnimationStep(null);
    setActivePatient(patient);

    try {
      const data = await calculateRoute(activeScenarioId, patient.id);
      setRouteResult(data.result);
    } catch (err) {
      console.error("Error calculating route:", err);
      setError("Failed to calculate routing path. Check backend connection.");
    }
  };

  // Run Dijkstra simulation loop
  const handleAnimatePathfinding = () => {
    if (!routeResult || !routeResult.steps || routeResult.steps.length === 0 || isAnimating) return;

    setIsAnimating(true);
    let stepIndex = 0;
    const steps = routeResult.steps;

    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        setAnimationStep(steps[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        setAnimationStep(null);
      }
    }, 220); // 220ms expansion delay
  };

  const handleResetRoute = () => {
    setActivePatient(null);
    setRouteResult(null);
    setIsAnimating(false);
    setAnimationStep(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-charcoal-950 text-gray-200 font-sans select-none">
      
      {/* Global Header */}
      <Header 
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onSelectScenario={setActiveScenarioId}
        user={user}
        onLogin={setUser}
        onLogout={() => setUser(null)}
        isAnimating={isAnimating}
      />

      {/* Warning Overlay */}
      {error && (
        <div className="bg-medical-red/10 border-b border-medical-red/30 text-medical-red text-xs p-3 flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 animate-bounce" />
            <span className="font-semibold">{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="hover:text-white font-bold bg-medical-red/15 px-2.5 py-1 rounded"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main dashboard content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 w-full">
        
        {/* Left Triage Feed Panel (35% width) */}
        <div className="w-full md:w-[35%] flex flex-col h-full min-h-0">
          <EmergencyFeed 
            patients={activeScenario?.patients || []}
            onAcceptPatient={handleAcceptPatient}
            activePatient={activePatient}
            isAnimating={isAnimating}
          />
        </div>

        {/* Right Map Canvas Panel (65% width) */}
        <div className="w-full md:w-[65%] flex flex-col h-full min-h-0 bg-charcoal-900">
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-charcoal-400 bg-charcoal-950">
                <Cpu className="h-8 w-8 text-medical-blue animate-spin mb-3" />
                <p className="text-xs font-bold text-white tracking-wide font-mono uppercase">Syncing Map Overlay...</p>
                <p className="text-[10px] text-charcoal-500 mt-1">Downloading road network structures...</p>
              </div>
            ) : (
              <MapPanel 
                nodes={activeScenario?.nodes || []}
                edges={activeScenario?.edges || []}
                center={activeScenario?.center || [51.505, -0.09]}
                zoom={activeScenario?.zoom || 13}
                activePatient={activePatient}
                routeResult={routeResult}
                isAnimating={isAnimating}
                animationStep={animationStep}
                onAnimate={handleAnimatePathfinding}
                onReset={handleResetRoute}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
