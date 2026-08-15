---
name: fleet-setup
description: Use when the user wants to install, configure, or set up Fleet in a repository. Handles OS detection, prebuilt binary install, control-plane registration, human sign-in, fleet up, skills install, and starting a first agent. Triggers on "set up fleet", "install fleet", "add fleet to this repo".
license: Apache-2.0
metadata:
  author: Feral Intelligence <hello@fleetctl.ai>
  version: 1.0.0
  homepage: https://fleetctl.ai
---

# Fleet Setup

Walk the user from zero to a working Fleet in their repository. Fleet is a Go CLI that runs AI agents in tmux sessions. A watcher hosts saved workflows; it does not match fabric events to launch agents.

Be concrete. Run commands yourself where possible. Ask only when you cannot discover the answer. Stop cleanly on a missing prerequisite instead of improvising.

## What the user needs before starting

- **macOS or Linux.** Windows users need WSL2.
- **tmux** installed. Every agent runs in a tmux session.
- **gh CLI** installed and authenticated (`gh auth status`). The brain and source-control paths use it.
- **An active Fleet trial or subscription.** Hosted workflows, the watcher, brain, and agent starts require it. If they have no account yet, send them to https://app.fleetctl.ai to start a trial and stop here.

Check all four first. See `reference/troubleshooting.md` for installs.

## Step 1 — Install the binary

```sh
curl -fsSL https://fleetctl.ai/install | sh
```

The installer detects OS/arch, fetches `/releases/latest`, verifies SHA-256, and extracts `fleet` to `~/.local/bin/`.

**Verify:**

```sh
~/.local/bin/fleet version
```

Expected: a version string such as `1.16.4`, **not** `dev`.

If `~/.local/bin` is not on PATH, add it (detect `$SHELL`):

- zsh → `~/.zshrc`: `export PATH="$HOME/.local/bin:$PATH"`
- bash → `~/.bashrc` or `~/.bash_profile`
- fish → `fish_add_path $HOME/.local/bin`

Then `source` the rc file or open a new terminal and verify `fleet version` without the full path.

## Step 2 — Register this machine

Ask the user for a registration code from https://app.fleetctl.ai (Getting Started or Settings). Do not invent one. Codes expire about 15 minutes after minting.

```sh
fleet admin register --url https://app.fleetctl.ai --code <registration-code>
```

This binds the instance to the tenant and issues the machine's workload identity. `--url` defaults to production if omitted; pass it anyway so a self-hosted or local control plane cannot be guessed wrong.

**Verify:**

```sh
fleet admin status
```

Expected: an active license, control-plane URL, and last-sync timestamp.

## Step 3 — Sign in as the human

Registration is the machine. Hosted workflows, approvals, and Lessons need a human too:

```sh
fleet login
```

This uses Device Authorization. The user completes the browser prompt. Never paste an access token into a prompt, repo, or shell history.

**Verify:**

```sh
fleet auth status
```

A human identity and a workload identity should both be present. If they only need local agents for now, you may continue after saying hosted MCP and Lessons will stay unavailable until they sign in.

## Step 4 — Bring the repo up

Run from the git repository root (a `.git` directory must exist):

```sh
fleet up
```

`fleet up` is the normal onboarding path. It checks prerequisites, scaffolds `.fleet/config.yaml` when missing (same as `fleet init`), starts the watcher, and starts the brain. Pass `--yes` in non-interactive runs. Pass `--no-brain` only when the user asked to skip brain.

If the repo is mixed or they want a specific template instead of auto-detect:

```sh
fleet init --template <go-service|fullstack|data-pipeline|devops>
fleet up
```

`fleet init --list-templates` lists presets. Do not run `fleet init --force` unless they explicitly accept losing `.fleet/prompts/` customizations.

**Verify:**

```sh
fleet doctor
fleet status
```

Do not report setup complete while `fleet doctor` still fails a required check.

## Step 5 — Install Fleet skills

```sh
fleet skills install
```

This writes the binary-vendored playbooks (`fleet-dev-task`, `fleet-review-pr`, `fleet-ship-pr`, `fleet-create-ticket`, `fleet-hire`, `fleet-lessons`) to `~/.claude/skills/fleet/`. Re-run after every `fleet upgrade`.

## Step 6 — Start one agent (optional)

`fleet agent start <catalog-slug>` only works for an agent that already exists in this project's DB. After a template init, `fleet agent list` shows the scaffolded names. Otherwise create first:

```sh
fleet agent list
fleet template list
fleet template spawn <catalog-id> --name <name>
fleet agent start <name>
```

Pick **one** agent that matches the work. See `reference/agents.md`. To watch it: `tmux attach -t fleet-<name>` (Ctrl-B then D detaches).

Saved workflows, not a standing army of agents, are how delivery runs. Do not start every agent.

## Step 7 — Hand off

Fleet is installed, registered, initialized, and the watcher is running. Tell the user:

1. Hosted workflows live at https://app.fleetctl.ai. Labels may start a **saved workflow run**; fabric events do not launch agents.
2. Direct a one-off: `fleet task assign <agent> "<task>"`.
3. Status: `fleet status`. Doctor: `fleet doctor`.
4. After a correction they want remembered, use **fleet-lessons**.
5. CLI reference: https://fleetctl.ai/docs/cli-reference/

## What NOT to do

- **Don't suggest `go install`.** The curl installer is the supported path.
- **Don't skip registration.** Agent starts, watcher, and brain refuse to run without an entitlement.
- **Don't send the user to a retired dashboard hostname.** The control plane is https://app.fleetctl.ai.
- **Don't start the watcher a second time** after `fleet up` already started it. If they skipped `fleet up`, explain that `fleet watcher start` is a long-running daemon before you run it.
- **Don't run `fleet agent start --all`.**
- **Don't use the removed pipeline subcommand.** Saved workflows are the execution model.
- **Don't edit `.fleet/prompts/`** unless they asked. Show prompt edits before applying them.
- **Don't treat a GitHub label as an approval.** Merge through `fleet release check` / the release-manager path.
