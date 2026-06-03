# Operating the Reactive Chain

Fleet coordinates work through a **reactive event chain** — not a central
scheduler, and not pipelines. Understanding the chain is the core of managing a
fleet well.

## The chain, end to end

```
Issue labeled `ready`
  → watcher publishes ticket_ready
  → subscribed developer agent starts
  → agent branches, implements, tests, opens a PR, labels it `needs-review`
  → watcher publishes pr_needs_review
  → tech-lead + qa-lead start, review, publish pr_approved (or pr_changes_requested)
  → release-manager starts, merges the PR, labels it `shipped`
  → watcher publishes ticket_shipped
  → managers/leads see it in their next run
```

Each arrow is an event on the shared fabric bus. Agents subscribe to events;
when a matching event fires, the watcher starts that agent. Nothing is polled by
you — you create the first signal (`ready`) and the chain propagates.

## Dispatching well

The single highest-leverage thing you do is **write good tickets**. The agent
only knows what the issue says.

A good dispatch issue has:

- A clear, single-sentence outcome ("Add rate limiting to `POST /api/login`").
- Acceptance criteria the agent — and the reviewer — can check against.
- Pointers to the relevant files or modules, if you know them.
- Constraints ("don't touch the public API", "must stay backward compatible").

Then label it `ready`. The `.fleet/config.yaml` subscriptions decide which agent
picks up which label/event, so match the work to a label an agent is subscribed
to.

For work that doesn't warrant an issue (a quick spike, a one-off):

```sh
fleet task assign <agent> "<clear task>"
```

## Reviewing & shipping

The chain self-reviews: reviewer agents pick up `needs-review` PRs and publish a
decision. Your job is oversight, not re-doing the review:

- Watch `fleet log --type decision` for `pr_approved` / `pr_changes_requested`.
- A real approval is a reviewer agent's decision (or a human member review). An
  `approved` *label* alone is **not** an approval — see `guardrails.md`.
- release-manager merges approved, mergeable PRs and labels them `shipped`. It
  gates on the release check — it will not merge on a label alone.

## When the chain stalls

A stall looks like: a label sitting unchanged, a PR with no review, an issue
labeled `ready` that never started an agent. Walk the chain backward:

1. **Is the watcher running?** `fleet watcher status`. No watcher → no events
   fire. `fleet watcher start`.
2. **Did the agent start and exit?** `fleet agent logs <name>`. An agent that
   exits immediately is usually missing its skills or a prerequisite — check
   `fleet skills install --dry-run` and `fleet doctor`.
3. **Did the event publish?** `fleet log --since 1h` — look for the expected
   event (`ticket_ready`, `pr_needs_review`). A missing event means the label
   watcher didn't see the label, or it isn't a label the watcher watches.
4. **Is the agent waiting on a real blocker?** Failing CI, a missing approval, a
   merge conflict. That's a blocker to surface — not to force past.

Fix the cause and the chain resumes on its own: it's level-triggered and
self-healing. Don't toggle labels to fake progress.
