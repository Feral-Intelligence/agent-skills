# Trust-but-Verify: Review in an AI-Authored Fleet

When AI agents write the code, **no single agent's "it works" can be trusted.** A developer will confidently report "all tests pass" after a subset, a weakened assertion, or a last edit that broke the build. Review has to independently verify the change, not just read the diff.

## Every PR is checked three ways before it can merge

1. The **developer** writes tests and runs them while implementing.
2. **QA** checks out the branch and runs the full suite again.
3. The **tech-lead** reads the diff for logic, security, and design that tests cannot catch.

The redundancy is the point.

## Why the reviewer runs the suite

A diff review answers "is this code reasonable?" It does not answer "does it build and pass?"

- The author may have run `go test ./internal/foo`, not `./...`.
- The author may have "fixed" a failing test by weakening it.
- The author's last edit may have landed after its last test run.

Pay the CPU cost of an independent run.

## Gate the merge on review evidence, not a label

`fleet release check` honors either GitHub `reviewDecision == APPROVED` or an `approved` label **plus** a `pr_approved` fabric event with no later `pr_changes_requested`. It also fails closed on unresolved review threads.

The reviewer skill always publishes the fabric event, even when GitHub rejects a self-review approval. Fabric is the source of truth Fleet agents share; GitHub is one of several signals.

Treat CI as an important signal. Do not treat a green check as a substitute for an independent reviewer run, and do not treat an `approved` label as a substitute for `pr_approved`.

## Split the roles so review isn't a rubber-stamp

| Role | Verifies |
|---|---|
| developer | writes and runs tests as it builds |
| QA | independently checks out and runs the full suite |
| tech-lead | reads the diff for logic, security, and design |

`pr_changes_requested` sends work back through the workflow's review/fix loop. A real revision round is the healthy signal.
