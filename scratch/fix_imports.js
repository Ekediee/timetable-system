const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  let useClient = false;
  let imports = [];
  let otherLines = [];

  let inImport = false;
  let currentImport = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (i === 0 && (trimmed === '"use client";' || trimmed === "'use client';")) {
      useClient = true;
      continue;
    }

    if (inImport) {
      currentImport.push(line);
      if (trimmed.endsWith(";")) {
        inImport = false;
        imports.push(currentImport.join("\n"));
        currentImport = [];
      }
      continue;
    }

    if (trimmed.startsWith("import ") || trimmed.startsWith("import{") || trimmed.startsWith("import type")) {
      if (trimmed.endsWith(";")) {
        imports.push(line);
      } else {
        inImport = true;
        currentImport = [line];
      }
      continue;
    }

    otherLines.push(line);
  }

  // Remove leading blank lines from otherLines
  while (otherLines.length > 0 && otherLines[0].trim() === "") {
    otherLines.shift();
  }

  const result = (useClient ? '"use client";\n\n' : '') + imports.join("\n") + "\n\n" + otherLines.join("\n");
  fs.writeFileSync(filePath, result, "utf8");
  console.log("Fixed: " + filePath);
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git" && file !== "scratch") {
        processDir(full);
      }
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      fixFile(full);
    }
  }
}

processDir(".");
