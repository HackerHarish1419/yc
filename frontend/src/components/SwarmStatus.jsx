import { Shield, Cpu, Activity, Radio } from 'lucide-react';

function SwarmStatus({ swarmState, systemHealth }) {
  if (!swarmState) {
    return (
      <div className="border border-[#2A2D35] bg-[#0A0A0A] p-4" data-testid="swarm-status">
        <div className="flex items-center justify-center h-24">
          <span className="text-xs font-mono text-[#5C5F66] animate-pulse">
            LOADING SWARM DATA...
          </span>
        </div>
      </div>
    );
  }

  const activeDrones = swarmState.drones.filter(d => d.status === 'ACTIVE').length;
  const warningDrones = swarmState.drones.filter(d => d.status === 'WARNING').length;
  const criticalDrones = swarmState.drones.filter(d => d.status === 'CRITICAL').length;
  
  const overallStatus = criticalDrones > 0 ? 'CRITICAL' : 
                        warningDrones > 0 ? 'WARNING' : 'NOMINAL';

  return (
    <div className="border border-[#2A2D35] bg-[#0A0A0A]" data-testid="swarm-status">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2A2D35] flex items-center justify-between">
        <span className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase">
          SWARM STATUS
        </span>
        <div className={`flex items-center gap-2 px-2 py-1 ${
          overallStatus === 'CRITICAL' ? 'bg-[#FF3B30]/20' :
          overallStatus === 'WARNING' ? 'bg-[#FFB300]/20' :
          'bg-[#00FF66]/20'
        }`}>
          <span className={`w-2 h-2 ${
            overallStatus === 'CRITICAL' ? 'bg-[#FF3B30] status-pulse' :
            overallStatus === 'WARNING' ? 'bg-[#FFB300]' :
            'bg-[#00FF66]'
          }`}></span>
          <span className={`text-[10px] font-mono font-bold tracking-wider ${
            overallStatus === 'CRITICAL' ? 'text-[#FF3B30]' :
            overallStatus === 'WARNING' ? 'text-[#FFB300]' :
            'text-[#00FF66]'
          }`} data-testid="swarm-overall-status">
            {overallStatus}
          </span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Active Drones */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#2A2D35] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#00FF66]" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-white">{activeDrones}</div>
              <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider">Active</div>
            </div>
          </div>
          
          {/* Warning Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#2A2D35] flex items-center justify-center">
              <Activity className={`w-5 h-5 ${warningDrones > 0 ? 'text-[#FFB300]' : 'text-[#5C5F66]'}`} />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-white">{warningDrones}</div>
              <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider">Warning</div>
            </div>
          </div>
          
          {/* Critical Status */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border flex items-center justify-center ${
              criticalDrones > 0 ? 'border-[#FF3B30] bg-[#FF3B30]/10' : 'border-[#2A2D35]'
            }`}>
              <Radio className={`w-5 h-5 ${criticalDrones > 0 ? 'text-[#FF3B30]' : 'text-[#5C5F66]'}`} />
            </div>
            <div>
              <div className={`text-2xl font-mono font-bold ${
                criticalDrones > 0 ? 'text-[#FF3B30]' : 'text-white'
              }`} data-testid="critical-count">
                {criticalDrones}
              </div>
              <div className="text-[10px] font-mono text-[#5C5F66] uppercase tracking-wider">Critical</div>
            </div>
          </div>
          
          {/* AI Status */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border flex items-center justify-center ${
              systemHealth?.gemini_available ? 'border-[#007AFF] bg-[#007AFF]/10' : 'border-[#2A2D35]'
            }`}>
              <Cpu className={`w-5 h-5 ${
                systemHealth?.gemini_available ? 'text-[#007AFF]' : 'text-[#FFB300]'
              }`} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-white">COPILOT</div>
              <div className={`text-[10px] font-mono uppercase tracking-wider ${
                systemHealth?.gemini_available ? 'text-[#007AFF]' : 'text-[#FFB300]'
              }`}>
                {systemHealth?.gemini_available ? 'GEMINI' : 'MOCK'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Mission Info */}
        <div className="mt-4 pt-4 border-t border-[#2A2D35]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5C5F66]">MISSION:</span>
            <span className="text-white">{swarmState.mission_id}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono mt-1">
            <span className="text-[#5C5F66]">STATUS:</span>
            <span className={`${
              swarmState.mission_status === 'ACTIVE' ? 'text-[#00FF66]' : 'text-[#FFB300]'
            }`}>
              {swarmState.mission_status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SwarmStatus;
