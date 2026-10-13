module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/dynamic-access-async-storage.external.js [external] (next/dist/server/app-render/dynamic-access-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/dynamic-access-async-storage.external.js", () => require("next/dist/server/app-render/dynamic-access-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[project]/lib/AppContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppProvider",
    ()=>AppProvider,
    "useApp",
    ()=>useApp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/data.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function nowLabel() {
    const d = new Date();
    const month = d.toLocaleString("en-US", {
        month: "short"
    });
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${month} ${day}, ${h}:${m}`;
}
const AppContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sidebarOpen, setSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [activeRevisionTarget, setActiveRevisionTarget] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("Draft generated");
    const [constraintsComplete, setConstraintsComplete] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [localSessions, setLocalSessions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sessions"]);
    const [localConstraints, setLocalConstraints] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["constraints"]);
    const [localTimeline, setLocalTimeline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["timeline"]);
    const [deptSubs, setDeptSubs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deptSubmissions"]);
    const [auditEntries, setAuditEntries] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auditLog"]);
    function addAuditEntry(partial) {
        const entry = {
            ...partial,
            id: `a${Date.now()}`,
            actor: "M. Danladi",
            at: nowLabel()
        };
        setAuditEntries((prev)=>[
                entry,
                ...prev
            ]);
    }
    function handleLogin(account) {
        setCurrentUser(account);
    }
    function handleLogout() {
        setCurrentUser(null);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContext.Provider, {
        value: {
            currentUser,
            setCurrentUser,
            status,
            setStatus,
            constraintsComplete,
            setConstraintsComplete,
            localSessions,
            setLocalSessions,
            localConstraints,
            setLocalConstraints,
            localTimeline,
            setLocalTimeline,
            deptSubs,
            setDeptSubs,
            auditEntries,
            setAuditEntries,
            sidebarOpen,
            setSidebarOpen,
            activeRevisionTarget,
            setActiveRevisionTarget,
            addAuditEntry,
            handleLogin,
            handleLogout
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/lib/AppContext.tsx",
        lineNumber: 93,
        columnNumber: 5
    }, this);
}
function useApp() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AppContext);
    if (!context) {
        return {
            currentUser: null,
            setCurrentUser: ()=>{},
            status: "Draft generated",
            setStatus: ()=>{},
            constraintsComplete: false,
            setConstraintsComplete: ()=>{},
            localSessions: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sessions"],
            setLocalSessions: ()=>{},
            localConstraints: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["constraints"],
            setLocalConstraints: ()=>{},
            localTimeline: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["timeline"],
            setLocalTimeline: ()=>{},
            deptSubs: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deptSubmissions"],
            setDeptSubs: ()=>{},
            auditEntries: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auditLog"],
            setAuditEntries: ()=>{},
            sidebarOpen: false,
            setSidebarOpen: ()=>{},
            activeRevisionTarget: null,
            setActiveRevisionTarget: ()=>{},
            addAuditEntry: ()=>{},
            handleLogin: ()=>{},
            handleLogout: ()=>{}
        };
    }
    return context;
}
}),
"[project]/lib/data.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// BU Pulse — Timetabling seed data for the Department of Computer Science
__turbopack_context__.s([
    "accounts",
    ()=>accounts,
    "adjunctRecords",
    ()=>adjunctRecords,
    "allocations",
    ()=>allocations,
    "auditLog",
    ()=>auditLog,
    "constraints",
    ()=>constraints,
    "days",
    ()=>days,
    "department",
    ()=>department,
    "deptSubmissions",
    ()=>deptSubmissions,
    "globalDaysOff",
    ()=>globalDaysOff,
    "globalStudyLeaves",
    ()=>globalStudyLeaves,
    "sessions",
    ()=>sessions,
    "slots",
    ()=>slots,
    "timeline",
    ()=>timeline,
    "user",
    ()=>user,
    "venueRecords",
    ()=>venueRecords,
    "venues",
    ()=>venues
]);
const department = {
    name: "Computer Science",
    school: "School of Computing & Engineering",
    session: "2025 / 2026",
    semester: "First Semester",
    level: "200 Level",
    status: "Draft generated"
};
const allocations = [
    // 100 Level
    {
        code: "COSC 101",
        title: "Introduction to Computer Science",
        lecturer: "Adams P.L",
        units: 3,
        size: 60,
        type: "Core",
        group: "Group A",
        level: "100 Level"
    },
    {
        code: "COSC 102",
        title: "Problem Solving & Programming",
        lecturer: "Maitanmi S.O",
        units: 3,
        size: 60,
        type: "Core",
        group: "Group B",
        level: "100 Level"
    },
    {
        code: "BU-GST 101",
        title: "Use of English & Communication",
        lecturer: "Ibrahim T.A",
        units: 2,
        size: 120,
        type: "GST",
        group: "All",
        level: "100 Level",
        isVirtual: true
    },
    // 200 Level
    {
        code: "COSC 204",
        title: "Object Oriented Software Development",
        lecturer: "Maitanmi S.O",
        units: 2,
        size: 50,
        type: "Core",
        group: "Group A",
        level: "200 Level"
    },
    {
        code: "COSC 202",
        title: "Advanced Database Management Systems",
        lecturer: "Johnson R.T",
        units: 3,
        size: 50,
        type: "Core",
        group: "Group B",
        level: "200 Level"
    },
    {
        code: "COSC 200",
        title: "Web Application Development",
        lecturer: "Adams P.L",
        units: 3,
        size: 50,
        type: "Core",
        group: "Group C",
        level: "200 Level"
    },
    {
        code: "BU-GST 201",
        title: "Artificial Intelligence Principles",
        lecturer: "Nguyen A.K",
        units: 4,
        size: 210,
        type: "GST",
        group: "All",
        level: "200 Level",
        isVirtual: true
    },
    {
        code: "COSC 268",
        title: "Mobile Application Development",
        lecturer: "Peterson J.E",
        units: 3,
        size: 50,
        type: "Elective",
        group: "Group D",
        level: "200 Level"
    },
    {
        code: "BU-GST 205",
        title: "Software Engineering",
        lecturer: "Williams H.J",
        units: 4,
        size: 205,
        type: "GST",
        group: "All",
        level: "200 Level",
        isVirtual: true
    },
    {
        code: "SENG 270",
        title: "Computer Networks",
        lecturer: "Rodriguez T.F",
        units: 3,
        size: 50,
        type: "Core",
        group: "Group A",
        level: "200 Level"
    },
    {
        code: "ITGY 271",
        title: "Human-Computer Interaction",
        lecturer: "Lee M.N",
        units: 3,
        size: 50,
        type: "Elective",
        group: "Group B",
        level: "200 Level"
    },
    {
        code: "COSC 872",
        title: "Data Structures and Algorithms",
        lecturer: "Singh R.V",
        units: 2,
        size: 50,
        type: "Core",
        group: "Group C",
        level: "200 Level"
    },
    // 300 Level
    {
        code: "COSC 301",
        title: "Operating Systems",
        lecturer: "Johnson R.T",
        units: 3,
        size: 55,
        type: "Core",
        group: "Group A",
        level: "300 Level"
    },
    {
        code: "COSC 305",
        title: "Computer Architecture",
        lecturer: "Rodriguez T.F",
        units: 3,
        size: 55,
        type: "Core",
        group: "Group B",
        level: "300 Level"
    },
    {
        code: "BU-GST 301",
        title: "Entrepreneurship & Innovation",
        lecturer: "Ibrahim T.A",
        units: 2,
        size: 110,
        type: "GST",
        group: "All",
        level: "300 Level",
        isVirtual: true
    },
    // 400 Level
    {
        code: "COSC 401",
        title: "Compiler Construction",
        lecturer: "Singh R.V",
        units: 3,
        size: 45,
        type: "Core",
        group: "Group A",
        level: "400 Level"
    },
    {
        code: "COSC 402",
        title: "Expert Systems & AI",
        lecturer: "Lee M.N",
        units: 3,
        size: 45,
        type: "Core",
        group: "Group B",
        level: "400 Level"
    },
    {
        code: "COSC 499",
        title: "Final Year Research Project",
        lecturer: "Maitanmi S.O",
        units: 4,
        size: 90,
        type: "Core",
        group: "All",
        level: "400 Level"
    }
];
const venues = [
    {
        name: "CST Hall A",
        capacity: 240,
        block: "College of Science & Tech",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        name: "CST Hall B",
        capacity: 160,
        block: "College of Science & Tech",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        name: "Lab 3 — Software",
        capacity: 60,
        block: "CS Building",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        name: "Lab 5 — Networks",
        capacity: 60,
        block: "CS Building",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        name: "LT 12",
        capacity: 120,
        block: "Central Lecture Complex",
        floor: "2nd Floor",
        spaceType: "shared"
    },
    {
        name: "Virtual / LMS",
        capacity: 5000,
        block: "Online / E-Learning",
        floor: "Virtual",
        spaceType: "shared",
        isVirtual: true
    }
];
const days = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri"
];
const slots = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00"
];
const sessions = [
    {
        code: "COSC 204",
        lecturer: "Maitanmi S.O",
        venue: "Lab 3 — Software",
        day: "Mon",
        slot: "08:00",
        duration: 2,
        level: "200 Level",
        group: "Group A"
    },
    {
        code: "COSC 200",
        lecturer: "Adams P.L",
        venue: "CST Hall B",
        day: "Mon",
        slot: "10:00",
        duration: 2,
        level: "200 Level",
        group: "Group C"
    },
    {
        code: "SENG 270",
        lecturer: "Rodriguez T.F",
        venue: "Lab 5 — Networks",
        day: "Mon",
        slot: "14:00",
        duration: 2,
        level: "200 Level",
        group: "Group A"
    },
    {
        code: "BU-GST 201",
        lecturer: "Nguyen A.K",
        venue: "CST Hall A",
        day: "Tue",
        slot: "08:00",
        duration: 2,
        level: "200 Level",
        group: "All",
        isVirtual: true
    },
    {
        code: "COSC 202",
        lecturer: "Johnson R.T",
        venue: "LT 12",
        day: "Tue",
        slot: "10:00",
        duration: 2,
        level: "200 Level",
        group: "Group B"
    },
    {
        code: "ITGY 271",
        lecturer: "Lee M.N",
        venue: "Lab 3 — Software",
        day: "Tue",
        slot: "14:00",
        duration: 2,
        level: "200 Level",
        group: "Group B"
    },
    // Capacity conflict: BU-GST 205 has 205 students in LT 12 (cap 120)
    {
        code: "BU-GST 205",
        lecturer: "Williams H.J",
        venue: "LT 12",
        day: "Wed",
        slot: "10:00",
        duration: 2,
        level: "200 Level",
        group: "All",
        conflict: "capacity"
    },
    {
        code: "COSC 268",
        lecturer: "Peterson J.E",
        venue: "Lab 3 — Software",
        day: "Wed",
        slot: "14:00",
        duration: 2,
        level: "200 Level",
        group: "Group D"
    },
    {
        code: "COSC 872",
        lecturer: "Singh R.V",
        venue: "CST Hall B",
        day: "Thu",
        slot: "08:00",
        duration: 2,
        level: "200 Level",
        group: "Group C"
    },
    // Venue double-booking: two classes in CST Hall A, Thu 10:00
    {
        code: "COSC 204",
        lecturer: "Maitanmi S.O",
        venue: "CST Hall A",
        day: "Thu",
        slot: "10:00",
        duration: 2,
        level: "200 Level",
        group: "Group A",
        conflict: "venue"
    },
    {
        code: "SENG 270",
        lecturer: "Rodriguez T.F",
        venue: "CST Hall A",
        day: "Thu",
        slot: "10:00",
        duration: 2,
        level: "200 Level",
        group: "Group A",
        conflict: "venue"
    },
    {
        code: "BU-GST 201",
        lecturer: "Nguyen A.K",
        venue: "CST Hall A",
        day: "Fri",
        slot: "10:00",
        duration: 2,
        level: "200 Level",
        group: "All",
        isVirtual: true
    }
];
const constraints = [
    {
        id: "c1",
        kind: "Study Leave",
        lecturer: "Adebayo F.O",
        detail: "Doctoral fieldwork",
        range: "12 Jan – 28 Feb"
    },
    {
        id: "c2",
        kind: "Study Leave",
        lecturer: "Okafor C.M",
        detail: "Conference & sabbatical",
        range: "05 – 19 Feb"
    },
    {
        id: "c3",
        kind: "Day Off",
        lecturer: "Johnson R.T",
        detail: "Recurring — Wednesdays",
        range: "Every Wed"
    },
    {
        id: "c4",
        kind: "Day Off",
        lecturer: "Lee M.N",
        detail: "Clinic day",
        range: "Every Fri AM"
    },
    {
        id: "c5",
        kind: "Adjunct",
        lecturer: "Nguyen A.K",
        detail: "Available Tue & Fri only",
        range: "Tue, Fri"
    },
    {
        id: "c6",
        kind: "Adjunct",
        lecturer: "Peterson J.E",
        detail: "Industry — evenings only",
        range: "After 14:00"
    }
];
const timeline = [
    {
        actor: "Yakubu Onome",
        role: "Dept T.O",
        action: "Draft generated & submitted",
        at: "Mar 04, 09:12",
        state: "done"
    },
    {
        actor: "Dr. A. Olumide",
        role: "HOD",
        action: "Rejected with comment",
        at: "Mar 04, 15:40",
        state: "rejected",
        comment: "BU-GST 205 exceeds LT 12 capacity — relocate to CST Hall A. Also resolve the Thu 12:00 venue clash in CST Hall A before resubmitting."
    },
    {
        actor: "Yakubu Onome",
        role: "Dept T.O",
        action: "Revising draft",
        at: "In progress",
        state: "current"
    },
    {
        actor: "Prof. E. Bassey",
        role: "Dean",
        action: "School-level approval",
        at: "Pending",
        state: "pending"
    },
    {
        actor: "M. Danladi",
        role: "Acad Pl. T.O",
        action: "Final approval & publish",
        at: "Pending",
        state: "pending"
    }
];
const user = {
    name: "Yakubu Onome",
    email: "y.onome@bupulse.edu",
    role: "Departmental T.O"
};
const accounts = [
    {
        id: "yakubu",
        name: "Yakubu Onome",
        email: "y.onome@bupulse.edu",
        role: "deptTO",
        roleLabel: "Departmental T.O",
        department: "Computer Science",
        school: "School of Computing & Engineering",
        avatarTone: "violet",
        initials: "YO"
    },
    {
        id: "olumide",
        name: "Dr. A. Olumide",
        email: "a.olumide@bupulse.edu",
        role: "hod",
        roleLabel: "Head of Department",
        department: "Computer Science",
        school: "School of Computing & Engineering",
        avatarTone: "brand",
        initials: "AO"
    },
    {
        id: "bassey",
        name: "Prof. E. Bassey",
        email: "e.bassey@bupulse.edu",
        role: "dean",
        roleLabel: "Dean",
        school: "School of Computing & Engineering",
        avatarTone: "good",
        initials: "EB"
    },
    {
        id: "danladi",
        name: "M. Danladi",
        email: "m.danladi@bupulse.edu",
        role: "acadPlanningTO",
        roleLabel: "Acad. Planning T.O",
        avatarTone: "warn",
        initials: "MD"
    }
];
const deptSubmissions = [
    {
        id: "cs-200",
        department: "Computer Science",
        school: "School of Computing & Engineering",
        level: "200 Level",
        semester: "First Semester 2025/26",
        deptTO: "Yakubu Onome",
        hod: "Dr. A. Olumide",
        dean: "Prof. E. Bassey",
        deanSignedAt: "Mar 07, 11:34",
        courses: 9,
        units: 27,
        conflicts: 0,
        status: "pending",
        sessions: [
            {
                code: "COSC 204",
                lecturer: "Maitanmi S.O",
                venue: "Lab 3 — Software",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "COSC 200",
                lecturer: "Adams P.L",
                venue: "CST Hall B",
                day: "Mon",
                slot: "10:00"
            },
            {
                code: "SENG 270",
                lecturer: "Rodriguez T.F",
                venue: "Lab 5 — Networks",
                day: "Mon",
                slot: "14:00"
            },
            {
                code: "BU-GST 201",
                lecturer: "Nguyen A.K",
                venue: "CST Hall A",
                day: "Tue",
                slot: "08:00"
            },
            {
                code: "COSC 202",
                lecturer: "Johnson R.T",
                venue: "LT 12",
                day: "Tue",
                slot: "12:00"
            },
            {
                code: "ITGY 271",
                lecturer: "Lee M.N",
                venue: "Lab 3 — Software",
                day: "Tue",
                slot: "16:00"
            },
            {
                code: "BU-GST 205",
                lecturer: "Williams H.J",
                venue: "CST Hall A",
                day: "Wed",
                slot: "10:00"
            },
            {
                code: "COSC 268",
                lecturer: "Peterson J.E",
                venue: "Lab 3 — Software",
                day: "Wed",
                slot: "14:00"
            },
            {
                code: "COSC 872",
                lecturer: "Singh R.V",
                venue: "CST Hall B",
                day: "Thu",
                slot: "08:00"
            }
        ]
    },
    {
        id: "ee-300",
        department: "Electrical Engineering",
        school: "School of Computing & Engineering",
        level: "300 Level",
        semester: "First Semester 2025/26",
        deptTO: "Fatima Bello",
        hod: "Dr. K. Amadi",
        dean: "Prof. E. Bassey",
        deanSignedAt: "Mar 07, 09:18",
        courses: 11,
        units: 33,
        conflicts: 0,
        status: "pending",
        sessions: [
            {
                code: "EELE 301",
                lecturer: "Adeyemi O.P",
                venue: "Eng Hall A",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "EELE 302",
                lecturer: "Okafor B.J",
                venue: "Lab 7 — Electronics",
                day: "Mon",
                slot: "12:00"
            },
            {
                code: "EELE 303",
                lecturer: "Abdullahi K.S",
                venue: "LT 12",
                day: "Tue",
                slot: "12:00"
            },
            {
                code: "EELE 304",
                lecturer: "Peters N.O",
                venue: "Eng Hall B",
                day: "Tue",
                slot: "14:00"
            },
            {
                code: "EELE 305",
                lecturer: "Olawale F.B",
                venue: "Eng Hall A",
                day: "Wed",
                slot: "08:00"
            },
            {
                code: "EELE 306",
                lecturer: "Chukwu G.A",
                venue: "Lab 7 — Electronics",
                day: "Wed",
                slot: "14:00"
            },
            {
                code: "EELE 307",
                lecturer: "Osei M.T",
                venue: "Eng Hall A",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "EELE 308",
                lecturer: "Taiwo B.K",
                venue: "Eng Hall B",
                day: "Thu",
                slot: "12:00"
            },
            {
                code: "EELE 309",
                lecturer: "Yusuf S.O",
                venue: "Eng Hall A",
                day: "Fri",
                slot: "08:00"
            },
            {
                code: "BU-GST 301",
                lecturer: "Ibrahim T.A",
                venue: "CST Hall A",
                day: "Fri",
                slot: "10:00"
            },
            {
                code: "BU-GST 302",
                lecturer: "Balogun P.R",
                venue: "CST Hall B",
                day: "Fri",
                slot: "14:00"
            }
        ]
    },
    {
        id: "mcm-100",
        department: "Mass Communication",
        school: "School of Social Sciences",
        level: "100 Level",
        semester: "First Semester 2025/26",
        deptTO: "Ngozi Igwe",
        hod: "Dr. S. Afolabi",
        dean: "Prof. H. Oke",
        deanSignedAt: "Mar 06, 12:40",
        courses: 6,
        units: 18,
        conflicts: 0,
        status: "pending",
        sessions: [
            {
                code: "MCOM 101",
                lecturer: "Okonkwo N.J",
                venue: "Art Hall A",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "MCOM 102",
                lecturer: "Adejoke A.B",
                venue: "Studio 1",
                day: "Mon",
                slot: "14:00"
            },
            {
                code: "MCOM 103",
                lecturer: "Eze K.M",
                venue: "Art Hall A",
                day: "Tue",
                slot: "10:00"
            },
            {
                code: "MCOM 104",
                lecturer: "Oduola V.S",
                venue: "Art Hall B",
                day: "Wed",
                slot: "08:00"
            },
            {
                code: "BU-GST 101",
                lecturer: "Ibrahim T.A",
                venue: "LT 15",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "BU-GST 102",
                lecturer: "Chukwuemeka O.B",
                venue: "LT 15",
                day: "Fri",
                slot: "10:00"
            }
        ]
    },
    {
        id: "bus-100",
        department: "Business Administration",
        school: "School of Management Sciences",
        level: "100 Level",
        semester: "First Semester 2025/26",
        deptTO: "Emeka Nwosu",
        hod: "Dr. C. Okeke",
        dean: "Prof. L. Adegoke",
        deanSignedAt: "Mar 06, 16:50",
        courses: 8,
        units: 24,
        conflicts: 1,
        status: "pending",
        sessions: [
            {
                code: "BUSA 101",
                lecturer: "Nwosu E.C",
                venue: "Mgt Hall A",
                day: "Mon",
                slot: "10:00"
            },
            {
                code: "BUSA 102",
                lecturer: "Okafor D.M",
                venue: "Mgt Hall B",
                day: "Mon",
                slot: "14:00"
            },
            {
                code: "BUSA 103",
                lecturer: "Adeyemi R.K",
                venue: "Mgt Hall A",
                day: "Tue",
                slot: "08:00"
            },
            {
                code: "BUSA 104",
                lecturer: "Lawal S.T",
                venue: "Mgt Hall B",
                day: "Tue",
                slot: "12:00"
            },
            {
                code: "BUSA 105",
                lecturer: "Nnaji F.O",
                venue: "Mgt Hall A",
                day: "Wed",
                slot: "10:00"
            },
            {
                code: "BU-GST 101",
                lecturer: "Ibrahim T.A",
                venue: "LT 10",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "BUSA 106",
                lecturer: "Babatunde K.L",
                venue: "Mgt Hall A",
                day: "Thu",
                slot: "14:00",
                conflict: true
            },
            {
                code: "BUSA 107",
                lecturer: "Chukwu A.N",
                venue: "Mgt Hall A",
                day: "Thu",
                slot: "14:00",
                conflict: true
            }
        ]
    },
    {
        id: "mec-200",
        department: "Mechanical Engineering",
        school: "School of Computing & Engineering",
        level: "200 Level",
        semester: "First Semester 2025/26",
        deptTO: "Bode Fashola",
        hod: "Dr. U. Obi",
        dean: "Prof. E. Bassey",
        deanSignedAt: "Mar 07, 13:55",
        courses: 12,
        units: 35,
        conflicts: 0,
        status: "pending",
        sessions: [
            {
                code: "MECE 201",
                lecturer: "Fashola B.O",
                venue: "Eng Hall C",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "MECE 202",
                lecturer: "Okafor T.S",
                venue: "Lab 8 — Mech",
                day: "Mon",
                slot: "12:00"
            },
            {
                code: "MECE 203",
                lecturer: "Adeyemi P.R",
                venue: "Eng Hall C",
                day: "Tue",
                slot: "08:00"
            },
            {
                code: "MECE 204",
                lecturer: "Nwosu K.A",
                venue: "Lab 8 — Mech",
                day: "Tue",
                slot: "10:00"
            },
            {
                code: "MECE 205",
                lecturer: "Osei M.B",
                venue: "Eng Hall D",
                day: "Tue",
                slot: "14:00"
            },
            {
                code: "MECE 206",
                lecturer: "Chukwu F.N",
                venue: "Eng Hall C",
                day: "Wed",
                slot: "08:00"
            },
            {
                code: "MECE 207",
                lecturer: "Abiodun T.K",
                venue: "Lab 8 — Mech",
                day: "Wed",
                slot: "12:00"
            },
            {
                code: "MECE 208",
                lecturer: "Bello O.S",
                venue: "Eng Hall C",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "MECE 209",
                lecturer: "Eze N.T",
                venue: "Eng Hall D",
                day: "Thu",
                slot: "10:00"
            },
            {
                code: "MECE 210",
                lecturer: "Okonkwo A.P",
                venue: "Lab 8 — Mech",
                day: "Thu",
                slot: "14:00"
            },
            {
                code: "BU-GST 201",
                lecturer: "Ibrahim T.A",
                venue: "LT 15",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "BU-GST 202",
                lecturer: "Balogun R.O",
                venue: "LT 16",
                day: "Fri",
                slot: "12:00"
            }
        ]
    },
    {
        id: "law-400",
        department: "Law",
        school: "School of Law",
        level: "400 Level",
        semester: "First Semester 2025/26",
        deptTO: "Aisha Garba",
        hod: "Prof. R. Oladipo",
        dean: "Prof. T. Osei",
        deanSignedAt: "Mar 05, 14:22",
        courses: 7,
        units: 21,
        conflicts: 0,
        status: "approved",
        sessions: [
            {
                code: "LAW 401",
                lecturer: "Garba A.O",
                venue: "Law Hall A",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "LAW 402",
                lecturer: "Oladele R.T",
                venue: "Law Hall B",
                day: "Mon",
                slot: "14:00"
            },
            {
                code: "LAW 403",
                lecturer: "Folarin K.S",
                venue: "Law Hall A",
                day: "Tue",
                slot: "10:00"
            },
            {
                code: "LAW 404",
                lecturer: "Ibrahim O.C",
                venue: "Law Hall B",
                day: "Wed",
                slot: "08:00"
            },
            {
                code: "LAW 405",
                lecturer: "Adeola P.N",
                venue: "Law Hall A",
                day: "Thu",
                slot: "10:00"
            },
            {
                code: "LAW 406",
                lecturer: "Nwoye F.O",
                venue: "Law Hall B",
                day: "Thu",
                slot: "14:00"
            },
            {
                code: "BU-GST 401",
                lecturer: "Osei A.T",
                venue: "LT 8",
                day: "Fri",
                slot: "10:00"
            }
        ]
    },
    {
        id: "nurs-200",
        department: "Nursing Science",
        school: "College of Health Sciences",
        level: "200 Level",
        semester: "First Semester 2025/26",
        deptTO: "Joy Okonkwo",
        hod: "Dr. M. Eze",
        dean: "Prof. B. Hassan",
        deanSignedAt: "Mar 05, 10:05",
        courses: 10,
        units: 28,
        conflicts: 0,
        status: "published",
        publishedAt: "Mar 05, 10:22",
        sessions: [
            {
                code: "NURS 201",
                lecturer: "Okonkwo J.M",
                venue: "Health Sci Hall",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "NURS 202",
                lecturer: "Eze A.B",
                venue: "Lab 9 — Clinical",
                day: "Mon",
                slot: "12:00"
            },
            {
                code: "NURS 203",
                lecturer: "Hassan S.T",
                venue: "Health Sci Hall",
                day: "Tue",
                slot: "08:00"
            },
            {
                code: "NURS 204",
                lecturer: "Balogun R.K",
                venue: "Lab 9 — Clinical",
                day: "Tue",
                slot: "14:00"
            },
            {
                code: "NURS 205",
                lecturer: "Nwachukwu P.O",
                venue: "Health Sci Hall",
                day: "Wed",
                slot: "08:00"
            },
            {
                code: "NURS 206",
                lecturer: "Adebayo M.F",
                venue: "Lab 9 — Clinical",
                day: "Wed",
                slot: "12:00"
            },
            {
                code: "NURS 207",
                lecturer: "Osei G.T",
                venue: "Health Sci Hall",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "NURS 208",
                lecturer: "Okugo C.A",
                venue: "Lab 9 — Clinical",
                day: "Thu",
                slot: "14:00"
            },
            {
                code: "NURS 209",
                lecturer: "Olumide P.N",
                venue: "Health Sci Hall",
                day: "Fri",
                slot: "08:00"
            },
            {
                code: "BU-GST 201",
                lecturer: "Ade T.K",
                venue: "LT 5",
                day: "Fri",
                slot: "12:00"
            }
        ]
    },
    {
        id: "acct-300",
        department: "Accounting",
        school: "School of Management Sciences",
        level: "300 Level",
        semester: "First Semester 2025/26",
        deptTO: "Sola Abimbola",
        hod: "Dr. P. Eze",
        dean: "Prof. L. Adegoke",
        deanSignedAt: "Mar 04, 17:11",
        courses: 9,
        units: 26,
        conflicts: 2,
        status: "returned",
        returnComment: "Persistent venue overlap on Tuesday afternoon — resolve before resubmitting.",
        sessions: [
            {
                code: "ACCT 301",
                lecturer: "Abimbola S.O",
                venue: "Mgt Hall C",
                day: "Mon",
                slot: "08:00"
            },
            {
                code: "ACCT 302",
                lecturer: "Adeyemi O.T",
                venue: "Mgt Hall C",
                day: "Mon",
                slot: "12:00"
            },
            {
                code: "ACCT 303",
                lecturer: "Nwosu K.B",
                venue: "Mgt Hall D",
                day: "Tue",
                slot: "08:00"
            },
            {
                code: "ACCT 304",
                lecturer: "Okafor P.A",
                venue: "Mgt Hall C",
                day: "Tue",
                slot: "14:00",
                conflict: true
            },
            {
                code: "ACCT 305",
                lecturer: "Ibrahim C.L",
                venue: "Mgt Hall C",
                day: "Tue",
                slot: "14:00",
                conflict: true
            },
            {
                code: "ACCT 306",
                lecturer: "Chukwu N.O",
                venue: "Mgt Hall C",
                day: "Thu",
                slot: "08:00"
            },
            {
                code: "ACCT 307",
                lecturer: "Babatunde S.T",
                venue: "Mgt Hall D",
                day: "Thu",
                slot: "14:00"
            },
            {
                code: "ACCT 308",
                lecturer: "Eze J.M",
                venue: "Mgt Hall C",
                day: "Fri",
                slot: "10:00"
            },
            {
                code: "BU-GST 301",
                lecturer: "Osei B.K",
                venue: "LT 11",
                day: "Fri",
                slot: "14:00"
            }
        ]
    }
];
const venueRecords = [
    {
        id: "v1",
        name: "CST Hall A",
        capacity: 240,
        type: "Lecture Hall",
        assignedDept: "Computer Science",
        school: "School of Computing & Engineering",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v2",
        name: "CST Hall B",
        capacity: 160,
        type: "Lecture Hall",
        assignedDept: "Computer Science",
        school: "School of Computing & Engineering",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v3",
        name: "Lab 3 — Software",
        capacity: 60,
        type: "Lab",
        assignedDept: "Computer Science",
        school: "School of Computing & Engineering",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v4",
        name: "Lab 5 — Networks",
        capacity: 60,
        type: "Lab",
        assignedDept: "Computer Science",
        school: "School of Computing & Engineering",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v5",
        name: "Eng Hall A",
        capacity: 200,
        type: "Lecture Hall",
        assignedDept: "Electrical Engineering",
        school: "School of Computing & Engineering",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v6",
        name: "Eng Hall B",
        capacity: 180,
        type: "Lecture Hall",
        assignedDept: "Electrical Engineering",
        school: "School of Computing & Engineering",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v7",
        name: "Lab 7 — Electronics",
        capacity: 50,
        type: "Lab",
        assignedDept: "Electrical Engineering",
        school: "School of Computing & Engineering",
        floor: "2nd Floor",
        spaceType: "exclusive"
    },
    {
        id: "v8",
        name: "Eng Hall C",
        capacity: 200,
        type: "Lecture Hall",
        assignedDept: "Mechanical Engineering",
        school: "School of Computing & Engineering",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v9",
        name: "Eng Hall D",
        capacity: 160,
        type: "Lecture Hall",
        assignedDept: "Mechanical Engineering",
        school: "School of Computing & Engineering",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v10",
        name: "Lab 8 — Mech",
        capacity: 45,
        type: "Lab",
        assignedDept: "Mechanical Engineering",
        school: "School of Computing & Engineering",
        floor: "Basement",
        spaceType: "exclusive"
    },
    {
        id: "v11",
        name: "Art Hall A",
        capacity: 150,
        type: "Lecture Hall",
        assignedDept: "Mass Communication",
        school: "School of Social Sciences",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v12",
        name: "Art Hall B",
        capacity: 120,
        type: "Lecture Hall",
        assignedDept: "Mass Communication",
        school: "School of Social Sciences",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v13",
        name: "Studio 1",
        capacity: 30,
        type: "Seminar Room",
        assignedDept: "Mass Communication",
        school: "School of Social Sciences",
        floor: "2nd Floor",
        spaceType: "exclusive"
    },
    {
        id: "v14",
        name: "Mgt Hall A",
        capacity: 180,
        type: "Lecture Hall",
        assignedDept: "Business Administration",
        school: "School of Management Sciences",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v15",
        name: "Mgt Hall B",
        capacity: 160,
        type: "Lecture Hall",
        assignedDept: "Business Administration",
        school: "School of Management Sciences",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v16",
        name: "Mgt Hall C",
        capacity: 180,
        type: "Lecture Hall",
        assignedDept: "Accounting",
        school: "School of Management Sciences",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v17",
        name: "Mgt Hall D",
        capacity: 140,
        type: "Lecture Hall",
        assignedDept: "Accounting",
        school: "School of Management Sciences",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v18",
        name: "Law Hall A",
        capacity: 120,
        type: "Lecture Hall",
        assignedDept: "Law",
        school: "School of Law",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v19",
        name: "Law Hall B",
        capacity: 100,
        type: "Seminar Room",
        assignedDept: "Law",
        school: "School of Law",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v20",
        name: "Health Sci Hall",
        capacity: 220,
        type: "Lecture Hall",
        assignedDept: "Nursing Science",
        school: "College of Health Sciences",
        floor: "Ground Floor",
        spaceType: "exclusive"
    },
    {
        id: "v21",
        name: "Lab 9 — Clinical",
        capacity: 40,
        type: "Lab",
        assignedDept: "Nursing Science",
        school: "College of Health Sciences",
        floor: "1st Floor",
        spaceType: "exclusive"
    },
    {
        id: "v22",
        name: "LT 5",
        capacity: 300,
        type: "Lecture Hall",
        assignedDept: "Nursing Science",
        school: "College of Health Sciences",
        floor: "Ground Floor",
        spaceType: "shared"
    },
    {
        id: "v23",
        name: "LT 8",
        capacity: 280,
        type: "Lecture Hall",
        assignedDept: "Law",
        school: "School of Law",
        floor: "Ground Floor",
        spaceType: "shared"
    },
    {
        id: "v24",
        name: "LT 10",
        capacity: 300,
        type: "Lecture Hall",
        assignedDept: "Business Administration",
        school: "School of Management Sciences",
        floor: "1st Floor",
        spaceType: "shared"
    },
    {
        id: "v25",
        name: "LT 11",
        capacity: 280,
        type: "Lecture Hall",
        assignedDept: "Mass Communication",
        school: "School of Social Sciences",
        floor: "1st Floor",
        spaceType: "shared"
    },
    {
        id: "v26",
        name: "LT 12",
        capacity: 260,
        type: "Lecture Hall",
        assignedDept: "Computer Science",
        school: "School of Computing & Engineering",
        floor: "2nd Floor",
        spaceType: "shared"
    },
    {
        id: "v27",
        name: "LT 15",
        capacity: 320,
        type: "Lecture Hall",
        assignedDept: "Electrical Engineering",
        school: "School of Computing & Engineering",
        floor: "Ground Floor",
        spaceType: "shared"
    },
    {
        id: "v28",
        name: "LT 16",
        capacity: 300,
        type: "Lecture Hall",
        assignedDept: "Accounting",
        school: "School of Management Sciences",
        floor: "1st Floor",
        spaceType: "shared"
    },
    {
        id: "v29",
        name: "Main Auditorium",
        capacity: 1200,
        type: "Auditorium",
        assignedDept: "Central Administration",
        school: "University Central Services",
        floor: "Ground Floor",
        spaceType: "shared"
    },
    {
        id: "v30",
        name: "Seminar Room A",
        capacity: 40,
        type: "Seminar Room",
        assignedDept: "Mechanical Engineering",
        school: "School of Computing & Engineering",
        floor: "2nd Floor",
        spaceType: "shared"
    },
    {
        id: "v31",
        name: "Virtual / LMS",
        capacity: 5000,
        type: "Lecture Hall",
        assignedDept: "Academic Planning Office",
        school: "Vice-Chancellor's Office",
        floor: "Online",
        spaceType: "shared",
        isVirtual: true
    }
];
const adjunctRecords = [
    {
        id: "adj1",
        name: "Nguyen A.K",
        department: "Computer Science",
        school: "School of Computing & Engineering",
        courses: [
            "BU-GST 201"
        ],
        availableDays: [
            "Tue",
            "Fri"
        ],
        note: "Available Tue & Fri only — tech industry practitioner"
    },
    {
        id: "adj2",
        name: "Peterson J.E",
        department: "Computer Science",
        school: "School of Computing & Engineering",
        courses: [
            "COSC 268"
        ],
        availableDays: [
            "Wed"
        ],
        note: "Industry practitioner — evenings only, after 14:00"
    },
    {
        id: "adj3",
        name: "Ibrahim T.A",
        department: "General Studies",
        school: "Cross-dept (GST)",
        courses: [
            "BU-GST 101",
            "BU-GST 201",
            "BU-GST 301"
        ],
        availableDays: [
            "Mon",
            "Tue",
            "Thu",
            "Fri"
        ],
        note: "GST lecturer shared across multiple departments — no Wednesdays"
    },
    {
        id: "adj4",
        name: "Balogun R.O",
        department: "General Studies",
        school: "Cross-dept (GST)",
        courses: [
            "BU-GST 202"
        ],
        availableDays: [
            "Fri"
        ],
        note: "Available Fridays only — part-time visiting"
    },
    {
        id: "adj5",
        name: "Osei A.T",
        department: "General Studies",
        school: "Cross-dept (GST)",
        courses: [
            "BU-GST 401"
        ],
        availableDays: [
            "Mon",
            "Wed",
            "Fri"
        ],
        note: "Morning slots preferred — not available after 14:00"
    }
];
const globalDaysOff = [
    {
        id: "do1",
        lecturer: "Johnson R.T",
        department: "Computer Science",
        date: "Every Wednesday",
        reason: "Research day — standing arrangement with department",
        recurring: true
    },
    {
        id: "do2",
        lecturer: "Lee M.N",
        department: "Computer Science",
        date: "Every Friday AM",
        reason: "Clinic day — unavailable until 12:00 on Fridays",
        recurring: true
    },
    {
        id: "do3",
        lecturer: "Adeyemi O.P",
        department: "Electrical Engineering",
        date: "Mar 15, 2026",
        reason: "External examiner duty at FUTA",
        recurring: false
    }
];
const globalStudyLeaves = [
    {
        id: "sl1",
        lecturer: "Adebayo F.O",
        department: "Computer Science",
        from: "12 Jan 2026",
        to: "28 Feb 2026",
        reason: "Doctoral fieldwork — University of Lagos"
    },
    {
        id: "sl2",
        lecturer: "Okafor C.M",
        department: "Computer Science",
        from: "05 Feb 2026",
        to: "19 Feb 2026",
        reason: "Conference & sabbatical — IEEE ICCV 2026"
    },
    {
        id: "sl3",
        lecturer: "Nwachukwu P.O",
        department: "Nursing Science",
        from: "10 Mar 2026",
        to: "14 Mar 2026",
        reason: "Clinical attachment — Lagos University Teaching Hospital"
    }
];
const auditLog = [
    {
        id: "a1",
        actor: "M. Danladi",
        action: "published",
        department: "Nursing Science",
        school: "College of Health Sciences",
        level: "200 Level",
        at: "Mar 05, 10:22"
    },
    {
        id: "a2",
        actor: "M. Danladi",
        action: "approved",
        department: "Law",
        school: "School of Law",
        level: "400 Level",
        at: "Mar 05, 14:35",
        note: "Clean submission, no conflicts. All venue assignments verified against school calendar."
    },
    {
        id: "a3",
        actor: "M. Danladi",
        action: "returned",
        department: "Accounting",
        school: "School of Management Sciences",
        level: "300 Level",
        at: "Mar 04, 17:20",
        note: "Persistent venue overlap on Tuesday afternoon — resolve before resubmitting."
    }
];
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0x_fsei._.js.map