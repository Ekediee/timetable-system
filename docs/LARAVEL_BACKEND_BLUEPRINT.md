# Laravel + PostgreSQL Backend Blueprint (`timetable-backend`)

This document outlines the database schema, migrations, Eloquent models, and API routes designed for the temporary Laravel backend, tailored precisely to the specifications in `BACKEND_API_SPECIFICATION.md`.

---

## 1. Database Schema & Migrations (PostgreSQL)

### Table 1: `users`
Represents institutional accounts with role-based access control.
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('deptTO', 'hod', 'dean', 'acadPlanningTO')),
    role_label VARCHAR(100) NOT NULL,
    department VARCHAR(100) NULL,
    school VARCHAR(100) NULL,
    avatar_tone VARCHAR(20) DEFAULT 'brand',
    initials VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 2: `course_allocations` (Read-Only)
Master teaching allocations imported from institutional Excel sheets (`.xlsx`).
```sql
CREATE TABLE course_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session VARCHAR(50) NOT NULL,            -- e.g. "2026 / 2027"
    semester VARCHAR(50) NOT NULL,           -- e.g. "First Semester"
    department VARCHAR(100) NOT NULL,        -- e.g. "Computer Science"
    level VARCHAR(50) NOT NULL,              -- e.g. "200 Level"
    code VARCHAR(50) NOT NULL,               -- e.g. "COS 201"
    title VARCHAR(255) NOT NULL,             -- e.g. "Object-Oriented Programming"
    lecturer VARCHAR(255) NOT NULL,          -- e.g. "Ayankoya Folashade"
    units SMALLINT NOT NULL DEFAULT 2,       -- e.g. 2, 3, 4
    size INTEGER NOT NULL DEFAULT 60,        -- Enrolled students
    type VARCHAR(20) NOT NULL DEFAULT 'Core',-- "Core", "Elective", "GST"
    cohort_group VARCHAR(50) DEFAULT 'All',  -- "Group A", "Group B", "All"
    is_virtual BOOLEAN DEFAULT FALSE,        -- Online LMS courses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_allocations_dept_sem ON course_allocations(department, semester, session, level);
```

### Table 3: `venues`
Classrooms, laboratories, lecture halls, and auditoriums.
```sql
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,       -- e.g. "BUC_LAB1", "CST Hall A"
    capacity INTEGER NOT NULL,               -- e.g. 92, 240, 2500
    block VARCHAR(100) NULL,                 -- e.g. "Babcock University Complex (BUC)"
    floor VARCHAR(50) NULL,                  -- e.g. "Ground Floor", "1st Floor"
    type VARCHAR(50) NOT NULL DEFAULT 'Lecture Hall', -- "Lecture Hall", "Lab", "Seminar Room", "Auditorium"
    space_type VARCHAR(20) DEFAULT 'exclusive',      -- "exclusive", "shared"
    dept_owners JSONB NULL,                  -- ["Computer Science", "Software Engineering"]
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 4: `constraint_categories` (Academic Planning Managed)
Dynamic constraint categories created, updated, and deactivated by the Academic Planning Office.
```sql
CREATE TABLE constraint_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,        -- e.g. "study_leave", "day_off", "adjunct", "sabbatical"
    name VARCHAR(100) NOT NULL,              -- e.g. "Study Leave", "Day Off", "Adjunct"
    description TEXT NULL,
    color_tone VARCHAR(20) DEFAULT 'brand',  -- "violet", "warn", "brand", "good"
    applies_to VARCHAR(20) DEFAULT 'lecturer', -- "lecturer", "venue", "cohort"
    input_type VARCHAR(50) NOT NULL DEFAULT 'days', -- "days", "date_range", "time_range", "boolean"
    requires_substitute BOOLEAN DEFAULT FALSE,      -- True for Study Leave (policy flag)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 5: `constraints`
Active constraints created for faculty against the dynamic constraint categories.
```sql
CREATE TABLE constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES constraint_categories(id) ON DELETE CASCADE,
    kind VARCHAR(100) NOT NULL,              -- Denormalized category name
    lecturer VARCHAR(255) NOT NULL,          -- Faculty name
    department VARCHAR(100) NOT NULL,        -- e.g. "Computer Science"
    detail TEXT NOT NULL,                    -- Reason / note
    range VARCHAR(100) NOT NULL,             -- "Every Wed", "12 Jan – 28 Feb", "Tue, Fri"
    recurring BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_constraints_dept ON constraints(department, lecturer);
```

### Table 6: `timetables`
Parent record tracking the state, version, and review status of a departmental timetable.
```sql
CREATE TABLE timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department VARCHAR(100) NOT NULL,
    school VARCHAR(100) NOT NULL,
    session VARCHAR(50) NOT NULL,            -- e.g. "2026 / 2027"
    semester VARCHAR(50) NOT NULL,           -- e.g. "First Semester"
    status VARCHAR(50) NOT NULL DEFAULT 'Draft generated' 
        CHECK (status IN (
            'Draft generated',
            'Constraints in progress',
            'Submitted to HOD',
            'Rejected by HOD',
            'Submitted to Dean',
            'Submitted to Acad Pl. T.O',
            'Published'
        )),
    constraints_complete BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_dept_semester UNIQUE (department, semester, session)
);
```

### Table 7: `timetable_sessions`
Stores the scheduled sessions generated by the frontend CSP engine.
```sql
CREATE TABLE timetable_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    course_code VARCHAR(50) NOT NULL,
    lecturer VARCHAR(255) NOT NULL,
    venue VARCHAR(100) NOT NULL,
    day VARCHAR(10) NOT NULL CHECK (day IN ('Mon', 'Tue', 'Wed', 'Thu', 'Fri')),
    slot VARCHAR(10) NOT NULL,               -- e.g. "08:00", "10:00", "14:00"
    duration SMALLINT NOT NULL DEFAULT 1,    -- 1 or 2 hours
    level VARCHAR(50) NOT NULL,              -- "100 Level", "200 Level", etc.
    cohort_group VARCHAR(50) DEFAULT 'All',  -- "Group A", "Group A & B", "All"
    is_virtual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_search ON timetable_sessions(timetable_id, day, slot, venue);
```

### Table 8: `timeline_steps`
Governance audit log & approval trail (HOD / Dean / Acad Planning reviews, rejections, comments).
```sql
CREATE TABLE timeline_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    actor VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,               -- "Dept T.O", "HOD", "Dean", "Acad Pl. T.O"
    action VARCHAR(255) NOT NULL,            -- e.g. "Draft generated & submitted", "Approved"
    state VARCHAR(20) NOT NULL CHECK (state IN ('done', 'current', 'pending', 'rejected')),
    comment TEXT NULL,
    flagged_target JSONB NULL,               -- {"code": "BU-GST 205", "day": "Thu", "slot": "12:00"}
    recorded_at VARCHAR(50) NOT NULL,        -- Display timestamp e.g. "Mar 04, 09:12"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 9: `audit_logs`
Immutable system audit trail.
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,            -- "published", "approved", "returned", "uploaded"
    department VARCHAR(100) NULL,
    school VARCHAR(100) NULL,
    level VARCHAR(50) NULL,
    note TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. API Routes Definition (`routes/api.php`)

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AllocationController;
use App\Http\Controllers\Api\VenueController;
use App\Http\Controllers\Api\ConstraintCategoryController;
use App\Http\Controllers\Api\ConstraintController;
use App\Http\Controllers\Api\TimetableController;
use App\Http\Controllers\Api\WorkflowController;
use App\Http\Controllers\Api\PublishController;
use App\Http\Controllers\Api\AuditController;

/*
|--------------------------------------------------------------------------
| BU Pulse Timetable System API v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── 1. Authentication ──────────────────────────────────────
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // ── 2. Course Allocations (Read-Only) ───────────────────
        Route::get('allocations', [AllocationController::class, 'index']);
        Route::get('allocations/{id}', [AllocationController::class, 'show']);
        Route::get('faculty/roster', [AllocationController::class, 'facultyRoster']);

        // ── 3. Venues & Facilities ──────────────────────────────
        Route::apiResource('venues', VenueController::class);
        Route::post('venues/import-csv', [VenueController::class, 'importCsv']);
        Route::get('venues/occupancy/matrix', [VenueController::class, 'occupancyMatrix']);

        // ── 4. Dynamic Constraint Categories (Acad Planning) ───
        Route::apiResource('constraint-categories', ConstraintCategoryController::class);

        // ── 5. Lecturer Constraints ─────────────────────────────
        Route::apiResource('constraints', ConstraintController::class)->except(['show']);
        Route::post('constraints/status', [ConstraintController::class, 'toggleStatus']);

        // ── 6. Timetable State & Sync (Frontend CSP Solver) ─────
        Route::get('timetable/current', [TimetableController::class, 'current']);
        Route::put('timetable/draft', [TimetableController::class, 'saveDraft']);
        Route::post('timetable/reset', [TimetableController::class, 'resetDraft']);
        Route::get('timetable/fixed-rules', [TimetableController::class, 'fixedRules']);

        // ── 7. Governance & Multi-Tier Approvals ────────────────
        Route::post('workflow/submit-to-hod', [WorkflowController::class, 'submitToHod']);
        Route::post('workflow/hod/approve', [WorkflowController::class, 'hodApprove']);
        Route::post('workflow/hod/reject', [WorkflowController::class, 'hodReject']);
        Route::post('workflow/dean/approve', [WorkflowController::class, 'deanApprove']);
        Route::post('workflow/dean/reject', [WorkflowController::class, 'deanReject']);
        Route::get('workflow/submissions', [WorkflowController::class, 'submissions']);
        Route::get('workflow/timeline', [WorkflowController::class, 'timeline']);

        // ── 8. Master Publishing & Audit ────────────────────────
        Route::post('publish', [PublishController::class, 'publishMaster']);
        Route::get('publish/cross-clashes', [PublishController::class, 'crossClashes']);
        Route::get('audit/logs', [AuditController::class, 'index']);
        Route::get('analytics/overview', [AuditController::class, 'analyticsOverview']);
    });

    // ── Public Access (Students & Faculty) ──────────────────────
    Route::get('publish/master', [PublishController::class, 'publicMaster']);
});
```

---

## 3. Seed Data Strategy

When running `php artisan db:seed`, the backend will populate:
1. **Initial Accounts**:
   * `y.onome@bupulse.edu` — Departmental T.O (Computer Science)
   * `a.olumide@bupulse.edu` — Head of Department (HOD)
   * `e.bassey@bupulse.edu` — Dean (School of Computing & Engineering)
   * `m.danladi@bupulse.edu` — Academic Planning T.O
2. **Initial Constraint Categories**:
   * `study_leave` — Study Leave (Violet tone, requires substitute flag)
   * `day_off` — Day Off (Warn tone, days format)
   * `adjunct` — Adjunct Working Hours (Brand tone, time/day window)
   * `sabbatical` — Research Sabbatical (Violet tone)
3. **Master Course Allocations**:
   * Sourced directly from `2026_2027_first_semester_allocation.xlsx` (169 rows for Computer Science).
4. **Campus Venues**:
   * Sourced from `venu.csv` and `university_venues.json` (exclusive CS rooms + university shared pool + Amphitheatre).
