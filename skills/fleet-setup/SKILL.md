---
name: fleet-setup
description: Use when the user wants to install, configure, or set up Fleet (a Go CLI for managing AI agent fleets) in a repository. Handles OS detection, prebuilt binary install, license registration, fleet init, and starting the first agent. Triggers on "set up fleet", "install fleet", "add fleet to this repo".
license: Apache-2.0
metadata:
  author: Feral Intelligence <hello@fleetctl.ai>
  version: 0.1.0
  homepage: https://fleetctl.ai
---

# Fleet Setup

You are walking a user through installing and configuring **Fleet** in their repository. Fleet is a Go CLI that manages long-running AI agents running in tmux sessions, orchestrated by a watcher daemon that reacts to GitHub labels.

Your job: get them from zero to a working agent in under 5 minutes. Be concrete, run commands yourself where possible, and ask only when you genuinely need information you can't discover.

## What the user needs before starting

- **macOS or Linux.** Windows users need WSL2.
- **tmux** installed. Fleet runs every agent in a tmux session.
- **gh CLI** installed and authenticated (`gh auth status`). Fleet uses it to poll GitHub for label changes and PR reviews.
- **A registration code** from their Fleet admin dashboard. Fleet is a paid product in closed beta — without a valid license, `fleet agent start`, `fleet brain start`, `fleet watcher start`, and `fleet pipeline run` all refuse to run. If they don't have a code yet, send them to https://fleetctl.ai/#contact and stop here.

Check all four prerequisites at the start. If any are missing, stop and help the user install them before proceeding. See `reference/troubleshooting.md` for specific fixes.

## Step 1 — Install the binary

Run the installer. It detects OS/arch, fetches the latest version from `/releases/latest`, downloads the matching tarball, verifies its SHA-256, and extracts `fleet` to `~/.local/bin/`:

```sh
curl -fsSL https://fleetctl.ai/install | sh
```

**Verify:**

```sh
~/.local/bin/fleet version
```

Expected output: a version string like `1.15.0.0`, NOT `dev`. If it says `dev`, the install is broken.

**PATH:** If `~/.local/bin` is not in the user's PATH, add it. Detect their shell (`echo $SHELL`) and append the right line to the right rc file:

- `zsh` → `~/.zshrc`: `export PATH="$HOME/.local/bin:$PATH"`
- `bash` → `~/.bashrc` or `~/.bash_profile`
- `fish` → `~/.config/fish/config.fish`: `fish_add_path $HOME/.local/bin`

After appending, tell the user to run `source <rc-file>` or open a new terminal. Then verify `fleet version` works without the full path.

## Step 2 — Register the license

Ask the user for their registration code. Do NOT invent one, do NOT proceed without it.

```sh
fleet admin register --url https://dashboard.fleetctl.ai --code <registration-code>
```

Registration codes expire 15 minutes after generation. If the command returns an "expired" or "invalid code" error, tell the user to generate a fresh code at https://dashboard.fleetctl.ai and retry.

**Verify:**

```sh
fleet admin status
```

Expected: license status `active`, a control plane URL, and a last-sync timestamp.

## Step 3 — Initialize the repo

Make sure you're in the repo root (not a subdirectory). Check that a `.git` directory exists.

Pick the right template by inspecting the repo:

| Repo signal | Template |
|---|---|
| `go.mod` present, no frontend | `go-service` |
| `package.json` with `next`, `react`, or `vite` | `fullstack` |
| `pyproject.toml`, `requirements.txt`, or `*.py` dominant | `data-pipeline` |
| `Dockerfile`, `.github/workflows/`, `terraform/`, or `serverless.yml` and nothing else | `devops` |
| Mixed or ambiguous | Run bare `fleet init` and let Fleet auto-detect |

Run the init:

```sh
fleet init --template <detected-template>
```

Or bare:

```sh
fleet init
```

This creates `.fleet/config.yaml`, scaffolds prompt files in `.fleet/prompts/`, and configures GitHub labels used by the watcher daemon (`ready`, `needs-review`, `changes-requested`, `shipped`).

**Verify:**

```sh
cat .fleet/config.yaml
fleet agent list
```

You should see a list of recommended agents. These come from the template.

## Step 4 — Start the first agent

Pick one agent from `fleet agent list` that matches what the user actually wants to do. Good defaults by repo type:

- **Go service** → `backend-dev`
- **Fullstack** → `frontend-dev`
- **Data pipeline** → `data-engineer`
- **DevOps** → `infra-engineer`

Start it:

```sh
fleet agent start <name>
```

**Verify:**

```sh
fleet agent list
```

The agent you started should show `running`. To watch what it's doing:

```sh
tmux attach -t fleet-<agent-name>
```

Tell the user: Ctrl-B then D to detach without stopping the agent.

## Step 5 — Hand off

At this point Fleet is installed, licensed, initialized, and running at least one agent. The user should:

1. Label a GitHub issue `ready` to trigger the agent reactively (if they started `backend-dev`, `frontend-dev`, or similar). The watcher needs to be running: `fleet watcher start`.
2. Or assign a task directly: `fleet task assign <agent> "<task description>"`.
3. Open the fleet status dashboard: `fleet status`.
4. Read the full CLI reference: https://fleetctl.ai/docs/cli-reference

**Critical: do NOT start the watcher daemon automatically.** The watcher polls GitHub every 2 minutes and will start agents reactively. Make sure the user understands that before running `fleet watcher start` in the background.

## If something goes wrong

Read `reference/troubleshooting.md` for the full list. Most common failures:

- **`fleet: license unregistered`** — the user skipped Step 2 or their registration code expired. Re-run `fleet admin register`.
- **`fleet: license expired/revoked`** — the user's license is inactive. Send them to their dashboard.
- **`tmux: command not found`** — install via `brew install tmux` (macOS) or `apt install tmux` (Debian/Ubuntu).
- **`gh auth status` fails** — run `gh auth login` and retry.
- **`fleet init` says "not a git repository"** — the user ran it outside a repo. `cd` to the repo root.

## What NOT to do

- **Don't suggest `go install`.** The curl|sh installer is the supported path. It downloads a prebuilt binary with the version string baked in.
- **Don't skip the license step.** Every command that starts agents or daemons will fail without it.
- **Don't start the watcher daemon on the user's behalf** without explaining what it does. It's a long-running background process that polls GitHub and starts agents reactively.
- **Don't edit `.fleet/prompts/*.md` for the user** unless they specifically ask. Those files define agent behavior and should be reviewed before running.
- **Don't run `fleet agent start --all`.** That starts every agent in the config, burning tokens on agents the user may not need.
