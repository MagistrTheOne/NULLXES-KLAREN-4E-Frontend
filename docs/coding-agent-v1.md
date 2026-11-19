# Coding Agent V1 — NULLXES KLAREN 4E

**NULLXES GROUP · Orbital AI**

## Objective

Turn Coding Mode from a prompt preset into a permission-controlled coding workspace, separate from KLAREN inference on RunPod.

## Tool registry

| Tool | Capability | Access | Phase | V1 status |
|---|---|---|---|---|
| `repo.list` | Repository structure | Read | 1 | Preview (GitHub PAT server-side) |
| `repo.read` | File read | Read | 1 | Preview |
| `repo.search` | Code search | Read | 1 | Preview |
| `code.patch` | Patch prep | Approval | 3 | Disabled |
| `code.diff` | Diff view | Read | 3 | Not connected |
| `sandbox.test` | Isolated tests | Approval | 4 | Disabled |
| `git.commit` | Commit | Approval | 5 | Disabled |
| `git.push` | Push | Separate approval | 5 | Disabled |

## Architecture

```text
Browser (Coding workspace)
  → /api/coding-agent/tools
  → /api/coding-agent/execute
        → Orchestrator (lib/coding-agent/orchestrator.ts)
        → Permissions (lib/coding-agent/permissions.ts)
        → GitHub read-only (server PAT)
Chat / KLAREN 4E (RunPod) — separate runtime, future tool-calling JSON protocol
```

## Environment

Server-only (never `NEXT_PUBLIC_`):

- `GITHUB_CODING_AGENT_TOKEN` — fine-grained or classic PAT, minimum read scopes
- `GITHUB_CODING_AGENT_OWNER` — optional default org/user
- `GITHUB_CODING_AGENT_REPO` — optional default repo name
- `GITHUB_CODING_AGENT_REF` — optional ref (default `HEAD`)

## Agent event contract

`agent.status` · `tool.start` · `tool.result` · `tool.error` · `approval.required` · `agent.completed`

Defined in `lib/coding-agent/contracts.ts`.

## Restrictions (current)

- No patch apply, sandbox, commit or push
- No auto-approval
- No model text as shell commands
- No RunPod deployment from this work

## Tests

```bash
npm run test:coding-agent
```