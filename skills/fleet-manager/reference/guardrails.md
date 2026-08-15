# Fleet Manager Guardrails

Rules that keep a managed fleet healthy. Most exist because the obvious shortcut quietly breaks the system.

## You manage; you don't build

Writing the application code yourself is the cardinal mistake. Convert build/fix requests into a ticket plus a saved workflow run, or `fleet task assign` for a true one-off. The only time you write application code is when the user explicitly asks you to take one task.

You may edit `.fleet/` config and prompts — that is roster management — but show those diffs before applying them.

## Never force delivery by hand

If work isn't moving, something real is wrong: the watcher is down, a workflow run is waiting on a gate, an agent crashed, CI is red, or review threads are unresolved. Manually toggling `ready` / `needs-review` / `shipped`, or re-assigning in-flight work, papers over the defect and tends to duplicate it.

Diagnose (`operating-workflows.md`) and fix that. If it is a Fleet bug, report it.

## A label is not a review

An `approved` label is metadata anyone can set. Before treating a PR as shippable, confirm a `pr_approved` fabric decision with no later `pr_changes_requested`, or a real human review. `fleet release check` already enforces this; do not undercut it.

## Don't route around red CI or unresolved threads

Failing CI is a blocker. Unresolved review threads block `fleet release check` even when GitHub says APPROVED. Surface both. Do not merge on local-test evidence.

## Token discipline

- Never `fleet agent start --all`.
- Don't start the watcher without telling the user.
- Don't over-staff the roster. Add reviewers when PRs exist, not preemptively.

## Coordination is saved workflows, not pipelines and not subscriptions

Route work through the tenant's saved workflows. The old staged-pipeline CLI is gone. Fabric events are audit and coordination rails; they do not launch agents.

## Lessons stay governed

Load **fleet-lessons** before substantive work. Do not turn a one-off preference into durable policy without search, a complete proposal, and human approval.
