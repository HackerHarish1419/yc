import { AlertTriangle, Radio, ShieldAlert, Zap } from 'lucide-react';

function AlertPanel({ drones, ewAttackActive }) {
  const criticalDrones = drones.filter(d => d.status === 'CRITICAL');
  const warningDrones = drones.filter(d => d.status === 'WARNING');
  const gpsLostDrones = drones.filter(d => d.gps_status === 'LOST');
  const lowBatteryDrones = drones.filter(d => d.battery < 30);
  const lowSignalDrones = drones.filter(d => d.signal_strength < -70);

  const alerts = [];

  // EW Attack Alert
  if (ewAttackActive) {
    alerts.push({
      id: 'ew-attack',
      severity: 'CRITICAL',
      icon: Zap,
      title: 'ELECTRONIC WARFARE DETECTED',
      description: 'GPS jamming affecting swarm assets',
      time: 'NOW'
    });
  }

  // GPS Lost Alerts
  gpsLostDrones.forEach(drone => {
    alerts.push({
      id: `gps-${drone.id}`,
      severity: 'CRITICAL',
      icon: ShieldAlert,
      title: `GPS LOST - ${drone.callsign}`,
      description: `Asset ${drone.id} has lost GPS lock`,
      time: 'ACTIVE'
    });
  });

  // Low Signal Alerts
  lowSignalDrones.forEach(drone => {
    if (drone.status !== 'CRITICAL') {
      alerts.push({
        id: `signal-${drone.id}`,
        severity: 'WARNING',
        icon: Radio,
        title: `WEAK SIGNAL - ${drone.callsign}`,
        description: `RSSI: ${drone.signal_strength}dBm`,
        time: 'ACTIVE'
      });
    }
  });

  // Low Battery Alerts
  lowBatteryDrones.forEach(drone => {
    alerts.push({
      id: `battery-${drone.id}`,
      severity: drone.battery < 15 ? 'CRITICAL' : 'WARNING',
      icon: AlertTriangle,
      title: `LOW BATTERY - ${drone.callsign}`,
      description: `Battery at ${drone.battery}%`,
      time: 'ACTIVE'
    });
  });

  return (
    <div className="border border-[#2A2D35] bg-[#0A0A0A] flex-1 min-h-0 flex flex-col" data-testid="alert-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2A2D35] flex items-center justify-between shrink-0">
        <span className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase">
          ALERTS
        </span>
        {alerts.length > 0 && (
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold ${
            alerts.some(a => a.severity === 'CRITICAL') 
              ? 'bg-[#FF3B30]/20 text-[#FF3B30]' 
              : 'bg-[#FFB300]/20 text-[#FFB300]'
          }`}>
            {alerts.length} ACTIVE
          </span>
        )}
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border border-[#00FF66]/30 flex items-center justify-center mb-2">
              <ShieldAlert className="w-4 h-4 text-[#00FF66]/50" />
            </div>
            <span className="text-xs font-mono text-[#5C5F66]">NO ACTIVE ALERTS</span>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2D35]">
            {alerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-3 ${
                  alert.severity === 'CRITICAL' 
                    ? 'border-l-2 border-l-[#FF3B30] bg-[#FF3B30]/5' 
                    : 'border-l-2 border-l-[#FFB300] bg-[#FFB300]/5'
                }`}
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start gap-2">
                  <alert.icon className={`w-4 h-4 mt-0.5 ${
                    alert.severity === 'CRITICAL' ? 'text-[#FF3B30]' : 'text-[#FFB300]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${
                        alert.severity === 'CRITICAL' ? 'text-[#FF3B30]' : 'text-[#FFB300]'
                      }`}>
                        {alert.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#5C5F66] shrink-0 ml-2">
                        {alert.time}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[#8F939D] mt-1">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertPanel;
