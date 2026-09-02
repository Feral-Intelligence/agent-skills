---
name: fleet-setup
description: Use when the user wants to install, configure, or set up Fleet in a repository. Handles OS detection, prebuilt binary install, control-plane registration from a code already in the user message, human sign-in, fleet up, and skills install to Claude Code and Codex load paths. Triggers on "set up fleet", "install fleet", "add fleet to this repo".
license: Apache-2.0
metadata:
  author: Feral Intelligence <hello@fleetctl.ai>
  version: 1.1.0
  homepage: https://fleetctl.ai
---

# Fleet Setup

Walk this repository from zero to a working Fleet. Fleet is a Go CLI that runs AI agents in tmux sessions. A watcher hosts saved workflows; it does not match fabric events to launch agents.

You run the commands. The human's one paste is enough when it already includes a live `fleet admin register --url … --code …` line. Do not ask them to curl, paste an installer, or fetch a code.

Be concrete. Run commands yourself. Stop cleanly on a missing prerequisite instead of improvising.

## Hard rules

- **Use a code already in the user message** when this machine is not registered. Parse `fleet admin register --url <url> --code <code>` or a `--code <code>` flag from this conversation. Run that register command. Never invent a code. Never request a registration code from the human. Never send them to mint one. If the machine is not registered and no code is present, say this message has no registration code and **stop**. If `fleet admin status` already shows registered, skip register and do not demand a code.
- **Do not lead with curl.** The human is not asked to curl. If the binary is missing, you install it yourself with the official installer (under the hood). Do not present `curl … | sh` as the headline step or as something they should paste.
- **Do not stop the whole setup on `gh auth`.** GitHub auth is later, not a gate for registration. First value is: binary present, machine registered to the tenant, human login if needed, `fleet up` in this repo, skills installed where Claude Code and Codex load them.
- **Do not skip registration.** After a valid code in the prompt, `fleet admin status` must show registered. Registration is not optional.
- **Do not only write project `.agents`.** `npx skills add` often lands only in `.agents/skills/`, which Claude Code does not load. Write or copy skills to the real load paths in `reference/skill-paths.md`.
- **Don't suggest `go install`.** The official prebuilt binary is the supported path.
- **Don't send the user to a retired dashboard hostname.** The control plane is https://app.fleetctl.ai.

## First value — do these in order

Work in the current git repository (a `.git` directory, or `git rev-parse --show-toplevel`). If this directory is not a git repo, say so and stop — `fleet up` will not run.

### 0. Registration code vs already registered

Do **not** start by asking for a code.

- If `fleet` is already on PATH (or at `~/.local/bin/fleet`) and `fleet admin status` shows registered, skip register. Do not demand a code.
- Else extract `--url` (default `https://app.fleetctl.ai` if the paste omitted it) and `--code` from the **user message**. If a code is missing, say this message has no registration code and **stop**. Do not install-and-hope. Do not invent a code.

### 1. Binary present

Skip this entire step if you stopped in step 0. If `fleet version` already works (or `~/.local/bin/fleet version` does), skip install. Otherwise **you** install the official prebuilt binary yourself from https://fleetctl.ai/install (run that installer script; do not ask the human to paste curl, and do not print curl as their next step).

Verify:

```sh
~/.local/bin/fleet version
```

Expected: a release version such as `2.9.1`, **not** `dev`. If `~/.local/bin` is not on PATH, export it for the rest of this session (`export PATH="$HOME/.local/bin:$PATH"`) and, if you can write their rc file, add the same line (zsh → `~/.zshrc`; bash → `~/.bashrc` or `~/.bash_profile`; fish → `fish_add_path $HOME/.local/bin`).

See `reference/troubleshooting.md` if the installer fails.

### 2. Register this machine (required)

Run the paste's register line with the **exact** code from the user message. Example shape (substitute the extracted values, never a placeholder):

```sh
fleet admin register --url https://app.fleetctl.ai --code <code-from-this-message>
```

This binds the instance to the tenant and issues the machine's workload identity. Pass `--url` so a self-hosted or local control plane cannot be guessed wrong.

**Verify — do not continue as "done" until this is registered:**

```sh
fleet admin status
```

Expected: registered, an active license, control-plane URL, and last-sync timestamp. If it still says `Not registered`, stop and report the command output. Do not invent another code.

Codes are single-use and expire about 15 minutes after minting. If the extracted code is expired or invalid, say that and stop. Do not ask them to go mint one.

### 3. Human login if needed

Registration is the machine. Hosted workflows, approvals, and Lessons need a human too.

```sh
fleet auth status
```

If a human identity is already present, skip login. Otherwise:

```sh
fleet login
```

This uses Device Authorization. The user completes the browser prompt. Never paste an access token into a prompt, repo, or shell history.

If they cannot complete the browser now, continue after saying hosted MCP and Lessons will stay unavailable until they sign in. Do not block registration, `fleet up`, or skills install on this.

### 4. `fleet up` in this repo

tmux is required for agent sessions. If `tmux` is missing, install it yourself when you can (`brew install tmux`, `sudo apt install tmux`, …) and continue. If you cannot install it, say so and stop — `fleet up` will fail.

GitHub CLI is **not** a gate here. If `gh` is missing or `gh auth status` fails, note it for later and continue.

From the git repository root:

```sh
fleet up --yes
```

`fleet up` is the normal onboarding path. It checks prerequisites, scaffolds `.fleet/config.yaml` when missing (same as `fleet init`), starts the watcher, and starts the brain. Pass `--no-brain` only when the user asked to skip brain.

If the repo is mixed or they want a specific template instead of auto-detect:

```sh
fleet init --template <go-service|fullstack|data-pipeline|devops>
fleet up --yes
```

Heuristics: `go.mod` + `cmd/` / `internal/` → **go-service** (backend/developer agent). Next/React/Vite/Vue/Svelte → **fullstack** (frontend). Python data/ETL → **data-pipeline**. Docker/terraform/k8s without a clear app → **devops**.

`fleet init --list-templates` lists presets. Do not run `fleet init --force` unless they explicitly accept losing `.fleet/prompts/` customizations.

**Verify:**

```sh
fleet doctor
fleet status
```

Do not report setup complete while `fleet doctor` still fails a **required** check. A missing `gh` auth is not required for this first value — record it, do not treat it as a hard stop.

### 5. Skills where Claude Code and Codex actually load them

`npx skills add` writing `.agents/skills/fleet-setup` is **not** enough. Claude Code loads `.claude/skills/` and `~/.claude/skills/` only. Codex global is `~/.codex/skills/` (still loaded as `$CODEX_HOME/skills`); repo Codex also scans `.agents/skills`.

Install the binary-vendored playbooks with the existing installer — twice if needed, not a second installer:

```sh
fleet skills install
fleet skills install --target ~/.codex/skills/fleet
```

Default target is `~/.claude/skills/fleet`. `--target ~/.codex/skills/fleet` is the same command for Codex. Re-run after every `fleet upgrade`.

Then copy **this** skill (the `fleet-setup` directory that contains this `SKILL.md`, including `reference/`) onto the Claude Code and Codex load paths so the next session finds it even if npx only wrote `.agents`. Resolve `SRC` as the directory of this file (or `.agents/skills/fleet-setup` / `~/.agents/skills/fleet-setup` if that is where it lives):

```sh
mkdir -p ~/.claude/skills .claude/skills ~/.codex/skills
cp -R "$SRC" ~/.claude/skills/fleet-setup
cp -R "$SRC" .claude/skills/fleet-setup
cp -R "$SRC" ~/.codex/skills/fleet-setup
```

Do **not** finish after writing only project `.agents`. Confirm the copies exist:

```sh
test -f ~/.claude/skills/fleet/fleet-dev-task/SKILL.md
test -f ~/.codex/skills/fleet/fleet-dev-task/SKILL.md
test -f ~/.claude/skills/fleet-setup/SKILL.md
test -f ~/.codex/skills/fleet-setup/SKILL.md
```

Vendored playbooks: `fleet-dev-task`, `fleet-review-pr`, `fleet-ship-pr`, `fleet-create-ticket`, `fleet-hire`, `fleet-lessons`. Full path table: `reference/skill-paths.md`.

## Later — not a gate for registration

`gh` is used by the brain and coding workflows that open PRs. After first value is done, if `gh` is missing or unauthenticated, install it if you can and tell them `gh auth login` is next — then stop that later path. Do not rewind setup to wait on GitHub.

Starting a first agent is optional. `fleet agent start <catalog-slug>` only works for an agent that already exists in this project's DB. After a template init, `fleet agent list` shows the scaffolded names. Otherwise create first:

```sh
fleet agent list
fleet template list
fleet template spawn <catalog-id> --name <name>
fleet agent start <name>
```

Pick **one** agent that matches the work. See `reference/agents.md`. To watch it: `tmux attach -t fleet-<name>` (Ctrl-B then D detaches). Saved workflows, not a standing army of agents, are how delivery runs. Do not start every agent. Do not run `fleet agent start --all`.

## Hand off

Fleet is installed, **registered**, initialized, and the watcher is running. Tell the user:

1. `fleet admin status` is registered for this machine.
2. Hosted workflows live at https://app.fleetctl.ai. Labels may start a **saved workflow run**; fabric events do not launch agents.
3. Direct a one-off: `fleet task assign <agent> "<task>"`.
4. Status: `fleet status`. Doctor: `fleet doctor`.
5. After a correction they want remembered, use **fleet-lessons**.
6. CLI reference: https://fleetctl.ai/docs/cli-reference/

## What NOT to do

- **Don't suggest `go install`.**
- **Don't skip registration** or treat it as optional.
- **Don't request a registration code** or send the human to mint one. The paste either has it or you stop.
- **Don't lead with curl** or ask the human to paste the installer.
- **Don't hard-stop on `gh auth`** before register / login / `fleet up` / skills.
- **Don't only write `.agents`.** Claude Code will not see it.
- **Don't start the watcher a second time** after `fleet up` already started it. If they skipped `fleet up`, explain that `fleet watcher start` is a long-running daemon before you run it.
- **Don't run `fleet agent start --all`.**
- **Don't use the removed pipeline subcommand.** Saved workflows are the execution model.
- **Don't edit `.fleet/prompts/`** unless they asked. Show prompt edits before applying them.
- **Don't treat a GitHub label as an approval.** Merge through `fleet release check` / the release-manager path.
