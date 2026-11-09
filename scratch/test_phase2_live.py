import urllib.request
import urllib.error
import json
import uuid
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    END = "\033[0m"

results = {"passed": 0, "failed": 0, "tests": []}

def report(name, success, detail=""):
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if success else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"[{status}] {name}")
    if detail:
        print(f"       {Colors.YELLOW}{detail}{Colors.END}")
    if success:
        results["passed"] += 1
    else:
        results["failed"] += 1
    results["tests"].append({"name": name, "success": success, "detail": detail})

def api_call(endpoint, method="GET", token=None, body=None):
    url = f"{BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            data = json.loads(content) if content else {}
            return resp.status, data
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            err_data = json.loads(content)
        except:
            err_data = {"raw": content}
        return e.code, err_data
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print(f"\n{Colors.BOLD}{Colors.BLUE}===================================================={Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}   BU PULSE — PHASE 2 LIVE BACKEND INTEGRATION TEST   {Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}===================================================={Colors.END}\n")

    # 1. Authentication
    status, dept_auth = api_call("/auth/login", method="POST", body={"email": "y.onome@bupulse.edu", "password": "password123"})
    report("1.1 Login as Dept TO (Yakubu Onome)", status == 200 and "token" in dept_auth, f"Role: {dept_auth.get('user', {}).get('role')}")
    dept_token = dept_auth.get("token")

    status, acad_auth = api_call("/auth/login", method="POST", body={"email": "m.danladi@bupulse.edu", "password": "password123"})
    report("1.2 Login as Acad Planning TO (M. Danladi)", status == 200 and "token" in acad_auth, f"Role: {acad_auth.get('user', {}).get('role')}")
    acad_token = acad_auth.get("token")

    if not dept_token or not acad_token:
        print(f"{Colors.RED}Aborting due to authentication failure{Colors.END}")
        sys.exit(1)

    # 2. Module 6: Departmental Events
    print(f"\n{Colors.BOLD}--- Module 6: Departmental Events ---{Colors.END}")
    status, events_data = api_call("/departmental-events", method="GET", token=dept_token)
    events_list = events_data.get("events", [])
    report("2.1 GET /api/v1/departmental-events (Auto-seeds defaults)", 
           status == 200 and len(events_list) >= 4, 
           f"Total events found: {len(events_list)}")

    # Filtered by department
    status, cs_events = api_call("/departmental-events?department=Computer+Science", method="GET", token=dept_token)
    cs_list = cs_events.get("events", [])
    report("2.2 GET /api/v1/departmental-events?department=Computer+Science",
           status == 200 and len(cs_list) > 0,
           f"CS events count: {len(cs_list)}")

    # Create new event
    unique_suffix = uuid.uuid4().hex[:6]
    new_event_payload = {
        "title": f"AI & Cybersecurity Hackathon {unique_suffix}",
        "department": "Computer Science",
        "category": "Hackathon",
        "week": "Semester Week 6",
        "day": "Fri",
        "timeRange": "09:00 – 17:00",
        "venue": "BUC_LAB1",
        "level": "All Levels",
        "description": "Student competition solving industry algorithmic security problems.",
        "advisoryNote": "Friday afternoon slots dedicated to pitch demos.",
        "exemptFromLectures": False
    }
    status, created_event = api_call("/departmental-events", method="POST", token=dept_token, body=new_event_payload)
    event_id = created_event.get("id") or created_event.get("event", {}).get("id")
    report("2.3 POST /api/v1/departmental-events (Create milestone)",
           status == 201 and event_id is not None,
           f"Created ID: {event_id}")

    # Update event
    if event_id:
        update_payload = {
            "title": f"AI & Cybersecurity Hackathon {unique_suffix} [Updated]",
            "venue": "BUC Auditorium & Labs"
        }
        status, updated_event = api_call(f"/departmental-events/{event_id}", method="PUT", token=dept_token, body=update_payload)
        updated_title = updated_event.get("title") or updated_event.get("event", {}).get("title")
        report("2.4 PUT /api/v1/departmental-events/{id}",
               status == 200 and "[Updated]" in str(updated_title),
               f"Updated title: {updated_title}")

        # Delete event
        status, del_resp = api_call(f"/departmental-events/{event_id}", method="DELETE", token=dept_token)
        report("2.5 DELETE /api/v1/departmental-events/{id}",
               status == 200 and del_resp.get("success") is True,
               f"Response: {del_resp.get('message')}")

    # 3. Module 7: Master Venues & Facilities
    print(f"\n{Colors.BOLD}--- Module 7: Venues & Facilities Management ---{Colors.END}")
    status, venues_data = api_call("/venues", method="GET", token=dept_token)
    venues_list = venues_data.get("venues", [])
    report("3.1 GET /api/v1/venues (Auto-seeds master dataset)",
           status == 200 and len(venues_list) > 10,
           f"Total venues loaded: {len(venues_list)}")

    # Filtered by department
    status, cs_venues = api_call("/venues?department=Computer+Science", method="GET", token=dept_token)
    cs_venue_list = cs_venues.get("venues", [])
    report("3.2 GET /api/v1/venues?department=Computer+Science",
           status == 200 and len(cs_venue_list) > 0,
           f"Computer Science & shared venues count: {len(cs_venue_list)}")

    # Authorization Guard: Dept TO cannot create venues
    test_venue_name = f"TEST_HALL_{uuid.uuid4().hex[:6].upper()}"
    new_venue_payload = {
        "name": test_venue_name,
        "capacity": 150,
        "block": "BUC Complex",
        "floor": "2nd Floor",
        "type": "Lecture Hall",
        "spaceType": "shared",
        "deptOwners": ["Computer Science", "Software Engineering"],
        "isVirtual": False
    }
    status, res = api_call("/venues", method="POST", token=dept_token, body=new_venue_payload)
    report("3.3 POST /api/v1/venues authorization guard (Dept TO forbidden)",
           status == 403,
           f"Status: {status}")

    # Authorized Creation by Acad Planning TO
    status, created_venue = api_call("/venues", method="POST", token=acad_token, body=new_venue_payload)
    venue_id = created_venue.get("id") or created_venue.get("venue", {}).get("id")
    report("3.4 POST /api/v1/venues by Acad Planning TO",
           status == 201 and venue_id is not None,
           f"Created venue ID: {venue_id}, Name: {test_venue_name}")

    # Update venue
    if venue_id:
        update_v_payload = {
            "capacity": 180,
            "spaceType": "exclusive"
        }
        status, updated_venue = api_call(f"/venues/{venue_id}", method="PUT", token=acad_token, body=update_v_payload)
        cap = updated_venue.get("capacity") or updated_venue.get("venue", {}).get("capacity")
        report("3.5 PUT /api/v1/venues/{id} (Update capacity)",
               status == 200 and cap == 180,
               f"Updated capacity: {cap}")

    # Batch Import / CSV
    csv_sample = f"Department owner, venue, capacity, floor, space type(shared / exclusive)\nComputer Science, CSV_LAB_{uuid.uuid4().hex[:4].upper()}, 55, Ground Floor, exclusive"
    status, import_res = api_call("/venues/import-csv", method="POST", token=acad_token, body={"csv": csv_sample})
    report("3.6 POST /api/v1/venues/import-csv (CSV venue import)",
           status == 200 and import_res.get("importedCount") == 1,
           f"Imported count: {import_res.get('importedCount')}")

    # Occupancy Matrix
    status, occ_data = api_call("/venues/occupancy/matrix", method="GET", token=dept_token)
    report("3.7 GET /api/v1/venues/occupancy/matrix",
           status == 200 and "occupancy" in occ_data,
           f"Occupancy records: {len(occ_data.get('occupancy', []))}")

    # Authorization Guard: Dept TO cannot delete venues
    if venue_id:
        status, res = api_call(f"/venues/{venue_id}", method="DELETE", token=dept_token)
        report("3.8 DELETE /api/v1/venues/{id} authorization guard (Dept TO forbidden)",
               status == 403,
               f"Status: {status}")

        # Authorized Delete by Acad Planning TO
        status, del_v_res = api_call(f"/venues/{venue_id}", method="DELETE", token=acad_token)
        report("3.9 DELETE /api/v1/venues/{id} by Acad Planning TO",
               status == 200 and del_v_res.get("success") is True,
               f"Message: {del_v_res.get('message')}")

    # Summary
    print(f"\n{Colors.BOLD}===================================================={Colors.END}")
    print(f"Results: {Colors.GREEN}{results['passed']} Passed{Colors.END}, {Colors.RED}{results['failed']} Failed{Colors.END} out of {len(results['tests'])} tests.")
    print(f"{Colors.BOLD}===================================================={Colors.END}\n")

    if results["failed"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()

