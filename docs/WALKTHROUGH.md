# 9-minute walkthrough outline

Record in your own voice, with camera on for the introduction. Replace notes with your own experience; do not claim tests or deployments that are still pending.

| Time | Show and explain |
| --- | --- |
| 0:00–0:35 | Introduce yourself and one relevant project you actually worked on. |
| 0:35–2:00 | Open the live app; upload the committed real Spectora HTML export. Explain counts, order and preservation notes before confirming. |
| 2:00–3:15 | Rename a section/item, edit a formatted comment, save and reload. Duplicate the template, edit only the copy, then reopen the original. |
| 3:15–4:15 | Show the repo layout, Next.js UI/API, libSQL database and parser. Explain what Codex helped build and what you checked. |
| 4:15–5:30 | Explain relational IDs, positions, raw HTML versus sanitized display, original source rows and source-file hash. Show a metadata column retained in View source. |
| 5:30–6:30 | Show tests for source preservation, database reopen and independent copies. Explain atomic writes and version conflicts. |
| 6:30–7:30 | Demonstrate invalid-headers.xlsx failure. Explain the entity-decoding regression, its test, and remaining same-name hierarchy ambiguity. |
| 7:30–8:30 | Explain preservation review as the customer improvement. Explain omitted field controls, remote assets, guest access and why no AI mapping. |
| 8:30–9:00 | Show Hive exploration evidence. Suggest in-context HTML-export guidance and a clear durable completion state. Mention Binsr was intentionally omitted. |

## Speaking notes and exact screen actions

Aim for 9–10 minutes including clicks and pauses. Speak naturally; these are notes, not a claim that every line describes your personal experience. Replace the introduction with truthful details. The main import must use a genuine Spectora `.xls` or `.xlsx` obtained through **Export HTML Text → Download File**. At preparation time, that workbook is still missing. The synthetic fixture is suitable for rehearsal and regression demonstrations, but does not satisfy the real-file demonstration.

### 0:00–0:35 — You (camera on)

**Say:** “Hi, I'm Gokul. I've worked on [one real project or relevant experience]. For this assignment, I built Fieldnote, a workspace that imports Spectora templates, lets an inspector edit them, and creates independent copies. I'll demonstrate the workflow, then explain the mapping, persistence, and tradeoffs.”

Keep the personal project to one sentence. Camera is optional after this introduction.

### 0:35–2:00 — Import and preservation review

**Show:** The live app. Click **Import template** or **Import another template**, choose the actual Spectora workbook, and pause on the preview before confirming. Point at the actual counts and warnings displayed; do not quote the synthetic fixture's counts for the real file.

**Say:** “The customer problem is moving years of inspection writing into another system while keeping its structure and formatting. I chose Spectora's HTML-text export because the spreadsheet cells retain markup. Before saving, the app shows what it found: sections, items, comments, and preservation notes. I can inspect those notes before committing the import.”

Confirm the import, open a section, and show a formatted comment. Open **Import review** and **View source** on one comment. If possible, compare that same cell in the original workbook.

**Say:** “The original row remains available beside the editable content. Extra columns are retained for inspection even when the app doesn't implement their behavior. I also retain the original workbook, so the user can download and compare it.”

### 2:00–3:15 — Saved edit and independent copy

**Show:** Edit a comment's title and one sentence, save, then reload the page. Point to the saved text. Duplicate the template. Rename a section in the copy to an obvious value such as “Roof — copy demo.” Reopen the original and show its unchanged section name.

**Say:** “This edit is saved through the API into the database. Reloading reads it back. When I duplicate a template, every editable record receives a new ID. The two templates share the immutable source reference, but their editable records are separate. Changing the copy therefore leaves the original content unchanged.”

### 3:15–4:15 — Repo, stack, and AI use

**Show:** The repository tree, then `src/components/workspace.tsx`, `src/app/api`, `src/lib`, and `tests`. Open `NOTES.md` briefly.

**Say:** “The stack is Next.js and React with TypeScript, SheetJS for workbook parsing, and SQLite through libSQL. The hosted deployment uses Turso and Vercel. The workspace component contains the editor and dialogs. API routes handle preview, import, edits, copies, and original downloads. The library folder separates parsing, rich-content handling, and database operations. Tests cover the parser and persistence.”

“The application was built for this assignment; I didn't start from an existing application codebase. I used OpenAI Codex to help build the UI, parser, API, and tests. I checked the resulting behavior through automated tests and browser demonstrations. [Describe only the code you personally reviewed and the decisions you can explain.]”

### 4:15–5:45 — Model, mapping, and content checks

**Show:** `src/lib/db.ts`, then `parseSpectora` in `src/lib/importer.ts`, and the source view in the UI.

**Say:** “The hierarchy is templates, sections, items, and comments. Each level has its own ID and ordering position. A separate sources table stores the original bytes under a SHA-256 fingerprint. Comments retain editable HTML and the original row values.”

“The importer detects the required Section Name, Item Name, Comment Name, and Comment Text columns. It groups sections and items by exact name, preserves their first appearance, and uses the comment order column when it is consistently numeric. It reports ambiguity rather than inventing missing structure.”

“Raw HTML is retained. Display HTML is sanitized so scripts and unsafe links do not execute. That means preserving source content and reproducing every visual feature are separate guarantees. Remote images remain external references.”

**Show:** Relevant assertions in `tests/importer.test.ts` and `tests/repository.test.ts`, plus recorded test output or run `pnpm test` if pnpm is available in your terminal.

**Say:** “The 17 tests cover exact strings, hierarchy, ordering, metadata, invalid workbooks, persisted edits, independent copies, workspace isolation, stale saves, and rollback. Synthetic files exercise both XLS and XLSX. [After genuine-file verification: explain its measured counts and the exact source-cell checks.] Imports and copies commit in one transaction. Edits compare a version number, and a stale save returns a conflict rather than overwriting a newer change.”

### 5:45–7:05 — Hardest problem and failure case

**Show:** `src/lib/exact-strings.ts` and its corresponding regression test.

**Say:** “The hardest content issue was an XLSX entity-decoding problem. In a regression case, the workbook parser decoded an XML string twice, so literal entity text inside the customer's HTML changed. I added a narrowly scoped pass for those string cells that reads the original worksheet XML and decodes it once. The regression test checks the exact resulting content.”

**Show:** Upload `tests/fixtures/invalid-headers.xlsx`. Read the actual error, then close the dialog and show that the library has no additional template.

**Say:** “This file is missing required headers. The app rejects it before committing anything. A remaining limitation is same-named sections: without source section IDs, separate sections with identical names cannot be distinguished reliably. The importer reports that limitation.”

Optional, if time permits: upload the actual saved `export.htm` to demonstrate the recovery message and official download-page link. Do not spend the main demo attempting to download the workbook.

### 7:05–8:25 — Priorities, improvement, and cuts

**Show:** Import review and original-source inspection again, then `NOTES.md`'s deliberate cuts.

**Say:** “I prioritized faithful content, visible preservation limits, saved edits, and independent copies. The main improvement is a preservation review: the inspector can see counts, warnings, and original cells instead of relying on an unexplained success message. That addresses the customer's fear of losing years of work.”

“I left out scheduling, payments, report generation, a full field builder, and asset migration. Extra field metadata is retained, but doesn't become functioning inspection controls. I used deterministic mapping because the import should be explainable and should not invent customer content. Guest workspaces are appropriate for this demonstration; real deployment would need organization authentication and operational controls. I did not explore the optional Binsr product.”

### 8:25–9:10 — Specific Hive feedback

**Show:** `docs/evidence/hive-spectora-import.png` and, if useful, `docs/evidence/hive-report-published.png`.

**Say:** “In the Hive Spectora upload dialog I inspected, Excel extensions were explained, but the view didn't show guidance for selecting Export HTML Text. I'd add a short export checklist at that point, because a plain-text export can lose formatting before Hive receives it.”

“I also observed a publication-state inconsistency in one session: publishing from the report editor did not leave the report marked published when I reopened the inspection, while publishing from the inspection's report selector did. I haven't diagnosed that as a reproducible bug. I'd investigate the transition and make the durable completion state clear when PDF generation happens in the background.”

“Those observations informed the export guidance and explicit saved/imported states in my app.”

## Recording setup and rehearsal

Open the live app, the real workbook, the repository, the two test files, and Hive screenshots before recording. Keep a short cue sheet beside you: **intro → import → save/reload → copy/original → repo → schema/mapping → tests → entity bug/failure → decisions → Hive**. Record one rehearsal to ensure it fits in 8–10 minutes; cut navigation time before cutting the technical explanation. Upload with a link that opens without requesting access, and test that link in a signed-out browser.

For the later live discussion, practice locating `parseSpectora`, `storeImport`, `copyTemplate`, and `saveEdit`. Be able to explain the entity fix, transaction rollback, source versus editable HTML, ordering, and version conflicts. Make one small local change yourself and trace it from UI to API to database before submitting.

## Before recording

- Obtain and commit the actual Spectora workbook and record its provenance.
- Verify its counts/content, then seed and test the Vercel deployment.
- Confirm the public repository and live app work for a signed-out reviewer.
- Keep passwords, tokens, personal tabs and terminal environment files off screen.
- Practice explaining `importer.ts`, `repository.ts`, `db.ts` and the 409 stale-save behavior.
- Use the actual sample for the main demo; synthetic fixtures are only edge/failure demonstrations.
- Finish NOTES.md's time estimate honestly.

## Submission email draft — not sent

Hi Apoorv,

Thank you for the opportunity. Here is my template importer submission:

- Repository (NOTES.md included; actual Spectora export must still be added): https://github.com/BolanwarGokul/spectora-template-importer
- Live app: https://fieldnote-tau-steel.vercel.app/
- Access: no login required; each browser has an independent workspace. [Finish and verify sample seeding before sending.]
- Walkthrough: [insert accessible 8–10 minute video link]

Best,
Gokul
