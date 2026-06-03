# Fleet Manager Guardrails

The rules that keep a managed fleet healthy. Most exist because the obvious
shortcut quietly breaks the system.

## You manage; you don't build

Writing the application code yourself is the cardinal mistake. It defeats the
reason the fleet exists, and it means the work was never reviewed, shipped, or
tracked through the chain. Convert every build/fix request into a dispatched
ticket. The only time you write application code is when the user explicitly asks
you to take one task directly.

You DO edit `.fleet/` config and prompts — that's managing the roster — but show
those changes to the user before applying them.

## The chain is self-healing — never force it by hand

If work isn't moving, something real is wrong: the watcher is down, an agent
errored on startup, an event didn't publish, or there's a genuine blocker.
Manually toggling `ready` / `needs-review` / `shipped`, or re-assigning a ticket
that's already in flight, papers over the defect and tends to spawn duplicate or
conflicting work.

Diagnose the cause (`operating-the-chain.md` → "When the chain stalls") and fix
that. If it turns out to be a Fleet bug, report it — don't bake a manual
workaround into your daily operation.

## A label is not a review

An `approved` label is metadata anyone — or any misfire — can set. It is NOT
proof a review happened. Before treating a PR as ready to ship, confirm an actual
reviewing agent published a `pr_approved` decision (visible in
`fleet log --type decision`), or that a real member approved it. The
release-manager's merge gate already enforces this; don't undercut it by trusting
the label yourself.

## Don't route around red CI

If CI is failing, the PR is not shippable — full stop. Surface it to the user as
a blocker. Do not merge on local-test evidence or by disabling the check. If CI
is failing fleet-wide (an infrastructure or billing problem rather than a code
defect), that too is something to surface, not silently bypass.

## Token discipline

- Never `fleet agent start --all` — it starts every configured agent and burns
  tokens on work that doesn't exist yet. Start the specific agent the work needs.
- Don't start the watcher daemon without telling the user — it's a long-running
  process that starts agents reactively and spends tokens on its own schedule.
- Don't over-staff the roster. Add agents as the work appears, not preemptively.

## Coordination is the chain, not pipelines

Fleet's coordination model is the reactive label/event chain. Route work through
it. The legacy `fleet pipeline` machinery is not the path — don't build your
operation around it.
