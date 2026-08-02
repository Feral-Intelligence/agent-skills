---
name: fleet-lessons
description: Use governed Fleet Lessons from Codex or another agent harness. Use at the start of every substantive task when Fleet Lessons may be enabled, when a user corrects reusable behavior or asks the harness to remember how work should be done, and when asked to inspect, approve, promote, apply, audit, revert, retire, or erase a Lesson.
---

# Fleet lessons

Use the model already serving this task to recognize, compare, and refine learning. Fleet does not run a model. Fleet supplies OAuth identity, scoped context, strict proposals, human decisions, closed target adapters, lifecycle state, and provenance. Never send a transcript, hidden reasoning, or an access token to Fleet.

Use hosted `lessons.*` MCP tools when they are available. A direct client may use the canonical `/api/lessons/v1` REST sibling with the same strict snake-case objects. Read [the REST and MCP mapping](references/api.md) before making a direct REST call.

## Establish identity and capability

1. Use the verified principal supplied by hosted MCP. Never infer identity from the logged-in operating-system user and never add tenant, subject, actor, or role fields to a request.
2. For direct REST or CLI-backed use, require a named OAuth profile:
   - An interactive human uses `fleet auth login --profile <name> --client-id <id>` and Device Authorization.
   - A server or unattended harness uses `fleet auth workload configure --profile <name> --client-id <id>` and Client Credentials, then sets `FLEET_AUTH_PROFILE=<name>`.
   - Delegated OAuth must preserve both the human subject and workload actor. Do not use a human profile noninteractively or fall back to legacy Fleet credentials.
3. Honor the consuming harness's own Learning and `share_lesson_evidence` controls before sending anything. A harness may be stricter than Fleet. A local opt-out stops capture at the source; it does not weaken Fleet's independent tenant, user, or authorization gates.
4. Call `lessons.bootstrap`, then `lessons.capabilities` and `lessons.proposal_schema`. Treat the returned contract, limits, target list, controls, and denial reasons as authoritative.
5. If Learning is disabled, capture is disabled for the intended mode, the target is unavailable, or authority is denied, stop cleanly. Do not search, capture, propose, or apply around the toggle.

## Load policy before work

1. Start with bootstrap's exact `principal_scope_refs`: organization for every principal and user only when Fleet authenticated a human. Add task-local project, team, role, or agent-type layers only from Fleet-synchronized identity or a signed run binding; do not broaden or invent a user layer for a workload.
2. Call `lessons.context` before first inference with `contract_version: lessons/v1` and those scope references.
3. Fetch `lessons.receipt_jwks`, verify the Ed25519 context receipt locally, and pin the receipt, ETag, scope stack, component revisions, and digests to the run. A model's assertion is not receipt verification.
4. On an outage, use only an unexpired locally verified Fleet-signed snapshot when the advertised outage policy permits it. Otherwise fail closed and tell the user policy could not be loaded.
5. Follow the compiled effects as policy. If policy conflicts, report the conflict metadata instead of silently choosing a lower-priority rule.

## Find and propose learning

- Use `lessons.search` for a bounded authorized candidate set. Rank candidates, compare semantic overlap, and refine wording inside this harness. Fetch a selected record with `lessons.get` before relying on its complete lifecycle.
- Treat a correction as `explicit_correction`. Treat a recurring harness-observed pattern as `observed_pattern` only when capabilities permit automatic capture. Do not turn a one-off preference or guess into durable policy.
- Build a complete proposal against the live `lessons.proposal_schema`. Preserve the user's intent in the statement, trigger, recommended action, rationale, intended outcome, typed target effects or patch, bounded evidence, relationships, and producer metadata. Set `skill_version` to the Fleet plugin or binary version that shipped this skill; never invent it. Use a stable idempotency key for the logical observation.
- Include only traceable evidence the user is authorized to retain. Include an excerpt only when evidence excerpts are enabled, it is human-confirmed, and DLP has run; otherwise send digest and locator metadata only.
- Submit with `lessons.propose`. On a likely duplicate, inspect and relate or revise the existing Lesson instead of creating competing policy.

## Govern decisions and application

- Use the latest `revision` as `expected_revision` and a stable operation-specific idempotency key for every mutation. On conflict, fetch the Lesson again and reconcile; never overwrite a newer revision.
- Use `lessons.evidence.add` and `lessons.revise` to improve a proposal. Use `lessons.reject`, `lessons.supersede`, `lessons.retire`, and `lessons.personal_data.erase` only for the user's requested lifecycle outcome and explain their lasting audit effect.
- `lessons.approve` and `lessons.promote` require human confirmation. First inspect the exact proposal, destination scope, target preview, evidence, and current revision with the user. Start the decision to obtain its opaque challenge ID and confirmation URL. After that same human confirms in Fleet, retry the exact request with the challenge ID in `decision_token`. Never claim the browser confirmation happened and never substitute workload authority for it.
- Call `lessons.apply` only for an approved current revision and only when the user or authorized workflow requested application.

For direct `personal_policy`, `house_rule`, and `agent_prompt` targets, use the exact overlay revision and digest returned by context; use revision `0` and the all-zero digest only for an empty overlay. Application completes synchronously. Never rebase a stale proposal silently.

For governed `repository_prompt`, `skill`, and `product_proposal` targets, `lessons.apply` returns `applying` plus a deterministic `application_ref`. The authorized harness must perform only the reviewed artifact change with its normal repository tools, then report exactly one result:

- Call `lessons.application.adopt` with the matching reference and the exact `artifact_revision` and lowercase SHA-256 `artifact_digest` after independently verifying the changed artifact.
- Call `lessons.application.fail` with the matching reference and a bounded reason when the change cannot be completed or verified.

Never report adoption merely because a command succeeded.

## Apply governed repository targets

- `workflow`: Fleet applies this direct target transactionally. Bind the proposal to the exact numeric base revision and raw-definition digest; Fleet validates the full closed add/replace/remove patch and preserves immutable history for audit and reversal. Use `workflows.get_revision` only to inspect that immutable history; never mutate the workflow separately in the harness.
- `repository_prompt`: require `owner/repo@<40-character-lowercase-commit>:<safe-relative-path>` and its exact base digest. Change only the named prompt sections through the repository's reviewed PR path, then report the same `github-pr:` artifact form described for skills.
- `skill`: only tenant-owned skills are valid skill targets. Require the same immutable base ref and digest. Edit only the authorized skill sections through a reviewed PR. After merge, report `github-pr:owner/repo#<pull-request>@<40-character-lowercase-merge-commit>:<safe-relative-path>` plus the exact file digest; Fleet verifies the latest effective review state includes an independent approval of the merged head and that the file is live. Never replace the base with a branch or tag.
- `product_proposal`: a tenant harness may compile this target but must not file it. Only Fleet's configured publication workload may create the reviewed GitHub issue in an allowed Fleet product repository and report `github:owner/repo#issue` plus lowercase SHA-256 over the UTF-8 JSON serialization of `{ "body": ..., "state": "open"|"closed", "title": ... }` in that key order, normalizing a null body to an empty string. A human may authorize reversal and open the inverse handoff, but only that publication workload may close or otherwise change the issue and report the resulting artifact. Do not draft extra product scope beyond the approved Lesson.

If the requested learning would change Fleet's canonical or globally distributed skill, compile it only as `product_proposal`. A tenant Lesson cannot represent that change as a `skill` target and cannot open, merge, adopt, or publish the global change itself.

## Inspect drift and reverse

Use `lessons.divergence.mark` to ask Fleet to inspect an adopted target; do not infer divergence from unrelated changes in the same scope. Before `lessons.revert`, show the user the current artifact, stored provenance, reversal preview, and reason.

A direct-target reversal completes synchronously. A governed reversal returns a new `applying` inverse handoff. Perform the exact inverse change from Fleet's historical material, then call `lessons.application.adopt` or `lessons.application.fail` with the reversal application reference and exact resulting provenance.

Report the Lesson ID, lifecycle state, scope, target, revision, and any pending human or repository action. Separate what Fleet verified from semantic judgments made by this harness.
