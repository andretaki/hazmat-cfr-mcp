import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set(["node_modules", "dist", ".git"]);
const findings = [];

const patterns = [
  { name: "private-key", regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: "openai-key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "github-token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "generic-secret-assignment", regex: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\n]{12,}['"]/i },
  { name: "internal-ip", regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/ },
  { name: "email-address", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { name: "alliance-private-name", regex: /\bAlliance Chemical\b/i },
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignoredDirs.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (stat.size > 1024 * 1024) continue;
    scan(path);
  }
}

function scan(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        const rel = relative(root, path);
        if (rel === ".env.example" && pattern.name === "generic-secret-assignment") continue;
        findings.push({ pattern: pattern.name, file: rel, line: index + 1 });
      }
    }
  });
}

walk(root);

if (findings.length > 0) {
  console.error(JSON.stringify({ status: "failed", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "passed", findings: [] }, null, 2));
