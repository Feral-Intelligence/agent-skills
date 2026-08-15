# Picking the Right First Agent

Start **one** agent that matches the work in this repo. Do not stand up the whole catalog on day one.

`fleet agent start` only starts an agent that already exists in this project's database. After `fleet init --template …` / `fleet up`, `fleet agent list` shows scaffolded names. Otherwise spawn from the catalog first (`fleet template spawn <id> --name <name>`).

## Detection heuristic

### `go-service` → a backend/developer agent

Signals: `go.mod` at root, `cmd/` or `internal/`, no root `package.json`.

### `fullstack` → a frontend/developer agent

Signals: `package.json` with Next, React, Vite, Vue, or Svelte; `src/app/`, `src/pages/`, or `src/components/`.

If they are clearly working on the API, pick the backend agent instead.

### `data-pipeline` → a data-engineering agent

Signals: `pyproject.toml` or `requirements.txt`, dominant `*.py`, `airflow/`, `dags/`, `notebooks/`, or `etl/`.

### `devops` → an infra agent

Signals: `Dockerfile` without a clear app, `.github/workflows/` deploy jobs, `terraform/`, `pulumi/`, `k8s/`, `cdk/`.

## When heuristics disagree

1. Look at the last 10 commits (`git log --name-only --oneline -10`).
2. Match the area with the most recent activity.
3. If still mixed, ask: backend, frontend, data, or infra?

## Add later, not on day one

| Kind | When |
|---|---|
| tech-lead / reviewer | PRs need review |
| QA | Independent test runs on branches |
| release-manager | Merge only through `fleet release check` |
| docs / security | When that work appears |

Delivery itself should go through a **saved workflow** (dashboard or hosted MCP), not a pile of always-on agents. Labels may start a workflow run. Fabric events do not launch agents.

## Org agents

Repo agents are scoped to one repository. Org agents (CEO, CPO, CTO, PMs) need `~/.fleet/org.yaml` and are out of scope for first-time setup. Point org questions at https://fleetctl.ai/docs/configuration.

## After start

1. Session name is `fleet-<name>`. Attach with `tmux attach -t fleet-<name>`; Ctrl-B then D detaches.
2. One-off work: `fleet task assign <name> '…'`.
3. `fleet up` already started the watcher. Do not start it again unless `fleet watcher status` shows it down.
