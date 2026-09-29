# Fieldnote — Spectora template importer

A desktop workspace for importing inspection templates, reviewing what survived, editing comments, and making independent copies. Built for the Hive Inspect FDE assignment.

**Submission status:** local implementation and production build work. The genuine Spectora spreadsheet, hosted database, GitHub publication, Vercel deployment, and recorded walkthrough are still pending. Synthetic QA fixtures are explicitly labeled and are not the required Spectora export.

## Run locally

Use Node.js 22+ and pnpm 11. Install dependencies with `pnpm install --frozen-lockfile`. Copy `.env.example` to `.env.local`, then run:

```sh
pnpm db:init
pnpm dev
```

Open http://localhost:3000. The default database is a real SQLite file at `data/templates.db`. API startup initializes the schema automatically; `db:init` is an explicit setup check. The CLI scripts read environment variables from the process; their default local database needs no configuration. For a remote database, run scripts with `node --env-file=.env.local --import=tsx scripts/init-db.ts`.

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
```

## Database and deployment

Set `DATABASE_URL` to a hosted libSQL/Turso database URL and `DATABASE_AUTH_TOKEN` to its database token in Vercel's server environment. Neither is a `NEXT_PUBLIC_` variable. A local `file:` database is explicitly rejected on Vercel because its filesystem is not persistent application storage.

Import this repository into Vercel as a Next.js project. Use `pnpm install --frozen-lockfile` and `pnpm build`, with Node.js 24. There is no additional build-time database dependency. On first API access, tables are created idempotently. Use a dedicated database for this demonstration.

Put the genuine shareable HTML-text export in `samples/` before deployment. Each new browser workspace receives its own imported copy on first load. The `/api/demo` function includes sample files through Next.js output tracing. Synthetic fixtures are never seeded automatically.

Run `pnpm exec tsx scripts/verify-sample.ts` to check source-row accounting and exact comment-cell preservation and print the actual sample's fingerprint, counts, warnings and section names. This intentionally fails while no genuine sample is present.

No app login is required: an opaque HttpOnly cookie identifies a guest workspace; templates and edits live in the backend. Reopening in the same browser retains access. Clearing cookies or changing browsers creates another workspace. This is a review demo, not production company authentication. Use sample data only.

## Try the workflow

1. In Spectora, select a template and use **Export to spreadsheet → Export HTML Text**. Click **Download File** on the generated download page. A saved `.htm` webpage is not the export.
2. Upload the `.xls` or `.xlsx`. Review structural counts and preservation notes before committing.
3. Rename a section/item or edit a comment; save and reload.
4. Duplicate the template, edit the copy, then reopen the original.
5. Open **Import review** and a comment's **View source** to compare original cells. Download the exact original workbook at any time.
6. Upload `tests/fixtures/invalid-headers.xlsx` for a deliberate validation failure. No partial template is saved.

## Layout

| Path | Purpose |
| --- | --- |
| `src/lib/importer.ts` | Deterministic workbook validation and hierarchy mapping |
| `src/lib/exact-strings.ts` | Regression fix for double-decoded XLSX string entities |
| `src/lib/db.ts` | Relational schema and local/remote connection |
| `src/lib/repository.ts` | Atomic imports, copies, versioned edits, ownership checks |
| `src/lib/rich-content.ts` | Safe rendering and explicit rich-content warnings |
| `src/app/api/` | Upload, preview, persistence and source-download endpoints |
| `src/components/workspace.tsx` | Editor, import review, dialogs and template navigation |
| `tests/` | Parser and database regression tests; synthetic fixtures |
| `docs/PRODUCT_EXPLORATION.md` | Observed Hive and Spectora behavior |
| `docs/WALKTHROUGH.md` | Recording outline and demonstration checklist |

See [NOTES.md](NOTES.md) for mapping rules, tradeoffs, verification and credits.
