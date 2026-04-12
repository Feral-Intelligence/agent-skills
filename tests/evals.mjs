// Scenario-driven evaluation of skills/fleet-setup/SKILL.md.
//
// Run: npm test
// Run one scenario: npm run test:one happy-path
//
// Requires ANTHROPIC_API_KEY in the environment.

import {
  loadSkill,
  runScenario,
  assertContains,
  assertNotContains,
} from "./harness.mjs";

const skill = loadSkill("fleet-setup");

const scenarios = [
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

async function main() {
  const onlyFlag = process.argv.indexOf("--only");
  const filter = onlyFlag >= 0 ? process.argv[onlyFlag + 1] : null;

  const toRun = filter ? scenarios.filter((s) => s.name === filter) : scenarios;
  if (filter && toRun.length === 0) {
    console.error(`No scenario matches --only ${filter}`);
    console.error("Available:", scenarios.map((s) => s.name).join(", "));
    process.exit(1);
  }

  console.log(
    `Running ${toRun.length} scenario${toRun.length === 1 ? "" : "s"} for skill: ${skill.name}\n`,
  );

  const results = [];
  for (const scenario of toRun) {
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
