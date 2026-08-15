# Operating saved workflows

Fleet coordinates delivery with **saved workflows**, not a subscription engine and not the removed pipeline subcommand. The watcher hosts those workflows. Labels may start a run when a workflow's trigger says so. Fabric events record decisions; they do not launch agents.

## The default delivery shape

A typical software-delivery graph is:

```
ticket / label / manual start
  → refine (optional)
  → develop (code step; agent type via role:)
  → review / fix loop
  → approval gate
  → merge (release check)
  → announce
```

Inspect the tenant's actual saved definition before dispatching. Do not invent step names.

Canonical triggers are **manual**, **label**, **schedule**, **merge**, and **KPI**. A label trigger needs a label; a schedule needs cron; a KPI trigger needs a KPI id.

## Dispatching well

The highest-leverage work is a good ticket:

- One sentence outcome
- Acceptance criteria a developer and a reviewer can check
- Pointers to files or modules
- Constraints ("don't break the public API")

Then start the workflow that owns this class of work. If the saved trigger is the `ready` label, applying `ready` is dispatch — because the workflow says so, not because a generic chain always listens for it.

For a spike with no issue:

```sh
fleet task assign <agent> "<clear task>"
```

## Reviewing and shipping

- Developers follow `/fleet-dev-task`.
- Reviewers follow `/fleet-review-pr` and always publish `pr_approved` or `pr_changes_requested` on fabric, even when GitHub rejects a self-review approval.
- Release follows `/fleet-ship-pr` and `fleet release check`. An `approved` label alone is not enough.

## When work stalls

Walk backward from the symptom:

1. **Is the watcher running?** `fleet watcher status`. No watcher → no workflow worker. `fleet up` or `fleet watcher start` (tell the user first).
2. **Is there a saved run?** Hosted `workflows.runs.list` / dashboard. Distinguish pending, awaiting code, awaiting approval, failed, rejected.
3. **Did the agent start and exit?** `fleet agent logs <name>`. Missing skills: `fleet skills install --dry-run`. Broader: `fleet doctor`.
4. **Is the gate waiting on a human?** Read the approval document. Do not approve from a list summary.
5. **Is CI red, a thread unresolved, or `fleet release check` failing?** That is a blocker to surface, not to skip.

Fix the cause. Do not toggle `ready` / `needs-review` / `shipped` to fake progress.

## Roster vs workflow

Agents in `.fleet/config.yaml` are capacity. Workflows bind **agent types** (`role:` on a step), not a named instance. Control-kind steps (gate, publish, merge, notify, check) must not bind `role:`.
