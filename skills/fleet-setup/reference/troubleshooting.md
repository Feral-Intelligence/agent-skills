# Troubleshooting Fleet Setup

Common failures during `fleet-setup` and how to fix them.

## Install script failures

### `curl: command not found`

macOS ships with curl. If it's missing, something is very wrong with the user's shell environment. On Linux, install via `apt install curl` or `dnf install curl`.

### `install: line N: sha256sum: command not found` (macOS)

macOS uses `shasum -a 256`, not `sha256sum`. The installer at `/install` already handles this with a fallback chain. If it's failing, check the installer script at https://fleetctl.ai/install for regressions.

### Install succeeds but `fleet version` says `dev`

The binary was built without the ldflags version injection. This should not happen with a prebuilt release. Tell the user to re-run the installer — it may have downloaded from a cached stale location:

```sh
curl -fsSL https://fleetctl.ai/install | sh
~/.local/bin/fleet version
```

### `~/.local/bin/fleet: cannot execute binary file`

Wrong architecture. The installer auto-detects OS/arch, but if the user is on an unusual setup (e.g., running x86 Docker on Apple Silicon), they may have downloaded the wrong tarball. Check with:

```sh
file ~/.local/bin/fleet
uname -m
```

## License / registration failures

### `fleet: not registered — run: fleet admin register`

The user skipped registration, or the instance credentials at `~/.fleet/controlplane.json` got wiped. Re-run:

```sh
fleet admin register --url https://dashboard.fleetctl.ai --code <fresh-code>
```

### `fleet: license expired — renew at your Fleet admin dashboard`

The user's license has expired. Send them to https://dashboard.fleetctl.ai to renew. There is no way to bypass this.

### `fleet: license revoked`

Same as expired — the user needs to contact Feral Intelligence. Do not attempt any workarounds.

### `expired code` or `invalid registration code`

Registration codes are single-use and expire 15 minutes after generation. Tell the user to:

1. Open https://dashboard.fleetctl.ai
2. Generate a fresh registration code
3. Run `fleet admin register --url https://dashboard.fleetctl.ai --code <new-code>` immediately

## Prerequisite failures

### `tmux: command not found`

Fleet agents run in tmux sessions. Install tmux:

| OS | Command |
|---|---|
| macOS (Homebrew) | `brew install tmux` |
| Debian/Ubuntu | `sudo apt install tmux` |
| Fedora/RHEL | `sudo dnf install tmux` |
| Arch | `sudo pacman -S tmux` |

### `gh: command not found`

Fleet uses the GitHub CLI for repo polling, label management, and PR review. Install:

| OS | Command |
|---|---|
| macOS (Homebrew) | `brew install gh` |
| Debian/Ubuntu | `sudo apt install gh` |
| Fedora/RHEL | `sudo dnf install gh` |
| Arch | `sudo pacman -S github-cli` |

After install:

```sh
gh auth login
gh auth status
```

### `gh auth status` says "not logged in"

Run `gh auth login` and follow the prompts. Fleet needs this for the watcher daemon to poll labels and the brain daemon to read PR reviews.

## `fleet init` failures

### `.fleet/config.yaml already exists. Use --force to overwrite`

The repo was already initialized. Either accept the existing config (just run `fleet agent list`) or explicitly overwrite:

```sh
fleet init --force
```

Warn the user that `--force` will wipe their `.fleet/prompts/` directory and regenerate from the template. Any customizations they made will be lost unless committed to git.

### `fleet: not a git repository`

The user is running `fleet init` outside a git repo. `cd` to the actual repo root and retry. Fleet is designed for per-repo installation — it writes `.fleet/config.yaml` alongside `.git/`.

### Unknown template name

Run `fleet init --list-templates` to see available templates. As of 2026, the supported templates are:

- `go-service` — Go backend service with Docker and CI
- `fullstack` — Frontend + Node backend + Docker + CI
- `data-pipeline` — Python data engineering with Docker
- `devops` — Infrastructure with Docker, CI, and serverless

## Agent start failures

### `fleet: tmux session already exists`

An agent with that name is already running. List them:

```sh
tmux ls
fleet agent list
```

Stop it first if needed:

```sh
fleet agent stop <name>
```

### Agent starts but immediately exits

Attach to the tmux session to see the actual error:

```sh
tmux attach -t fleet-<agent-name>
```

Common causes:
- Claude Code CLI not installed or not on PATH
- API key not set in environment
- Prompt file syntax error in `.fleet/prompts/<agent>.md`

### `fleet: license check failed: network error`

Fleet verifies the license with the control plane at startup. If the user is offline or the control plane is unreachable, Fleet caches the license for 24 hours. If they've been offline longer than that, they need to reconnect and re-verify.

## PATH issues

### `fleet: command not found` after install

`~/.local/bin` is not in PATH. Fix by appending to the appropriate shell rc file:

```sh
# zsh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# fish
fish_add_path $HOME/.local/bin
```

Verify:

```sh
which fleet
fleet version
```

## Nothing in this list matches

Run `fleet doctor`. It checks prerequisites, sockets, paths, and common misconfigurations. Paste the output and work from there.

If `fleet doctor` passes but the issue persists, the user should open an issue at https://github.com/Feral-Intelligence/fleet/issues with:

1. `fleet version` output
2. `fleet doctor` output
3. OS and architecture (`uname -a`)
4. The exact command they ran and its output
