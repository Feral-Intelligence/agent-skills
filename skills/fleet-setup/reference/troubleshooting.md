# Troubleshooting Fleet Setup

Common failures during `fleet-setup` and how to fix them.

## Install script failures

### `curl: command not found`

macOS ships with curl. On Linux: `apt install curl` or `dnf install curl`.

### `install: line N: sha256sum: command not found` (macOS)

macOS uses `shasum -a 256`. The installer at https://fleetctl.ai/install already has a fallback. If it still fails, re-fetch that script; do not invent a checksum command.

### Install succeeds but `fleet version` says `dev`

The binary was built without release ldflags. Re-run the installer:

```sh
curl -fsSL https://fleetctl.ai/install | sh
~/.local/bin/fleet version
```

### `~/.local/bin/fleet: cannot execute binary file`

Wrong architecture. Check `file ~/.local/bin/fleet` against `uname -m`.

## Registration and sign-in

### `fleet: not registered — run: fleet admin register`

Instance credentials at `~/.fleet/controlplane.json` are missing. Re-run:

```sh
fleet admin register --url https://app.fleetctl.ai --code <fresh-code>
```

Generate the code at https://app.fleetctl.ai.

### `expired` or `invalid registration code`

Codes are single-use and expire about 15 minutes after minting. Generate a fresh code and register immediately.

### License expired or revoked

Send the user to https://app.fleetctl.ai. There is no bypass.

### Hosted tools return authentication errors

`fleet admin register` is the machine. The human must also run `fleet login`. Treat those as distinct. Never paste an access token into a prompt.

## Prerequisites

### `tmux: command not found`

| OS | Command |
|---|---|
| macOS (Homebrew) | `brew install tmux` |
| Debian/Ubuntu | `sudo apt install tmux` |
| Fedora/RHEL | `sudo dnf install tmux` |
| Arch | `sudo pacman -S tmux` |

### `gh: command not found` or `gh auth status` fails

| OS | Command |
|---|---|
| macOS (Homebrew) | `brew install gh` |
| Debian/Ubuntu | `sudo apt install gh` |
| Fedora/RHEL | `sudo dnf install gh` |
| Arch | `sudo pacman -S github-cli` |

Then `gh auth login` and `gh auth status`.

## `fleet up` / `fleet init` failures

### `.fleet/config.yaml already exists`

`fleet up` skips init when the repo is already scaffolded. That is success. Only run `fleet init --force` if the user explicitly accepts regenerating `.fleet/prompts/`.

### `fleet: not a git repository`

`cd` to the repo root. Fleet writes `.fleet/config.yaml` next to `.git/`.

### Unknown template name

```sh
fleet init --list-templates
```

Supported presets: `go-service`, `fullstack`, `data-pipeline`, `devops`.

### Doctor still failing after `fleet up`

Print `fleet doctor` and fix the failing required checks. Do not claim setup is complete.

## Agent start failures

### `no such agent` / start of a catalog slug fails

`fleet agent start` takes a **database name**, not a catalog id. List first, or spawn:

```sh
fleet agent list
fleet template spawn <catalog-id> --name <name>
fleet agent start <name>
```

### `tmux session already exists`

The agent is already running. `fleet agent list` / `tmux ls`. Stop with `fleet agent stop <name>` only if the user wants a restart.

### Agent starts then exits

```sh
tmux attach -t fleet-<agent-name>
```

Common causes: coding CLI missing from PATH, missing credentials, prompt file errors. Also run `fleet skills install --dry-run`.

## PATH

If `fleet: command not found` after install, append `~/.local/bin` to PATH (see the skill) and re-open the shell.

## Nothing here matches

Run `fleet doctor`. If it passes and the issue remains, open https://github.com/Feral-Intelligence/fleet/issues with `fleet version`, `fleet doctor`, `uname -a`, and the exact command output.
