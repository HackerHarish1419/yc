import { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";

// Components
import DroneMap from "./components/DroneMap";
import TelemetryPanel from "./components/TelemetryPanel";
import SwarmStatus from "./components/SwarmStatus";
import AICopilotCard from "./components/AICopilotCard";
import MissionTimeline from "./components/MissionTimeline";
import AlertPanel from "./components/AlertPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Progress } from "./components/ui/progress";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Attack types available for simulation
const ATTACK_TYPES = [
  { id: "GPS_JAMMING", label: "GPS Jamming", description: "Electronic warfare disrupting GPS signal" },
  { id: "SIGNAL_LOSS", label: "Signal Loss", description: "Communication link degradation" },
  { id: "SPOOFING", label: "GPS Spoofing", description: "False GPS coordinates injection" },
  { id: "CYBER_INTRUSION", label: "Cyber Intrusion", description: "Attempted system breach detected" },
];

// Formation descriptions
const FORMATIONS = {
  "SPREAD": "Independent spread - maximum coverage",
  "V_FORMATION": "V-shape - classic military pattern",
  "LINE": "Single file - follow the leader",
  "DIAMOND": "Diamond - balanced defense",
  "CIRCLE": "Circular - 360° patrol coverage"
};

function App() {
  const [swarmState, setSwarmState] = useState(null);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [ewAttackActive, setEwAttackActive] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [missionEvents, setMissionEvents] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [selectedAttackType, setSelectedAttackType] = useState("GPS_JAMMING");
  const [selectedTargetDrone, setSelectedTargetDrone] = useState("D-1");
  const [selectedFormation, setSelectedFormation] = useState("SPREAD");
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const lastAttackId = useRef(null); // Track last attack to prevent duplicates

  // Fetch swarm state
  const fetchSwarmState = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/swarm/state`);
      setSwarmState(response.data);
      setEwAttackActive(response.data.ew_attack_active);
      setSelectedFormation(response.data.formation || "SPREAD");
    } catch (e) {
      console.error("Failed to fetch swarm state:", e);
    }
  }, []);

  // Fetch mission events
  const fetchMissionEvents = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/mission/events?limit=20`);
      setMissionEvents(response.data);
    } catch (e) {
      console.error("Failed to fetch mission events:", e);
    }
  }, []);

  // Fetch recovery status
  const fetchRecoveryStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/swarm/recovery-status`);
      setRecoveryStatus(response.data);
    } catch (e) {
      console.error("Failed to fetch recovery status:", e);
    }
  }, []);

  // Fetch system health
  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/health`);
      setSystemHealth(response.data);
    } catch (e) {
      console.error("Failed to fetch system health:", e);
    }
  }, []);

  // Simulate Attack with user-selected type
  const simulateAttack = async () => {
    try {
      // Prevent duplicate attacks
      const attackId = `${selectedAttackType}-${selectedTargetDrone}-${Date.now()}`;
      if (lastAttackId.current === attackId) return;
      lastAttackId.current = attackId;

      setIsLoadingRecommendation(true);
      
      // Trigger the attack with selected parameters
      const attackResponse = await axios.post(`${API}/swarm/simulate-attack`, {
        attack_type: selectedAttackType,
        target_drone: selectedTargetDrone
      });
      
      const attackLabel = ATTACK_TYPES.find(a => a.id === selectedAttackType)?.label || selectedAttackType;
      toast.error(`THREAT DETECTED - ${attackLabel.toUpperCase()} ON ${selectedTargetDrone}`, {
        duration: 5000,
      });
      
      // Update state immediately
      await fetchSwarmState();
      await fetchMissionEvents();
      
      // Get tactical recommendation
      const recResponse = await axios.post(`${API}/copilot/recommend`, {
        anomaly_type: selectedAttackType,
        affected_drone_id: selectedTargetDrone,
        swarm_state: swarmState,
        roe_constraints: {
          restricted_zones: [[34.06, -118.25], [34.04, -118.23]],
          civilian_corridors: true
        }
      });
      
      setRecommendation(recResponse.data);
      setIsLoadingRecommendation(false);
      
    } catch (e) {
      console.error("Failed to simulate attack:", e);
      setIsLoadingRecommendation(false);
      toast.error("Failed to process attack simulation");
    }
  };

  // Reset swarm
  const resetSwarm = async () => {
    try {
      await axios.post(`${API}/swarm/reset?formation=${selectedFormation}`);
      setRecommendation(null);
      setEwAttackActive(false);
      setRecoveryStatus(null);
      lastAttackId.current = null; // Clear attack tracking
      await fetchSwarmState();
      await fetchMissionEvents();
      toast.success("Swarm reset to nominal status");
    } catch (e) {
      console.error("Failed to reset swarm:", e);
      toast.error("Failed to reset swarm");
    }
  };

  // Change formation
  const changeFormation = async (formation) => {
    try {
      await axios.post(`${API}/swarm/set-formation?formation=${formation}`);
      setSelectedFormation(formation);
      await fetchSwarmState();
      await fetchMissionEvents();
      toast.success(`Formation changed to ${formation}`);
    } catch (e) {
      console.error("Failed to change formation:", e);
      toast.error("Failed to change formation");
    }
  };

  // Start recovery
  const startRecovery = async (droneId, recommendationId) => {
    try {
      await axios.post(`${API}/swarm/start-recovery/${droneId}?recommendation_id=${recommendationId}`);
      toast.success(`Recovery started for ${droneId}`);
      await fetchSwarmState();
      await fetchMissionEvents();
      await fetchRecoveryStatus();
    } catch (e) {
      console.error("Failed to start recovery:", e);
      toast.error("Failed to start recovery");
    }
  };

  // Advance recovery step
  const advanceRecovery = async () => {
    try {
      const response = await axios.post(`${API}/swarm/advance-recovery`);
      if (response.data.status === "recovery_completed") {
        toast.success(`Recovery completed! Asset restored to NOMINAL`);
        setRecommendation(null);
        setRecoveryStatus(null);
      } else {
        toast.success(`Step ${response.data.step} completed (${response.data.progress}%)`);
      }
      await fetchSwarmState();
      await fetchMissionEvents();
      await fetchRecoveryStatus();
    } catch (e) {
      console.error("Failed to advance recovery:", e);
      toast.error("Failed to advance recovery step");
    }
  };

  // Approve recommendation and start recovery
  const approveRecommendation = async (recommendationId) => {
    try {
      await axios.post(`${API}/copilot/approve/${recommendationId}`);
      // Find the affected drone from recommendation context
      const affectedDrone = selectedTargetDrone;
      await startRecovery(affectedDrone, recommendationId);
    } catch (e) {
      console.error("Failed to approve recommendation:", e);
      toast.error("Failed to approve recommendation");
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchSwarmState();
    fetchMissionEvents();
    fetchSystemHealth();
    fetchRecoveryStatus();

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchSwarmState();
      fetchRecoveryStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchSwarmState, fetchMissionEvents, fetchSystemHealth, fetchRecoveryStatus]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4" data-testid="aura-v-dashboard">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#0A0A0A',
            border: '1px solid #2A2D35',
            color: '#FFFFFF',
            fontFamily: 'JetBrains Mono, monospace',
          },
        }}
      />
      
      {/* Header */}
      <header className="flex items-center justify-between mb-4 pb-4 border-b border-[#2A2D35]">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter uppercase font-heading" data-testid="app-title">
            AURA-V
          </h1>
          <span className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase">
            Adaptive UAV Response Architecture
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${systemHealth?.ollama_available ? 'bg-[#00FF66]' : 'bg-[#FFB300]'}`}></span>
            <span className="text-[#8F939D]">
              AI: {systemHealth?.gemini_available ? 'GEMINI ONLINE' : 'MOCK MODE'}
            </span>
          </div>
          <div className="text-xs font-mono text-[#8F939D]">
            MSN: {swarmState?.mission_id || 'LOADING...'}
          </div>
        </div>
      </header>

      {/* Main Grid Layout - Control Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        
        {/* Left Panel - Map */}
        <div className="lg:col-span-8 lg:row-span-2 border border-[#2A2D35] bg-black overflow-hidden">
          <div className="h-full relative">
            <div className="absolute top-2 left-2 z-[1000] bg-[#0A0A0A]/90 px-3 py-1 border border-[#2A2D35]">
              <span className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase">
                TACTICAL OVERVIEW
              </span>
            </div>
            <DroneMap 
              drones={swarmState?.drones || []} 
              selectedDrone={selectedDrone}
              onSelectDrone={setSelectedDrone}
              ewAttackActive={ewAttackActive}
            />
          </div>
        </div>

        {/* Right Panel - Controls & Status */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
          
          {/* Swarm Status */}
          <SwarmStatus 
            swarmState={swarmState} 
            systemHealth={systemHealth}
          />

          {/* Formation Control Panel */}
          <div className="border border-[#2A2D35] bg-[#0A0A0A] p-4">
            <div className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase mb-3">
              FORMATION CONTROL
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#5C5F66] uppercase mb-1 block">Swarm Pattern</label>
              <Select value={selectedFormation} onValueChange={changeFormation}>
                <SelectTrigger className="bg-[#050505] border-[#2A2D35] text-white text-xs font-mono rounded-none h-9" data-testid="formation-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-[#2A2D35] rounded-none">
                  {Object.entries(FORMATIONS).map(([key, desc]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      className="text-xs font-mono text-white hover:bg-[#2A2D35] rounded-none"
                    >
                      {key.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] font-mono text-[#5C5F66] mt-2">
                {FORMATIONS[selectedFormation]}
              </p>
            </div>
          </div>

          {/* Attack Simulation Panel */}
          <div className="border border-[#2A2D35] bg-[#0A0A0A] p-4">
            <div className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase mb-3">
              THREAT SIMULATION
            </div>
            
            {/* Attack Type Selector */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-mono text-[#5C5F66] uppercase mb-1 block">Attack Type</label>
                <Select value={selectedAttackType} onValueChange={setSelectedAttackType}>
                  <SelectTrigger className="bg-[#050505] border-[#2A2D35] text-white text-xs font-mono rounded-none h-9" data-testid="attack-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-[#2A2D35] rounded-none">
                    {ATTACK_TYPES.map(attack => (
                      <SelectItem 
                        key={attack.id} 
                        value={attack.id}
                        className="text-xs font-mono text-white hover:bg-[#2A2D35] rounded-none"
                      >
                        {attack.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-[10px] font-mono text-[#5C5F66] uppercase mb-1 block">Target Drone</label>
                <Select value={selectedTargetDrone} onValueChange={setSelectedTargetDrone}>
                  <SelectTrigger className="bg-[#050505] border-[#2A2D35] text-white text-xs font-mono rounded-none h-9" data-testid="target-drone-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0A0A0A] border-[#2A2D35] rounded-none">
                    {(swarmState?.drones || []).map(drone => (
                      <SelectItem 
                        key={drone.id} 
                        value={drone.id}
                        className="text-xs font-mono text-white hover:bg-[#2A2D35] rounded-none"
                      >
                        {drone.id} ({drone.callsign})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Attack description */}
            <p className="text-[10px] font-mono text-[#5C5F66] mb-3">
              {ATTACK_TYPES.find(a => a.id === selectedAttackType)?.description}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={simulateAttack}
                disabled={ewAttackActive || isLoadingRecommendation}
                className={`flex-1 border-2 border-[#FF3B30] text-[#FF3B30] font-black uppercase tracking-widest p-3 
                  transition-all duration-200
                  ${ewAttackActive || isLoadingRecommendation 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-[#FF3B30] hover:text-white'}`}
                data-testid="attack-trigger"
              >
                {isLoadingRecommendation ? 'PROCESSING...' : 'EXECUTE SIMULATION'}
              </button>
              <button
                onClick={resetSwarm}
                className="px-4 border border-[#2A2D35] text-[#8F939D] font-mono text-sm uppercase
                  hover:border-[#434856] hover:text-white transition-colors"
                data-testid="reset-swarm-btn"
              >
                RESET
              </button>
            </div>
          </div>

          {/* AI Copilot Card */}
          {(recommendation || isLoadingRecommendation) && (
            <AICopilotCard 
              recommendation={recommendation}
              isLoading={isLoadingRecommendation}
              onApprove={approveRecommendation}
              recoveryStatus={recoveryStatus}
              onAdvanceRecovery={advanceRecovery}
            />
          )}

          {/* Alert Panel */}
          <AlertPanel 
            drones={swarmState?.drones || []}
            ewAttackActive={ewAttackActive}
          />

        </div>

        {/* Bottom Panel - Telemetry */}
        <div className="lg:col-span-8 border border-[#2A2D35] bg-[#0A0A0A] overflow-hidden">
          <TelemetryPanel 
            drones={swarmState?.drones || []}
            selectedDrone={selectedDrone}
            onSelectDrone={setSelectedDrone}
          />
        </div>

        {/* Bottom Right - Timeline */}
        <div className="lg:col-span-4 border border-[#2A2D35] bg-[#0A0A0A] overflow-hidden">
          <MissionTimeline events={missionEvents} />
        </div>

      </div>
    </div>
  );
}

export default App;
