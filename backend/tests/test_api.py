#!/usr/bin/env python
"""
Quick test script to verify all project components are working
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_backend():
    print("=" * 60)
    print("TESTING BACKEND API")
    print("=" * 60)
    
    # Test 1: Root endpoint
    print("\n1. Testing root endpoint...")
    try:
        r = requests.get(f"{BASE_URL}/")
        print(f"   ✓ Status: {r.status_code}")
        data = r.json()
        print(f"   ✓ API Version: {data['version']}")
        print(f"   ✓ Endpoints available: {len(data['endpoints'])}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    # Test 2: Health check
    print("\n2. Testing health endpoint...")
    try:
        r = requests.get(f"{BASE_URL}/health")
        print(f"   ✓ Status: {r.status_code}")
        data = r.json()
        print(f"   ✓ Service: {data.get('service', 'N/A')}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    # Test 3: Temperature trends
    print("\n3. Testing temperature trends endpoint...")
    try:
        r = requests.get(f"{BASE_URL}/api/temperature-trends?days=7")
        print(f"   ✓ Status: {r.status_code}")
        data = r.json()
        print(f"   ✓ Response Status: {data['status']}")
        print(f"   ✓ Records Retrieved: {data['count']}")
        if data['data']:
            print(f"   ✓ Sample city: {data['data'][0]['city_name']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    # Test 4: Weather summary
    print("\n4. Testing weather summary endpoint...")
    try:
        r = requests.get(f"{BASE_URL}/api/weather-summary")
        print(f"   ✓ Status: {r.status_code}")
        data = r.json()
        print(f"   ✓ Response Status: {data['status']}")
        print(f"   ✓ Locations: {len(data['data'])}")
        if data['data']:
            for city in data['data'][:3]:
                print(f"      - {city['city_name']}: Avg {city['avg_temperature']}°C")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False

    # Test 5: Temperature anomalies
    print("\n5. Testing temperature anomalies endpoint...")
    try:
        r = requests.get(f"{BASE_URL}/api/temperature-anomalies?days=30")
        print(f"   ✓ Status: {r.status_code}")
        data = r.json()
        print(f"   ✓ Response Status: {data.get('status')}")
        print(f"   ✓ Records Retrieved: {data.get('count', 0)}")
        if data.get('data'):
            print(f"   ✓ Sample city: {data['data'][0]['city_name']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✓ ALL BACKEND TESTS PASSED!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    test_backend()
