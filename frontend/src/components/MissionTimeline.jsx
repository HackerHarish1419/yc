import { Clock, AlertTriangle, CheckCircle, Cpu, Radio, Shield } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';

const EVENT_ICONS = {
  'EW_ATTACK_DETECTED': AlertTriangle,
  'COPILOT_RECOMMENDATION': Cpu,
  'RECOMMENDATION_APPROVED': CheckCircle,
  'SWARM_RESET': Shield,
  'GPS_ANOMALY': Radio,
};

const EVENT_COLORS = {
  'EW_ATTACK_DETECTED': '#FF3B30',
  'COPILOT_RECOMMENDATION': '#007AFF',
  'RECOMMENDATION_APPROVED': '#00FF66',
  'SWARM_RESET': '#8F939D',
  'GPS_ANOMALY': '#FFB300',
};

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
}

function MissionTimeline({ events }) {
  return (
    <div className="h-full flex flex-col" data-testid="mission-timeline">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[#2A2D35] flex items-center justify-between shrink-0">
        <span className="text-xs font-mono text-[#8F939D] tracking-[0.2em] uppercase">
          MISSION TIMELINE
        </span>
        <Clock className="w-3 h-3 text-[#5C5F66]" />
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="w-6 h-6 text-[#5C5F66]/50 mb-2" />
              <span className="text-xs font-mono text-[#5C5F66]">NO EVENTS YET</span>
            </div>
          ) : (
            <div className="space-y-0">
              {events.map((event, index) => {
                const IconComponent = EVENT_ICONS[event.event_type] || Clock;
                const color = EVENT_COLORS[event.event_type] || '#8F939D';
                
                return (
                  <div 
                    key={event.id || index}
                    className="relative pl-6 pb-4 last:pb-0"
                    data-testid={`timeline-event-${index}`}
                  >
                    {/* Timeline line */}
                    {index < events.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-[#2A2D35]"></div>
                    )}
                    
                    {/* Icon */}
                    <div 
                      className="absolute left-0 top-0 w-4 h-4 flex items-center justify-center"
                      style={{ color }}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    
                    {/* Content */}
                    <div className="ml-2">
                      <div className="flex items-center justify-between mb-1">
                        <span 
                          className="text-[10px] font-mono font-bold uppercase tracking-wider"
                          style={{ color }}
                        >
                          {event.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] font-mono text-[#5C5F66]">
                          {formatTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#8F939D] leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default MissionTimeline;
