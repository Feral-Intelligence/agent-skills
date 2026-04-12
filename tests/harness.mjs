// Eval harness — loads a SKILL.md and asks Claude to follow it.
//
// Uses Claude Code headless (`claude -p`) as the backend so runs don't need
// an ANTHROPIC_API_KEY — we reuse whatever auth Claude Code is already using.
//
// This is NOT an integration test of Claude Code's full runtime. It
// approximates skill behavior by injecting SKILL.md content as an
// --append-system-prompt and capturing the text response. Assertions are
// string/regex based. For the small, concrete commands in fleet-setup that's
// the right resolution.

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const MODEL = process.env.EVAL_MODEL || "sonnet";

/**
 * Load a SKILL.md from skills/<name>/SKILL.md and return frontmatter + body.
 */
export function loadSkill(skillName) {
  const skillPath = resolve(REPO_ROOT, "skills", skillName, "SKILL.md");
  const content = readFileSync(skillPath, "utf-8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid SKILL.md (missing frontmatter): ${skillPath}`);
  }
  return { name: skillName, frontmatter: match[1], body: match[2] };
}

/**
 * Run a scenario: invoke `claude -p` with the skill as system context and
 * the scenario prompt as the user message. Returns the plain-text response.
 */
export function runScenario(skill, userPrompt) {
  const systemPrompt = buildSystemPrompt(skill);
  return new Promise((resolvePromise, rejectPromise) => {
    const args = [
      "-p",
      "--model", MODEL,
      "--append-system-prompt", systemPrompt,
      "--no-session-persistence",
      "--output-format", "text",
      // Block all tools — eval mode wants pure text output.
      "--disallowedTools", "Bash", "Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "WebSearch", "Agent", "Skill",
      "--disable-slash-commands",
      userPrompt,
    ];

    const proc = spawn("claude", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk; });
    proc.stderr.on("data", (chunk) => { stderr += chunk; });

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      rejectPromise(new Error("claude -p timed out after 90s"));
    }, 90_000);

    proc.on("error", (err) => {
      clearTimeout(timeout);
      rejectPromise(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        rejectPromise(new Error(`claude -p exited ${code}: ${stderr.slice(0, 500)}`));
        return;
      }
      resolvePromise(stdout.trim());
    });
  });
}

function buildSystemPrompt(skill) {
  return `You are an AI coding assistant with access to the following installed skill. When the user's request matches this skill's description, follow its instructions precisely and completely.

---BEGIN SKILL: ${skill.name}---
${skill.body}
---END SKILL---

Evaluation mode: you are running offline against a test suite. Do NOT execute any commands or use any tools. Instead, show the exact commands you would run in fenced code blocks and explain your reasoning in plain text. Follow the skill's instructions as if you were helping a real user, but describe rather than execute.`;
}

/**
 * Assert that all expected patterns appear in the response.
 */
export function assertContains(text, patterns) {
  const missing = [];
  for (const p of patterns) {
    const regex = p instanceof RegExp ? p : new RegExp(escapeRegex(p), "i");
    if (!regex.test(text)) {
      missing.push(p.toString());
    }
  }
  return { passed: missing.length === 0, missing };
}

/**
 * Assert that none of the forbidden patterns appear in the response.
 */
export function assertNotContains(text, patterns) {
  const found = [];
  for (const p of patterns) {
    const regex = p instanceof RegExp ? p : new RegExp(escapeRegex(p), "i");
    if (regex.test(text)) {
      found.push(p.toString());
    }
  }
  return { passed: found.length === 0, found };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
