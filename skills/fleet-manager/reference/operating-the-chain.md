# Operating Saved Workflows

Fleet coordinates multi-step delivery through explicit, versioned workflows.
The watcher hosts those workflow workers and evaluates only label or cron
triggers declared by a saved workflow. Legacy agent `subscribes_to` fields do
not launch agents.

## A delivery workflow, end to end

```text
Issue or explicit input
  -> Refine step
  -> Develop step creates a branch and PR
  -> Review/fix loop
  -> Human or policy approval gate
  -> Merge step
  -> Announce step
```

The workflow definition selects stable agent types, supplies each step's exact
task instructions, declares routes and retry bounds, and embeds the definition
in the run. Existing runs do not change when the saved definition is edited.

## Dispatching well

The highest-leverage thing you do is write good workflow input. A good issue or
task has:

- A clear, single-sentence outcome.
- Acceptance criteria the implementer and reviewer can check.
- Pointers to relevant files or modules, if known.
- Constraints such as API compatibility or protected areas.

Inspect `fleet genflow list`, choose the workflow whose graph matches the work,
and run it with the issue or task as input. If that workflow declares a label
trigger, applying the configured label is an explicit way to start that saved
graph; the label does not choose an agent by subscription.

For a one-off directed task that does not need a workflow:

```sh
fleet task assign <agent> "<clear task>"
```

## Reviewing and shipping

- Inspect the run's current step, artifacts, review result, and gate documents.
- A real approval is a reviewer decision or human member review. An `approved`
  label alone is not an approval.
- Merge only through the workflow's merge gate after review, green checks, and
  required approval.

## When a run stalls

Walk the declared graph backward:

1. If a declared trigger did not fire, check `fleet watcher status`, then the
   saved workflow's trigger configuration.
2. Inspect the run and current step. Check the selected agent's logs when a step
   launched but did not complete.
3. Read `fleet log --since 1h` for the run, artifact, review, and gate events.
4. Surface real blockers such as red CI, a missing approval, merge conflict, or
   unavailable credential.

Fix the cause and resume through the workflow's supported route. Do not toggle
labels, fabricate events, or reassign in-flight work to fake progress.
