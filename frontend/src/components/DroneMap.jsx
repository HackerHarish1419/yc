import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom drone icon creator
const createDroneIcon = (status, isSelected, isLead) => {
  const color = status === 'CRITICAL' ? '#FF3B30' : 
                status === 'WARNING' ? '#FFB300' : '#00FF66';
  const size = isSelected ? 32 : 24;
  const strokeWidth = isSelected ? 3 : 2;
  
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" fill="${status === 'CRITICAL' ? '#FF3B30' : '#0A0A0A'}" stroke="${color}" stroke-width="${strokeWidth}"/>
      <circle cx="12" cy="12" r="3" fill="${color}"/>
      ${isLead ? '<circle cx="12" cy="12" r="5" stroke="#007AFF" stroke-width="1" stroke-dasharray="2 2"/>' : ''}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'drone-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  });
};

// Component to handle map center updates
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// ROE Boundary polygon (restricted area)
const ROE_BOUNDARY = [
  [34.058, -118.255],
  [34.058, -118.235],
  [34.045, -118.235],
  [34.045, -118.255],
];

function DroneMap({ drones, selectedDrone, onSelectDrone, ewAttackActive }) {
  const mapRef = useRef(null);
  
  // Default center (Los Angeles area)
  const defaultCenter = [34.0522, -118.2437];
  
  // Calculate center based on drones
  const center = drones.length > 0 
    ? [
        drones.reduce((sum, d) => sum + d.lat, 0) / drones.length,
        drones.reduce((sum, d) => sum + d.lng, 0) / drones.length
      ]
    : defaultCenter;

  return (
    <MapContainer 
      center={center} 
      zoom={14} 
      className="h-full w-full"
      ref={mapRef}
      zoomControl={true}
      data-testid="drone-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapUpdater center={selectedDrone ? [selectedDrone.lat, selectedDrone.lng] : null} />
      
      {/* ROE Boundary - Restricted Area */}
      <Polygon 
        positions={ROE_BOUNDARY}
        pathOptions={{
          color: '#FF3B30',
          fillColor: '#FF3B30',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 10'
        }}
      />
      
      {/* Drone Markers */}
      {drones.map((drone) => (
        <Marker
          key={drone.id}
          position={[drone.lat, drone.lng]}
          icon={createDroneIcon(
            drone.status, 
            selectedDrone?.id === drone.id,
            drone.mission_role === 'LEAD'
          )}
          eventHandlers={{
            click: () => onSelectDrone(drone)
          }}
        >
          <Popup className="drone-popup">
            <div className="bg-[#0A0A0A] text-white p-2 font-mono text-xs min-w-[180px]">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#2A2D35]">
                <span className="font-bold">{drone.callsign}</span>
                <span className={`px-2 py-0.5 text-[10px] uppercase ${
                  drone.status === 'CRITICAL' ? 'bg-[#FF3B30]/20 text-[#FF3B30]' :
                  drone.status === 'WARNING' ? 'bg-[#FFB300]/20 text-[#FFB300]' :
                  'bg-[#00FF66]/20 text-[#00FF66]'
                }`}>
                  {drone.status}
                </span>
              </div>
              <div className="space-y-1 text-[#8F939D]">
                <div className="flex justify-between">
                  <span>GPS:</span>
                  <span className={drone.gps_status === 'LOST' ? 'text-[#FF3B30]' : 'text-[#00FF66]'}>
                    {drone.gps_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ALT:</span>
                  <span className="text-white">{drone.altitude}m</span>
                </div>
                <div className="flex justify-between">
                  <span>BAT:</span>
                  <span className="text-white">{drone.battery}%</span>
                </div>
                <div className="flex justify-between">
                  <span>RSSI:</span>
                  <span className="text-white">{drone.signal_strength}dBm</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* EW Attack Indicator */}
      {ewAttackActive && (
        <div className="absolute top-14 right-4 z-[1000] bg-[#FF3B30]/20 border border-[#FF3B30] px-3 py-2">
          <span className="text-xs font-mono text-[#FF3B30] tracking-wider uppercase animate-pulse">
            ⚠ EW THREAT ACTIVE
          </span>
        </div>
      )}
    </MapContainer>
  );
}

export default DroneMap;
