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
npm --prefix agent test        # the tool suite (vitest, EYVAR_MCP_SOURCE forced to mock)
npm --prefix agent run typecheck
npm --prefix agent run build   # tsc → agent/dist (see "Known gap: the compiled dist path" below)
npm --prefix agent run dev     # tsx mcp/server.ts, against EYVAR_MCP_SOURCE from the environment
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
mock operator is "signed in" — which in a real job is fixed by the runner (out of this WP's
scope, WP-7.2) and in the interactive/test path is `switchMockUser()` from
`src/data/clients`.

## Pointing it at mock vs http

```
EYVAR_MCP_SOURCE=mock npm --prefix agent run dev          # against the frontend's own fixtures
EYVAR_MCP_SOURCE=http AGENT_RUNNER_TOKEN=... EYVAR_ACTING_FOR=USR-1 \
  EYVAR_API_BASE_URL=https://staging.example.com/api/v1 npm --prefix agent run dev
```

`source.ts` reads `EYVAR_MCP_SOURCE` once and dynamically `import()`s exactly one of
`mockBackend.ts` / `httpBackend.ts` — the other is never evaluated, so an http-mode process
never touches `src/data/clients` (and the gap below never bites it).

## Known gap: `import.meta.env` outside Vite/Vitest

`src/data/config.ts` reads `import.meta.env.VITE_DATA_SOURCE` unguarded (every other read in
that file goes through its own `readEnv()`, which try/catches this exact case — this one line
does not). Under Vite and under Vitest, `import.meta.env` is a real object and this works; under
plain Node or `tsx` — the mechanism `01-analyst-agent.md` §3.1 names for mock-mode development
("mock imports `src/data/clients/index.ts` through `tsx`") — `import.meta.env` is `undefined`,
and the read throws before `mockBackend.ts` finishes loading.

Consequence: **`npm --prefix agent test` is unaffected** — every test runs under Vitest, which
defines `import.meta.env` correctly, so all 23 tool suites exercise the real mock backend end
to end. What does **not** work today is running the *compiled* server (`node dist/mcp/server.js`
or `npm run dev`'s `tsx mcp/server.ts`) with `EYVAR_MCP_SOURCE=mock` — it throws on startup. Http
mode is unaffected either way (it never imports `src/data/clients`).

This is one line, in a file outside `agent/**`'s touch scope:

```ts
// src/data/config.ts — current
export const DATA_SOURCE: DataSource = import.meta.env.VITE_DATA_SOURCE === 'http' ? 'http' : 'mock'
// the fix (mirrors every other read in the same file):
export const DATA_SOURCE: DataSource = readEnv('VITE_DATA_SOURCE') === 'http' ? 'http' : 'mock'
```

`globals.d.ts` in this workspace only shims the *type* of `import.meta.env` so `tsc` can
check the files `mockBackend.ts` pulls in; it changes nothing at runtime.

## Known gap: `npm run build`'s output does not run under plain `node` yet

`tsc -p tsconfig.json` needs `rootDir: ".."` (the repo root) because `mockBackend.ts`,
`labels.ts` and the Zod schemas import from `../../src/data/**` and `../../src/screens/**`.
Two consequences, both real, both outside `agent/**`'s fix:

1. **The whole transitively-imported `src/` subtree gets compiled into `agent/dist/src/**`
   too** — not a bug (those files must exist for a compiled `mockBackend.js`'s relative import
   to resolve at all), but it does mean `agent/dist/mcp/server.js` from `01-analyst-agent.md`
   §3.1's illustrative path is actually `agent/dist/**agent/**mcp/server.js` once `rootDir`
   accounts for the repo root — `mcp.json` here uses the real path.
2. **Every file under `src/` is authored with extensionless relative imports**
   (`from '../types/report'`), legal under the main app's `moduleResolution: "bundler"` (Vite,
   Vitest, `tsx` all tolerate it) and illegal under plain Node's ESM loader, which requires an
   explicit extension. `node agent/dist/agent/mcp/server.js` today fails on its first such
   import (`ERR_MODULE_NOT_FOUND`) — confirmed by running it. This hits **both** modes, not
   just mock: `labels.ts` (used by `catalogue_measures`/`catalogue_dimensions`/`glossary`)
   statically imports `src/screens/reports/copy.ts` regardless of `EYVAR_MCP_SOURCE`.

Neither is fixable inside `agent/**` alone without either (a) rewriting many `src/` imports to
carry `.js` extensions — a repo-wide convention change well outside this WP, or (b) bundling
(`esbuild --bundle --platform=node --format=esm`) instead of per-file `tsc` emission, which
sidesteps Node's extension rule entirely by inlining the dependency graph. (b) is the
recommended fix for whichever WP wires the runner's actual spawn — it is not this one.

**What does work today, unaffected by either gap:** `npm --prefix agent test` (Vitest — the WP's
own proof mechanism, §11), `npm --prefix agent run typecheck`, and `npm --prefix agent run dev`
(`tsx`, once the `import.meta.env` gap above is fixed upstream) for mock-mode manual testing.
Http mode's own files (`client.ts`, `httpBackend.ts`, the `tools/*.ts` that route entirely
through `Backend`) never touch `src/` at runtime except via `labels.ts`/`blockSchema.ts`/the
pure `reporting/` modules — the same extensionless-import issue above, so http mode is equally
blocked for a `node`-run compiled server until (b) lands.

## Tool coverage

Every tool in §5 (T1…T20) is registered in `mcp/index.ts` and has its own test file. See the WP
report for the AC-1240…AC-1244 mapping and the honest gap list (two client functions
`src/data/clients/agent.ts` is missing: `noteAgentFinding` for T19, and a per-firing
`getFiring`/`alert_context` read for T16c — both stood in for here, documented at the top of
`mcp/mockBackend.ts`).
