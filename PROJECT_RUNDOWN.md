use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Factories\HasFactory;
# Timetable Backend Project Rundown

## Overview

This is a Laravel 13 backend for the BU Pulse timetable system. It uses PostgreSQL, Laravel Sanctum for bearer-token authentication, and a versioned API under `/api/v1`.

The project currently supports:

- User authentication and token management
- Super-admin user creation
- Defined user roles
- Department and school assignment
- External course-allocation imports
- Timetable draft creation and updates
- Timetable retrieval
- External venue and lecturer booking lookups
- PostgreSQL UUIDs, constraints, indexes, and migrations

## Technology

- PHP 8.5
- Laravel `^13.17`
- Laravel Sanctum `^4.0`
- PostgreSQL
- PHPUnit
- Laravel Pint
- Laravel Boost

Key dependency configuration is in [`composer.json`](./composer.json).

## Authentication

### Login

`POST /api/v1/auth/login`

Accepts either a complete Babcock email or only the local part:

```json
{
  "email": "y.onome",
  "password": "password123"
}
```

The backend converts `y.onome` to `y.onome@babcock.edu.ng`. Full email addresses remain supported.

Successful login returns:

```json
{
  "token": "1|...",
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "name": "Yakubu Onome",
    "email": "y.onome@babcock.edu.ng",
    "role": "deptTO",
    "roleLabel": "Departmental T.O",
    "department": "Computer Science",
    "school": "School of Computing",
    "avatarTone": "violet",
    "initials": "YO"
  }
}
```

### Current user

`GET /api/v1/auth/me`

Requires:

```http
Authorization: Bearer YOUR_TOKEN
```

Returns the authenticated user associated with the bearer token.

### Logout

`POST /api/v1/auth/logout`

Deletes only the current Sanctum token. Other tokens for the same user remain active.

### Token expiration

Token expiration is configured through:

```env
SANCTUM_TOKEN_EXPIRATION=120
```

The value is in minutes. The setting is defined in [`config/sanctum.php`](./config/sanctum.php) and configured through [`.env.example`](./.env.example).

Protected routes use `auth:sanctum`. Missing, invalid, and expired tokens are rejected with HTTP `401`.

## User Management

### Roles

Roles are defined in [`app/Enums/UserRole.php`](./app/Enums/UserRole.php):

- `superAdmin`
- `deptTO`
- `hod`
- `dean`
- `acadPlanningTO`

Role labels are derived automatically:

- `superAdmin` → `Super Admin`
- `deptTO` → `Departmental T.O`
- `hod` → `Head of Department`
- `dean` → `Dean`
- `acadPlanningTO` → `Academic Planning T.O`

### Create user

`POST /api/v1/users`

Only a `superAdmin` may create users.

Example request:

```json
{
  "name": "Yakubu Onome",
  "email": "y.onome@babcock.edu.ng",
  "password": "password123",
  "role": "deptTO",
  "departmentCode": "cs"
}
```

The backend:

- Validates the role
- Validates the department code
- Hashes the password
- Generates the UUID
- Derives the role label
- Derives the department and school
- Randomly assigns an avatar tone
- Generates initials when they are not supplied

### Create the first super admin

Use the secure terminal command:

```bash
php artisan users:create-super-admin "System Administrator" admin@example.com
```

The command prompts for and confirms the password without displaying it.

## Departments and Schools

Department codes and their school mappings are documented in [`DEPARTMENT_CODES.md`](./DEPARTMENT_CODES.md).

The catalog is stored in the `academic_departments` table. PostgreSQL triggers automatically populate:

- `users.department`
- `users.school`

from `users.department_code`.

The database also rejects unknown department codes through a foreign key.

## Course Allocations

### Stored allocation data

Course allocations are stored in `course_allocations`.

The supplied allocation JSON was imported and replaced the previous table contents:

- Session: `2026/2027`
- Semester: `First Semester`
- Imported rows: `2,853`

The source file is [`2026_2027_first_semester_allocation.json`](./2026_2027_first_semester_allocation.json).

### Allocation retrieval

`GET /api/v1/allocations`

Optional query parameters:

- `department`
- `semester`
- `session`

The endpoint supports session formatting variants such as:

- `2026/2027`
- `2026 / 2027`

The response maps database fields to frontend fields, including `code`, `title`, `group`, `level`, and `isVirtual`.

GST and GEDS courses are identified as GST/virtual courses based on their course codes.

### External allocation synchronization

`POST /api/v1/allocations/sync`

Only a `superAdmin` may run this endpoint. It fetches the external API configured by:

```env
ALLOCATIONS_API_URL=https://example.com/allocations
```

The external response must use:

```json
{
  "session": "2026/2027",
  "semester": "First Semester",
  "programs": [
    {
      "program": "Computer Science",
      "courses": [
        {
          "courseCode": "COS201",
          "courseTitle": "Object-Oriented Programming",
          "unit": 2,
          "group": "Group A",
          "lecturer": "Lecturer Name"
        }
      ]
    }
  ]
}
```

The synchronization validates the payload and replaces all allocation rows in a transaction.

### CLI allocation import

The same JSON format can be imported from the terminal:

```bash
php artisan allocations:import 2026_2027_first_semester_allocation.json --replace
```

The `--replace` flag is required to prevent accidental deletion of existing allocation data.

Course levels are derived from course codes. For example:

- `COS201` → `200 Level`
- `MLSC513` → `500 Level`
- `BU-GST 011` → `100 Level`

## Timetables

### Save or update a generated timetable

`PUT /api/v1/timetable/draft`

The endpoint:

- Creates a timetable when one does not exist
- Updates the matching timetable when it already exists
- Matches by department, semester, and session
- Increments the timetable version on updates
- Replaces all generated sessions atomically
- Records the authenticated creator/updater
- Sets `published_at` when status is `Published`

Example payload:

```json
{
  "department": "Computer Science",
  "school": "School of Computing",
  "session": "2026 / 2027",
  "semester": "First Semester",
  "status": "Draft generated",
  "sessions": [
    {
      "code": "COS 201",
      "lecturer": "Ayankoya Folashade",
      "venue": "BUC_LAB1",
      "day": "Mon",
      "slot": "10:00",
      "duration": 2,
      "level": "200 Level",
      "group": "Group A",
      "isVirtual": false
    }
  ]
}
```

### Get current timetable

`GET /api/v1/timetable/current`

Query parameters:

- `department`
- `semester`
- `session`

Returns:

```json
{
  "timetableId": "uuid",
  "department": "Computer Science",
  "status": "Draft generated",
  "version": 2,
  "sessions": []
}
```

### External bookings

`GET /api/v1/timetable/external-bookings`

Query parameters:

- `exclude_department`
- `school`
- `semester`
- `session`

The endpoint returns venue and lecturer bookings belonging to other departments whose timetable status is one of:

- `Submitted to HOD`
- `Submitted to Dean`
- `Submitted to Acad Pl. T.O`
- `Published`

This lets the frontend CSP solver avoid clashes with already committed timetables.

## Database Schema

The main timetable schema is defined in [`2026_10_14_120000_create_timetable_system_tables.php`](./database/migrations/2026_10_14_120000_create_timetable_system_tables.php).

Implemented tables include:

- `users`
- `personal_access_tokens`
- `academic_departments`
- `course_allocations`
- `venues`
- `constraint_categories`
- `constraints`
- `timetables`
- `timetable_sessions`
- `timeline_steps`
- `audit_logs`

Additional migrations provide:

- UUID-compatible Sanctum token relationships
- PostgreSQL UUID generation
- Role checks and role-label triggers
- Department/school triggers
- Timetable status/day/duration checks
- Timetable lookup indexes

## Timetable Database Rules

The database enforces:

- Valid timetable statuses
- Weekdays limited to `Mon` through `Fri`
- Session durations limited to `1` or `2`
- Unique timetable per department, semester, and session
- Cascade deletion of timetable sessions
- UUID primary keys

The timetable booking lookup index is:

```text
(day, slot, venue, lecturer)
```

## Phase 1 Implementation: Institutional Policy & Dynamic Constraints (COMPLETED)

- **Database & Models**:
  - `campus_time_locks` table with JSONB columns for `operating_window`, `lunch_break`, `early_closings`, `chapel_slots`, and `custom_locks`.
  - `constraint_categories` & `constraints` enhanced with parameter schemas and JSONB params.
  - Eloquent models: `CampusTimeLock`, `ConstraintCategory`, `Constraint`.
- **Controllers & Endpoints**:
  - `GET|PUT /api/v1/time-locks`: Reads / persists campus time locks (enforcing `acadPlanningTO` / `superAdmin` role).
  - `GET|POST|PUT|DELETE /api/v1/constraint-types`: CRUD for dynamic constraint archetypes and parameters.
  - `GET|POST|PUT|DELETE /api/v1/constraints`: Departmental faculty constraint instances.
  - `POST /api/v1/constraints/status`: Toggle `timetables.constraints_complete`.
- **Live Verification**:
  - `scratch/test_phase1_live.py`: 17/17 assertions passed against live backend.

## Phase 2 Implementation: Master Venues & Departmental Events (COMPLETED)

- **Database & Models**:
  - `departmental_events` table (`database/migrations/2026_10_27_100000_create_departmental_events_table.php`) with fields for `title`, `department`, `category`, `week`, `dates`, `day`, `time_range`, `venue`, `level`, `description`, `advisory_note`, `exempt_from_lectures`.
  - Eloquent models: `DepartmentalEvent` & `Venue` with camelCase `toApiResponse()` transformers, default seeder routines, and JSON casts.
  - Master venue dataset mirrored in `database/seeders/data/university_venues.json` (133 campus teaching venues, capacity mappings, exclusive/shared space types).
- **Form Requests & Authorization**:
  - `StoreDepartmentalEventRequest` & `UpdateDepartmentalEventRequest`: Authorized for all authenticated faculty/officer roles.
  - `StoreVenueRequest` & `UpdateVenueRequest`: Authorized strictly for `acadPlanningTO` and `superAdmin`.
- **Controllers & Endpoints**:
  - `GET /api/v1/departmental-events`: Department-filtered event milestone retrieval with automatic seeding fallback.
  - `POST|PUT|DELETE /api/v1/departmental-events`: Milestone management with audit logging.
  - `GET /api/v1/venues`: Filters by `department`, `type`, and `spaceType`.
  - `POST|PUT|DELETE /api/v1/venues`: Full venue lifecycle management. Guards against deletion if active sessions are scheduled.
  - `POST /api/v1/venues/import-csv`: Batch imports venues via CSV string or payload.
  - `GET /api/v1/venues/occupancy/matrix`: Cross-venue occupancy grid across all scheduled timetable sessions.
- **Frontend Clients & Compilation**:
  - Added `departmentalEventsApi` and `venuesApi` in `lib/api.ts`.
  - Next.js Turbopack build verified: 18/18 routes compiled with 0 errors.
- **Live Verification**:
  - `scratch/test_phase2_live.py`: 16/16 assertions passed against live backend.

## Phase 3 Implementation: Multi-Tier Governance, Approvals & Audit Trail (COMPLETED)

- **Database & Models**:
  - Eloquent models: [`Timetable.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Models/Timetable.php), [`TimetableSession.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Models/TimetableSession.php), [`TimelineStep.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Models/TimelineStep.php), [`AuditLog.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Models/AuditLog.php).
  - Relationships wired: `sessions()`, `timelineSteps()`, `creator()`, `updater()`.
- **Form Requests & Jurisdiction Boundaries**:
  - [`SubmitToHodRequest.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Http/Requests/SubmitToHodRequest.php): Enforces Department T.O jurisdiction (`deptTO` & `superAdmin`).
  - [`HodApproveRequest.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Http/Requests/HodApproveRequest.php) & [`HodRejectRequest.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Http/Requests/HodRejectRequest.php): Enforces HOD department authority and mandatory corrective notes on rejection.
  - [`DeanApproveRequest.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Http/Requests/DeanApproveRequest.php) & [`DeanRejectRequest.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/app/Http/Requests/DeanRejectRequest.php): Enforces Dean school jurisdiction.
- **Controllers & Endpoints**:
  - `POST /api/v1/workflow/submit-to-hod`: Validates hard venue & lecturer clash absence before allowing submission. Transitions status to `Submitted to HOD`, writes timeline step and audit log.
  - `POST /api/v1/workflow/hod/approve`: Advances status to `Submitted to Dean`.
  - `POST /api/v1/workflow/hod/reject`: Reverts status to `Draft generated` with recorded correction note.
  - `POST /api/v1/workflow/dean/approve`: Validates school jurisdiction, advances to `Submitted to Acad Pl. T.O`.
  - `POST /api/v1/workflow/dean/reject`: Reverts to `Draft generated`.
  - `PUT /api/v1/timetable/status`: Direct workflow transition with allowed status validation.
  - `GET /api/v1/workflow/submissions`: Aggregated cards with course counts, Dean sign-off dates, and signatory roles.
  - `GET /api/v1/workflow/timeline`: Chronological audit trail of milestone sign-offs and return notes.
  - `POST /api/v1/publish`: Master publication endpoint with timestamping (`acadPlanningTO` and `superAdmin`).
  - `GET /api/v1/audit/logs`: Filtered queries across immutable system audit logs.
- **Verification**:
  - Feature test suite [`Phase3GovernanceAndAuditTest.php`](file:///home/mighty/Documents/Github/Frontend/timetable-backend/tests/Feature/Phase3GovernanceAndAuditTest.php): 11 tests, 221 assertions passed.
  - Live HTTP integration suite `scratch/test_phase3_live.py`: 21/21 assertions passed against running backend server.
  - Pint code style: 100% clean.

## Remaining Implementation Roadmap

- **Phase 4**: Timetable Generation, Optimization & Draft State Management (`PUT /api/v1/timetable/draft`, auto-scheduling validation, fixed rules, and reset).
- **Phase 5**: Cross-Department Clash Matrix, Master Publication & Campus Analytics (`/api/v1/publish/cross-clashes`, `/api/v1/analytics/overview`).

## Verification Performed

Completed checks include:

- PHP syntax checks
- Laravel route registration checks
- Laravel configuration checks
- Migration status checks
- PostgreSQL migration execution
- Laravel Pint formatting checks
- Allocation JSON validation
- Allocation import verification
- Database row-count verification

The focused authentication tests were added in [`tests/Feature/AuthLoginTest.php`](./tests/Feature/AuthLoginTest.php). Running them requires the PHP SQLite extension because the PHPUnit configuration uses an in-memory SQLite database for tests.
