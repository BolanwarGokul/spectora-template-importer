# Product exploration

Exploration date: 29 September 2026. These notes distinguish observed behavior from planned work. Screenshots are in `docs/evidence/`.

## Hive Inspect — observed in the real application

- Organization: **Hive FDE Assignment**.
- Used the existing fictional inspection at **123 Sample Street, Demo City, ST 12345** with the **Demo Residential Template**.
- The template overview reports **4 sections, 8 subsections, and 25 fields**. Its sections are Roof, Exterior, Plumbing, and Electrical.
- The report preview shows information, limitations, and defect comments. Defects carry severity/category labels, recommendation services, and, for some comments, example photos and captions.
- Renamed the report to **Hive FDE Assignment — Sample Inspection (Demo Only)**, saved a demonstration-only introduction and summary, and verified the introduction in the preview.
- Renamed the roof Notes field to **Roof Notes — Demo Observation** from the report preview. The edit remained visible after reloading the report editor. The original template still shows its field as **Notes**.
- Published through the inspection's report selector. It displayed **1 published**, **Published**, and an **Unpublish** action. The notification said PDF generation runs in the background.
- The first publication attempt from the report editor did not leave the report marked published when the inspection was reopened. Publishing from the inspection report selector did. This is an observation from one session, not yet a diagnosed/reproduced product bug.

### Template import

Opened **Templates → Upload → Spectora**.

- Sources offered: Spectora, HIP (Home Inspector Pro), HomeGauge, Horizon (Carson Dunlop).
- Spectora upload accepts **Excel files (.xls, .xlsx)**.
- Optional **Import cost estimates** checkbox; the explanation warns that stock Spectora templates can use the same default range for all comments and that imported estimates should be reviewed.
- Import remains disabled until a file is selected.
- The dialog says special PDF templates cannot be imported and directs users to Template Hub.
- For other platforms, the dialog offers help through the support chat.
- **No Spectora file has been uploaded yet.** A genuine export must first be obtained from Spectora; successful import and fidelity have not been checked.

### Template editor

- Hierarchy: template → section → subsection → fields grouped as Information, Limitations, and Defects/Deficiencies.
- The overview exposes template name, customer-facing name, introduction/summary rich text, ratings, document attachments, and structural counts.
- Sections and subsections expose title, rich description, private notes, and visibility.
- Comment controls include edit, duplicate, move, reorder, bulk selection, and auto-flag for review.
- Rich-text toolbars expose links, lists, text formatting, HTML source, images, video embeds, and tables.
- Template Tools includes alphabetical/usage sorting and category/report presentation settings.

### Preliminary feedback and design implications

1. **Export instructions at upload:** The Spectora upload dialog identifies Excel extensions but does not explain the assignment's crucial “Export HTML Text” choice in the view inspected. Add a short export checklist and explain why plain-text export loses formatting.
2. **Import confidence:** The cost-estimate warning gives useful context before importing. Extend this idea with source-versus-imported counts and specific warnings for unsupported content. Whether Hive already supplies this after upload is still unverified.
3. **Preserve hierarchy and categories:** The real editor demonstrates that descriptions, comment categories, private notes, and field types can carry meaning. Preserve any such information present in the export and explicitly distinguish unsupported values from values the export never contains.
4. **Clear completion state:** Saving and background publication are separate operations. Our importer should show a durable completed/failed state and explain whether a template was actually committed to the database.

## Spectora — authenticated exploration

The user completed trial signup and login. Opened the available **Residential Template**, whose editor lists 13 sections. Opened **Export to spreadsheet** and selected **Export HTML Text**. The export menu explicitly distinguishes preserving HTML from the plain-text option. Reached the generated page displaying **Your download is ready** and **Download File**.

The in-app browser blocked the final spreadsheet download. The saved `export.htm` was inspected and is the intermediate HTML download page, not an Excel workbook. The user was asked to save the actual workbook from a regular browser. It has not yet been checked into `samples/`; the app's QA fixture is explicitly synthetic. Hive import with the genuine file and fidelity checks remain pending.

## Binsr

Not explored. It is optional; time was focused on the required product access, input acquisition and importer baseline.

## Implementation informed by exploration

- Deterministic import mapping based on Spectora's official spreadsheet column guide; actual-export validation is still pending. No model-generated customer content.
- Structured database records for templates, sections, items, and comments, with stable ordering.
- Retain source-cell content/metadata for auditability and explicitly report unsupported content.
- A review step showing structural counts, rich-text previews, and actionable warnings is the customer-focused improvement.
- Verify the actual export plus synthetic edge cases, save/reopen persistence, independent copies, malformed input handling, and safe rich-content rendering.
