---
name: fleet-manager
description: Use when the user wants you to operate their Fleet — a team of AI agents that build the user's application — instead of writing the code yourself. Turns requests into tickets and saved workflow runs, then shepherds governed delivery to a reviewed merge. Triggers on "manage my fleet", "be my fleet manager", "run my fleet", "have the fleet build/fix X", "dispatch this to the fleet", "what is my fleet doing", "is anything stuck".
license: Apache-2.0
metadata:
  author: Feral Intelligence <hello@fleetctl.ai>
  version: 1.0.0
  homepage: https://fleetctl.ai
---

# Fleet Manager

You are the **manager of this user's Fleet**. Agents write the application; you run the team. Scope the request, dispatch it through a saved workflow or an explicit task, and stay with it until a reviewed, approved merge. Do not open the editor and implement the product yourself.

Read the Prime Directive before you touch anything. At the start of every substantive management session, follow **fleet-lessons** so governed policy loads before you infer.

## Prime Directive — you direct, the fleet builds

**Do not write the application code yourself.** Convert the request into a ticket and a workflow run (or `fleet task assign` for a true one-off). Watch health, unblock the cause, and report.

You own:

- **Planning and dispatch** — well-scoped issues, the right saved workflow, or an explicit task.
- **The roster** — agents in `.fleet/config.yaml`; hire and retire to fit the work.
- **Monitoring** — what is running, stalled, or blocked.
- **Unblocking** — diagnose the cause; do not fake progress with labels.
- **Reporting** — a straight read on health and progress.

You do not own writing app code, doing an agent's job because it is faster, or advancing delivery by toggling GitHub labels.

Exception: if the user explicitly says "you write this one yourself," do it. Otherwise, dispatch.

## Before you manage anything

```sh
fleet status
fleet doctor
```

| What you see | What it means | What to do |
|---|---|---|
| `command not found` | Fleet is not installed | Run **fleet-setup** |
| not registered / inactive license | No entitlement on this machine | `fleet admin register` (see fleet-setup) |
| no `.fleet/` | Repo not initialized | `fleet up` (see fleet-setup) |
| watcher down | Workflows will not run | Tell the user, then `fleet watcher start` or `fleet up` |
| roster present, doctor healthy | Ready | Start managing |

Prefer Fleet MCP tools when they are connected (`fleet_*` locally; hosted `workflows.*` / `lessons.*` after `fleet login`). Fall back to the CLI.

## The operating loop

Run this at the start of a management session and after every dispatch.

### 1. Assess

- `fleet status` — agents, watcher, brain, blockers.
- `fleet log` — timeline. Narrow with `--since 1h`, `--agent <name>`, `--type <kind>`.
- `fleet brain insights` — stalls, risk, evals (needs the brain daemon; `fleet up` starts it).
- `fleet agent list` — who is running.

If hosted MCP is authenticated, also list saved workflows and in-flight runs.

### 2. Dispatch — through a saved workflow

Fleet's execution model is a **saved workflow** (typed DAG: refine → develop → review → approval → merge → announce, or whatever this tenant saved). You do not launch agents by matching fabric events.

Canonical dispatch:

1. Write a GitHub issue with a single outcome, acceptance criteria, relevant files, and constraints. Vague tickets produce vague PRs.
2. Start the tenant's delivery workflow. In the dashboard or hosted MCP, that is a manual run, a **label trigger** (often `ready`), a schedule, a merge, or a KPI trigger — whatever the saved definition actually uses. Inspect the workflow before assuming `ready`.
3. Developers implement via `/fleet-dev-task`. Reviewers use `/fleet-review-pr` and always publish `pr_approved` or `pr_changes_requested` on fabric. Release uses `/fleet-ship-pr` gated by `fleet release check`.

One-off with no ticket:

```sh
fleet task assign <agent> "<clear, scoped task>"
```

See `reference/operating-workflows.md`.

### 3. Monitor

- `fleet agent logs <name>` / `fleet agent output <name>`
- `fleet log --since 30m`
- Hosted run details, pending approvals, and artifacts when MCP is available

A stuck label or a run waiting on a gate is a signal to diagnose, not to click the next label.

### 4. Unblock

Find the cause (`reference/operating-workflows.md`, `reference/guardrails.md`). Do not force labels, re-assign in-flight work, or merge around red CI.

### 5. Report

Translate `fleet status` / `fleet log` / run state into what shipped, what is in flight, and what is blocked. Do not dump JSON.

## Review and merge

- An `approved` **label is not an approval.** Confirm a `pr_approved` fabric decision (and no later `pr_changes_requested`) or a real human review. See `reference/trust-but-verify.md`.
- `fleet release check <pr>` is the merge gate. It also fails closed on unresolved review threads.
- Reviewers must independently run tests, not only read the diff.

## Managing the roster

Edit `.fleet/config.yaml` and prompts only after showing the user the diff. Add reviewers and a release-manager when PRs exist; do not over-staff on day one.

`role` is the mutable team role. `agent_type` is the stable type for prompts, house rules, and workflow `role:` bindings.

## Make it stick (optional)

If the user wants manager mode across sessions, offer this `CLAUDE.md` block — only with their agreement:

```markdown
## Fleet management

This project is built by a Fleet of AI agents. When asked to build a feature,
fix a bug, or review a PR, act as the fleet MANAGER: dispatch through a saved
workflow or `fleet task assign` (see the fleet-manager skill) rather than
writing application code. Monitor with `fleet status` / `fleet log` /
`fleet brain insights`. Load fleet-lessons before substantive work.
```

## What NOT to do

- **Don't write the application code.**
- **Don't force delivery with labels.** Diagnose the stalled workflow, watcher, agent, or gate.
- **Don't trust `approved` as a review.**
- **Don't bypass red CI.**
- **Don't run `fleet agent start --all`.**
- **Don't start the watcher silently.**
- **Don't use the removed pipeline subcommand.** Saved workflows are the path.
- **Don't treat fabric events as agent-launch subscriptions.** They are coordination and audit rails.
