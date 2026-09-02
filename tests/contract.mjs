// Static contract checks for published skills. No model required.
//
// Run: npm run test:contract

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(root, "skills");

const required = ["fleet-setup", "fleet-manager", "fleet-lessons"];
const stale = [
  /reactive chain/i,
  /subscription processor/i,
  /subscribes_to/i,
  /fleet pipeline/i,
  /dashboard\.fleetctl\.ai/i,
  /closed beta/i,
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      out.push(...walk(path));
    } else {
      out.push(path);
    }
  }
  return out;
}

let failed = 0;
function check(ok, message) {
  if (!ok) {
    failed += 1;
    console.error(`FAIL  ${message}`);
  }
}

for (const name of required) {
  const skill = join(skillsRoot, name, "SKILL.md");
  check(existsSync(skill), `missing ${name}/SKILL.md`);
}

const retired = join(skillsRoot, "fleet-manager", "reference", "operating-the-chain.md");
check(!existsSync(retired), "retired operating-the-chain.md must not ship");

const bodies = [];
for (const file of walk(skillsRoot)) {
  if (file.endsWith(".md") || file.endsWith(".json") || file.endsWith(".yaml")) {
    bodies.push(readFileSync(file, "utf8"));
  }
}
bodies.push(readFileSync(join(root, "README.md"), "utf8"));
const text = bodies.join("\n");
for (const pattern of stale) {
  check(!pattern.test(text), `stale phrase ${String(pattern)}`);
}

check(/fleet up/.test(readFileSync(join(skillsRoot, "fleet-setup", "SKILL.md"), "utf8")), "fleet-setup must teach fleet up");
check(/fleet login/.test(readFileSync(join(skillsRoot, "fleet-setup", "SKILL.md"), "utf8")), "fleet-setup must teach fleet login");

const setup = readFileSync(join(skillsRoot, "fleet-setup", "SKILL.md"), "utf8");
check(/code already in the user message/i.test(setup), "fleet-setup must use a code already in the user message");
check(/this message has no registration code/i.test(setup), "fleet-setup must stop when the paste has no code");
check(!/Ask the user for a registration code/i.test(setup), "fleet-setup must not ask the user for a registration code");
check(/~\/\.claude\/skills/.test(setup), "fleet-setup must write Claude Code personal skills path");
check(/\.claude\/skills\/fleet-setup/.test(setup), "fleet-setup must copy itself into project .claude/skills");
check(/~\/\.codex\/skills/.test(setup), "fleet-setup must write Codex global skills path");
check(/fleet skills install --target/.test(setup), "fleet-setup must reuse fleet skills install --target (no second installer)");
check(/not a gate/i.test(setup), "fleet-setup must not treat gh auth as a gate");
check(!/```sh\ncurl -fsSL/.test(setup), "fleet-setup must not present curl | sh as a paste block");

const skillPaths = join(skillsRoot, "fleet-setup", "reference", "skill-paths.md");
check(existsSync(skillPaths), "missing fleet-setup/reference/skill-paths.md");
if (existsSync(skillPaths)) {
  const paths = readFileSync(skillPaths, "utf8");
  check(/~\/\.claude\/skills/.test(paths), "skill-paths must list ~/.claude/skills");
  check(/~\/\.codex\/skills/.test(paths), "skill-paths must list ~/.codex/skills");
  check(/Claude Code does not read/.test(paths), "skill-paths must say Claude Code does not read .agents");
}

check(/saved workflow/.test(readFileSync(join(skillsRoot, "fleet-manager", "SKILL.md"), "utf8")), "fleet-manager must teach saved workflows");
check(/lessons\.bootstrap/.test(readFileSync(join(skillsRoot, "fleet-lessons", "SKILL.md"), "utf8")), "fleet-lessons must teach bootstrap");

if (failed > 0) {
  console.error(`\n${failed} contract check(s) failed`);
  process.exit(1);
}
console.log(`ok  ${required.join(", ")}`);
