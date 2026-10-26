const createJiti = require("jiti");
const jiti = createJiti(__filename);
const { generateTimetable, validateLiveSessions } = jiti("./lib/engine.ts");
const { venues, constraints } = jiti("./lib/data.ts");
const allocs = require("./lib/university_allocations.json");

console.log("=== Checking Current Chapel Seminar Behavior ===");
const cs = generateTimetable(allocs["Computer Science"], venues, constraints, "Computer Science");
console.log("Total CS Sessions:", cs.sessions.length);

const csChapel = cs.sessions.filter(s =>
  (s.code.includes("GST") && (s.code.includes("011") || s.code.includes("021") || s.code.includes("031") || s.code.includes("041"))) ||
  s.code.includes("GEDS")
);
console.log("CS Chapel Sessions found:", csChapel.map(s => `${s.code} (${s.level}) on ${s.day} ${s.slot} at ${s.venue}`));

const se = generateTimetable(allocs["Software Engineering"], venues, constraints, "Software Engineering");
console.log("\nTotal SE Sessions:", se.sessions.length);
const seChapel = se.sessions.filter(s =>
  (s.code.includes("GST") && (s.code.includes("011") || s.code.includes("021") || s.code.includes("031") || s.code.includes("041"))) ||
  s.code.includes("GEDS")
);
console.log("SE Chapel Sessions found:", seChapel.map(s => `${s.code} (${s.level}) on ${s.day} ${s.slot} at ${s.venue}`));

