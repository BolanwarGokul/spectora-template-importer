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

- Repository (including NOTES.md and the Spectora export): [insert verified repository link]
- Live app: [insert verified Vercel URL]
- Access: no login required; each browser receives its own sample workspace.
- Walkthrough: [insert accessible 8–10 minute video link]

Best,
Gokul
