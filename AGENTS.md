# Notes for agents working in this repo

If you were sent here to **install** Rabbithole for a user, stop — you don't
need to clone or build anything. Follow the Quick start in [README.md](./README.md)
(one `claude mcp add` / `codex mcp add` line). This file is for agents
**developing** the repo.

## What this is

An MCP server (stdio) that opens a branching-document canvas in the browser.
Plain ES modules, no build step, no TypeScript, no test framework yet.

- `bin/mcp-server.js` — entry; just imports `src/mcp/server.js`
- `src/mcp/` — MCP wiring (server name `rabbithole`, tools from `src/tools/manifest.js`)
- `src/core/` — sessions, storage, local HTTP + SSE transport, markdown
- `src/core/html/` — the entire canvas UI, served as ONE self-contained HTML
  document (see `src/core/html/README.md`). Client code is authored as JS
  strings/template literals — mind your escaping, especially backslashes
- `website/` — the Next.js site for rabbithole.ing; own package.json,
  `cd website && npm install && npm run dev`

## Run / debug

```bash
npm install
RABBITHOLE_NO_BROWSER=1 node bin/mcp-server.js   # speaks MCP on stdio
```

Storage is JSON files under `~/.rabbithole/` (`RABBITHOLE_DIR` overrides).
Logs go to stderr — stdout is reserved for the MCP protocol; never print to
stdout.

## Conventions

- The product name is **Rabbithole** — one word, no space, in all copy.
- Node ≥ 18, ES modules everywhere.
- The canvas page must stay fully self-contained (one HTML response, no
  external assets) — that constraint is load-bearing for export/snapshots.

<!-- br-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View ready issues (open, unblocked, not deferred)
br ready              # Ready work

# List and search
br list --status=open # All open issues
br show <id>          # Full issue details with dependencies
br search "keyword"   # Full-text search

# Create and update
br create --title="..." --description="..." --type=task --priority=2
br update <id> --status=in_progress
br close <id> --reason="Completed"
br close <id1> <id2>  # Close multiple issues at once

# Sync with git
br sync --flush-only  # Export DB to JSONL
br sync --status      # Check sync status
```

### Workflow Pattern

1. **Start**: Run `br ready` to find actionable work
2. **Claim**: Use `br update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id>`
5. **Sync**: Always run `br sync --flush-only` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready` shows only open, unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers 0-4, not words)
- **Types**: task, bug, feature, epic, chore, docs, question
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
br sync --flush-only    # Export beads changes to JSONL
git commit -m "..."     # Commit everything
git push                # Push to remote
```

### Best Practices

- Check `br ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `br create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always sync before ending session

<!-- end-br-agent-instructions -->
