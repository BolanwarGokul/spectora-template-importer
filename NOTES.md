# Implementation notes

## Customer priority

An inspector should not have to trust an unexplained “success” message with four years of writing. The deliberate improvement is an **import preservation review**: preview counts before saving, specific limitations, source rows per comment, untouched original cells, and a downloadable source workbook with a SHA-256 fingerprint. Imported content is editable without changing its provenance.

## Data model

`templates → sections → items → comments` is a relational hierarchy with separate IDs and explicit positions. `sources` holds the original workbook bytes keyed by SHA-256. A template records its workspace, source hash, parser version, counts, warnings, timestamps and edit version. Each comment contains editable HTML and a separate original row (sheet, row number, all column values).

Imports and copies commit in one transaction. A copy allocates fresh IDs at every editable level, retaining an immutable source reference. Edits compare and increment the template version in the same transaction as the field update. Stale edits return 409 rather than silently overwriting another tab. Every read/write/download checks workspace ownership.

## Input and mapping

- Binary Excel `.xls` and OOXML `.xlsx`, maximum 4 MB, 10,000 populated data rows, 100 columns and 100,000 characters per cell. XLSX declared expanded size is limited to 40 MB. ZIP64, formulas, missing hierarchy, duplicate headers, unknown populated sheets and malformed workbooks are rejected with actionable messages. These limits are appropriate for a demo, not a complete hostile-file sandbox.
- Header detection scans the first 20 rows. Required columns are `Section Name`, `Item Name`, `Comment Name`, `Comment Text`; matching is case/whitespace insensitive. Content values themselves are preserved.
- Sections/items are grouped by exact names within each sheet, in first-appearance order. Comments remain separate even when names repeat. A repeated section block produces a warning: without source IDs, two distinct same-named sections cannot be distinguished reliably.
- Numeric `Order (w/i item)` sorts comments within their item. Ties retain source order and warn. Mixed/missing values in a partly ordered item preserve row order and warn. An entirely absent order column uses row order.
- `Comment Type` and `Answer Type` are retained. Unknown types remain in the data with a warning. All extra columns remain visible in original-source inspection; field options/defaults, severity, recommendations, estimates, photo metadata and behavior flags are not functioning inspection controls.
- Blank comment text and blank titles are retained; the UI displays an untitled fallback without rewriting stored source data. Whitespace, Unicode and HTML entities have regression coverage.

## Rich content and honest limits

Raw HTML stays in the database and original workbook. Rendering uses `sanitize-html`: ordinary formatting, lists, tables and safe links survive; limited inline styles are allowed. Scripts, event handlers, unsafe URL schemes and interactive embeds are not executed. Images remain external references and can break or require source authentication; media is not copied to new hosting. Warnings identify common embeds, style filtering, unsafe content and remote images. This is not pixel-identical Spectora rendering.

A name-only edit preserves the original HTML exactly. A formatted edit saves the sanitized editor representation; the dialog warns about unsupported content, and original cells remain available. The HTML-source mode supports direct edits while rendering remains sanitized.

**Missing from export:** original IDs, application settings or assets not represented in spreadsheet cells cannot be reconstructed. A plain-text export cannot recover deleted markup; an all-plain file receives a warning because the importer cannot distinguish intentional plain text from a plain-text export. **Unsupported by editor:** fields present in extra columns are retained for inspection but not implemented as report controls. These are different conditions.

## Hardest issue

An exact-string test exposed SheetJS 0.20.3 decoding XML entities twice for XLSX `t="str"` cells. For example, literal `&amp;` in source HTML changed unexpectedly. A narrowly scoped OOXML pass restores those string cells from the original worksheet XML with one XML decode. Shared/inline strings use the normal parser. The original workbook is retained independently. See `exact-strings.ts` and the exact-content test.

## Checks performed

- All 16 automated tests pass: text/hierarchy/order, metadata, duplicates, BIFF and OOXML, blank/zero values, malformed inputs, formulas, sanitization, persisted edits read through another database connection, fresh copy IDs, independent edits, workspace isolation, stale edits and rollback.
- Production Next.js build and TypeScript check pass.
- Browser: uploaded the clearly labeled synthetic fixture; preview reported 4 sections, 8 items, 10 comments and 10 rows. Saved a comment title and rich HTML, reloaded, and observed the saved text. Opened the persisted workspace in a separate production server process. Renamed a section and item in a copy, then reopened the original and verified its names were unchanged. Uploaded the invalid-header fixture: an actionable error appeared and the template count stayed at two. Screenshots are in `docs/evidence/`. The real source regression remains pending.
- Hosted Turso/libSQL persistence passed import, saved section edit, independent copy and exact source-byte checks using `scripts/verify-remote.ts`. This script creates isolated synthetic QA records and leaves reviewer workspaces untouched.
- Genuine Spectora export verification and live app verification are **not yet complete**. `export.htm` downloaded in the session was the generated download webpage, not an Excel workbook. It is deliberately excluded from the repository.

## Deliberate cuts

No scheduling, reports, payments, mobile app, AI mapping, collaborative cursors, delete/restore, arbitrary hierarchy restructuring or full Spectora field builder. Deterministic mapping is easier to audit and does not invent customer content. A modest visual editor and raw source mode cover the required text edits. No AI runs inside the product.

No production identity/account recovery, global abuse protection, persistent migration framework or operations monitoring. Guest workspaces have a 20-template quota; the public demo needs sample data only. Database errors do not expose credentials. Original-source downloads are scoped to the same workspace. Before real customer use, add organization authentication, role authorization, migrations, rate limits, monitoring, backups, asset migration and broader export fixtures.

Binsr was left out to prioritize the required Hive/Spectora workflow and faithful persistence. Hive observations are documented separately and distinguish observed behavior from hypotheses.

## Credits and working process

Custom UI, importer, relational model, API routes and tests were built for this assignment with OpenAI Codex assistance. No application starter or copied product code was used. Libraries: Next.js/React, SheetJS Community Edition from its official distribution, libSQL client, sanitize-html, Zod, Lucide icons, TypeScript, tsx and Prettier. Fonts: DM Sans and Manrope through Google Fonts, with system fallbacks. Review their upstream licenses when redistributing.

References: [Spectora export instructions](https://support.spectora.com/en/articles/2769896-how-to-export-a-template), [Spectora spreadsheet column guide](https://support.spectora.com/en/articles/6198400-how-to-import-a-template-from-a-spreadsheet), [SheetJS installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs), [libSQL client reference](https://docs.turso.tech/sdk/ts/reference). Next.js's installed documentation informed route handlers and output tracing. Test-fixture generation is included as a reusable script. No private credentials are included.

Time: work began 29 September 2026. A reliable total across product exploration, account setup and implementation has not yet been recorded; Gokul should supply an honest approximate total before submission. Do not represent AI execution time as the candidate's personal effort.
