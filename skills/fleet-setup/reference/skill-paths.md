# Where skills must land

`npx skills add` copies a canonical tree to project `.agents/skills/<name>/` (or `~/.agents/skills/<name>/` with `-g`). That is **not** sufficient. Claude Code does not read `.agents`. Finish by writing the same trees onto the load paths below.

## Claude Code (required)

Claude Code discovers only these filesystem locations (plus plugins). It does **not** load `.agents/skills/`.

| Scope | Path |
|---|---|
| Personal | `~/.claude/skills/<name>/SKILL.md` |
| Project | `<repo>/.claude/skills/<name>/SKILL.md` |

`fleet skills install` with no flags writes vendored playbooks to `~/.claude/skills/fleet/`.

Also copy `fleet-setup` itself to `~/.claude/skills/fleet-setup/` and `<repo>/.claude/skills/fleet-setup/` so the next Claude Code session in this repo (or any repo, for the personal copy) can load this skill. `npx` leaving it only under `.agents/skills/fleet-setup` is the failure mode.

## Codex (required)

| Scope | Path | Notes |
|---|---|---|
| User (global) | `~/.codex/skills/<name>/SKILL.md` | `$CODEX_HOME/skills`; still loaded. This is the `npx skills` Codex **global** path. |
| User (agents) | `~/.agents/skills/<name>/SKILL.md` | Current Codex user-scope scan. |
| Repo | `<repo>/.agents/skills/<name>/SKILL.md` | Codex scans this from cwd up to the repo root. Fine as a *copy*, never the only copy. |
| Repo (config) | `<repo>/.codex/skills/<name>/SKILL.md` | Project config-layer skills dir. Optional extra; do not prefer it over `~/.codex/skills`. |

Install vendored playbooks for Codex with the **same** installer:

```sh
fleet skills install --target ~/.codex/skills/fleet
```

Do not add a second installer. `--target` is the supported override (default remains `~/.claude/skills/fleet`).

## What to write

1. `fleet skills install` → `~/.claude/skills/fleet/`
2. `fleet skills install --target ~/.codex/skills/fleet` → `~/.codex/skills/fleet/`
3. Copy the `fleet-setup` directory (this `SKILL.md` plus `reference/`) to:
   - `~/.claude/skills/fleet-setup/`
   - `<repo>/.claude/skills/fleet-setup/`
   - `~/.codex/skills/fleet-setup/`

Copy, do not only symlink into `.agents`. Confirm the `SKILL.md` files exist at those destinations before calling setup complete.
