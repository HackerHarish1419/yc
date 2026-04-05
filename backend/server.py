from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import json
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Ollama configuration
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.1:8b')

# Create the main app
app = FastAPI(title="AURA-V Backend", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===== Models =====
class DroneStatus(BaseModel):
    id: str
    callsign: str
    lat: float
    lng: float
    altitude: float
    battery: int
    signal_strength: int
    gps_status: str  # "NOMINAL", "DEGRADED", "LOST"
    status: str  # "ACTIVE", "WARNING", "CRITICAL"
    heading: int
    speed: float
    mission_role: str
    last_update: str


class SwarmState(BaseModel):
    drones: List[DroneStatus]
    mission_id: str
    mission_status: str
    ew_attack_active: bool


class AnomalyEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    drone_id: str
    anomaly_type: str
    severity: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved: bool = False


class TacticalRequest(BaseModel):
    anomaly_type: str
    affected_drone_id: str
    swarm_state: Dict[str, Any]
    roe_constraints: Optional[Dict[str, Any]] = None


class TacticalRecommendation(BaseModel):
    recommendation_id: str
    primary_action: str
    recovery_steps: List[str]
    reassignment_vectors: List[Dict[str, Any]]
    roe_compliance: str
    confidence: str
    timestamp: str


class MissionEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    description: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: Optional[Dict[str, Any]] = None


class AttackSimulationRequest(BaseModel):
    attack_type: str  # GPS_JAMMING, SIGNAL_LOSS, SPOOFING, CYBER_INTRUSION
    target_drone: str  # D-1, D-2, etc.


# Attack type configurations
ATTACK_CONFIGS = {
    "GPS_JAMMING": {
        "gps_status": "LOST",
        "signal_strength": -95,
        "status": "CRITICAL",
        "event_type": "EW_ATTACK_DETECTED",
        "description_template": "Electronic Warfare attack detected. GPS jamming affecting {drone_id} ({callsign})."
    },
    "SIGNAL_LOSS": {
        "gps_status": "NOMINAL",
        "signal_strength": -110,
        "status": "CRITICAL",
        "event_type": "SIGNAL_LOSS_DETECTED",
        "description_template": "Signal loss detected on {drone_id} ({callsign}). Communication degraded."
    },
    "SPOOFING": {
        "gps_status": "DEGRADED",
        "signal_strength": -50,
        "status": "WARNING",
        "event_type": "SPOOFING_DETECTED",
        "description_template": "GPS spoofing attempt detected on {drone_id} ({callsign}). Position data untrusted."
    },
    "CYBER_INTRUSION": {
        "gps_status": "NOMINAL",
        "signal_strength": -45,
        "status": "CRITICAL",
        "event_type": "CYBER_INTRUSION_DETECTED",
        "description_template": "Cyber intrusion detected on {drone_id} ({callsign}). Network isolation recommended."
    }
}


# ===== Initial Swarm Data =====
INITIAL_SWARM = [
    {
        "id": "D-1",
        "callsign": "ALPHA-1",
        "lat": 34.0522,
        "lng": -118.2437,
        "altitude": 1200,
        "battery": 87,
        "signal_strength": -42,
        "gps_status": "NOMINAL",
        "status": "ACTIVE",
        "heading": 45,
        "speed": 35.2,
        "mission_role": "LEAD",
        "last_update": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "D-2",
        "callsign": "BRAVO-2",
        "lat": 34.0532,
        "lng": -118.2457,
        "altitude": 1150,
        "battery": 92,
        "signal_strength": -38,
        "gps_status": "NOMINAL",
        "status": "ACTIVE",
        "heading": 42,
        "speed": 34.8,
        "mission_role": "RECON",
        "last_update": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "D-3",
        "callsign": "CHARLIE-3",
        "lat": 34.0512,
        "lng": -118.2417,
        "altitude": 1180,
        "battery": 78,
        "signal_strength": -45,
        "gps_status": "NOMINAL",
        "status": "ACTIVE",
        "heading": 48,
        "speed": 36.1,
        "mission_role": "SUPPORT",
        "last_update": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "D-4",
        "callsign": "DELTA-4",
        "lat": 34.0542,
        "lng": -118.2427,
        "altitude": 1220,
        "battery": 95,
        "signal_strength": -35,
        "gps_status": "NOMINAL",
        "status": "ACTIVE",
        "heading": 44,
        "speed": 35.5,
        "mission_role": "RELAY",
        "last_update": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": "D-5",
        "callsign": "ECHO-5",
        "lat": 34.0502,
        "lng": -118.2447,
        "altitude": 1100,
        "battery": 68,
        "signal_strength": -48,
        "gps_status": "NOMINAL",
        "status": "ACTIVE",
        "heading": 50,
        "speed": 33.9,
        "mission_role": "RESERVE",
        "last_update": datetime.now(timezone.utc).isoformat()
    }
]

# In-memory swarm state
current_swarm_state = {
    "drones": INITIAL_SWARM.copy(),
    "mission_id": "MSN-2026-ALPHA",
    "mission_status": "ACTIVE",
    "ew_attack_active": False
}


# ===== Helper Functions =====
async def check_ollama_health():
    """Check if Ollama server is available"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_URL}/")
            return response.status_code == 200
    except Exception:
        return False


async def generate_tactical_recommendation_ollama(request: TacticalRequest) -> str:
    """Generate tactical recommendation using Ollama"""
    prompt = f"""You are AURA-V, a tactical AI copilot for drone swarm operations. 
A critical anomaly has been detected:

ANOMALY TYPE: {request.anomaly_type}
AFFECTED ASSET: {request.affected_drone_id}
CURRENT SWARM STATUS: {len(request.swarm_state.get('drones', []))} assets active

Generate a tactical response following ROE (Rules of Engagement) constraints.
Provide:
1. PRIMARY ACTION (one sentence)
2. RECOVERY STEPS (numbered list, 3-4 steps)
3. SWARM REASSIGNMENT (which drones should cover the gap)
4. ROE COMPLIANCE STATUS

Keep response concise and military-style."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.7
                }
            )
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
    except Exception as e:
        logging.error(f"Ollama request failed: {e}")
    
    return None


def generate_mock_recommendation(request: TacticalRequest) -> TacticalRecommendation:
    """Generate mock tactical recommendation when Ollama unavailable"""
    drone_id = request.affected_drone_id
    
    recommendations = {
        "GPS_JAMMING": {
            "primary_action": f"IMMEDIATE: Switch {drone_id} to Visual-Inertial Odometry (VIO) mode. Initiate terrain-relative navigation.",
            "recovery_steps": [
                f"1. Activate VIO subsystem on {drone_id}",
                "2. Establish mesh network link with nearby assets for positional triangulation",
                "3. Reduce altitude to 800m for terrain feature recognition",
                "4. Execute gradual RTB on last known safe vector (heading 225°)"
            ],
            "reassignment_vectors": [
                {"drone_id": "D-2", "action": "EXPAND_SECTOR", "new_heading": 35, "note": "Cover northern gap"},
                {"drone_id": "D-3", "action": "EXPAND_SECTOR", "new_heading": 55, "note": "Cover eastern perimeter"}
            ],
            "roe_compliance": "GREEN - All recovery vectors clear of restricted airspace. Civilian corridor avoided.",
            "confidence": "HIGH"
        },
        "SIGNAL_LOSS": {
            "primary_action": f"IMMEDIATE: Initiate peer-to-peer relay chain. {drone_id} to broadcast on emergency mesh frequency.",
            "recovery_steps": [
                f"1. {drone_id} switch to P2P mesh protocol",
                "2. D-4 (RELAY) move to intermediate position for signal bridge",
                "3. Reduce data transmission rate to essential telemetry only",
                "4. Confirm link restoration within 30 seconds or initiate autonomous RTB"
            ],
            "reassignment_vectors": [
                {"drone_id": "D-4", "action": "REPOSITION", "new_lat": 34.0527, "new_lng": -118.2442, "note": "Signal relay position"}
            ],
            "roe_compliance": "GREEN - Relay positioning within operational boundaries.",
            "confidence": "HIGH"
        },
        "SPOOFING": {
            "primary_action": f"CRITICAL: {drone_id} GPS data compromised. Engage inertial navigation system and cross-reference with swarm consensus.",
            "recovery_steps": [
                f"1. Immediately disable GPS input on {drone_id}",
                "2. Switch to INS (Inertial Navigation System) with dead reckoning",
                "3. Cross-validate position with D-2 and D-4 radar returns",
                "4. Mark current coordinates as UNTRUSTED until verification complete"
            ],
            "reassignment_vectors": [
                {"drone_id": "D-2", "action": "VERIFY_POSITION", "note": f"Triangulate {drone_id} actual position"},
                {"drone_id": "D-4", "action": "RADAR_TRACK", "note": f"Track {drone_id} via radar"}
            ],
            "roe_compliance": "AMBER - Spoofing may have caused position drift. Verify before resuming mission.",
            "confidence": "MEDIUM"
        },
        "CYBER_INTRUSION": {
            "primary_action": f"ALERT: Cyber intrusion detected on {drone_id}. Isolate from swarm network immediately.",
            "recovery_steps": [
                f"1. Disconnect {drone_id} from swarm mesh network",
                "2. Enable autonomous safe-mode on affected asset",
                "3. Initiate system integrity check on remaining swarm",
                "4. Prepare manual override capability for compromised unit"
            ],
            "reassignment_vectors": [
                {"drone_id": "D-5", "action": "NETWORK_GUARD", "note": "Monitor for lateral movement"},
                {"drone_id": "D-4", "action": "RELAY_BYPASS", "note": f"Exclude {drone_id} from relay chain"}
            ],
            "roe_compliance": "RED - Asset potentially compromised. Do NOT execute offensive commands via affected unit.",
            "confidence": "MEDIUM"
        }
    }
    
    rec_data = recommendations.get(request.anomaly_type, recommendations["GPS_JAMMING"])
    
    return TacticalRecommendation(
        recommendation_id=str(uuid.uuid4())[:8].upper(),
        primary_action=rec_data["primary_action"],
        recovery_steps=rec_data["recovery_steps"],
        reassignment_vectors=rec_data["reassignment_vectors"],
        roe_compliance=rec_data["roe_compliance"],
        confidence=rec_data["confidence"],
        timestamp=datetime.now(timezone.utc).isoformat()
    )


# ===== API Routes =====
@api_router.get("/")
async def root():
    return {"message": "AURA-V Backend Online", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    """System health check"""
    ollama_available = await check_ollama_health()
    return {
        "status": "operational",
        "ollama_available": ollama_available,
        "ollama_model": OLLAMA_MODEL if ollama_available else "MOCK_MODE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/swarm/state", response_model=SwarmState)
async def get_swarm_state():
    """Get current swarm state"""
    return SwarmState(**current_swarm_state)


@api_router.post("/swarm/reset")
async def reset_swarm():
    """Reset swarm to initial state"""
    global current_swarm_state
    current_swarm_state = {
        "drones": [d.copy() for d in INITIAL_SWARM],
        "mission_id": "MSN-2026-ALPHA",
        "mission_status": "ACTIVE",
        "ew_attack_active": False
    }
    for drone in current_swarm_state["drones"]:
        drone["last_update"] = datetime.now(timezone.utc).isoformat()
    
    # Log event
    event = MissionEvent(
        event_type="SWARM_RESET",
        description="Swarm state reset to initial configuration"
    )
    await db.mission_events.insert_one(event.model_dump())
    
    return {"status": "reset", "swarm_state": current_swarm_state}


@api_router.post("/swarm/simulate-ew-attack")
async def simulate_ew_attack():
    """Simulate Electronic Warfare attack on Drone-1 (legacy endpoint)"""
    global current_swarm_state
    
    # Find and update D-1
    for drone in current_swarm_state["drones"]:
        if drone["id"] == "D-1":
            drone["gps_status"] = "LOST"
            drone["signal_strength"] = -95
            drone["status"] = "CRITICAL"
            drone["last_update"] = datetime.now(timezone.utc).isoformat()
            break
    
    current_swarm_state["ew_attack_active"] = True
    
    # Log anomaly event
    anomaly = AnomalyEvent(
        drone_id="D-1",
        anomaly_type="GPS_JAMMING",
        severity="CRITICAL"
    )
    await db.anomaly_events.insert_one(anomaly.model_dump())
    
    # Log mission event
    event = MissionEvent(
        event_type="EW_ATTACK_DETECTED",
        description="Electronic Warfare attack detected. GPS jamming affecting D-1 (ALPHA-1).",
        data={"affected_drone": "D-1", "anomaly_type": "GPS_JAMMING"}
    )
    await db.mission_events.insert_one(event.model_dump())
    
    return {
        "status": "attack_simulated",
        "affected_drone": "D-1",
        "anomaly_type": "GPS_JAMMING",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/swarm/simulate-attack")
async def simulate_attack(request: AttackSimulationRequest):
    """Simulate attack with user-selected type and target drone"""
    global current_swarm_state
    
    attack_type = request.attack_type
    target_drone = request.target_drone
    
    # Get attack configuration
    config = ATTACK_CONFIGS.get(attack_type, ATTACK_CONFIGS["GPS_JAMMING"])
    
    # Find target drone and get callsign
    callsign = target_drone
    for drone in current_swarm_state["drones"]:
        if drone["id"] == target_drone:
            callsign = drone.get("callsign", target_drone)
            # Apply attack effects
            drone["gps_status"] = config["gps_status"]
            drone["signal_strength"] = config["signal_strength"]
            drone["status"] = config["status"]
            drone["last_update"] = datetime.now(timezone.utc).isoformat()
            break
    
    current_swarm_state["ew_attack_active"] = True
    
    # Log anomaly event
    anomaly = AnomalyEvent(
        drone_id=target_drone,
        anomaly_type=attack_type,
        severity=config["status"]
    )
    await db.anomaly_events.insert_one(anomaly.model_dump())
    
    # Log mission event
    description = config["description_template"].format(drone_id=target_drone, callsign=callsign)
    event = MissionEvent(
        event_type=config["event_type"],
        description=description,
        data={"affected_drone": target_drone, "anomaly_type": attack_type}
    )
    await db.mission_events.insert_one(event.model_dump())
    
    return {
        "status": "attack_simulated",
        "affected_drone": target_drone,
        "anomaly_type": attack_type,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/copilot/recommend", response_model=TacticalRecommendation)
async def get_tactical_recommendation(request: TacticalRequest):
    """Get AI tactical recommendation for anomaly"""
    
    # Try Ollama first
    ollama_response = await generate_tactical_recommendation_ollama(request)
    
    if ollama_response:
        # Parse Ollama response into structured format
        # For demo, we'll use mock structure but could parse the text
        recommendation = generate_mock_recommendation(request)
        recommendation.primary_action = ollama_response[:500] if len(ollama_response) > 500 else ollama_response
    else:
        # Fall back to mock
        recommendation = generate_mock_recommendation(request)
    
    # Log recommendation
    event = MissionEvent(
        event_type="COPILOT_RECOMMENDATION",
        description=f"Tactical recommendation generated for {request.anomaly_type}",
        data=recommendation.model_dump()
    )
    await db.mission_events.insert_one(event.model_dump())
    
    return recommendation


@api_router.post("/copilot/approve/{recommendation_id}")
async def approve_recommendation(recommendation_id: str):
    """Approve and execute tactical recommendation"""
    global current_swarm_state
    
    # Log approval
    event = MissionEvent(
        event_type="RECOMMENDATION_APPROVED",
        description=f"Tactical recommendation {recommendation_id} approved by operator",
        data={"recommendation_id": recommendation_id}
    )
    await db.mission_events.insert_one(event.model_dump())
    
    # Simulate recovery (update D-1 status to recovering)
    for drone in current_swarm_state["drones"]:
        if drone["id"] == "D-1":
            drone["status"] = "WARNING"
            drone["gps_status"] = "DEGRADED"
            drone["last_update"] = datetime.now(timezone.utc).isoformat()
            break
    
    return {
        "status": "approved",
        "recommendation_id": recommendation_id,
        "message": "Recovery protocol initiated",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.get("/mission/events", response_model=List[MissionEvent])
async def get_mission_events(limit: int = 50):
    """Get recent mission events"""
    events = await db.mission_events.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return events


@api_router.get("/mission/anomalies", response_model=List[AnomalyEvent])
async def get_anomalies(resolved: Optional[bool] = None):
    """Get anomaly events"""
    query = {}
    if resolved is not None:
        query["resolved"] = resolved
    anomalies = await db.anomaly_events.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return anomalies


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
