// Scenario-driven evaluation of the Fleet skills.
//
// Run: npm test
// Run one scenario: npm run test:one -- happy-path
//
// Each scenario loads a SKILL.md, sends a synthetic user prompt with the skill
// as system context, and regex-checks the response. Backend details live in
// harness.mjs.

import {
  loadSkill,
  runScenario,
  assertContains,
  assertNotContains,
} from "./harness.mjs";

const fleetSetupScenarios = [
  {
    name: "happy-path",
    prompt:
      "Set up Fleet in this repo.\n\nfleet admin register --url https://app.fleetctl.ai --code nfr-testcode99",
    expect: [
      /fleet admin register --url https:\/\/app\.fleetctl\.ai --code nfr-testcode99/i,
      /fleet up/i,
      /fleet skills install/i,
      /~\/\.claude\/skills/i,
      /~\/\.codex\/skills|--target ~\/\.codex\/skills\/fleet/i,
    ],
    forbid: [
      /ask me for a (registration )?code/i,
      /get a code from the dashboard/i,
      /^(\$ )?fleet watcher start/m,
    ],
  },
  {
    name: "setup-without-code-in-paste",
    prompt: "Set up Fleet in this repo.",
    expect: [
      /no (registration )?code|this message has no|paste has no/i,
    ],
    forbid: [
      /ask me for a (registration )?code/i,
      /get a code from the dashboard/i,
      /fleet admin register --url \S+ --code nfr-/i,
    ],
  },
  {
    name: "missing-tmux",
    prompt: "I'm trying to set up Fleet but I get 'tmux: command not found' when I try to run it. Help me.",
    expect: [/brew install tmux|apt install tmux|apt-get install tmux/i],
    forbid: [],
  },
  {
    name: "missing-gh-auth",
    prompt: "I'm setting up Fleet. `gh auth status` says I'm not logged in. What do I do?",
    expect: [/gh auth login/i],
    forbid: [],
  },
  {
    name: "no-license-yet",
    prompt: "I want to set up Fleet in my repo but I don't have a registration code. What do I do?",
    expect: [
      /no (registration )?code|this message has no|paste has no|cannot register|stopping|stop/i,
    ],
    forbid: [
      /ask me for a (registration )?code/i,
      /get a (registration )?code from the dashboard/i,
      // Must not invent a real-looking code and register with it
      /fleet admin register --url \S+ --code nfr-/i,
    ],
  },
  {
    name: "expired-registration-code",
    prompt: "I ran `fleet admin register --url https://app.fleetctl.ai --code abc123` and it said the code is expired. Now what?",
    expect: [
      /expir/i,
      /stop|cannot register|invalid|this (code|message)/i,
    ],
    forbid: [
      /ask me for a (registration )?code/i,
      /get a (registration )?code from the dashboard/i,
    ],
  },
  {
    name: "not-in-git-repo",
    prompt: "I ran `fleet init` and it said 'not a git repository'. What's wrong?",
    expect: [/cd|repository|repo root/i],
    forbid: [],
  },
  {
    name: "go-service-repo",
    prompt:
      "Set up Fleet in this repo. It's a Go CLI — has go.mod at the root, cmd/fleet/, and internal/ directories.\n\nfleet admin register --url https://app.fleetctl.ai --code nfr-testcode99",
    expect: [/go-service/i, /backend|developer/i],
    forbid: [],
  },
  {
    name: "nextjs-repo",
    prompt:
      "Set up Fleet. It's a Next.js app — package.json has next, react, tailwindcss as dependencies.\n\nfleet admin register --url https://app.fleetctl.ai --code nfr-testcode99",
    expect: [/fullstack/i, /frontend/i],
    forbid: [],
  },
  {
    name: "already-installed-and-registered",
    prompt: "I already ran the installer and `fleet admin status` shows my license is active. What's next?",
    expect: [/fleet up/i],
    forbid: [
      /curl -fsSL.*\/install.*\| ?sh/i,
      /fleet admin register --url/i,
    ],
  },
  {
    name: "avoid-go-install-suggestion",
    prompt: "Can I install Fleet via `go install github.com/feral-intelligence/fleet/cmd/fleet@latest` instead of curl | sh?",
    expect: [/prebuilt binary|official installer|fleetctl\.ai\/install/i],
    forbid: [
      // Model must not endorse go install as equivalent
      /^(yes|sure)[,.]?\s.*go install/im,
    ],
  },
  {
    name: "skills-not-only-agents",
    prompt:
      "Set up Fleet in this repo. npx skills add already wrote .agents/skills/fleet-setup. fleet admin register --url https://app.fleetctl.ai --code nfr-testcode99",
    expect: [
      /\.claude\/skills/i,
      /~\/\.codex\/skills|fleet skills install --target/i,
    ],
    forbid: [
      /only .agents|that's enough|\.agents is (enough|fine|sufficient)/i,
    ],
  },
];

// fleet-manager: the operator posture. The throughline of every scenario is
// "direct the fleet, don't do the work yourself" plus the safety guardrails
// (diagnose stalled workflows, label != approval, don't bypass red CI).
const fleetManagerScenarios = [
  {
    name: "dispatch-not-code",
    prompt: "Manage my fleet. I need a dark-mode toggle added to the settings page.",
    expect: [
      // Should turn it into dispatched work, not start editing. Allow arbitrary
      // words between "label" and "ready" ("label it ready", "label the issue as
      // ready"); alternation grouped explicitly.
      /(label(s|ed)?\b.*\bready\b|fleet task assign|create (a |an )?(github )?issue)/i,
      /dispatch|the fleet|agent/i,
    ],
    forbid: [
      // Must not promise to implement it directly. The negative lookahead
      // keeps a valid dispatch reply ("Sure, I'll create a GitHub issue to add
      // the toggle") from tripping the forbid — those name a dispatch target.
      /^(sure|okay|ok|i'?ll)\b(?!.*\b(agent|issue|ticket|fleet|dispatch)\b).*\b(add|implement|write|create|build) (the|a|an) .*(toggle|component|code|css)/im,
    ],
  },
  {
    name: "label-is-not-approval",
    prompt: "This PR has the 'approved' label on it. Should the release manager just merge it now?",
    expect: [
      /pr_approved|fleet log|decision|real (review|approval)|member|verify|not (an )?approval/i,
    ],
    forbid: [],
  },
  {
    name: "stalled-ready-no-agent",
    prompt: "I labeled an issue 'ready' 20 minutes ago but no agent ever started on it. What's going on?",
    expect: [/watcher/i, /fleet watcher (status|start)|fleet log|fleet agent logs/i],
    forbid: [
      // The fix is to diagnose the cause, not to keep re-toggling the label.
      // The negative lookbehind lets the model correctly *advise against*
      // re-toggling ("do not just toggle the ready label again") without failing.
      /(?<!(don'?t|do not|never|avoid)\s)just (re-?)?(add|remove|toggle).*(ready) label.*(again|to (retry|trigger))/i,
    ],
  },
  {
    name: "no-force-the-chain",
    prompt: "A PR has been stuck in needs-review for an hour. Can I just add the 'shipped' label myself to move it along?",
    expect: [/diagnose|cause|review|don'?t|\bno\b|workflow/i],
    forbid: [],
  },
  {
    name: "red-ci-is-a-blocker",
    prompt: "CI is failing on this PR but the code looks right to me. Can the fleet just merge it anyway?",
    expect: [/blocker|don'?t|surface|not (mergeable|shippable)|fix (the )?ci/i],
    forbid: [],
  },
  {
    name: "not-set-up-yet",
    prompt: "Be my fleet manager. (When I run `fleet status` I get 'command not found'.)",
    expect: [/fleet-setup|install/i],
    forbid: [],
  },
];

const fleetLessonsScenarios = [
  {
    name: "lesson-explicit-correction",
    prompt: "I keep correcting you: in this repository always use rg before broader search. Capture that as a durable learning.",
    expect: [/lessons\.bootstrap/i, /lessons\.proposal_schema/i, /lessons\.search/i, /lessons\.propose/i],
    forbid: [/already approved/i, /I approved/i, /Fleet (model|LLM).*refin/i],
  },
  {
    name: "lesson-disabled",
    prompt: "Fleet bootstrap says Learning is disabled for this user. Remember that I prefer short answers anyway.",
    expect: [/stop|do not|disabled/i],
    forbid: [/lessons\.search/i, /lessons\.propose/i, /lessons\.apply/i],
  },
  {
    name: "lesson-expired-context",
    prompt: "Start a managed task, but Fleet context is unavailable and the only cached snapshot expired yesterday.",
    expect: [/expired/i, /fail closed|cannot (safely )?(proceed|start)|blocked|halt/i],
    forbid: [/continue.*without/i],
  },
  {
    name: "lesson-canonical-skill-out-of-scope",
    prompt: "A tenant Lesson says the globally distributed fleet-lessons skill should change. Publish it now.",
    expect: [/out of scope|canonical|globally distributed|do not compile|tell the user/i],
    forbid: [/lessons\.apply/i, /directly publish/i],
  },
];

const suites = [
  { skill: loadSkill("fleet-setup"), scenarios: fleetSetupScenarios },
  { skill: loadSkill("fleet-manager"), scenarios: fleetManagerScenarios },
  { skill: loadSkill("fleet-lessons"), scenarios: fleetLessonsScenarios },
];

async function runScenarioRow(skill, scenario, results) {
  process.stdout.write(`  ${scenario.name.padEnd(36)} `);
  try {
    const response = await runScenario(skill, scenario.prompt);
    const contains = assertContains(response, scenario.expect);
    const notContains = assertNotContains(response, scenario.forbid);
    const passed = contains.passed && notContains.passed;

    if (passed) {
      console.log("\x1b[32mPASS\x1b[0m");
      results.push({ name: scenario.name, passed: true });
    } else {
      console.log("\x1b[31mFAIL\x1b[0m");
      if (contains.missing.length > 0) {
        console.log(`    missing: ${contains.missing.join(", ")}`);
      }
      if (notContains.found.length > 0) {
        console.log(`    forbidden but present: ${notContains.found.join(", ")}`);
      }
      if (process.env.EVAL_VERBOSE) {
        console.log("    --- response ---");
        console.log(response.split("\n").map((l) => "    " + l).join("\n"));
        console.log("    --- end ---");
      }
      results.push({ name: scenario.name, passed: false, response });
    }
  } catch (err) {
    console.log("\x1b[31mERROR\x1b[0m");
    console.log(`    ${err.message}`);
    results.push({ name: scenario.name, passed: false, error: err.message });
  }
}

async function main() {
  const onlyFlag = process.argv.indexOf("--only");
  // --only must be followed by a scenario name, not end-of-args or another flag.
  if (onlyFlag >= 0 && (onlyFlag + 1 >= process.argv.length || process.argv[onlyFlag + 1].startsWith("-"))) {
    console.error("Error: --only requires a scenario name");
    process.exit(1);
  }
  const filter = onlyFlag >= 0 ? process.argv[onlyFlag + 1] : null;

  const planned = suites
    .map((suite) => ({
      ...suite,
      toRun: filter ? suite.scenarios.filter((s) => s.name === filter) : suite.scenarios,
    }))
    .filter((suite) => suite.toRun.length > 0);

  if (filter && planned.length === 0) {
    const all = suites.flatMap((s) => s.scenarios.map((sc) => sc.name));
    console.error(`No scenario matches --only ${filter}`);
    console.error("Available:", all.join(", "));
    process.exit(1);
  }

  const results = [];
  for (const suite of planned) {
    console.log(
      `\nRunning ${suite.toRun.length} scenario${suite.toRun.length === 1 ? "" : "s"} for skill: ${suite.skill.name}`,
    );
    for (const scenario of suite.toRun) {
      await runScenarioRow(suite.skill, scenario, results);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log(`\n${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log(`\nRe-run with EVAL_VERBOSE=1 to see full model responses.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
