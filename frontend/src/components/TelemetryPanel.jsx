import { Activity, Battery, Navigation, Radio, Crosshair } from 'lucide-react';
import { Progress } from '../components/ui/progress';

function TelemetryPanel({ drones, selectedDrone, onSelectDrone }) {
  return (
    <div className="h-full flex flex-col" data-testid="telemetry-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2A2D35] flex items-center justify-between">
        <span className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase">
          SWARM TELEMETRY
        </span>
        <span className="text-xs font-mono text-[#5C5F66]">
          {drones.length} ASSETS TRACKED
        </span>
      </div>
      
      {/* Telemetry Grid */}
      <div className="flex-1 overflow-x-auto">
        <div className="grid grid-cols-5 gap-0 min-w-[800px] h-full">
          {drones.map((drone) => (
            <div 
              key={drone.id}
              onClick={() => onSelectDrone(drone)}
              className={`border-r border-[#2A2D35] last:border-r-0 p-3 cursor-pointer transition-colors
                ${selectedDrone?.id === drone.id ? 'bg-[#007AFF]/10 border-t-2 border-t-[#007AFF]' : 'hover:bg-[#0A0A0A]/50'}
                ${drone.status === 'CRITICAL' ? 'critical-flash' : ''}`}
              data-testid={`drone-${drone.id}-telemetry`}
            >
              {/* Drone Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 ${
                    drone.status === 'CRITICAL' ? 'bg-[#FF3B30] status-pulse' :
                    drone.status === 'WARNING' ? 'bg-[#FFB300]' :
                    'bg-[#00FF66]'
                  }`}></span>
                  <span className="font-mono font-bold text-sm">{drone.id}</span>
                </div>
                <span className="text-[10px] font-mono text-[#5C5F66] uppercase">
                  {drone.mission_role}
                </span>
              </div>
              
              <div className="text-xs font-mono text-[#8F939D] mb-3">
                {drone.callsign}
              </div>
              
              {/* GPS Status */}
              <div className="flex items-center gap-2 mb-2">
                <Crosshair className="w-3 h-3 text-[#5C5F66]" />
                <span className="text-xs font-mono text-[#5C5F66]">GPS:</span>
                <span className={`text-xs font-mono font-bold ${
                  drone.gps_status === 'LOST' ? 'text-[#FF3B30]' :
                  drone.gps_status === 'DEGRADED' ? 'text-[#FFB300]' :
                  'text-[#00FF66]'
                }`} data-testid={`drone-${drone.id}-gps-status`}>
                  {drone.gps_status}
                </span>
              </div>
              
              {/* Altitude */}
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-3 h-3 text-[#5C5F66]" />
                <span className="text-xs font-mono text-[#5C5F66]">ALT:</span>
                <span className="text-xs font-mono text-white">{drone.altitude}m</span>
              </div>
              
              {/* Speed & Heading */}
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3 h-3 text-[#5C5F66]" />
                <span className="text-xs font-mono text-[#5C5F66]">SPD:</span>
                <span className="text-xs font-mono text-white">{drone.speed.toFixed(1)} m/s</span>
                <span className="text-xs font-mono text-[#5C5F66]">@{drone.heading}°</span>
              </div>
              
              {/* Signal Strength */}
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-3 h-3 text-[#5C5F66]" />
                <span className="text-xs font-mono text-[#5C5F66]">RSSI:</span>
                <span className={`text-xs font-mono ${
                  drone.signal_strength < -70 ? 'text-[#FF3B30]' :
                  drone.signal_strength < -50 ? 'text-[#FFB300]' :
                  'text-[#00FF66]'
                }`} data-testid={`drone-${drone.id}-signal`}>
                  {drone.signal_strength}dBm
                </span>
              </div>
              
              {/* Battery */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Battery className={`w-3 h-3 ${
                      drone.battery < 20 ? 'text-[#FF3B30]' :
                      drone.battery < 40 ? 'text-[#FFB300]' :
                      'text-[#5C5F66]'
                    }`} />
                    <span className="text-xs font-mono text-[#5C5F66]">BAT:</span>
                  </div>
                  <span className={`text-xs font-mono ${
                    drone.battery < 20 ? 'text-[#FF3B30]' :
                    drone.battery < 40 ? 'text-[#FFB300]' :
                    'text-white'
                  }`}>
                    {drone.battery}%
                  </span>
                </div>
                <Progress 
                  value={drone.battery} 
                  className="h-1 bg-[#2A2D35] rounded-none"
                  indicatorClassName={`rounded-none ${
                    drone.battery < 20 ? 'bg-[#FF3B30]' :
                    drone.battery < 40 ? 'bg-[#FFB300]' :
                    'bg-[#00FF66]'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TelemetryPanel;
