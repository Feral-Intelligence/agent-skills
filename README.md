# Feral Intelligence — Agent Skills

Drop-in skills that teach Claude Code (and any SKILL.md client) how to set up
and operate Fleet. Canonical copies are authored in
[Feral-Intelligence/fleet](https://github.com/Feral-Intelligence/fleet) and
served from [fleetctl.ai/.well-known/agent-skills](https://fleetctl.ai/.well-known/agent-skills/).
This repo is the `npx skills add` install source.

## Install

All skills:

```sh
npx skills add https://github.com/Feral-Intelligence/agent-skills
```

Just one:

```sh
npx skills add https://github.com/Feral-Intelligence/agent-skills --skill fleet-setup
```

Then:

> Set up Fleet in this repo

The assistant installs the binary, registers this machine, signs you in, runs
`fleet up`, and installs Fleet skills.

Once Fleet is running:

> Manage my fleet — have the team add a dark-mode toggle to the settings page

It scopes the work, starts the tenant's saved workflow (or `fleet task assign`
for a one-off), and stays with the run until a reviewed merge. It does not write
the application code itself.

Corrections you want remembered:

> Remember this as a Lesson

That path is `$fleet-lessons`.

## Available skills

| Skill | What it does |
|---|---|
| [`fleet-setup`](./skills/fleet-setup) | Install Fleet, register, sign in, `fleet up`, install skills |
| [`fleet-manager`](./skills/fleet-manager) | Operate the fleet through saved workflows instead of writing app code |
| [`fleet-lessons`](./skills/fleet-lessons) | Load governed policy before work; propose, approve, and apply Lessons |

## What is Fleet?

Fleet is a Go CLI for managing an AI agent fleet. Single binary, no Docker in
the runtime. Learn more at [fleetctl.ai](https://fleetctl.ai).

Fleet is a paid product after a trial. The binary is free to install and inspect.
Commands that start agents or daemons need an active entitlement. Start a trial
at [app.fleetctl.ai](https://app.fleetctl.ai).

## Testing

```sh
npm run test:contract              # stale-phrase and file-presence checks (no model)
npm test                           # Claude Code headless evals
npm run test:one -- happy-path     # one eval scenario
EVAL_VERBOSE=1 npm test            # show full responses on failure
```

Uses `claude -p` for evals. Run `npm run test:contract` before every push.

## License

Apache-2.0. See [LICENSE](./LICENSE).
