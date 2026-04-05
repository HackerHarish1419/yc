# AURA-V - Adaptive UAV Response Architecture (Vector)

## Original Problem Statement
Build a demo for AURA-V - The Cognitive Copilot for Mission-Critical Swarms in GPS-Denied Environments. A React-powered "Glass Cockpit" War Room UI tracking a 5-drone swarm on a map, with simulated Electronic Warfare attack triggering GPS loss on Drone-1, and an AI copilot that generates tactical recommendations within 3 seconds.

## User Personas
1. **Drone Swarm Operator** - Military/defense personnel monitoring swarm telemetry and making tactical decisions
2. **Mission Commander** - Oversight role reviewing AI recommendations and approving actions
3. **Defense Analyst** - Reviewing mission timelines and anomaly events

## Core Requirements (Static)
- Real-time drone swarm visualization on tactical map
- 5-drone swarm telemetry monitoring (GPS, altitude, battery, signal)
- AI decision copilot for tactical recommendations
- EW attack simulation with GPS jamming
- ROE (Rules of Engagement) compliance checking
- Decision cards for operator approval
- Mission event timeline

## Technical Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **Map**: Leaflet with CartoDB Dark Matter tiles
- **AI**: Ollama 7B (with mock fallback)
- **Theme**: Dark tactical military style

## What's Been Implemented (April 5, 2026)

### Backend (`/app/backend/server.py`)
- `GET /api/health` - System health check with Ollama status
- `GET /api/swarm/state` - Current swarm state with 5 drones
- `POST /api/swarm/simulate-ew-attack` - Triggers GPS jamming on D-1
- `POST /api/swarm/reset` - Reset swarm to nominal state
- `POST /api/copilot/recommend` - Get AI tactical recommendation
- `POST /api/copilot/approve/{id}` - Approve and execute recommendation
- `GET /api/mission/events` - Mission event timeline
- `GET /api/mission/anomalies` - Anomaly events log

### Frontend Components
- `App.js` - Main dashboard with Control Room grid layout
- `DroneMap.jsx` - Leaflet map with drone markers and ROE boundary
- `TelemetryPanel.jsx` - 5-drone telemetry display
- `SwarmStatus.jsx` - Swarm status overview panel
- `AICopilotCard.jsx` - AI recommendation card with typewriter effect
- `AlertPanel.jsx` - Active alerts display
- `MissionTimeline.jsx` - Mission event timeline

### Features Working
✅ Dark tactical theme (Chivo/Inter/JetBrains Mono fonts)
✅ 5-drone swarm visualization on Leaflet map
✅ Real-time telemetry display (GPS, altitude, battery, signal)
✅ EW attack simulation button
✅ D-1 turns CRITICAL with GPS LOST status
✅ AI Copilot generates tactical recommendation
✅ Recovery protocol with numbered steps
✅ Swarm reassignment vectors (D-2, D-3 expand sectors)
✅ ROE compliance status (GREEN)
✅ Approve & Execute button
✅ Alert panel with active alerts
✅ Mission timeline with events
✅ Reset functionality

## Prioritized Backlog

### P0 (Critical)
- None - MVP complete

### P1 (High Priority)
- Connect to real Ollama instance for live AI recommendations
- Add drone position animation/movement simulation
- Implement actual drone reassignment visualization on map

### P2 (Medium Priority)
- Add more anomaly types (signal loss, battery critical)
- Implement multi-step recovery protocols
- Add audio alerts for critical events
- Historical mission playback

### P3 (Low Priority)
- Mobile responsive design
- Export mission reports
- User authentication/roles
- Multiple mission support

## Next Tasks
1. Deploy with real Ollama 7B model for live AI recommendations
2. Add animated drone movement on the map
3. Implement additional anomaly scenarios
4. Add keyboard shortcuts for rapid response
