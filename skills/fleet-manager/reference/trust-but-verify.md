# Trust-but-Verify: Review in an AI-Authored Fleet

When AI agents write the code, **no single agent's "it works" can be trusted.**
A developer agent will confidently report "all tests pass" when it ran a subset,
mocked the wrong thing, or broke the build with its last edit. So the review
stage has to *independently verify* the change — not just read the diff.

## Every PR is checked three ways before it can merge

1. The **developer** writes tests and runs them as it implements.
2. **QA** checks out the branch and runs the full suite again — independently.
3. The **tech-lead** reads the diff for logic, security, and design that tests
   can't catch.

The redundancy is the point. Tests catch regressions; the code read catches
"passes but wrong"; the independent QA run catches "the author said green but
it's red." In a fleet of AI authors, no one layer is enough.

## Why the reviewer runs the suite, not just reads it

A diff review answers "is this code reasonable?" It does **not** answer "does it
actually build and pass?" Those are different questions, and in an AI-authored
fleet the second one is the one that bites you:

- The author may have run `go test ./internal/foo`, not `./...`.
- The author may have "fixed" a failing test by weakening it.
- The author's last edit (after its last test run) may have broken the build.

The only way to know is to pull the branch and run it. The CPU cost of that run
is the cost of *not* shipping broken code to your main branch — pay it.

## Gate the merge on the reviewer's run, not CI

This is the configuration that makes verification real. If your merge gate keys
on CI passing, and CI is flaky, disabled, or slow, your reviewers' independent
run is decorative. Invert it:

- Set `ci_required: false` and gate the merge on a **reviewer's approval
  decision** (`pr_approved`) — published *after* the reviewer has run the suite.
- Treat GitHub Actions CI as **advisory**: a useful second signal, not the thing
  standing between a broken PR and `main`.

Now the enforced gate is "a reviewer agent checked it out, ran it, and approved"
— the strongest signal you have, and one that survives a CI outage.

## Split the roles so review isn't a rubber-stamp

If one agent both writes and reviews, the review is theater. Separate them:

| Role | Verifies |
|---|---|
| **developer** | writes + runs tests as it builds |
| **qa-engineer** | independently checks out and runs the full suite |
| **tech-lead** | reads the diff for logic / security / design |

A `pr_changes_requested` from any reviewer sends the PR back to the developer —
the reactive chain re-dispatches it automatically — and the cycle repeats until
clean. A real revision round is the *healthy* signal, not a delay to optimize
away.

## The operator's takeaway

Don't tune the review stage for speed or CPU. In an AI-authored fleet, the
reviewer running the test suite **is** your CI — it's what lets you trust an
autonomous merge to `main`. If it feels expensive, that's because verifying
AI-written code is expensive, and skipping it is more expensive.
