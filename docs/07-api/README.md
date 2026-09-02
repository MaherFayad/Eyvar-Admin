# The API contract

**If you are the backend engineer, this directory is the whole handover.** Four files.
You should not have to open `src/` to build the API, and you should never have to read all
47 client modules — that is the problem this directory exists to solve.

| Read | File | What it is |
|---|---|---|
| 1st | [CONTRACT.md](CONTRACT.md) | The conventions. Envelopes, pagination, sort and filter wire format, errors, money, dates, auth. **Read this once; it applies to all 290 endpoints.** |
| 2nd | [ENDPOINTS.md](ENDPOINTS.md) | Every endpoint: method, path, request, response type, which client calls it. Generated. |
| as needed | [endpoints.json](endpoints.json) | The same index, machine-readable. Generate stubs, a Postman collection, or a route table from it. |
| before you start | [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | What the frontend assumed and needs you to confirm or overrule. **Answer these first** — some of them change endpoint shapes. |

## Where the truth actually lives

The frontend has a complete, typed, working mock of this API. It is not a sketch: the
screens run against it every day, so a shape that is wrong here is a shape that would break
a screen.

```
src/data/types/common.ts     the shared vocabulary - envelopes, errors, money, dates
src/data/clients/<name>.ts   one module per resource, each function annotated with
                             its endpoint, request and response type
src/data/clients/http.ts     the transport that will call you. Wire format lives here
src/data/config.ts           the switch: VITE_DATA_SOURCE=mock | http
```

**`ENDPOINTS.md` is generated from the docblocks in `src/data/clients/`.** It cannot drift,
because it is not written by hand:

```bash
npm run api:contract    # regenerate
npm run api:check       # exit 1 if stale, or if a client is malformed
```

If a row in `ENDPOINTS.md` looks wrong, the docblock above that function is wrong. Fix the
client, regenerate. Never edit `ENDPOINTS.md`.

## What the frontend guarantees you

- **One error type.** Every failure is an `ApiError` with `status`, `kind`, `code`,
  `details[]`, `requestId`, `retryable`. The UI branches on `kind`, never on a message
  string.
- **One list envelope.** Every index endpoint returns `Paginated<T>`, including the ones
  that fit on one page today.
- **No client-side money arithmetic.** Amounts are integer halalas end to end.
- **No hardcoded filter options.** Dropdowns come from your facet endpoints.
- **No endpoint per view tab.** `?view=` is a query parameter, never a route.

## What we need from you

Beyond the answers in `OPEN-QUESTIONS.md`: a base URL, an auth scheme, and one endpoint
implemented end to end. Flipping `VITE_DATA_SOURCE=http` then exercises the whole transport
against a real server, and any mismatch surfaces on the first screen rather than the
fortieth.
