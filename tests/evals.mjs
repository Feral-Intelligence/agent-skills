// Scenario-driven evaluation of the Fleet skills.
//
// Run: npm test
// Run one scenario: npm run test:one happy-path
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
    prompt: "Set up Fleet in this repo.",
    expect: [
      /curl -fsSL https:\/\/fleetctl\.ai\/install \| sh/i,
      /fleet admin register/i,
      /fleet init/i,
      /fleet agent start/i,
      /tmux/i,
      /gh (auth|CLI)/i,
    ],
    forbid: [
      /go install/i,
      // Don't start the watcher daemon automatically
      /^(\$ )?fleet watcher start/m,
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
      /fleetctl\.ai\/#contact|request (early )?access|closed beta/i,
    ],
    forbid: [
      // Should NOT proceed to running the installer before getting a code
      /^(\$ )?curl -fsSL https:\/\/fleetctl\.ai\/install \| sh/m,
    ],
  },
  {
    name: "expired-registration-code",
    prompt: "I ran `fleet admin register --url https://dashboard.fleetctl.ai --code abc123` and it said the code is expired. Now what?",
    expect: [
      /generate (a )?(fresh|new)|dashboard\.fleetctl\.ai/i,
      /15 ?min|expir/i,
    ],
    forbid: [],
  },
  {
    name: "not-in-git-repo",
    prompt: "I ran `fleet init` and it said 'not a git repository'. What's wrong?",
    expect: [/cd|repository|repo root/i],
    forbid: [],
  },
  {
    name: "go-service-repo",
    prompt: "Set up Fleet in this repo. It's a Go CLI — has go.mod at the root, cmd/fleet/, and internal/ directories.",
    expect: [/go-service/i, /backend-dev/i],
    forbid: [],
  },
  {
    name: "nextjs-repo",
    prompt: "Set up Fleet. It's a Next.js app — package.json has next, react, tailwindcss as dependencies.",
    expect: [/fullstack/i, /frontend-dev/i],
    forbid: [],
  },
  {
    name: "already-installed-and-registered",
    prompt: "I already ran the installer and `fleet admin status` shows my license is active. What's next?",
    expect: [/fleet init/i, /fleet agent start/i],
    forbid: [
      /curl -fsSL.*\/install.*\| ?sh/i,
      /fleet admin register --url/i,
    ],
  },
  {
    name: "avoid-go-install-suggestion",
    prompt: "Can I install Fleet via `go install github.com/feral-intelligence/fleet/cmd/fleet@latest` instead of curl | sh?",
    expect: [/curl -fsSL https:\/\/fleetctl\.ai\/install \| sh|prebuilt binary/i],
    forbid: [
      // Model must not endorse go install as equivalent
      /^(yes|sure)[,.]?\s.*go install/im,
    ],
  },
];

// fleet-manager: the operator posture. The throughline of every scenario is
// "direct the fleet, don't do the work yourself" plus the safety guardrails
// (self-healing chain, label != approval, don't bypass red CI).
const fleetManagerScenarios = [
  {
    name: "dispatch-not-code",
    prompt: "Manage my fleet. I need a dark-mode toggle added to the settings page.",
    expect: [
      // Should turn it into dispatched work, not start editing
      /label(ed)? .?ready.?|fleet task assign|create (a |an )?(github )?issue/i,
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
    expect: [/diagnose|cause|review|self-?healing|don'?t|\bno\b/i],
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

const suites = [
  { skill: loadSkill("fleet-setup"), scenarios: fleetSetupScenarios },
  { skill: loadSkill("fleet-manager"), scenarios: fleetManagerScenarios },
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
