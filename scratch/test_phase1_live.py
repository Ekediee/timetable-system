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
    print(f"{Colors.BOLD}{Colors.BLUE}   BU PULSE — PHASE 1 LIVE BACKEND INTEGRATION TEST   {Colors.END}")
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

    # 2. Campus Time Locks
    print(f"\n{Colors.BOLD}--- Module: Campus Time Locks ---{Colors.END}")
    status, time_locks = api_call("/time-locks", method="GET", token=dept_token)
    has_keys = all(k in time_locks for k in ["operatingWindow", "lunchBreak", "earlyClosings", "chapelSlots"])
    report("2.1 GET /api/v1/time-locks (Default seeded payload)", status == 200 and has_keys, 
           f"Keys present: {list(time_locks.keys()) if isinstance(time_locks, dict) else time_locks}")

    # Authorization Check: Dept TO cannot update time locks
    update_payload = {
        "operatingWindow": {"startSlot": "07:00", "endSlot": "17:00"},
        "lunchBreak": {"enabled": True, "slot": "13:00", "duration": 1, "label": "Campus Lunch Break"},
        "earlyClosings": [
            {"id": "curfew-wed", "day": "Wed", "cutoffSlot": "16:00", "label": "Mid-Week Sports", "enabled": True},
            {"id": "curfew-fri", "day": "Fri", "cutoffSlot": "14:00", "label": "Friday Sabbath Prep", "enabled": True}
        ],
        "chapelSlots": time_locks.get("chapelSlots", {}),
        "customLocks": []
    }
    status, res = api_call("/time-locks", method="PUT", token=dept_token, body=update_payload)
    report("2.2 PUT /api/v1/time-locks authorization guard (Dept TO forbidden)", status == 403, f"Status: {status}")

    # Authorized Update by Acad Planning TO
    status, updated_locks = api_call("/time-locks", method="PUT", token=acad_token, body=update_payload)
    report("2.3 PUT /api/v1/time-locks by Acad Planning TO", status == 200, f"Status: {status}")

    # 3. Dynamic Constraint Types (Templates)
    print(f"\n{Colors.BOLD}--- Module: Dynamic Constraint Types ---{Colors.END}")
    status, types_res = api_call("/constraint-types", method="GET", token=dept_token)
    types_list = types_res.get("types", []) if isinstance(types_res, dict) else types_res
    has_defaults = any(t.get("name") in ["Study Leave", "Day Off", "Adjunct Hours"] for t in types_list)
    report("3.1 GET /api/v1/constraint-types (Seeded default templates)", status == 200 and len(types_list) > 0 and has_defaults,
           f"Loaded {len(types_list)} templates: {[t.get('name') for t in types_list[:4]]}")

    # Backward compatibility alias test
    status_alias, alias_res = api_call("/constraint-categories", method="GET", token=dept_token)
    report("3.2 GET /api/v1/constraint-categories (Alias support)", status_alias == 200, f"Status: {status_alias}")

    # Unique test name with random UUID to guarantee no collision
    uid = uuid.uuid4().hex[:8]
    custom_type_name = f"Special Shift {uid}"
    custom_type_payload = {
        "name": custom_type_name,
        "category": "Faculty Availability",
        "description": "Restricted hours for medical and clinical consulting faculty.",
        "archetype": "time_window",
        "iconName": "Clock",
        "parameters": [
            {"key": "lecturer", "label": "Consultant Name", "type": "lecturer_select", "required": True},
            {"key": "range", "label": "Clinical Shift Days", "type": "text", "required": True},
            {"key": "detail", "label": "Teaching Hospital Unit", "type": "text", "required": True}
        ]
    }
    # Authorization Check: Dept TO cannot create constraint types
    status, res = api_call("/constraint-types", method="POST", token=dept_token, body=custom_type_payload)
    report("3.3 POST /api/v1/constraint-types authorization guard (Dept TO forbidden)", status == 403, f"Status: {status}")

    # Authorized Creation by Acad Planning TO
    status, created_type_res = api_call("/constraint-types", method="POST", token=acad_token, body=custom_type_payload)
    created_type_id = created_type_res.get("id") if isinstance(created_type_res, dict) else None
    report("3.4 POST /api/v1/constraint-types by Acad Planning TO", status in [200, 201] and created_type_id is not None,
           f"Created ID: {created_type_id}, Name: {custom_type_name}")

    # Update Constraint Type Template
    status, updated_type_res = api_call(f"/constraint-types/{created_type_id}", method="PUT", token=acad_token, body={
        "name": f"Updated Shift {uid}",
        "description": "Updated description for clinical staff.",
        "iconName": "Activity"
    })
    report("3.5 PUT /api/v1/constraint-types/{id}", status == 200, f"Status: {status}")

    # 4. Departmental Constraints (Faculty Rules)
    print(f"\n{Colors.BOLD}--- Module: Departmental Constraints ---{Colors.END}")
    faculty_rule_payload = {
        "kind": f"Updated Shift {uid}",
        "categoryId": created_type_id,
        "lecturer": "ADEGBENJO Aderonke",
        "detail": "General Hospital Surgical Unit",
        "range": "Every Thursday AM",
        "department": "Computer Science",
        "params": {
            "archetype": "time_window",
            "unit": "Surgery",
            "shift_hours": 4
        }
    }
    status, created_rule_res = api_call("/constraints", method="POST", token=dept_token, body=faculty_rule_payload)
    created_rule_id = created_rule_res.get("id") if isinstance(created_rule_res, dict) else None
    report("4.1 POST /api/v1/constraints by Dept TO (Creating faculty rule)", status in [200, 201] and created_rule_id is not None,
           f"Created Rule ID: {created_rule_id}, Lecturer: {created_rule_res.get('lecturer') if isinstance(created_rule_res, dict) else ''}")

    # Foreign Constraint Block: Cannot delete template when active faculty rules reference it
    status, del_res = api_call(f"/constraint-types/{created_type_id}", method="DELETE", token=acad_token)
    report("4.2 DELETE /api/v1/constraint-types/{id} guarded when active rules exist", status in [400, 422],
           f"Status: {status}, Error message: {del_res.get('message')}")

    # Query Departmental Constraints
    status, rules_res = api_call("/constraints?department=Computer+Science", method="GET", token=dept_token)
    rules_list = rules_res.get("constraints", []) if isinstance(rules_res, dict) else rules_res
    rule_found = any(r.get("id") == created_rule_id for r in rules_list)
    report("4.3 GET /api/v1/constraints?department=Computer+Science", status == 200 and rule_found,
           f"Retrieved {len(rules_list)} faculty constraints (Newly added rule found: {rule_found})")

    # Update Faculty Constraint
    status, updated_rule_res = api_call(f"/constraints/{created_rule_id}", method="PUT", token=dept_token, body={
        "detail": "General Hospital Pediatrics Unit (Updated)",
        "range": "Every Friday AM"
    })
    report("4.4 PUT /api/v1/constraints/{id}", status == 200, f"Status: {status}")

    # Update Constraint Status ("Mark Rules as Ready")
    status, status_res = api_call("/constraints/status", method="POST", token=dept_token, body={
        "department": "Computer Science",
        "session": "2026 / 2027",
        "semester": "First Semester",
        "completed": True
    })
    report("4.5 POST /api/v1/constraints/status (Mark rules as ready)", status == 200 and status_res.get("constraintsComplete") is True,
           f"Response: {status_res}")

    # 5. Teardown / Cleanup
    print(f"\n{Colors.BOLD}--- Cleanup & Cascade Verification ---{Colors.END}")
    status, _ = api_call(f"/constraints/{created_rule_id}", method="DELETE", token=dept_token)
    report("5.1 DELETE /api/v1/constraints/{id} (Delete faculty rule)", status == 200, f"Status: {status}")

    # Now that the faculty rule is deleted, deleting the template must succeed
    status, _ = api_call(f"/constraint-types/{created_type_id}", method="DELETE", token=acad_token)
    report("5.2 DELETE /api/v1/constraint-types/{id} (Template deletion unblocked)", status == 200, f"Status: {status}")

    # Final Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}===================================================={Colors.END}")
    print(f"{Colors.BOLD}   TEST SUMMARY: {results['passed']} PASSED, {results['failed']} FAILED{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}===================================================={Colors.END}\n")

    return results["failed"] == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

