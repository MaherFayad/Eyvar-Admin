# Glossary (analytics v2)

`GET /api/v1/catalogue/glossary` — plain-language measure definitions plus the fixed
business rules (Riyadh/Sunday week, the money rule, "a gap is null", partial-bucket
marking, declared coverage). Consumed by the analyst agent's `glossary` tool
(`docs/09-analytics-v2/01-analyst-agent.md` T3) and by anyone who wants the catalogue
read out in English rather than queried column by column.

**Generated, not written.** `api/_lib/glossary.ts`'s `buildGlossaryMarkdown()` builds one
entry per measure from `Measure`'s own fields — population, temporality, aggregate, unit,
coverage, grain, permission — via a template, every call, from whatever
`0003_catalogue.sql` currently holds. No sentence describing a specific measure is
hand-written anywhere in this codebase; a measure that changes shape gets a new
description automatically, because the description **is** the shape.

The one hand-written part is the fixed business-rules preamble, which does not vary per
measure and is cited from `docs/09-analytics-v2/05-backend.md` rather than invented.

`?term=` narrows to measures whose key, label key or category contains it
(case-insensitive); omitted, the response is the whole glossary. The response is bare
`text/markdown`, not a `Single<T>` JSON envelope — it is a document, not a resource.

Where the fields themselves are documented: `src/data/types/measure.ts` (the `Measure`
shape), `src/data/fixtures/measures.ts` (today's fourteen measures), `api/_db/migrations/0003_catalogue.sql`
(the columns that back them).
