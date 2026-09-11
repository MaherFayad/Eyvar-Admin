# The analyst agent's MCP server

WP-7.1, `docs/09-analytics-v2/01-analyst-agent.md` §3, §5. A standalone workspace with its
own `package.json` and `node_modules` — it is never part of the Vite build, and it never
depends on `@anthropic-ai/claude-agent-sdk` (D38: the product runs on the owner's subscription
through `claude -p` print mode, not an API key).

## What is here

```
agent/
  package.json, tsconfig.json     this workspace's own deps and compiler settings
  mcp.json                        the --mcp-config for `claude -p`: spawns `node dist/mcp/server.js`
  globals.d.ts                    a minimal `import.meta.env` type shim (see "Known gap" below)
  mcp/
    server.ts                     the stdio MCP server entry point
    index.ts                      registers every tool (T1…T20) onto one McpServer
    source.ts                     EYVAR_MCP_SOURCE switch → mockBackend.ts | httpBackend.ts
    backendTypes.ts                the one interface both backends implement
    mockBackend.ts                imports src/data/clients directly (dev/test mode)
    httpBackend.ts                calls the real /api/v1 through client.ts (untested — no
                                   backend exists yet; every endpoint is copied from the doc)
    client.ts                     the http fetch wrapper (runner token, X-Eyvar-Acting-For, X-Eyvar-Job)
    reportQuerySchema.ts          ReportQuery as Zod, shared by every query-taking tool
    blockSchema.ts                Page Block as Zod, for create_page_draft
    limits.ts                     the 64 KB / 400-point / 50-row caps
    result.ts                     ok()/refuse() — every tool's return envelope
    permissions.ts                the sample_rows resource→permission map (D44)
    labels.ts                     resolves a measure/dimension's *Key against the Report
                                   Builder's own English copy
    glossaryData.ts               T3's starter glossary content
    tools/*.ts                    one file per tool, T1…T20 (T14 and T16 are 2 and 3 tools)
    testHarness.ts, testQueries.ts, *.test.ts   the test rig and 23 test files (one per
                                   registered tool, `01-analyst-agent.md` §11's own count)
```

## Running it

```
npm --prefix agent install     # once, or after package.json changes
npm --prefix agent test        # the tool + runner suite (vitest, EYVAR_MCP_SOURCE forced to mock)
npm --prefix agent run typecheck
npm --prefix agent run build   # tsc (typecheck-shaped) + esbuild bundle → agent/dist/mcp/server.js (see "Resolved gap" below)
npm --prefix agent run dev     # tsx mcp/server.ts, against EYVAR_MCP_SOURCE from the environment
npm --prefix agent run runner:dev   # tsx runner/index.ts — the daemon, WP-7.2
```

`claude -p` spawns the server itself via `agent/mcp.json`'s `{ "command": "node", "args":
["agent/dist/mcp/server.js"] }` — a human never runs `server.ts` directly except to smoke-test
it (pipe an MCP `initialize` handshake at its stdin, or point an MCP Inspector at the `dev`
command).

## Environment variables

| Variable | Read by | Meaning |
|---|---|---|
| `EYVAR_MCP_SOURCE` | `source.ts` | `mock` (default) imports `src/data/clients` directly and runs against the fixtures. `http` calls the real API through `client.ts`. |
| `EYVAR_JOB_ID` | `run_report`, `note_finding`, `job_context`, and `client.ts` (as `X-Eyvar-Job`) | Which job this server instance is running for. The runner sets this once per spawn; `job_context` and `note_finding` refuse with `no-job` when it is unset. |
| `EYVAR_ACTING_FOR` | `client.ts` (http mode only) | The `TeamUser.id` every tool call is authorised as — `X-Eyvar-Acting-For`. Required in http mode; the http backend throws if it is missing rather than calling the API unauthenticated. |
| `AGENT_RUNNER_TOKEN` | `client.ts` (http mode only) | The runner's bearer token. Required in http mode. |
| `EYVAR_API_BASE_URL` | `client.ts` (http mode only) | Defaults to `http://localhost:3000/api/v1`. |

Mock mode reads no environment variable beyond `EYVAR_MCP_SOURCE`, `EYVAR_JOB_ID` and whichever
mock operator is "signed in" — which in a real job is fixed by the runner (WP-7.2, below) and in
the interactive/test path is `switchMockUser()` from `src/data/clients`.

**The runner's own environment** (`agent/runner/env.ts` — distinct from this table, which is the
spawned MCP tool server's) is `AGENT_RUNNER_TOKEN`, `AGENT_RUNNER_ID`/`AGENT_RUNNER_NAME`,
`EYVAR_API_BASE_URL`, `EYVAR_REPO_ROOT`, `CLAUDE_BIN`, `AGENT_POLL_INTERVAL_MS`,
`AGENT_HEARTBEAT_INTERVAL_MS`, `AGENT_JOB_TIMEOUT_MS`, `AGENT_MAX_TURNS` — the daemon reads these
to know how to reach the job queue and what to spawn, then sets `EYVAR_MCP_SOURCE`/`EYVAR_JOB_ID`/
`EYVAR_ACTING_FOR`/`AGENT_RUNNER_TOKEN`/`EYVAR_API_BASE_URL` itself on each `claude -p` child
(`runner/index.ts#runOneAttempt`) — the two tables never need reconciling by hand.

## Pointing it at mock vs http

```
EYVAR_MCP_SOURCE=mock npm --prefix agent run dev          # against the frontend's own fixtures
EYVAR_MCP_SOURCE=http AGENT_RUNNER_TOKEN=... EYVAR_ACTING_FOR=USR-1 \
  EYVAR_API_BASE_URL=https://staging.example.com/api/v1 npm --prefix agent run dev
```

`source.ts` reads `EYVAR_MCP_SOURCE` once and dynamically `import()`s exactly one of
`mockBackend.ts` / `httpBackend.ts` — the other is never evaluated, so an http-mode process
never touches `src/data/clients` (and the gap below never bites it).

## Resolved gap: `import.meta.env` outside Vite/Vitest

WP-7.1 found `src/data/config.ts` reading `import.meta.env.VITE_DATA_SOURCE` unguarded, throwing
under plain Node/`tsx` outside Vite or Vitest. The orchestrator fixed the one line (`config.ts`
now routes through its own `readEnv()` like every other read in that file) before WP-7.2 (the
runner) started. **Verified by actually running it**: `EYVAR_MCP_SOURCE=mock npx tsx mcp/server.ts`
now starts and serves a real tool call (`eyvar_glossary`) against the mock backend with no throw.

## Resolved gap: `npm run build`'s output now runs under plain `node`

WP-7.1 found `tsc -p tsconfig.json`'s per-file emission unusable under plain Node:
`mockBackend.ts`/`labels.ts`/the Zod schemas import `../../src/data/**` and `../../src/screens/**`
without extensions (legal under the app's bundler resolution, illegal under Node's ESM loader) —
confirmed live, `node dist/agent/mcp/server.js` failed with `ERR_MODULE_NOT_FOUND` on its first
such import. WP-7.1's own recommendation — bundle with esbuild instead of per-file `tsc` emission
— is what WP-7.2 (the runner, which actually has to spawn this server) implemented and verified:

- `build` now runs `tsc` (typecheck-shaped emission, harmless but unused at runtime) **and**
  `build:mcp-bundle`: `esbuild mcp/server.ts --bundle --platform=node --format=esm
  --packages=external --outfile=dist/mcp/server.js` — one self-contained file, `node_modules`
  packages (`zod`, `@modelcontextprotocol/sdk`) left external since they resolve normally from
  `agent/node_modules` and only the hand-authored `src/**`/`agent/**` graph needed inlining.
- **Verified by actually running it**: `EYVAR_MCP_SOURCE=mock node dist/mcp/server.js`, driven by
  a real `@modelcontextprotocol/sdk` `Client` over `StdioClientTransport`, served a real
  `eyvar_glossary` tool call — the same call that previously threw `ERR_MODULE_NOT_FOUND`.
- `mcp.json`'s `args` now point at the bundle's real path, `agent/dist/mcp/server.js` (esbuild's
  `--outfile` is not subject to `tsc`'s `rootDir`-driven `agent/dist/agent/mcp/server.js`
  doubling that the previous version of this README described).
- The runner itself (`agent/runner/**`) turned out **not** to need bundling at all — it holds no
  runtime import of `src/**`, only type-only ones (erased at compile time) — so `tsc`'s ordinary
  per-file emission already produces a plain-Node-runnable `dist/agent/runner/index.js`, confirmed
  by running it directly (`node dist/agent/runner/index.js` fails on the intended
  `AGENT_RUNNER_TOKEN is not set` check, not on module resolution).

Http mode was always unaffected by the `src/`-import half of this (it never imports
`src/data/clients`), but `labels.ts`/`blockSchema.ts`/the pure `reporting/` modules it does use
had the same extensionless-import exposure — the bundle fixes it for both modes at once.

## Tool coverage

Every tool in §5 (T1…T20) is registered in `mcp/index.ts` and has its own test file. See the WP
report for the AC-1240…AC-1244 mapping and the honest gap list (two client functions
`src/data/clients/agent.ts` is missing: `noteAgentFinding` for T19, and a per-firing
`getFiring`/`alert_context` read for T16c — both stood in for here, documented at the top of
`mcp/mockBackend.ts`).
