# BU Pulse — Timetabling
## Screen-by-Screen UX Flow & User Stories

**Prepared for:** BU Pulse design team
**Source:** BU_Pulse_Timetabling.docx (handwritten planning notes) + stakeholder clarification
**Status:** Draft v1 — ready for wireframing, pending sign-off on the open questions in Section 10

---

## 1. Purpose & scope

This document turns the raw timetabling notes into an implementation-ready spec: every screen each role sees, in order, with the features on it, plus a full backlog of user stories with acceptance criteria. It's written so design can move straight into wireframes and dev can scope tickets from it — no separate "flow doc" needed.

Confirmed end-to-end flow: **Departmental T.O generates → HOD approves → Dean approves → Academic Planning T.O approves → published to Lecturers & Students.** Any rejection sends the timetable back down the chain with a mandatory comment.

## 2. Roles glossary

| Role | Shorthand | Core responsibility in Timetabling |
|---|---|---|
| Departmental Timetable Officer | Dept T.O | Owns constraint input and timetable generation for their department |
| Head of Department | HOD | First approval gate |
| Dean | Dean | Second (school-level) approval gate |
| Academic Planning Timetable Officer | Acad Pl. T.O | Owns university-wide venue/time constraints; final approval and publish |
| Lecturer | Lect | Recipient of the published timetable; source of allocation data |
| Student | — | Recipient of the published timetable |
| Course Adviser | CA | Has Timetabling access per the role matrix, but no defined role in this approval chain — out of scope here (see Section 10) |

## 3. Assumptions made — flag for sign-off

The handwritten notes leave a few gaps. Design is proceeding on these assumptions; each is repeated in Section 10 for explicit confirmation.

- **A1** — "T.O – Dept" in the notes and "Departmental T.O" are the same role.
- **A2** — When the Dean rejects, it returns to the HOD (not directly to Dept T.O); the HOD then either resolves it directly or bounces it further down to Dept T.O.
- **A3** — When the Acad Pl. T.O rejects the final timetable, it returns to the HOD (mirroring the Dean's rejection pattern), since the notes don't specify a destination.
- **A4** — Only Dept T.O can edit venue & time on the actual timetable grid. HOD, Dean, and Acad Pl. T.O act on constraints and approval only, not direct edits to the grid.
- **A5** — "Publish" means the timetable becomes visible and read-only to Lecturers & Students for the affected department, and fires a notification.
- **A6** — Course Adviser sits outside the Timetabling approval chain per the access matrix and is excluded from the flows below.

## 4. Timetable status lifecycle

| Status | Set by | Meaning |
|---|---|---|
| Not started | — | No constraints entered yet |
| Constraints in progress | Dept T.O | Study leave / days off / adjunct data being entered |
| Draft generated | Dept T.O | Timetable created, editable, not yet submitted |
| Submitted to HOD | Dept T.O | Awaiting HOD decision |
| Rejected by HOD | HOD | Back with Dept T.O, comment attached |
| Submitted to Dean | HOD | Awaiting Dean decision |
| Rejected by Dean | Dean | Back with HOD, comment attached |
| Submitted to Acad Pl. T.O | Dean | Awaiting final decision |
| Rejected by Acad Pl. T.O | Acad Pl. T.O | Back with HOD, comment attached |
| Published | Acad Pl. T.O | Live and read-only for Lecturers & Students |

## 5. Screen-by-screen flows

### 5.1 Departmental Timetable Officer (Dept T.O)

**Screen 1 — Login**
- Institutional ID/email + password (SSO optional)
- Role-based redirect to Dept T.O dashboard

**Screen 2 — Dashboard (home)**
- Current timetable status badge (Not started / Draft / Submitted / Rejected / Approved / Published)
- Quick links: Allocations, Venues, Timeslots, Constraints, Generate Timetable
- Notification bell: rejection comments, approval updates

**Screen 3 — Allocations (read-only)**
- Table of lecturer ↔ course allocations for the department
- Filter by course or lecturer
- Purpose: informs constraint input and any manual edits later

**Screen 4 — Venues (read-only)**
- Venues assigned to the department (fed by Acad Pl. T.O's venue–department mapping)
- Capacity and availability calendar per venue

**Screen 5 — Timeslots (read-only)**
- Grid of available vs. blocked timeslots

**Screen 6 — Constraints input**
- Tabs: Study Leave / Days Off / Adjunct Lecturers
- Study Leave: lecturer, date range, optional reason
- Days Off: lecturer, one-off or recurring day(s)
- Adjunct Lecturers: name, available days/times, courses taught
- "Mark constraints complete" toggle once done

**Screen 7 — Generate timetable**
- Summary panel: venue availability snapshot, allocation snapshot, active constraint count
- Primary CTA: **Proceed to Generate**
- System auto-generates a draft respecting all constraints, then routes to Screen 8

**Screen 8 — Generated timetable review**
- View toggles: List view / By lecturer / By course / Calendar grid view (week-at-a-glance, venues or lecturers as rows)
- Inline edit: venue & time per class (dropdown or drag-and-drop)
- Persistent **✱ Check for constraints** indicator — live conflict validation as edits are made
- Conflict banner: lists each conflict with a jump-to link; blocks submission until cleared

**Screen 9 — Submit for approval**
- Confirmation modal; final constraint check runs automatically
- Pass → **Submit to HOD**, status becomes "Submitted to HOD"
- Fail → submission blocked, conflicts listed inline

**Screen 10 — Status & history**
- Timeline: Submitted → HOD decision → Dean decision → Acad Pl. T.O decision, each with timestamp, actor, comment (if rejected)
- On rejection: reviewer's comment pinned at top, CTA **Revise timetable** jumps straight into edit mode on the flagged item

### 5.2 Head of Department (HOD)

**Screen 1 — Dashboard**
- List of department/course timetables pending HOD review, with status chips (Pending / Returned by Dean)

**Screen 2 — Timetable review**
- Same List / By lecturer / By course / Calendar grid views as Dept T.O, read + comment
- Side panel: active constraints (study leave, days off, adjunct lecturers) — viewable, with the ability to flag/add anything Dept T.O missed

**Screen 3 — Decision**
- **Approve** → status "Submitted to Dean," leaves HOD's queue
- **Reject with comment** (comment required) → status "Rejected by HOD," returns to Dept T.O with comment attached

**Screen 4 — Handling a Dean rejection**
- Item flagged "Returned by Dean" with the Dean's comment visible
- HOD chooses: resolve directly and resubmit to Dean, or reject further to Dept T.O with a combined comment *(Assumption A2 — confirm)*

**Screen 5 — History / audit**
- Log of past decisions for accountability

### 5.3 Dean

**Screen 1 — Dashboard**
- Generated timetables pending Dean approval, grouped by department/course, with status chips

**Screen 2 — Timetable review (read-only)**
- Views: by department / by course

**Screen 3 — Decision**
- **Approve** → status "Submitted to Acad Pl. T.O"
- **Reject with comment** (required) → status "Rejected by Dean," returns to HOD's queue

**Screen 4 — History / audit**

### 5.4 Academic Planning Timetable Officer (Acad Pl. T.O)

**Screen 1 — Dashboard**
- Who-has-status board (which department/school is at which stage)
- Total constraints count, submitted timetables count
- Aging indicator (e.g. "3 days pending Dean")

**Screen 2 — Constraints management**
- Tab: Venues — select department(s), assign/reassign venues (school → department mapping)
- Tab: Time — institution-wide adjunct lecturer roster, days off, study leave calendar overlay

**Screen 3 — Final timetable review**
- Views: by school / by department
- Cross-department conflict check: shared venues, shared adjunct lecturers across departments

**Screen 4 — Final decision**
- **Approve → Publish**: status becomes "Published," timetable goes read-only and visible to Lecturers & Students, notifications fire
- **Reject with comment** (required) → returns to HOD's queue *(Assumption A3 — confirm)*

**Screen 5 — History / audit (institution-wide)**

### 5.5 Lecturer (recipient)

**Screen 1 — My timetable**
- Personal weekly/calendar view of published classes, filterable by course
- Empty state: "Timetable not yet published" before publish

**Screen 2 — Notifications**
- In-app/email alert on publish or post-publish amendment

**Screen 3 — Export** *(nice-to-have)*
- Download PDF / sync to personal calendar (.ics)

### 5.6 Student (recipient)

**Screen 1 — My timetable**
- Filter by course / level / department
- Same list/calendar toggle as the Lecturer view

**Screen 2 — Notifications**

**Screen 3 — Export** *(nice-to-have)*

## 6. Cross-cutting features

### 6.1 Notification matrix

| Trigger | Recipient | Channel |
|---|---|---|
| Timetable submitted | HOD | In-app + email |
| HOD approved | Dean | In-app + email |
| HOD rejected | Dept T.O | In-app + email, with comment |
| Dean approved | Acad Pl. T.O | In-app + email |
| Dean rejected | HOD | In-app + email, with comment |
| Acad Pl. T.O approved (published) | Lecturers & Students in the affected department | In-app + email |
| Acad Pl. T.O rejected | HOD | In-app + email, with comment |

### 6.2 Constraint validation engine

Runs at Dept T.O's review/submit screens (5.1, Screens 8–9) and re-checks at each approval stage. Checks: venue double-booking, lecturer double-booking, capacity vs. class size, adjunct lecturer availability window, study-leave/day-off conflicts.

Recommended severity split:
- **Hard block:** capacity overage, lecturer double-booking, venue double-booking
- **Soft warning:** sub-optimal but not invalid arrangements (e.g. back-to-back classes across campus)

### 6.3 Comments & audit trail
- Every rejection requires a comment (enforce as a required field, minimum length)
- Full audit trail visible to Dept T.O, HOD, Dean, and Acad Pl. T.O: who acted, when, and what was said

### 6.4 Rejection routing

| Rejected by | Returns to | Notes |
|---|---|---|
| HOD | Dept T.O | Direct edit access |
| Dean | HOD | HOD triages — Assumption A2 |
| Acad Pl. T.O | HOD | HOD triages — Assumption A3 |

## 7. End-to-end flow

Visualized above: **Dept T.O generates and submits → HOD approves/rejects → Dean approves/rejects → Acad Pl. T.O approves/rejects → published to Lecturers & Students.**

## 8. User stories & acceptance criteria

### Epic A — Departmental T.O

- **A1.** As a Dept T.O, I want to view lecturer-course allocations for my department, so I can make informed constraint and scheduling decisions.
  *AC: Given I open Allocations, then I see every course with its assigned lecturer(s), filterable by course or lecturer.*
- **A2.** As a Dept T.O, I want to see available venues and timeslots, so I know what resources I can schedule against.
- **A3.** As a Dept T.O, I want to input study leave, days off, and adjunct lecturer availability, so the generated timetable respects real staff availability.
  *AC: Given a study-leave record covering a date range, when the timetable is generated, then that lecturer gets no class in that range.*
- **A4.** As a Dept T.O, I want to generate a draft timetable in one click, so I don't have to build the schedule manually.
  *AC: Given constraints, allocations, and venues are set, when I click "Proceed to Generate," then a draft is created honoring all constraints and I land on the review screen.*
- **A5.** As a Dept T.O, I want to view the generated timetable by list, by lecturer, by course, or as a calendar grid, so I can review it from whichever angle is useful.
- **A6.** As a Dept T.O, I want to manually edit venue and time for any class, so I can override the auto-generated schedule when needed.
  *AC: Given I change a class's venue or time to one that conflicts with another booking, then I see an inline warning before I can save.*
- **A7.** As a Dept T.O, I want the system to check for constraint conflicts before I submit, so I never send an invalid timetable up the chain.
  *AC: Given unresolved conflicts exist, when I click Submit, then submission is blocked and every conflict is listed with a jump-to link.*
- **A8.** As a Dept T.O, I want to submit my timetable to the HOD, so it can move through approval.
- **A9.** As a Dept T.O, I want to see the live status and history of my submission, so I know exactly where it is in the chain.
- **A10.** As a Dept T.O, I want to see a reviewer's rejection comment and jump straight into the flagged edit, so I can resubmit quickly.
  *AC: Given my timetable is rejected, when I open it, then the comment is pinned at the top and a link drops me into edit mode on the relevant class.*

### Epic B — HOD

- **B1.** As an HOD, I want a dashboard of timetables pending my review, so I can prioritize my workload.
- **B2.** As an HOD, I want to review a department's generated timetable alongside its active constraints, so I can make an informed decision.
- **B3.** As an HOD, I want to approve a timetable, so it advances to the Dean.
  *AC: Given I click Approve, then status becomes "Submitted to Dean" and it leaves my queue.*
- **B4.** As an HOD, I want to reject with a mandatory comment, so the Dept T.O knows exactly what to fix.
  *AC: Given I click Reject without a comment, then I cannot submit the rejection.*
- **B5.** As an HOD, I want to see clearly when a timetable has bounced back from the Dean, so I can resolve it or route it further down.

### Epic C — Dean

- **C1.** As a Dean, I want to see all timetables pending my approval, grouped by department/course.
- **C2.** As a Dean, I want to approve a timetable so it moves to Academic Planning for final sign-off.
- **C3.** As a Dean, I want to reject with a mandatory comment, so the HOD knows what needs revisiting.

### Epic D — Academic Planning T.O

- **D1.** As an Acad Pl. T.O, I want a dashboard of status across all schools/departments, total constraints, and submitted timetables, so I have an institution-wide view.
- **D2.** As an Acad Pl. T.O, I want to assign venues to departments, so departments only schedule against venues available to them.
- **D3.** As an Acad Pl. T.O, I want to manage institution-wide time constraints (adjunct lecturers, days off, study leave), so cross-department scheduling stays consistent.
- **D4.** As an Acad Pl. T.O, I want to review the final timetable by school or by department before publishing, so I can catch cross-department conflicts.
- **D5.** As an Acad Pl. T.O, I want to give final approval and publish, so lecturers and students receive the timetable.
  *AC: Given I click Approve, then status becomes "Published," the timetable is read-only for Lecturers/Students, and notifications go out.*
- **D6.** As an Acad Pl. T.O, I want to reject with a comment, so unresolved institution-level conflicts get fixed before publishing.

### Epic E — Lecturer

- **E1.** As a Lecturer, I want to view my personal published timetable, so I know when and where I teach.
- **E2.** As a Lecturer, I want to be notified when a timetable is published or changed, so I don't miss updates.
- **E3.** *(Nice-to-have)* As a Lecturer, I want to export my timetable to my personal calendar, so I don't have to check the app manually.

### Epic F — Student

- **F1.** As a Student, I want to view my class timetable, so I know when and where to attend.
- **F2.** As a Student, I want to filter my timetable by course, so I can quickly find a specific class.
- **F3.** As a Student, I want to be notified when the timetable is published, so I can plan my week.

## 9. Edge cases & error states

- Timetable submitted with zero constraints set — should the system warn "no constraints defined, proceed anyway?"
- A venue is removed by Acad Pl. T.O after a department has already scheduled against it — needs a re-validation trigger on that department's timetable
- An adjunct lecturer is double-booked across two departments — should be caught at the Acad Pl. T.O cross-department check (5.4, Screen 3)
- A rejection comment doesn't reference a specific class — comments should support tagging a specific row/class, not just free text
- A timetable is resubmitted with no changes made — consider disabling Resubmit until at least one edit is detected, or requiring a short "response to reviewer" note
- Mid-semester constraint change after publish (e.g. a lecturer falls ill) — out of scope for this doc; flagged in Section 10 as needing a fast-track amendment flow

## 10. Open questions for stakeholder validation

1. Confirm rejection routing for Dean → HOD and Acad Pl. T.O → HOD (Assumptions A2 / A3).
2. Does the HOD have any timetable edit rights, or strictly approve/reject plus constraint flags?
3. Is the Course Adviser role involved anywhere in Timetabling, or purely in Course Advising per the access matrix?
4. Should Lecturers see a provisional (pre-publish) view of their allocation, or only the final published version?
5. Post-publish amendments — same full approval chain, or an expedited path?
6. What exactly counts as a hard block vs. a soft warning in the conflict engine?
