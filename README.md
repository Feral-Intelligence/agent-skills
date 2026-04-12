# Feral Intelligence — Agent Skills

Drop-in skills that teach your AI coding assistant (Claude Code, Cursor, Copilot) how to set up and operate Fleet.

## Install

All skills:

```sh
npx skills add https://github.com/Feral-Intelligence/agent-skills
```

Just one:

```sh
npx skills add https://github.com/Feral-Intelligence/agent-skills --skill fleet-setup
```

Then, in your AI assistant:

> Set up Fleet in this repo

Your assistant will detect your OS, run the installer, walk you through `fleet admin register`, initialize the repo with `fleet init`, and suggest a first agent based on what it finds in the codebase.

## Available skills

| Skill | What it does |
|---|---|
| [`fleet-setup`](./skills/fleet-setup) | Install Fleet, register your license, initialize the repo, start your first agent |

## What is Fleet?

Fleet is a pure Go CLI for managing an AI agent fleet. Single binary, no Docker, no Node.js. Learn more at [fleetctl.ai](https://fleetctl.ai).

Fleet is a paid product in invite-only beta. The binary is free to install and inspect, but every command that starts agents, daemons, or pipelines refuses to run without an active license. Request access at [fleetctl.ai/#contact](https://fleetctl.ai/#contact).

## Testing

Skills are tested with a scripted eval harness: a set of synthetic user prompts gets sent to a Claude model with the skill pre-loaded as system context, and the response is checked against expected (and forbidden) patterns. Happy paths, edge cases, and anti-patterns (e.g., the skill must never suggest `go install` for Fleet) all get covered.

Run locally:

```sh
npm install
npm test
```

Local runs use `claude -p` (Claude Code headless mode) as the backend, so they reuse your existing Claude Code auth — no `ANTHROPIC_API_KEY` needed.

Run a single scenario:

```sh
npm run test:one -- happy-path
```

See full model responses on failure:

```sh
EVAL_VERBOSE=1 npm test
```

CI runs evals via the Anthropic API (`EVAL_BACKEND=api`) on every push that touches `skills/` or `tests/`. The workflow is at [`.github/workflows/evals.yml`](.github/workflows/evals.yml).

## License

Apache-2.0. See [LICENSE](./LICENSE).
