export interface ExportableSession {
  day: string;
  slot: string;
  code: string;
  lecturer: string;
  venue: string;
  duration?: number;
  level?: string;
  group?: string;
  isVirtual?: boolean;
  conflict?: boolean | string;
  conflictDescription?: string;
}

export interface TimetableExportMeta {
  department?: string;
  level?: string;
  semester?: string;
  session?: string;
  status?: string;
}

/**
 * Exports a timetable session array to a standard RFC-4180 CSV file with UTF-8 BOM.
 */
export function exportToCsv(
  sessions: ExportableSession[],
  meta: TimetableExportMeta = {},
) {
  if (typeof window === "undefined") return;

  const deptName = meta.department || "Timetable";
  const levelName = meta.level || "All-Levels";

  const headers = [
    "Day",
    "Time Slot",
    "Duration (Hours)",
    "Course Code",
    "Lecturer",
    "Venue",
    "Level",
    "Group",
    "Mode",
    "Conflict Note",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = sessions.map((s) =>
    [
      escapeCsv(s.day),
      escapeCsv(s.slot),
      escapeCsv(s.duration ?? 1),
      escapeCsv(s.code),
      escapeCsv(s.lecturer),
      escapeCsv(s.venue),
      escapeCsv(s.level ?? ""),
      escapeCsv(s.group ?? "All"),
      escapeCsv(s.isVirtual ? "Virtual / Online" : "Physical"),
      escapeCsv(s.conflict ? (s as any).conflictDescription || "Conflict" : "Clear"),
    ].join(","),
  );

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeDept = deptName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeLvl = levelName.replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `BUPulse-${safeDept}-${safeLvl}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a print-formatted view of the timetable and prompts browser print / Save as PDF.
 */
export function printTimetablePdf(
  sessions: ExportableSession[],
  meta: TimetableExportMeta = {},
) {
  if (typeof window === "undefined") return;

  const deptName = meta.department || "Department Timetable";
  const levelName = meta.level || "All Levels";
  const semesterName = meta.semester || "First Semester";
  const sessionName = meta.session || "2026 / 2027";
  const statusName = meta.status || "";

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const sortedSessions = [...sessions].sort((a, b) => {
    const d = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (d !== 0) return d;
    return (a.slot || "").localeCompare(b.slot || "");
  });

  const printWindow = window.open("", "_blank", "width=1000,height=750");
  if (!printWindow) {
    window.print();
    return;
  }

  const rowsHtml = sortedSessions
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 8px 10px; font-weight: 600;">${s.day}</td>
      <td style="padding: 8px 10px;">${s.slot} (${s.duration ?? 1}h)</td>
      <td style="padding: 8px 10px; font-weight: 700; color: #1e3a8a;">${s.code}</td>
      <td style="padding: 8px 10px;">${s.lecturer}</td>
      <td style="padding: 8px 10px;">${s.venue}</td>
      <td style="padding: 8px 10px;">${s.level ?? levelName}</td>
      <td style="padding: 8px 10px;">${s.group ?? "All"}</td>
      <td style="padding: 8px 10px;">${s.isVirtual ? "Virtual" : "Physical"}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Timetable - ${deptName} (${levelName})</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 24px;
            color: #111827;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #1e3a8a;
            margin: 0 0 4px 0;
          }
          .meta {
            font-size: 13px;
            color: #4b5563;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 700;
            padding: 9px 10px;
            border-bottom: 2px solid #d1d5db;
          }
          .footer {
            margin-top: 18px;
            font-size: 11px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Babcock University — Timetable Schedule</h1>
            <p class="meta"><b>Department:</b> ${deptName} &nbsp;|&nbsp; <b>Level:</b> ${levelName} &nbsp;|&nbsp; <b>Semester:</b> ${semesterName} (${sessionName})</p>
          </div>
          <div style="text-align: right;">
            ${statusName ? `<span style="font-size: 12px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 9999px; font-weight: 600;">${statusName}</span>` : ""}
            <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">Total Sessions: ${sessions.length}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Time</th>
              <th>Course</th>
              <th>Lecturer</th>
              <th>Venue</th>
              <th>Level</th>
              <th>Group</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding: 24px; color: #9ca3af;">No sessions found</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <span>Generated by BUPulse Institutional Timetable System</span>
          <span>Printed on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Unified export function for timetable sessions.
 */
export function exportTimetable(
  format: "csv" | "pdf",
  sessions: ExportableSession[],
  meta: TimetableExportMeta = {},
) {
  if (format === "csv") {
    exportToCsv(sessions, meta);
  } else if (format === "pdf") {
    printTimetablePdf(sessions, meta);
  }
}
