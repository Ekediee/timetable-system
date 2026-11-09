import urllib.request
import urllib.parse
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
    print(f"\n{Colors.BOLD}{Colors.BLUE}======================================================{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}   BU PULSE — PHASE 3 LIVE GOVERNANCE & AUDIT TEST    {Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}======================================================{Colors.END}\n")

    # 1. Multi-Role Authentication
    print(f"{Colors.BOLD}--- 1. Multi-Role Authentication ---{Colors.END}")
    users = {
        "cs_to": ("y.onome@bupulse.edu", "password123"),
        "se_to": ("flourencea@babcock.edu.ng", "password123"),
        "cs_hod": ("a.olumide@bupulse.edu", "password123"),
        "dean_comp": ("e.bassey@bupulse.edu", "password123"),
        "dean_law": ("dean.law@bupulse.edu", "password123"),
        "acad_to": ("m.danladi@bupulse.edu", "password123"),
    }
    tokens = {}
    for key, (email, pwd) in users.items():
        status, auth = api_call("/auth/login", method="POST", body={"email": email, "password": pwd})
        token = auth.get("token")
        tokens[key] = token
        report(f"1. Auth for {key} ({email})", status == 200 and token is not None, f"Role: {auth.get('user', {}).get('role')}")

    if any(t is None for t in tokens.values()):
        print(f"{Colors.RED}Aborting due to authentication failure{Colors.END}")
        sys.exit(1)

    dept = "Computer Science"
    school = "School of Computing"
    session = "2026 / 2027"
    semester = "First Semester"

    # 2. Hard Clash Validation Check
    print(f"\n{Colors.BOLD}--- 2. Hard Clash Validation Guard ---{Colors.END}")
    # Populate a draft with an intentional venue clash
    clashing_sessions = [
        {"code": "CSC 201", "lecturer": "Dr. A", "venue": "BUC_LAB1", "day": "Mon", "slot": "10:00", "duration": 2, "level": "200 Level"},
        {"code": "CSC 301", "lecturer": "Dr. B", "venue": "BUC_LAB1", "day": "Mon", "slot": "10:00", "duration": 2, "level": "300 Level"},
    ]
    api_call("/timetable/draft", method="PUT", token=tokens["cs_to"], body={
        "department": dept,
        "school": school,
        "session": session,
        "semester": semester,
        "status": "Draft generated",
        "sessions": clashing_sessions
    })

    status, clash_res = api_call("/workflow/submit-to-hod", method="POST", token=tokens["cs_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("2.1 Hard clash guard: Overlapping sessions block submission", 
           status == 400 and "unresolved hard venue clash" in clash_res.get("message", ""), 
           f"Message: {clash_res.get('message')}")

    # Now populate clean, collision-free schedule
    clean_sessions = [
        {"code": "CSC 201", "lecturer": "ADEGBENJO Aderonke", "venue": "BUC_LAB1", "day": "Mon", "slot": "08:00", "duration": 2, "level": "200 Level", "group": "Group A"},
        {"code": "CSC 203", "lecturer": "Ayankoya Folashade", "venue": "BUC_ROOM1", "day": "Mon", "slot": "10:00", "duration": 2, "level": "200 Level", "group": "Group A"},
        {"code": "SEN 201", "lecturer": "Akande Oyebola", "venue": "SAT_B006", "day": "Tue", "slot": "10:00", "duration": 2, "level": "200 Level", "group": "Group A"},
        {"code": "BU-GST 221", "lecturer": "Akintunde Adeyinka Oye", "venue": "Virtual / LMS", "day": "Wed", "slot": "08:00", "duration": 2, "level": "200 Level", "group": "Group A", "isVirtual": True},
        {"code": "BU-COS 209", "lecturer": "Bankole Oloruntobi", "venue": "BUC_ROOM2", "day": "Thu", "slot": "10:00", "duration": 2, "level": "200 Level", "group": "Group B"},
    ]
    status, draft_res = api_call("/timetable/draft", method="PUT", token=tokens["cs_to"], body={
        "department": dept,
        "school": school,
        "session": session,
        "semester": semester,
        "status": "Draft generated",
        "sessions": clean_sessions
    })
    report("2.2 PUT /api/v1/timetable/draft (Loaded clean schedule)", status == 200, f"Saved sessions: {len(draft_res.get('sessions', []))}")

    # 3. Timetable State Setup & HOD Submission
    print(f"\n{Colors.BOLD}--- 3. Timetable State Setup & HOD Submission ---{Colors.END}")
    # 3.1 Jurisdiction Guard: SE Dept TO cannot submit CS Timetable
    status, res = api_call("/workflow/submit-to-hod", method="POST", token=tokens["se_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("3.1 Jurisdiction guard: SE Dept TO cannot submit CS timetable", status == 403, f"HTTP Code: {status}")

    # 3.2 Authorized Submission by CS Dept TO
    status, submit_res = api_call("/workflow/submit-to-hod", method="POST", token=tokens["cs_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("3.2 Authorized submission by CS Dept TO -> 'Submitted to HOD'", 
           status == 200 and submit_res.get("status") == "Submitted to HOD", 
           f"Status: {submit_res.get('status')}")

    # 3.3 State Machine Guard: Cannot re-submit while already in Submitted to HOD
    status, res = api_call("/workflow/submit-to-hod", method="POST", token=tokens["cs_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("3.3 State machine guard: Duplicate submission blocked", status == 400, f"HTTP Code: {status}, Msg: {res.get('message')}")

    # 4. HOD Rejection & Return Workflow
    print(f"\n{Colors.BOLD}--- 4. HOD Review & Rejection Workflow ---{Colors.END}")
    comment_text = "BU-GST 205 exceeds LT 12 capacity — relocate to CST Hall A."
    status, rej_res = api_call("/workflow/hod/reject", method="POST", token=tokens["cs_hod"], body={
        "department": dept,
        "session": session,
        "semester": semester,
        "comment": comment_text
    })
    report("4.1 HOD Rejection reverts to 'Draft generated' with corrective note", 
           status == 200 and rej_res.get("status") == "Draft generated", 
           f"Status: {rej_res.get('status')}")

    # 4.2 Re-submit to HOD
    status, submit_res2 = api_call("/workflow/submit-to-hod", method="POST", token=tokens["cs_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("4.2 Re-submission by CS Dept TO after revision", status == 200, f"Status: {submit_res2.get('status')}")

    # 4.3 HOD Approval -> Submitted to Dean
    status, hod_app_res = api_call("/workflow/hod/approve", method="POST", token=tokens["cs_hod"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("4.3 HOD Approval advances to 'Submitted to Dean'", 
           status == 200 and hod_app_res.get("status") == "Submitted to Dean", 
           f"Status: {hod_app_res.get('status')}")

    # 5. Dean Review & School Jurisdiction Boundary
    print(f"\n{Colors.BOLD}--- 5. Dean Review & School Boundary Checks ---{Colors.END}")
    # 5.1 Cross-school rejection: Law Dean cannot approve School of Computing timetable
    status, res = api_call("/workflow/dean/approve", method="POST", token=tokens["dean_law"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("5.1 School boundary guard: Law Dean cannot approve Computing timetable", status == 403, f"HTTP Code: {status}")

    # 5.2 Authorized Dean Approval
    status, dean_app_res = api_call("/workflow/dean/approve", method="POST", token=tokens["dean_comp"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("5.2 Dean Approval advances to 'Submitted to Acad Pl. T.O'", 
           status == 200 and dean_app_res.get("status") == "Submitted to Acad Pl. T.O", 
           f"Status: {dean_app_res.get('status')}")

    # 6. Master Publishing & Finalization
    print(f"\n{Colors.BOLD}--- 6. Master Publishing & Finalization ---{Colors.END}")
    # 6.1 Dept TO cannot publish
    status, res = api_call("/publish", method="POST", token=tokens["cs_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("6.1 Master publication guard: Dept TO forbidden", status == 403, f"HTTP Code: {status}")

    # 6.2 Acad Planning TO publishes
    status, pub_res = api_call("/publish", method="POST", token=tokens["acad_to"], body={
        "department": dept,
        "session": session,
        "semester": semester
    })
    report("6.2 Master schedule publication by Acad Planning TO -> 'Published'", 
           status == 200 and pub_res.get("status") == "Published", 
           f"Status: {pub_res.get('status')}")

    # 7. Workflow Submissions, Timeline & Audit Trail
    print(f"\n{Colors.BOLD}--- 7. Submissions Overview, Timeline & Audit Logs ---{Colors.END}")
    # 7.1 Submissions
    qs_sub = urllib.parse.urlencode({"session": session, "semester": semester})
    status, sub_data = api_call(f"/workflow/submissions?{qs_sub}", method="GET", token=tokens["acad_to"])
    submissions = sub_data.get("submissions", [])
    cs_sub = next((s for s in submissions if s.get("department") == dept), None)
    report("7.1 GET /api/v1/workflow/submissions (Overview card aggregation)", 
           status == 200 and cs_sub is not None and "courses" in cs_sub and cs_sub.get("rawStatus") == "Published",
           f"CS submission found | Status: '{cs_sub.get('status') if cs_sub else None}' | Raw: '{cs_sub.get('rawStatus') if cs_sub else None}' | Courses: {cs_sub.get('courses') if cs_sub else None}")

    # 7.2 Timeline
    qs_tl = urllib.parse.urlencode({"department": dept})
    status, tl_data = api_call(f"/workflow/timeline?{qs_tl}", method="GET", token=tokens["cs_to"])
    timeline_steps = tl_data.get("timeline", [])
    has_rej = any(s.get("state") == "rejected" for s in timeline_steps)
    has_done = any(s.get("state") == "done" for s in timeline_steps)
    report("7.2 GET /api/v1/workflow/timeline (Chronological history & audit steps)",
           status == 200 and len(timeline_steps) >= 3 and has_rej and has_done,
           f"Total recorded timeline steps: {len(timeline_steps)}")

    # 7.3 Audit Logs
    qs_audit = urllib.parse.urlencode({"department": dept})
    status, audit_data = api_call(f"/audit/logs?{qs_audit}", method="GET", token=tokens["acad_to"])
    audit_entries = audit_data.get("auditEntries", [])
    report("7.3 GET /api/v1/audit/logs (Immutable system audit trail)",
           status == 200 and len(audit_entries) > 0,
           f"Audit log entries retrieved: {len(audit_entries)}")

    # Summary
    print(f"\n{Colors.BOLD}======================================================{Colors.END}")
    print(f"Results: {Colors.GREEN}{results['passed']} Passed{Colors.END}, {Colors.RED}{results['failed']} Failed{Colors.END} out of {len(results['tests'])} tests.")
    print(f"{Colors.BOLD}======================================================{Colors.END}\n")

    if results["failed"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()

