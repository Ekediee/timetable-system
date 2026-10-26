# Timetable System — Development Progress Log

> **Note**: This log documents all system changes, architectural decisions, and feature implementations. Subsequent updates will be appended chronologically.

---

## 📅 Session Summary — Oct 8, 2026

### 1. CSP Timetable Solver Engine (`lib/engine.ts`)
* **New File Implementation**: Built a deterministic **Constraint Satisfaction Problem (CSP)** solver using **Minimum Remaining Values (MRV)** heuristics.
* **Unit Course Breakdown**:
  * 3-unit courses automatically split into **1 session of 2 hours + 1 session of 1 hour** on distinct days.
  * 2-unit courses scheduled as **1 session of 2 hours**.
* **Operating Hours & Boundary Constraints**:
  * Daily operating window: 7:00 AM – 6:00 PM (`07:00` to `17:00` slots).
  * **Mandatory Lunch Break**: 1:00 PM – 2:00 PM (`13:00` slot) locked daily across all days.
  * **Wednesday Cutoff**: Classes end strictly by 5:00 PM on Wednesdays (`17:00` slot locked).
  * **Friday Cutoff**: Classes end strictly by 1:00 PM on Fridays (`13:00`+ slots locked).
* **Lecturer Availability Rules**: Enforces Study Leave, Days Off (Wednesdays, Friday AM), and Adjunct availability windows (Tue/Fri, after 14:00).
* **Venue Fitness Scoring**: Prioritizes home department venues and optimizes room capacity ratio ($\text{class size} / \text{room capacity}$).
* **Cross-Level & Sub-Group Non-Overlap Rules**:
  * **Cross-level Venue Protection**: Global venue reservation tracking prevents 100L, 200L, 300L, or 400L classes from double-booking the same venue.
  * **Multi-Group Parallel Scheduling**: Different groups (e.g., `Group A` in Lab 3 while `Group B` is in LT 12) can run simultaneously in different venues.
  * **Same-Group Anti-Clash**: Guarantees students within the same group (e.g., `Group A`) are never double-booked.
  * **Combined Lectures (`Group: "All"`)**: General courses (GST) reserve all groups at that level for that time slot.
* **Multi-Hour Duration Span**: Schedules and reserves consecutive slots (e.g., `08:00` and `09:00`) for 2-hour or 3-hour blocks.

---

### 2. Data Schema & Multi-Level Seed Allocations (`lib/data.ts`)
* Expanded `slots` grid to 1-hour granularity from `07:00` to `17:00`.
* Added `duration`, `group`, and `level` fields to `Allocation` and `Session` TypeScript types.
* Expanded seed allocations to cover **100 Level**, **200 Level**, **300 Level**, and **400 Level** with sub-groups (`Group A`, `Group B`, `Group C`, `Group D`, `All`).

---

### 3. Academic Planning Venue CSV Upload (`views/AcademicPlanningConstraints.tsx`)
* Added **Upload CSV** button and interactive modal for Academic Planning Officers to parse, preview, and batch-register new venues into the system formatted as `Venue Name, Capacity, Type, Assigned Department`.

---

### 4. Generate Timetable View & Filters (`views/Generate.tsx`)
* Connected real `generateTimetable(...)` CSP solver engine to the **Regenerate** button.
* Added visual locked indicators in the calendar grid for **Lunch Break (1–2pm)**, **Wed 5pm End**, and **Fri Afternoon Off**.
* Displayed session duration badges (`2h`) on session cards.
* Added **Level Filter** (`100 Level` – `400 Level`) and **Sub-group Filter** (`Group A` – `Group D`) dropdown selectors in the toolbar to toggle between the master institution schedule and individual level/group timetables.
* Updated `cell` lookup function to account for multi-hour session slot coverage.

---

### 5. Departmental T.O Venues & Timeslots View (`views/Venues.tsx`)
* Converted the view from interactive block toggling to a **Read-Only Directory & Schedule View**.
* Displays venue seat capacity, location block, and assigned department in a card list.
* Rendered a **Read-Only Venue Availability Schedule Grid** showing occupied course sessions, system locked slots (Lunch Break, Wednesday 5pm cutoff, Friday 1pm cutoff), and free open slots.
* Added read-only stats bar showing total capacity, scheduled hours per week, and available free hours per week for the selected room.
* Updated `getSessionForCell` to span multi-hour sessions across all occupied slots.

---

### 6. Timetable Workflow: Pre-Generation Snapshots & Post-Generation Screens (`views/Generate.tsx`)
* Implemented a dedicated two-screen timetable workflow in `views/Generate.tsx`:
  * **Screen 1: Generate Timetable Pre-Generation Screen (`screenMode === "snapshot"`)**:
    * **Venue Availability Snapshot**: Displays all mapped departmental rooms, total seating capacity (640 seats), operational parameters, and a direct link to inspect venue schedules.
    * **Course Allocations Snapshot**: Displays total courses (16 courses, 48 units), covered levels (100L–400L), sub-groups (`Group A`–`D`, `All`), course previews, and link to view allocations.
    * **Active Constraints Snapshot**: Displays active lecturer rules (Study Leave, Days Off, Adjuncts), institutional policy checklist (1–2pm Lunch Break, Wed 5pm cutoff, Fri 1pm cutoff, 3-unit 2h+1h split), and link to manage constraints.
    * **Primary Action CTA**: Prominent **"Proceed to Generate Timetable"** button.
  * **Interactive Generating State**:
    * Displays animated engine status with rotating progress indicators explaining CSP solving steps (unit decomposition, availability checks, multi-group non-overlap, capacity optimization).
  * **Screen 2: Generated Timetable Screen (`screenMode === "generated"`)**:
    * Displays the master calendar grid and list view of scheduled sessions.
    * Allows quick switching back to view input snapshots (`"Input Snapshots"` button).
    * Provides **Regenerate** and **Submit to HOD** actions once cleared of hard conflicts.

---

### 7. Support for Unified Cohort Classes & Virtual Venues (`lib/data.ts`, `lib/engine.ts`, `views/Generate.tsx`)
* **Departmental Grouping Structure vs. Unified Cohort Classes**:
  * Grouping is determined at the **department level**: Departments with high student enrolments (e.g. Computer Science) divide students into sub-groups (Group A, Group B, Group C, Group D) and **maintain these groups across all levels from 100L through 400L**.
  * Departments with smaller enrolments do not group their students from the start and maintain unified cohort classes throughout their entire program.
  * Within grouped departments, specific courses (such as General GST lectures or combined departmental projects) can unify all groups into a single session (`group: "All"` / unified).
  * When `group` is omitted or marked `"All"`, the engine treats the session as a whole-cohort unified class, preventing any other course from running for that cohort at that time slot.
  * When sub-groups are active (e.g. `Group A`, `Group B`), the engine schedules them in parallel in separate venues while preventing same-group double-booking.
* **Virtual Venues (`Virtual / LMS`) for GST & Online Courses**:
  * Added `isVirtual?: boolean` property to `Allocation`, `Session`, `Venue`, and `VenueRecord`.
  * Added `Virtual / LMS` (capacity 5,000, Online / E-Learning block) to available venues.
  * Courses marked virtual (such as general university courses `BU-GST 101`, `BU-GST 201`, `BU-GST 301`):
    * Bypass physical classroom capacity limits and do not lock physical lecture halls.
    * Multiple virtual classes can run simultaneously on separate online links/channels without physical room clashes.
    * Still strictly enforce lecturer availability (no lecturer teaching two virtual classes at once) and student cohort non-overlap.
* **UI Indicators for Virtual Sessions**:
  * Added `<Globe size={9} /> Virtual` badge rendering in both the calendar grid view and list view in `views/Generate.tsx`.

---

## 📅 Session Summary — Oct 11, 2026

### 8. Academic Planning Office CSV Venue Upload & N/A Normalization (`views/AcademicPlanningConstraints.tsx`, `lib/data.ts`)
* **CSV Ingestion Scheme for Academic Planning Office**:
  * Added an **Upload CSV** button and interactive modal dialog (`UploadVenuesModal`) allowing Academic Planning Officers to ingest campus venues in bulk.
  * Supported input modes:
    * File drag-and-drop & file picker (`.csv`, `.txt`).
    * Direct paste textarea for raw CSV lines.
    * One-click demo dataset showcasing both clean rows and edge cases (missing owners, unknown capacities, N/A floors, unknown space types).
    * Downloadable CSV template (`bupulse_venues_template.csv`) and copyable clipboard format.
* **Prescribed Format & Columns**:
  * `Department owner, venue, capacity, floor, space type(shared / exclusive)`
* **Intelligent Normalization for Fields Containing `N/A`, `Unknown`, or Blank**:
  * **Department Owner**:
    * If `N/A`, `Unknown`, `none`, `-`, `?`, `empty`, or `shared`: Automatically routed to the **Central Shared Pool** (`assignedDept: null`, `school: null`) with note `Shared Pool (was N/A)`.
    * If a valid department name is provided: Matched against the institution's department registry to automatically populate `school`.
  * **Venue (Room Name)**:
    * If `N/A`, `Unknown`, or blank: Auto-generates a designated identifier (`Unassigned Venue #[Row]`) and flags a warning badge (`⚠️ Unknown Venue Name — Review Required`) with an editable text input in the review table.
  * **Capacity**:
    * If `N/A`, `Unknown`, non-numeric, or `<= 0`: Safely defaulted to **50 seats** and flagged with a warning pill (`⚠️ Defaulted to 50 seats (was N/A)`) with an editable numeric input in the review table.
  * **Floor**:
    * If `N/A`, `Unknown`, or blank: Handled gracefully as `"Unspecified"`.
    * If shorthands provided (`0`, `1`, `2`, `g`, `b`): Normalized to `"Ground Floor"`, `"1st Floor"`, `"2nd Floor"`, `"Basement"`.
  * **Space Type (`shared` / `exclusive`)**:
    * If `N/A`, `Unknown`, or blank: **Auto-inferred based on Department Owner**:
      * If an owner department is present $\rightarrow$ Inferred as **Exclusive** (`spaceType: "exclusive"`).
      * If owner department is `null` / N/A $\rightarrow$ Inferred as **Shared Pool** (`spaceType: "shared"`).
    * If marked exclusive without a department owner: Flagged with a conflict warning allowing the officer to assign an owner or switch to Shared.
    * Toggle button in the review table allows instant flipping between `Shared` and `Exclusive`.
  * **Venue Type (`Lecture Hall`, `Lab`, `Seminar Room`, `Auditorium`)**:
    * Inferred intelligently based on room keywords (`Lab`, `Studio`, `Auditorium`, `Seminar`) and capacity.
* **Review & Verification Table**:
  * Shows parsed rows with original vs. normalized values, inline editable inputs (name, department, capacity, floor, space type toggle), and delete buttons before committing.
  * Provides import strategies: **Append to existing inventory** or **Replace entire inventory**.
* **Venues Inventory Directory Enhancement**:
  * Updated desktop and mobile directory tables to display `Floor` and `Space Type` (`Exclusive` vs `Shared Pool`) pills alongside Capacity, Type, and Department Owner.
  * Added filtering by **Space Type** (`All space types`, `Exclusive only`, `Shared pool only`) and updated header statistics.

---

### 9. Preservation of Department Ownership for Shared Venues (`views/AcademicPlanningConstraints.tsx`, `lib/data.ts`)
* **Decoupling of Department Ownership from Exclusivity**:
  * Venues designated as `shared` (multi-department access) now **strictly maintain and display their Department Owner** (custodian / host department) instead of being cleared or marked as unassigned.
  * Shared lecture complexes and halls (e.g., `LT 12` owned by Computer Science, `LT 5` owned by Nursing Science, `Main Auditorium` owned by Central Administration) now clearly indicate both their owner and their `Shared` access status.
* **UI & Workflow Updates**:
  * Table renders `[Department Name]` with subtitle `[School] · Shared Host` for shared venues that have designated owner departments.
  * Interactive one-click toggle button on the **Space Type** column in the directory table allows Academic Planning Officers to toggle a venue between `Exclusive` and `Shared` without affecting its assigned department owner.
  * In the CSV Ingestion Modal (`UploadVenuesModal`), selecting or editing an owner department does not automatically force the space type to exclusive, preserving custom shared venue arrangements.
  * Updated seed inventory (`venueRecords` in `lib/data.ts`) and sample CSV template so all campus lecture complexes have their respective custodian department owners indicated.

---

### 10. Actual CSV Department Owner Preservation & Removal of Rigid Dropdown (`views/AcademicPlanningConstraints.tsx`)
* **Problem Addressed**:
  * Previously, the CSV import review table rendered a rigid `<select>` dropdown containing only pre-hardcoded departments. Any department listed in the uploaded CSV that was not in that list (e.g. Civil Engineering, Biochemistry, General Studies, etc.) fell back to displaying `"— Shared Pool (All) —"`, masking the true department owner.
* **Solution Implemented**:
  * Removed the rigid `<select>` dropdown entirely from the CSV import review table.
  * Replaced with a direct, editable text input that displays the **exact Department Owner** from the CSV file.
  * If the CSV cell is genuinely blank, `N/A`, or `Unknown`, the input displays an italicized placeholder `"— Shared Pool (Unassigned) —"`.
  * The user can freely edit or type any department name directly; the system matches known departments to their school and assigns `"Departmental / Faculty Pool"` to custom/unlisted departments without resetting or corrupting the department name.
  * In the directory table's edit selector (`VenuesTab`), dynamically populated all known and uploaded departments (`allKnownDepts`) so newly imported departments can be selected seamlessly.

---

### 11. Generated Timetable Screen Upgrades: Perspectives, Line Editing, Persistent Constraint Indicator & Conflict Banner (`views/Generate.tsx` & `lib/engine.ts`)
* **Features Implemented**:
  1. **Toggle View Perspectives (`By Cohort / Master`, `By Lecturer`, `By Course`)**:
     * Added top-level perspective selector segmented buttons in [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx).
     * **By Cohort / Master**: Full multi-level (100L–400L) and sub-group (Group A–D) calendar grid or table list.
     * **By Lecturer**: Dedicated lecturer filter dropdown and lecturer workload overview card (displaying assigned courses, weekly hours, and constraint badges such as Days Off or Adjunct limits). Isolates that lecturer's weekly schedule with visual shading for locked days off.
     * **By Course**: Course filter & search bar with cards for each course, displaying enrollment, units, core/elective/GST type, virtual LMS indicator, and all scheduled sub-sessions with status and quick edit buttons.
  2. **Line Edit per Class (Venue & Time Slot)**:
     * Interactive Line Edit modal accessible from any view (Calendar grid cards, list rows, Course cards, or Conflict banner).
     * Dropdowns to adjust **Day of Week** (`Mon`–`Fri`), **Start Time Slot** (`07:00`–`17:00`), and **Assigned Venue** (with capacity & room type indicators).
     * **Live Conflict Preview inside Modal**: As the user changes dropdowns, real-time hypothetical validation checks if the new slot/venue creates or resolves collisions (e.g. lunch break overlap, lecturer day off, double-booking, or capacity overage) before saving.
     * Direct commit to global `localSessions` with instant feedback toast.
  3. **Persistent ✱ Check for Constraints Indicator**:
     * Prominent status pill in the top header displaying the live constraint status (`✱ All Satisfied` with green badge or `✱ X Violations Active` with pulsing red badge).
     * Interactive **Re-check** button with animated scan state that re-evaluates all operational and lecturer constraints in real time.
  4. **Conflict Banner with Jump-to Links & Submission Blocker**:
     * Callout banner at the top of the schedule listing each detected conflict with category (`Venue double-booking`, `Capacity overage`, `Lecturer clash`, `Constraint violation`), session details, and explicit error explanations.
     * **Jump & Edit → Link**: Jumps to the cell, highlights it with an animated attention ring, and automatically opens the Line Edit modal on that conflicting session.
     * **Submission Gate**: The `Submit to HOD` button is strictly disabled with a lock indicator whenever conflicts remain, preventing submission of invalid drafts.

---

### 12. Resolution of 2-Hour Lecture Period Alignment & Cohort Timing Overlaps (`lib/engine.ts`, `views/Generate.tsx`, `lib/data.ts`)
* **Problem Addressed**:
  * On the generated timetable, 2-hour classes were allowed to start on odd offset hours (such as `11:00 AM` for `COSC 204` running 11:00–13:00) while another whole-cohort 2-hour course (`BU-GST 205`) was scheduled at `10:00 AM` (running 10:00–12:00).
  * This resulted in a 1-hour staggered collision between 11:00 AM and 12:00 PM where 200 Level students had two simultaneous classes. Additionally, starting 2-hour classes at 11:00 AM fragmented the institutional schedule and approached the 13:00 lunch break.
* **Solution Implemented**:
  1. **Standard 2-Hour Academic Lecture Period Alignment**:
     * In [`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts), constrained 2-hour classes to standard institutional block start times:
       * `08:00 – 10:00` (Period 1)
       * `10:00 – 12:00` (Period 2)
       * `14:00 – 16:00` (Period 3)
       * `16:00 – 18:00` (Period 4, Mon/Tue/Thu)
     * Strictly barred 2-hour sessions from starting at `11:00 AM` (which straddles the 10:00–12:00 period) or `12:00 PM` (which collides with the 13:00 lunch break).
     * Allocated 1-hour single sessions to appropriate 1-hour windows (`07:00–08:00`, `12:00–13:00`, `16:00–17:00`).
  2. **Comprehensive Cohort Occupancy Tracking**:
     * When any whole-cohort/unified course (e.g. `group: "All"`, such as `BU-GST 205`) is scheduled, the engine now marks all student sub-groups (`Group A`, `Group B`, `Group C`, `Group D`) as occupied for all hours of that duration.
     * Prevents any sub-group course (such as `COSC 204 Group A`) from being placed during or overlapping with unified cohort hours.
     * Hardened fallback assignment so it never assigns sessions into slots with cohort clashes.
  3. **Visual Multi-Hour Block Clarification in UI**:
     * In [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx), the calendar grid now clearly displays the full time range on start cards (e.g., `10:00–12:00 (2h)`).
     * For continuation cells (e.g. Hour 2 at 11:00 AM), renders a distinct `Cont. (Hr 2)` dashed indicator showing the parent block, preventing visual confusion with a new class starting at 11:00 AM.
     * In the Line Edit modal, clearly highlights standard 2-hour blocks and flags non-standard offset start times.

---

### 13. Implementation of User Story A10 & Screen 10 Rejection Deep-Link Revision Flow (`views/History.tsx`, `views/Generate.tsx`, `views/Dashboard.tsx`, `components/TopBar.tsx`, `lib/AppContext.tsx`)
* **Specification Target**:
  * Screen 10 (Status & History) and Epic A User Story A10: *"As a Dept T.O, I want to see a reviewer's rejection comment and jump straight into the flagged edit, so I can resubmit quickly. AC: Given my timetable is rejected, when I open it, then the comment is pinned at the top and a link drops me into edit mode on the relevant class."*
* **Implementation Details**:
  1. **Global `activeRevisionTarget` in AppContext**:
     * Added `{ code: string; day?: string; slot?: string } | null` state and setter to [`lib/AppContext.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/AppContext.tsx).
     * Enables seamless cross-view navigation from any rejection alert directly into editing mode on specific flagged courses.
  2. **Screen 10 Pinned Reviewer Rejection Banner ([`views/History.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/History.tsx))**:
     * When a timetable has been returned by a reviewer (e.g., HOD Dr. A. Olumide), a prominent banner is pinned at the top of the Status & History view.
     * Displays reviewer identity, role, timestamp, and highlighted feedback.
     * Includes one-click action buttons: **"Revise BU-GST 205 →"** and **"Revise CST Hall A Clash →"**, plus updated sidebar quick actions.
  3. **Auto-Focus & Line Edit Launch in [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx)**:
     * Added `useEffect` listening for `activeRevisionTarget`.
     * Upon navigation, the view switches to generated mode, resets any conflicting cohort/lecturer filters to `"all"` so the session is guaranteed visible, animates an attention ring around the cell, and **automatically launches the Line Edit modal** directly on that session.
     * Emits a guidance toast notification confirming the targeted course is open for revision.
  4. **TopBar & Dashboard Notification Integration ([`components/TopBar.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/components/TopBar.tsx) & [`views/Dashboard.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Dashboard.tsx))**:
     * TopBar notification bell now features a badge indicator and an interactive dropdown showing the rejection note with a one-click **"Fix BU-GST 205 →"** revision button.
     * Dashboard's returned timetable card offers direct deep-link buttons to fix flagged issues immediately.

---

### 14. Overhaul & Fix of "By Lecturer" Perspective ([`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx))
* **Issues Addressed**:
  1. **Missing Lecturer Label in Calendar Cells**:
     * When switching to "By Lecturer" with "All Department Lecturers" selected, calendar grid cell items completely hid the lecturer name because rendering was conditionally locked to `perspective === "cohort"`.
     * Fixed so that in "All Department Lecturers" grid view, each session card prominently displays the **Lecturer's name** with a dedicated avatar/user badge (`<User size={10} />`). Continuation cards (`Cont. (Hr 2)`) also display the lecturer's name.
  2. **Hardcoded Day-Off and Availability Checks**:
     * Previously, day-off headers and unavailable cell tinting were hardcoded exclusively for `"Johnson R.T"` on Wednesdays and `"Lee M.N"` on Friday AM. Any other lecturer selected had zero visual constraint feedback.
     * Replaced with dynamic helper functions `getLecturerDayRestriction` and `getLecturerSlotRestriction` powered by `isLecturerAvailableForSlot` from [`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts).
     * Day column headers now dynamically show `(Day Off)`, `(Clinic AM Off)`, `(Adjunct Off)`, or `(On Study Leave)` based on active departmental constraints for whichever lecturer is selected.
     * Unavailable slots are shaded with warning tint and display a clear `Unavailable: [Reason]` badge when no class is scheduled.
  3. **Dedicated "Cards by Lecturer" Mode**:
     * Added a 3-way view toggle for "By Lecturer": **Cards**, **Calendar**, and **List**.
     * In **Cards** mode:
       * Renders a dedicated card per department lecturer featuring their avatar initials, weekly teaching load (e.g. `4 hrs/week`), constraint badges (e.g. `Day Off: Every Wed` or `Full Availability`), and clash indicators.
       * Lists all assigned course sessions with day, time, venue, cohort group, and an inline **"Edit"** button for immediate line edits.
       * Includes a **"View on Calendar →"** shortcut that focuses directly on that lecturer's calendar grid.
  4. **Lecturer Profile Highlight Banner & Quick Return**:
     * When focusing on a specific lecturer, the top profile banner displays their avatar, teaching load, assigned course count, constraint pills, and a one-click **"← All Lecturers"** return button.
     * Switching from Cards mode to an individual lecturer smoothly opens their personal timetable grid.

---

### 15. Master Course Allocation Excel Data Integration & Full In-App Upload/Import System (`lib/university_allocations.json`, `lib/data.ts`, `lib/AppContext.tsx`, `views/Allocations.tsx`, `views/Generate.tsx`, `views/Dashboard.tsx`, `views/HODReview.tsx`, `views/DeanReview.tsx`, `app/api/upload-allocations/route.ts`, `lib/engine.ts`)
* **Background & Goal**:
  * Replace the static mock course allocations with authentic, real-world university course allocations parsed from `2026_2027_first_semester_allocation.xlsx`.
  * Support in-app Excel (`.xlsx`/`.xls`) and CSV file uploads, multi-program university-wide switching, and live synchronization across all timetable generation, scheduling, and review views.
* **Key Enhancements**:
  1. **Master Excel Parsing & Structured University Dataset**:
     * Parsed all 2,853 course allocations across 50 university programs from `2026_2027_first_semester_allocation.xlsx` into [`lib/university_allocations.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_allocations.json).
     * Computer Science department course allocations replaced with 169 authentic allocations across 100L–400L, 49 real university lecturers, and Groups A through F.
  2. **Reactive App Context Synchronization ([`lib/AppContext.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/AppContext.tsx))**:
     * Added `localAllocations`, `setLocalAllocations`, `currentProgram`, and `setCurrentProgram` to `AppContext`.
     * All views ([`views/Allocations.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Allocations.tsx), [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx), [`views/Dashboard.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Dashboard.tsx), [`views/HODReview.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/HODReview.tsx), [`views/DeanReview.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/DeanReview.tsx)) now dynamically consume and respond to live allocation changes without page reloads.
  3. **Zero-Dependency Server-Side Excel Upload API ([`app/api/upload-allocations/route.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/app/api/upload-allocations/route.ts))**:
     * Created a Next.js API route handler accepting file uploads via `FormData`.
     * Utilizes Python 3's built-in standard library (`zipfile` and `xml.etree.ElementTree`) to securely decompress and parse OpenXML workbook sheets without external npm dependencies, running completely within the local execution environment.
  4. **Interactive In-App Upload & Program Selector Modal ([`views/Allocations.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Allocations.tsx))**:
     * Built a modal supporting:
       * Drag-and-drop or file selection for `.xlsx`, `.xls`, and `.csv` spreadsheets.
       * Preloaded 50-program Master Selector allowing instant switching between departments (e.g., Computer Science with 169 courses, Software Engineering with 213, Information Technology with 66, etc.).
       * Live parse preview showing row counts, unique lecturers, and level distribution before committing.
  5. **Advanced Allocations Directory View Overhaul**:
     * Live metrics header: Total Courses, Total Units, Unique Lecturers, and Active Levels.
     * Comprehensive multi-criteria filtering: Level (`All`, `100L`–`400L`), Group (`All`, `Group A`–`F`, `Unified`), Course Type (`All`, `Core`, `Elective`, `GST`), and Search bar.
     * Dynamic cohort group support expanded from Groups A–D to include Groups E and F across all cohort selectors.
  6. **Engine Scalability ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts))**:
     * Updated `decomposeAllocations` to suffix session IDs with group keys (`${alloc.code}-${grp}-s1`), preventing ID collisions for multi-group courses.
     * Extended cohort reservation logic to track occupancy across Groups A through F.
  7. **React Key Collision Resolution ([`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx))**:
     * Fixed duplicate React key warning (`Encountered two children with the same key, 'CSC 203'`) caused by multi-group courses sharing identical course codes.
     * Updated sample course preview and "By Course" perspective cards to use compound keys including course code, cohort group, lecturer name, and loop index.
     * Added reactive `[allocations]` dependencies to `allLecturers`, `allCourseCodes`, and `courseFilteredAllocations`.
  8. **Zero Lecturer Double-Booking in Scheduler Engine ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts))**:
     * Investigated root cause of 94 initial conflicts on the 169-course allocation dataset: 289 weekly sessions (~386 class hours) vs. 6 venues (~210 usable venue hours) caused extreme physical room exhaustion.
     * When unplaced sessions overflowed into the fallback handler, the fallback previously only checked cohort collisions and did not verify or record lecturer occupancy.
     * Overhauled fallback to enforce two-tiered search prioritizing lecturer availability and strictly forbidding lecturer double-booking.
     * Lecturer clashes dropped from 12 down to **0**, leaving only pure venue capacity shortage conflicts pending the import of the campus-wide venues dataset.
  9. **Authentic University Venues Dataset Integration ([`venu.csv`](file:///home/mighty/Documents/Github/Frontend/timetable-system/venu.csv), `lib/university_venues.json`, `lib/data.ts`, `lib/AppContext.tsx`, `views/Venues.tsx`, `views/Generate.tsx`)**:
     * Processed all 311 venue mapping entries in `venu.csv` into [`lib/university_venues.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_venues.json), cataloging 132 unique university venues across 50 departments.
     * Mapped the **31 authentic School of Computing venues** (`BUC_LAB1`, `BUC_ROOM1–3`, `CIT`, `SAPHIRE_HALL1`, `SAT_A006–A107`, `SAT_B006–B107`, `SAT_F104–F203`, New Horizon Studios 1–5, etc.) to replace the legacy 6 mock rooms.
     * Bound `localVenues` into `AppContext` and updated [`views/Venues.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Venues.tsx) with a real-time search filter and scrollable room directory.
  10. **Elimination of Multi-Group Day Lockout & Fallback Cascade ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts))**:
     * Diagnosed root cause of the 38 remaining conflicts (predominantly `BUC_LAB1` room collisions on courses like `COS 201`, `BU-CSC 313`, `CSC 301`, `ICT 305`, `STA 111`):
       1. The daily distribution guard was previously keyed on `courseScheduledDays[item.code]`. For multi-group courses with 4–10 sessions across Groups A–E, once the first 2–3 groups took sessions across the week, all 5 days were marked full, causing all subsequent groups to be rejected on every weekday and dumped into fallback `BUC_LAB1`.
       2. The 2-hour lecture block candidate slots were limited to `[1, 3, 7, 9, 0]`.
     * Fixed by keying daily distribution per course and cohort group: `courseScheduledDays[\`${item.code}-${item.group || "All"}\`]`.
     * Expanded 2-hour slot candidates to `[1, 3, 7, 9, 0, 4, 8, 2]` to allow valid packing into off-peak windows.
     * Re-running timetable generation cleared all 38 conflicts down to **1 single cohort clash** out of 238 sessions (caused by 200L Group A having 48 credit hours in a 41-hour institutional week).
   11. **Zero Conflicts Master Schedule & 2-Unit Course Decomposition ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts), [`lib/university_allocations.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_allocations.json), [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx), [`lib/AppContext.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/AppContext.tsx))**:
      * **Root Cause of the 9 Cohort Conflicts**:
        * In the raw Excel workbook, multiple historical/parallel curriculum tracks (BMAS legacy tracks, remedial/orientation modules, and direct-entry streams) had no sub-group letter specified and were defaulted to "Group A".
        * This overloaded 200L Group A with 26 courses (48 units) and 300L Group A with 18 courses (46 units) — physically impossible to fit in a 41-hour institutional week without artificial cohort self-collisions.
        * Four duplicate instances of `GEDS001` and duplicate 0-level modules (`BU-GST 011`–`041`) were stacked under 200L Group A.
      * **Domain Rules Applied**:
        1. **Curriculum Cap Enforcement (<= 24 units per cohort)**: Corrected the level mappings for Citizenship modules (`BU-GST 011` -> 100L, `021` -> 200L, `031` -> 300L, `041` -> 400L) and separated BMAS/parallel curriculum streams into dedicated cohorts (Groups E and F), bringing every single level/cohort across 100L–400L strictly within the university's 18–24 unit maximum.
        2. **2-Unit Course Decomposition Support**: Extended `decomposeAllocations` and `generateTimetable` with a flexible `DecomposeOptions` parameter (`splitTwoUnitCourses`). When active, 2-unit courses are decomposed into two 1-hour sessions (`1h + 1h`) scheduled across distinct days, granting optimal packing agility.
        3. **Interactive UI Toggle**: Added a toggle button ("Split 2-Unit Courses") with live pill indicators in both the snapshot readiness banner and the generated timetable action bar, allowing one-click switching between standard 2-hour blocks and split 1-hour classes.
        4. **Clean Zero-Clash Startup**: Updated [`lib/AppContext.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/AppContext.tsx) to initialize `localSessions` with the generated timetable schedule.
   12. **Institutional Chapel Seminar (GEDS 001) Scheduling & Snapshot Card Optimization ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts), [`lib/university_venues.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_venues.json), [`lib/university_allocations.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_allocations.json), [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx))**:
      * **GEDS 001 Chapel Seminar Institutional Mapping**:
        * Linked `GEDS 001` / `GEDS001` explicitly to **"Chapel Seminar"** across 100L–400L.
        * Configured as whole-cohort physical sessions (`group: "All"`, `size: 200`, `isVirtual: false`) taught by the Chapel Directorate.
        * Incorporated the central **University Amphitheatre** (capacity: 2,500) into [`lib/university_venues.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_venues.json) and [`lib/data.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/data.ts).
        * Embedded `CHAPEL_SEMINAR_SCHEDULE` into [`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts) to automatically pin each level's Chapel Seminar at 09:00 on its designated weekday:
          * **100 Level**: Monday 09:00 – 10:00 (`Mon` `09:00`)
          * **200 Level**: Tuesday 09:00 – 10:00 (`Tue` `09:00`)
          * **300 Level**: Wednesday 09:00 – 10:00 (`Wed` `09:00`)
          * **400 Level**: Thursday 09:00 – 10:00 (`Thu` `09:00`)
        * Reserved cohort occupancy across all sub-groups (`All`, `Groups A–F`) for that hour, ensuring no conflicting departmental classes can be scheduled during Chapel Seminar.
      * **Constraint Snapshot UI Optimization ([`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx))**:
        * Replaced the lengthy full-list rendering of all 32 venues in Snapshot Card 1 with a compact sample of the top 5 venues plus a `+ 27 more mapped departmental venues` summary indicator.
   13. **Subgroup Pairing, Residual Distribution, and Constituent Clash Architecture ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts), [`lib/university_allocations.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_allocations.json), [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx), [`views/Allocations.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Allocations.tsx))**:
      * **Domain Problem Solved**:
        * In departments with 6 cohorts (Groups A–F), courses with fewer allocations than cohorts (e.g. only Group A assigned, only A & B assigned, or only A–D assigned) cannot pack 200+ students into one physical room.
      * **Architectural Rules Applied**:
        1. **Single-Allocation Physical Courses (Paired in Twos)**:
           * Physical courses assigned only to Group A (e.g., `COSC111`, `MATH101`) are subdivided into three parallel sections: **Group A & B**, **Group C & D**, and **Group E & F** (each ~60 students), scheduled at distinct non-overlapping times to respect physical room capacities.
        2. **Residual Subgroup Distribution for 4-Section Courses**:
           * Courses allocated for A, B, C, D (e.g., `BU-COS 107`, `MTH 101`, `PHY 107`, `PHY 101`, `STA 111`, `BU-COS 209`, `BU-CSC 333`, `CSC 301`, `CSC 309`, `BU-CSC 307`):
           * Combined leftover subgroups across sections: Section 1 becomes **Group A & F**, Section 2 becomes **Group B & E**, Section 3 is **Group C**, and Section 4 is **Group D**.
        3. **Shared Subgroup Distribution for 2-Section Courses**:
           * 400L core courses allocated only to A & B (`INS 401`, `BU-CSC 427`, `BU-COS 419`, `BU-CSC 403`, `BU-SEN 417`, `COS 409`, `CSC 401`, `BU-CSC 411`) are shared across sections: **Group A & C & E** and **Group B & D & F**.
        4. **Constituent Group Extraction & Non-Overlap Logic ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts))**:
           * Implemented `extractSubgroups(groupStr)` and `doGroupsClash(group1, group2)`:
           * Sessions with disjoint constituent groups (e.g. `Group A & F` vs. `Group B & E`) schedule concurrently in separate venues without clashing.
           * Sessions with intersecting groups (e.g. `Group A & F` vs. `Group A & B`) are strictly prevented from colliding.
           * Occupancy recording tracks each constituent subgroup independently.
        5. **Cohort Filter Integration ([`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx), [`views/Allocations.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Allocations.tsx))**:
           * Selecting `Group A` in cohort filters automatically displays all classes involving Group A (including `Group A & F`, `Group A & B`, and whole-cohort `All`), providing students and faculty with their complete weekly schedule.
      * **Result**: **0 violations, 0 venue double-bookings, 0 lecturer overlaps, and 0 cohort clashes** across all 246 sessions (and 325 sessions in split mode).

    14. **Curriculum Streamlining & 2-Unit Block Standardization ([`lib/engine.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/engine.ts), [`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx), [`lib/university_allocations.json`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/university_allocations.json))**:
       * **Merged CCMAS (`BU-GST`) & BMAS (`GEDS`) Curriculum Streams**:
         * Merged duplicate `BU-GST 011`–`041` orientation entries into unified physical institutional requirements: `GEDS 001 / BU-GST` ("Chapel Seminar & Citizenship Orientation").
         * Taught by `Chapel Directorate / Abioye Funke Victoria` in the **University Amphitheatre** (capacity: 2,500) during each cohort's designated weekday 09:00 slot.
         * Removed curriculum duplication, reducing Computer Science allocations from 173 to **169** clean rows.
       * **Standardized 2-Unit Courses to 2-Hour Blocks**:
         * Removed the manual/explicit toggle option to split 2-unit courses into `1h + 1h` from both the input snapshot banner and the generated calendar toolbar.
         * Standardized 2-unit courses in `decomposeAllocations` to always schedule as a single unified 2-hour lecture block.
         * Preserved 0-conflict master schedule output with clean TypeScript compilation.

    15. **Timetable Grid UI Optimization & Dual-Scrollbar Navigation ([`views/Generate.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Generate.tsx))**:
       * **Full Week Visibility (Monday through Friday)**:
         * Optimized grid column proportions from fixed oversized columns to an agile `grid-cols-[56px_repeat(5,1fr)]` responsive layout with reduced minimum container threshold (`700px`), preventing Thursday and Friday from being cut off on typical desktop resolutions.
         * Streamlined time column width to 56px and refined cell typography to fit all course codes, groups, and rooms neatly.
       * **Dual Synchronized Scrollbars**:
         * Implemented a top horizontal scrollbar banner directly above the calendar header in addition to the standard bottom scrollbar.
         * Synced scroll positions bidirectionally between `topScrollRef` and `tableContainerRef`, allowing users to navigate horizontally without having to scroll to the very bottom of the page.
         * Added helpful indicator text (`← Scroll Monday to Friday | Showing all 5 days (Mon–Fri)`).
       * **Density Toggle ("Fit to Screen" vs "Comfortable")**:
         * Added a density switcher in both Cohort and Lecturer calendar toolbars allowing users to toggle between compact screen-fitting view and roomier comfortable view.

    16. **Department Lecturer Constraints Update & Dropdown Integration ([`views/Constraints.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Constraints.tsx), [`lib/data.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/data.ts))**:
        * **Real Departmental Lecturer Seed Data**:
          * Replaced outdated placeholder lecturer names across constraints (`Adebayo F.O`, `Okafor C.M`, `Johnson R.T`, `Lee M.N`, `Nguyen A.K`, `Peterson J.E`) with actual Computer Science department faculty members:
            * `Kehinde Daniel Olusegun` — Study Leave (Doctoral research fellowship)
            * `Uka Uchenna A.` — Study Leave (International conference & sabbatical)
            * `Akinwunmi Damilare Samuel` — Day Off (Recurring — Wednesdays)
            * `Nzenwata Uchenna Jeremiah` — Day Off (Clinical / Research day, Every Fri AM)
            * `Adeoye Ayodele Olusegun` — Adjunct (Industry practitioner — Tue & Fri only)
            * `Bamishile Olabode Oludare` — Adjunct (Visiting faculty — evenings only, after 14:00)
          * Updated global university planning records (`adjunctRecords`, `globalDaysOff`, `globalStudyLeaves`) to stay in sync with the real Computer Science faculty roster.
        * **Interactive Lecturer Dropdown in Constraints Modal**:
          * Dynamically extracted all 48 unique departmental lecturers directly from active allocations (`context.localAllocations`).
          * Replaced free-text lecturer input in `AddModal` with a comprehensive `<select>` dropdown populated with all 48 lecturers sorted alphabetically.
          * Added quick preset chips for recurrent constraint types: *"Every Wednesday"*, *"Every Friday AM"*, *"Tue & Fri Only"*, *"After 14:00 Only"*, and *"Semester First Half"*.
        * **Live Lecturer Filter in Constraints Table**:
          * Added a Lecturer Filter dropdown in the Constraints view header, enabling instant filtering of constraints by individual lecturer or viewing all 48 lecturers.
        * **Constraint Satisfaction & Stability**:
          * Preserved **0 hard constraint collisions, 0 lecturer overlaps, 0 venue collisions** in timetable generation.
          * Verified TypeScript compilation passes cleanly (`npx tsc --noEmit` exited code 0).

    17. **Study Leave Policy Separation & External Substitute Handling ([`views/Constraints.tsx`](file:///home/mighty/Documents/Github/Frontend/timetable-system/views/Constraints.tsx), [`lib/data.ts`](file:///home/mighty/Documents/Github/Frontend/timetable-system/lib/data.ts))**:
        * **Institutional Policy Alignment**:
          * Addressed institutional constraint: *Lecturers assigned to active semester courses cannot be on study leave*. When faculty members take study leave, substitutes are assigned externally outside the timetabling system before allocations reach the solver.
          * Seed Study Leave records updated to reflect faculty on leave whose substitute arrangements are handled externally (`Adebanjo Olawunmi Asake`, `DARAMOLA CHRISTIANA`), preventing teaching slot starvation or false clashes against active courses.
        * **Smart Categorization in Constraints Modal**:
          * For Study Leave, the modal dropdown displays the full School of Computing faculty roster organized into clear option groups:
            1. **Non-Teaching / On-Leave Faculty (Eligible)**: Faculty without active teaching allocations this semester.
            2. **Active Teaching Lecturers (Requires External Substitute)**: Displays an amber alert notice if selected, noting that a substitute lecturer must be designated outside the system to cover their classes.
          * Appends an informational policy note directly inside the Study Leave dialog clarifying the external substitute workflow.
        * **Verification**:
          * Generator remains at **0 constraint violations, 0 venue double-bookings, 0 cohort clashes**.
          * TypeScript check (`npx tsc --noEmit`) passes with 0 errors.

---

## 📝 Guidelines for Future Logging
* Append new feature additions, bug fixes, or architectural changes under a new timestamped header (e.g., `## 📅 Session Summary — [Date]`).
* Do not overwrite previous session logs.



