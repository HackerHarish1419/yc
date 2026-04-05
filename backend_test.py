#!/usr/bin/env python3
"""
AURA-V Backend API Testing Suite
Tests all backend endpoints for the drone swarm command dashboard
"""

import requests
import sys
import json
from datetime import datetime

class AURAVAPITester:
    def __init__(self, base_url="https://aura-copilot.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status=200, data=None, check_response=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success and check_response:
                try:
                    response_data = response.json()
                    check_result = check_response(response_data)
                    if not check_result:
                        success = False
                        details += " - Response validation failed"
                except Exception as e:
                    success = False
                    details += f" - Response check error: {str(e)}"
            
            self.log_test(name, success, details if not success else "")
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        def check_health(data):
            required_fields = ['status', 'ollama_available', 'ollama_model', 'timestamp']
            return all(field in data for field in required_fields)
        
        return self.run_test(
            "Health Check Endpoint",
            "GET",
            "health",
            200,
            check_response=check_health
        )

    def test_swarm_state(self):
        """Test /api/swarm/state endpoint"""
        def check_swarm_state(data):
            if 'drones' not in data or 'mission_id' not in data:
                return False
            if len(data['drones']) != 5:
                return False
            # Check first drone has required fields
            drone = data['drones'][0]
            required_fields = ['id', 'callsign', 'lat', 'lng', 'altitude', 'battery', 
                             'signal_strength', 'gps_status', 'status', 'mission_role']
            return all(field in drone for field in required_fields)
        
        return self.run_test(
            "Swarm State Endpoint (5 drones)",
            "GET",
            "swarm/state",
            200,
            check_response=check_swarm_state
        )

    def test_ew_attack_simulation(self):
        """Test /api/swarm/simulate-ew-attack endpoint"""
        def check_attack_response(data):
            required_fields = ['status', 'affected_drone', 'anomaly_type', 'timestamp']
            return all(field in data for field in required_fields) and data['affected_drone'] == 'D-1'
        
        return self.run_test(
            "EW Attack Simulation",
            "POST",
            "swarm/simulate-ew-attack",
            200,
            check_response=check_attack_response
        )

    def test_copilot_recommendation(self):
        """Test /api/copilot/recommend endpoint"""
        request_data = {
            "anomaly_type": "GPS_JAMMING",
            "affected_drone_id": "D-1",
            "swarm_state": {
                "drones": [{"id": "D-1", "status": "CRITICAL"}],
                "mission_id": "TEST"
            },
            "roe_constraints": {
                "restricted_zones": [[34.06, -118.25], [34.04, -118.23]],
                "civilian_corridors": True
            }
        }
        
        def check_recommendation(data):
            required_fields = ['recommendation_id', 'primary_action', 'recovery_steps', 
                             'reassignment_vectors', 'roe_compliance', 'confidence', 'timestamp']
            return all(field in data for field in required_fields)
        
        return self.run_test(
            "Copilot Tactical Recommendation",
            "POST",
            "copilot/recommend",
            200,
            data=request_data,
            check_response=check_recommendation
        )

    def test_swarm_reset(self):
        """Test /api/swarm/reset endpoint"""
        def check_reset_response(data):
            return 'status' in data and data['status'] == 'reset' and 'swarm_state' in data
        
        return self.run_test(
            "Swarm Reset",
            "POST",
            "swarm/reset",
            200,
            check_response=check_reset_response
        )

    def test_mission_events(self):
        """Test /api/mission/events endpoint"""
        def check_events(data):
            return isinstance(data, list)
        
        return self.run_test(
            "Mission Events",
            "GET",
            "mission/events?limit=20",
            200,
            check_response=check_events
        )

    def test_approve_recommendation(self):
        """Test /api/copilot/approve/{recommendation_id} endpoint"""
        def check_approval(data):
            required_fields = ['status', 'recommendation_id', 'message', 'timestamp']
            return all(field in data for field in required_fields) and data['status'] == 'approved'
        
        return self.run_test(
            "Approve Recommendation",
            "POST",
            "copilot/approve/TEST123",
            200,
            check_response=check_approval
        )

    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🚁 AURA-V Backend API Testing Suite")
        print("=" * 50)
        
        # Test basic health
        health_success, health_data = self.test_health_endpoint()
        
        # Test swarm state
        swarm_success, swarm_data = self.test_swarm_state()
        
        # Test EW attack simulation
        attack_success, attack_data = self.test_ew_attack_simulation()
        
        # Test copilot recommendation
        rec_success, rec_data = self.test_copilot_recommendation()
        
        # Test approve recommendation
        approve_success, approve_data = self.test_approve_recommendation()
        
        # Test swarm reset
        reset_success, reset_data = self.test_swarm_reset()
        
        # Test mission events
        events_success, events_data = self.test_mission_events()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests PASSED!")
            return 0
        else:
            print("⚠️  Some backend tests FAILED!")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            return 1

def main():
    tester = AURAVAPITester()
    return tester.run_full_test_suite()

if __name__ == "__main__":
    sys.exit(main())