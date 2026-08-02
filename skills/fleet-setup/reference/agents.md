# Picking the Right First Agent

Fleet's catalog has 138+ agent templates. For the initial setup, you want to pick ONE that matches what the user is actually doing in this repo. Overwhelming them with 10 agents on day one is a bad experience.

## Detection heuristic

Inspect the repo and pick based on what you find:

### `go-service` template → start `backend-dev`

Signals:
- `go.mod` at root
- `cmd/` or `internal/` directories
- No `package.json` in root

Why: Go services are usually CLI tools, APIs, or daemons. `backend-dev` knows how to write Go, run `go test`, create PRs, and handle review feedback.

### `fullstack` template → start `frontend-dev`

Signals:
- `package.json` with `next`, `react`, `vite`, `vue`, or `svelte` in dependencies
- `src/app/`, `src/pages/`, or `src/components/`
- May also have a backend in `api/`, `server/`, or similar

Why: Fullstack repos usually have more frontend surface area than backend. `frontend-dev` knows React/Next.js patterns, runs `npm test`, and handles the UI layer. If the user is obviously working on the backend, pick `backend-dev` instead.

### `data-pipeline` template → start `data-engineer`

Signals:
- `pyproject.toml` or `requirements.txt`
- `*.py` files dominant
- `airflow/`, `dags/`, `notebooks/`, or `etl/` directories

Why: Data engineering repos usually need agents that understand pandas, pytest, and pipeline orchestration. `data-engineer` is tuned for this.

### `devops` template → start `infra-engineer`

Signals:
- `Dockerfile` + no clear backend/frontend signal
- `.github/workflows/` with deployment pipelines
- `terraform/`, `pulumi/`, `serverless.yml`, `k8s/`
- `cdk/` or `cloudformation/` directories

Why: DevOps repos need agents that can read Terraform, write GitHub Actions workflows, and debug CI. `infra-engineer` is tuned for this.

## When heuristics disagree

Some repos are genuinely mixed (e.g., a Go backend with a Next.js frontend and Terraform for deploys). When you can't decide from file signals alone:

1. Look at the most recently modified files in the last 10 commits (`git log --name-only --oneline -10`).
2. Pick the agent that matches the area with the most recent activity.
3. If still ambiguous, ASK the user: "Are you mostly working on backend, frontend, data, or infra in this repo?"

## Agents you can add later

Don't start these on day one unless the user asks. But mention them as options:

| Agent | When to add |
|---|---|
| `tech-lead` | Once there are PRs coming in that need review |
| `qa-lead` | Once there's test coverage to maintain |
| `release-manager` | Once the user wants automated merges on approved PRs |
| `devops` | For infra work alongside feature dev |
| `docs-writer` | For API/CLI/user docs |
| `security-reviewer` | For repos that handle secrets, auth, or PII |

## Org-level agents

Fleet distinguishes between **repo agents** (scoped to one repository) and **org agents** (span multiple repos — CEO, CPO, CTO, PMs). For first-time setup, always start with a repo agent. Org agents require `~/.fleet/org.yaml` configuration and are out of scope for basic onboarding.

If the user asks about org agents, point them at https://fleetctl.ai/docs/configuration and let them set it up manually.

## What to tell the user after starting

After `fleet agent start <name>`:

1. "The agent is now running in a tmux session named `fleet-<name>`."
2. "To watch what it's doing: `tmux attach -t fleet-<name>`. Press Ctrl-B then D to detach."
3. "To assign a specific task: `fleet task assign <name> 'your task description'`."
4. "Use `fleet task assign <name> 'your task description'` for a direct task, or run a saved workflow that selects this agent type. Start `fleet watcher start` only when you want it to host that workflow's declared triggers or schedules."

Don't start the watcher yourself. The user should do that deliberately.
