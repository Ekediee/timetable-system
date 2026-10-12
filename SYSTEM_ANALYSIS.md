# BU Pulse Timetabling System — Roles, Capabilities & System Gaps

## 1. System Overview

**BU Pulse** is an institutional academic timetabling and scheduling system designed for higher education institutions (e.g., Babcock University). It coordinates course allocations, venue assignments, lecturer availability, constraint satisfaction problem (CSP) timetable generation, conflict detection, and an end-to-end multi-tier approval workflow from departments to central administration.

---

## 2. User Roles & Hierarchical Workflow

The system is structured around **4 primary user personas**:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Departmental T.O  ──►  2. Head of Dept (HOD)            │
│    (Draft & Generate)       (Department Sign-off)           │
│                                      │                      │
│                                      ▼                      │
│ 4. Academic Planning T.O ◄──  3. Dean of School             │
│    (Central Publish & Audit)   (School Sign-off)            │
└─────────────────────────────────────────────────────────────┘
```

1. **Departmental Timetable Officer (`deptTO`)**: Configures department courses, venues, constraints, runs the automated scheduling engine, resolves internal clashes, and submits drafts.
2. **Head of Department (`hod`)**: Reviews departmental schedules and conflict alerts, signs off to the Dean, or returns drafts with revision notes.
3. **Dean of School (`dean`)**: Reviews school-wide submissions, verifies cross-department resource utilization within the faculty, and endorses schedules to Academic Planning.
4. **Academic Planning Timetable Officer (`acadPlanningTO`)**: Oversees university-wide review queues, institutional venues/adjuncts/leaves, detects cross-department venue double-bookings, maintains audit logs, and officially publishes schedules.

---

## 3. Current Implementation Status: What Each User Can & Cannot Do

### A. System-Wide Architectural Gaps (Applies to All Roles)

- **In-Memory Local State**: State resides entirely in client-side React state. Refreshing the browser resets all edits, approvals, and generated schedules back to static seed data.
- **Simulated Authentication**: Role switching uses a mock avatar selector with 4 hardcoded accounts (`yakubu`, `olumide`, `bassey`, `danladi`) with no backend authentication (JWT/OAuth/SSO/password).
- **Single Active Department Focus**: Interactive generation and editing are implemented for **Computer Science (200 Level)**. Other departments exist as static submission items in the review queue.

---

### B. Departmental Timetable Officer (`deptTO` — _Yakubu Onome_)

| Feature Area              | What They CAN Do Now                                                                                                                                                                                                                                             | What They CANNOT Do (Incomplete / Missing)                                                                                                                                                                                                               |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Course Allocations**    | • View course allocations list.<br>• Filter by Core / Elective / GST.<br>• Search courses and view detail modals.                                                                                                                                                | • **Cannot create, edit, or delete courses** (allocations are read-only).<br>• Cannot import allocations via Excel/CSV.                                                                                                                                  |
| **Venues & Timeslots**    | • View department-assigned venues.<br>• Toggle timeslot cells to block or open hours.                                                                                                                                                                            | • **Cannot add new venues or edit seat capacities**.<br>• The timeslot blocker state in the venues view is not yet dynamically connected to the generation engine.                                                                                       |
| **Constraints**           | • Add and delete Study Leaves, Days Off, and Adjunct rules.<br>• Toggle "Mark constraints complete".                                                                                                                                                             | • Cannot set custom time ranges (e.g. 10:00–12:00 only) beyond predefined day/time formats.<br>• No document upload for official leave approvals.                                                                                                        |
| **Timetable Generation**  | • Run the CSP engine (`lib/engine.ts`) to generate conflict-free schedules.<br>• Automatic handling of 1h/2h blocks, lunch break (13:00–14:00), and Friday restrictions.<br>• View calendar grid or list, inspect cell details, and view hard-conflict warnings. | • **No manual drag-and-drop editor**: You can only regenerate the entire schedule; you cannot drag a specific class to swap its room or slot manually.<br>• Cannot generate timetables for multiple cohorts/levels (100L, 300L, 400L) in a single batch. |
| **Submission & Workflow** | • Submit clean draft to HOD.<br>• View rejection notes and status history.<br>• Export status history as `.txt`.                                                                                                                                                 | • Cannot attach submission cover notes or specific comments for the HOD.<br>• No real-time notifications when HOD responds.                                                                                                                              |

---

### C. Head of Department (`hod` — _Dr. A. Olumide_)

| Feature Area              | What They CAN Do Now                                                                                                                   | What They CANNOT Do (Incomplete / Missing)                                                                                                                              |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Review & Verification** | • View incoming Computer Science 200L submission.<br>• Inspect all scheduled sessions and flagged capacity/venue clashes.              | • **Cannot review multiple levels/cohorts** (e.g. 100L, 300L, 400L simultaneously).<br>• Cannot view a "diff" / revision history showing what changed between versions. |
| **Decision Authority**    | • **Approve & Forward**: Sends the submission to the Dean.<br>• **Return with Note**: Rejects with feedback, returning it to Dept T.O. | • **Cannot make inline corrections**: Must either accept the entire timetable or reject the whole thing.<br>• Cannot approve with conditional exceptions.               |

---

### D. Dean of School (`dean` — _Prof. E. Bassey_)

| Feature Area           | What They CAN Do Now                                                                                                      | What They CANNOT Do (Incomplete / Missing)                                                                                                                                      |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **School Review**      | • View HOD-approved submission for Computer Science.<br>• Read HOD endorsement notes and session breakdown.               | • **Cannot switch between departments in the school**: The Dean view is hardcoded to Computer Science, even though the Dean oversees Electrical Eng and Mechanical Eng as well. |
| **Decision Authority** | • **Approve**: Forwards submission to Academic Planning Office.<br>• **Return**: Returns draft back to HOD with comments. | • **No cross-department school clash check**: Cannot check if Electrical and Mechanical engineering are competing for shared faculty labs before endorsing.                     |

---

### E. Academic Planning Timetable Officer (`acadPlanningTO` — _M. Danladi_)

| Feature Area                  | What They CAN Do Now                                                                                                                                                                                                     | What They CANNOT Do (Incomplete / Missing)                                                                                                                                                                                             |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Review Queue & Publishing** | • View all university department submissions with status filters.<br>• Open full timetable modals for any department.<br>• Approve, Return, or Publish individually or in **Bulk**.<br>• Maintain timestamped audit log. | • **No student/staff public portal**: Publishing updates internal state to `"Published"`, but there is no public-facing view for students to search by student ID or download personal schedules.<br>• No iCal / Google Calendar sync. |
| **Clash Detection**           | • Automatically scans all active university submissions for cross-department room double-bookings.<br>• Groups clashes by venue and timeslot.                                                                            | • **Cannot resolve clashes directly on screen**: You can identify the clash, but cannot force-swap venues from the clash view (must return the submission to the Dept T.O).                                                            |
| **Constraints Management**    | • Reassign venues to departments or release them to the shared pool.<br>• Add/remove university adjunct lecturers with allowed teaching days.<br>• Add/remove global study leaves and recurring days off.                | • Changes made to global venues/adjuncts do not automatically re-solve or push warnings back to already generated department drafts in real-time.                                                                                      |
| **Analytics & Export**        | • View charts on room utilization, submission progress, and capacity efficiency.<br>• Export audit log and submissions to CSV.                                                                                           | • Cannot generate institutional PDF reports or print-ready university master schedules.                                                                                                                                                |

---

## 4. Key Roadmap Items for Production Readiness

1. **Backend Database & REST/GraphQL API**:
   - Persist entities (departments, courses, lecturers, venues, sessions, constraints, approvals, audit logs) into PostgreSQL using Prisma or Drizzle ORM.
2. **Interactive Schedule Canvas (Drag-and-Drop)**:
   - Provide direct visual manipulation of timetable sessions with instant constraint validation.
3. **Full Multi-Department & Multi-Level Workspaces**:
   - Allow Dept T.Os to manage 100L through 500L simultaneously and enable Deans to switch fluidly between all departments under their faculty.
4. **Public Portal & Calendar Integrations**:
   - Public read-only timetable viewer for students and staff with custom search, filter by matriculation number/course, and export to PDF/iCal.
