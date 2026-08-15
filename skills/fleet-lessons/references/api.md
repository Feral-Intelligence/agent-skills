# Lessons transport mapping

Use MCP when the hosted Fleet tools are present. REST is canonical for a
custom harness. Prefix every relative REST path below with
`/api/lessons/v1`. The workflow-history path is already absolute.

| Operation | MCP tool | REST method and path |
|---|---|---|
| Bootstrap | `lessons.bootstrap` | `GET /bootstrap` |
| Capabilities | `lessons.capabilities` | `GET /capabilities` |
| Proposal schema | `lessons.proposal_schema` | `GET /schemas/proposal` |
| Context | `lessons.context` | `POST /context` |
| Search | `lessons.search` | `POST /search` |
| Get | `lessons.get` | `GET /lessons/:lessonId` |
| Propose | `lessons.propose` | `POST /proposals` |
| Add evidence | `lessons.evidence.add` | `POST /lessons/:lessonId/evidence` |
| Revise | `lessons.revise` | `POST /lessons/:lessonId/revise` |
| Reject | `lessons.reject` | `POST /lessons/:lessonId/reject` |
| Approve | `lessons.approve` | `POST /lessons/:lessonId/approve` |
| Promote | `lessons.promote` | `POST /lessons/:lessonId/promote` |
| Apply | `lessons.apply` | `POST /lessons/:lessonId/apply` |
| Mark failed | `lessons.application.fail` | `POST /lessons/:lessonId/applications/fail` |
| Mark adopted | `lessons.application.adopt` | `POST /lessons/:lessonId/applications/adopt` |
| Mark divergence | `lessons.divergence.mark` | `POST /lessons/:lessonId/divergence` |
| Revert | `lessons.revert` | `POST /lessons/:lessonId/revert` |
| Supersede | `lessons.supersede` | `POST /lessons/:lessonId/supersede` |
| Retire | `lessons.retire` | `POST /lessons/:lessonId/retire` |
| Erase personal data | `lessons.personal_data.erase` | `POST /lessons/:lessonId/erase-personal-data` |
| Read workflow revision | `workflows.get_revision` | `GET /api/genflow/defs/:id/revisions/:revision` |

Send a direct REST bearer token through the caller's credential layer, never in
a prompt or retained transcript. Use `Content-Type: application/json`. Do not
send identity overrides. The verified OAuth token is the only tenant, subject,
actor, client, and transport identity source.

Use `contract_version: lessons/v1` in every request object. Proposal creation
carries its idempotency key inside the strict proposal. Every later mutation
carries the latest `expected_revision` and a stable operation-specific
`idempotency_key`. Unknown fields are errors.

An initial approval or promotion may return an opaque challenge ID and a
browser confirmation URL. The human inspects and confirms that challenge in
Fleet. Retry the identical operation with the challenge ID in `decision_token`;
the pending decision's claims are never returned to the harness.

REST context responses include `ETag`; use conditional context reads for an
already verified pin. MCP expresses the same condition as `if_none_match` and
returns `not_modified`. Treat non-2xx REST responses and MCP error content as
domain failures; do not retry authorization, disabled-feature, stale-revision,
or invalid-contract failures without changing their cause.
