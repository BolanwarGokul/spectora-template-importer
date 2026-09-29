import { createHash, randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { AppError } from "./repository";
import { renderHtml, richWarnings } from "./rich-content";
import { restoreExactStrings } from "./exact-strings";
import type {
  CommentNode,
  ImportResult,
  ImportWarning,
  SectionNode,
  ItemNode,
} from "./types";

export const PARSER_VERSION = "spectora-html-v1";
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_ROWS = 10000,
  MAX_COLUMNS = 100,
  MAX_CELL = 100000;
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const required = ["section name", "item name", "comment name", "comment text"];
const core = new Set([
  ...required,
  "comment type",
  "answer type",
  "order (w/i item)",
]);
const warningMessages: Record<string, string> = {
  EMBED_NOT_RENDERED:
    "Embedded video, audio, scripts, forms, or other active content is retained in source cells but not executed in the preview.",
  UNSAFE_CONTENT:
    "Potentially unsafe markup or URL schemes are retained in the original source and blocked in the rendered preview.",
  REMOTE_IMAGE:
    "Images reference external URLs. Their addresses are preserved; image files are not copied and can become unavailable.",
  STYLE_FILTERED:
    "Inline styling is present. Basic colors, emphasis, alignment, and font sizes render; other CSS is not applied. Original HTML remains available.",
};

// Inspect central directory sizes before letting the workbook reader inflate ZIP members.
function checkZipSize(bytes: Buffer) {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return;
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0)
    throw new AppError(
      "The spreadsheet archive is incomplete. Please export it again.",
    );
  const entries = bytes.readUInt16LE(end + 10),
    offset = bytes.readUInt32LE(end + 16);
  if (entries === 65535 || offset === 0xffffffff)
    throw new AppError(
      "ZIP64 spreadsheets are not supported. Export a standard .xlsx file.",
    );
  let cursor = offset,
    total = 0;
  for (let n = 0; n < entries; n++) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw new AppError(
        "The spreadsheet archive is damaged. Please export it again.",
      );
    total += bytes.readUInt32LE(cursor + 24);
    if (total > 40 * 1024 * 1024)
      throw new AppError(
        "This workbook expands beyond the 40 MB safety limit. Export a smaller template.",
      );
    cursor +=
      46 +
      bytes.readUInt16LE(cursor + 28) +
      bytes.readUInt16LE(cursor + 30) +
      bytes.readUInt16LE(cursor + 32);
  }
}

export function parseSpectora(bytes: Buffer, filename: string): ImportResult {
  if (!/\.(xlsx|xls)$/i.test(filename))
    throw new AppError(
      "Choose a Spectora .xls or .xlsx spreadsheet exported with “Export HTML Text”. CSV, PDF, and web pages are not supported.",
    );
  if (!bytes.length)
    throw new AppError(
      "This file is empty. Download a fresh export from Spectora.",
    );
  if (bytes.length > MAX_FILE_BYTES)
    throw new AppError(
      "This file exceeds the 4 MB upload limit. Export a smaller template.",
      413,
    );
  const signature = bytes.subarray(0, 8).toString("hex");
  if (
    !signature.startsWith("504b0304") &&
    !signature.startsWith("d0cf11e0a1b11ae1")
  )
    throw new AppError(
      "This is not an Excel workbook. It may be a saved download page. In Spectora, wait for the export and choose “Download File”.",
    );
  checkZipSize(bytes);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "buffer",
      cellDates: false,
      cellFormula: true,
      cellHTML: false,
      bookFiles: true,
      sheetRows: MAX_ROWS + 25,
    });
    restoreExactStrings(workbook);
  } catch {
    throw new AppError(
      "This workbook could not be read. It may be damaged, encrypted, or password protected. Export it again from Spectora.",
    );
  }
  const result: ImportResult = {
    name:
      filename
        .replace(/\.(xlsx|xls)$/i, "")
        .replace(/[_-]+/g, " ")
        .trim() || "Imported template",
    sourceName: filename,
    sourceHash: createHash("sha256").update(bytes).digest("hex"),
    parserVersion: PARSER_VERSION,
    sections: [],
    stats: {
      sections: 0,
      items: 0,
      comments: 0,
      rows: 0,
      richText: 0,
      links: 0,
      images: 0,
    },
    warnings: [],
    unmappedColumns: [],
  };
  const warningCounts = new Map<string, number>(),
    metadata = new Set<string>();
  const increment = (code: string) =>
    warningCounts.set(code, (warningCounts.get(code) || 0) + 1);
  let foundSheets = 0;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) continue;
    const range = XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"]);
    if (range.e.r > MAX_ROWS + 20 || range.e.c >= MAX_COLUMNS)
      throw new AppError(
        `“${sheetName}” exceeds 10,000 rows or 100 columns. Please split this export into smaller templates.`,
      );
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: true,
    });
    if (!rows.some((r) => r.some((v) => String(v) !== ""))) continue;
    const headerIndex = rows.findIndex(
      (r, index) =>
        index < 20 &&
        required.every((h) => r.some((v) => normalize(String(v)) === h)),
    );
    if (headerIndex < 0)
      throw new AppError(
        `“${sheetName}” does not contain the Spectora headers Section Name, Item Name, Comment Name, and Comment Text. No rows were imported. Use Export to spreadsheet → Export HTML Text.`,
      );
    foundSheets++;
    if (headerIndex > 0)
      result.warnings.push({
        code: "PREAMBLE_RETAINED",
        sheet: sheetName,
        message: `${headerIndex} row(s) before the header in “${sheetName}” are retained in the original workbook but are not template content.`,
      });
    const headers = rows[headerIndex].map((v) => String(v));
    const keys = headers.map(normalize);
    const nonemptyKeys = keys.filter(Boolean);
    if (new Set(nonemptyKeys).size !== nonemptyKeys.length)
      throw new AppError(
        `“${sheetName}” has duplicate column headings. Make headings unique before importing.`,
      );
    const column = (key: string) => keys.indexOf(key);
    const value = (r: unknown[], key: string) => String(r[column(key)] ?? "");
    const sectionsByName = new Map<string, SectionNode>(),
      itemsBySection = new Map<string, Map<string, ItemNode>>();
    const itemOrders = new Map<
      string,
      { comment: CommentNode; order: number | null }[]
    >();
    let previousSection = "";
    const seenSections = new Set<string>();
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row.some((v) => v !== "" && v !== null && v !== undefined)) continue;
      if (++result.stats.rows > MAX_ROWS)
        throw new AppError(
          "This export exceeds the 10,000-row limit. No partial template was saved.",
        );
      const rowNumber = rowIndex + 1;
      for (let c = 0; c < row.length; c++) {
        if (String(row[c] ?? "").length > MAX_CELL)
          throw new AppError(
            `“${sheetName}”, row ${rowNumber} has a cell longer than 100,000 characters.`,
          );
        if (sheet[XLSX.utils.encode_cell({ r: rowIndex, c })]?.f)
          throw new AppError(
            `“${sheetName}”, row ${rowNumber} contains a formula. Export values rather than formulas; formulas are not evaluated or silently converted.`,
          );
      }
      const sectionName = value(row, "section name"),
        itemName = value(row, "item name");
      if (!sectionName.trim() || !itemName.trim())
        throw new AppError(
          `“${sheetName}”, row ${rowNumber} is missing a section or item name. No content was imported. Fill in the hierarchy rather than relying on blank or merged cells.`,
        );
      if (seenSections.has(sectionName) && sectionName !== previousSection)
        increment("REPEATED_SECTION_BLOCK");
      seenSections.add(sectionName);
      previousSection = sectionName;
      let section = sectionsByName.get(sectionName);
      if (!section) {
        section = {
          id: randomUUID(),
          name: sectionName,
          position: result.sections.length,
          items: [],
        };
        sectionsByName.set(sectionName, section);
        itemsBySection.set(section.id, new Map());
        result.sections.push(section);
      }
      const itemMap = itemsBySection.get(section.id)!;
      let item = itemMap.get(itemName);
      if (!item) {
        item = {
          id: randomUUID(),
          name: itemName,
          position: section.items.length,
          comments: [],
        };
        itemMap.set(itemName, item);
        section.items.push(item);
        itemOrders.set(item.id, []);
      }
      const cells: Record<string, string> = Object.create(null);
      for (let c = 0; c < Math.max(headers.length, row.length); c++) {
        const key = headers[c] || `Unnamed column ${XLSX.utils.encode_col(c)}`;
        cells[key] = String(row[c] ?? "");
        if (cells[key] !== "" && !core.has(normalize(key))) metadata.add(key);
      }
      const kind = value(row, "comment type") || "info",
        fieldType = value(row, "answer type");
      let html = value(row, "comment text");
      const name = value(row, "comment name");
      // Empty names remain empty. The UI labels them without rewriting source data.
      if (!name.trim()) increment("EMPTY_COMMENT_NAME");
      if (!["info", "limit", "defect"].includes(kind.toLowerCase()))
        increment("UNKNOWN_COMMENT_TYPE");
      const warnings = richWarnings(html);
      for (const warning of warnings) increment(warning);
      if (/<[a-z][\s\S]*>/i.test(html)) result.stats.richText++;
      result.stats.links += (html.match(/<a\b/gi) || []).length;
      result.stats.images += (html.match(/<img\b/gi) || []).length;
      const comment: CommentNode = {
        id: randomUUID(),
        name,
        html,
        renderedHtml: renderHtml(html),
        kind,
        fieldType,
        position: item.comments.length,
        source: { sheet: sheetName, row: rowNumber, cells },
        warnings,
      };
      item.comments.push(comment);
      result.stats.comments++;
      const order = value(row, "order (w/i item)");
      itemOrders
        .get(item.id)!
        .push({
          comment,
          order:
            order.trim() !== "" && Number.isFinite(Number(order))
              ? Number(order)
              : null,
        });
    }
    for (const section of sectionsByName.values())
      for (const item of section.items) {
        const records = itemOrders.get(item.id)!;
        if (records.every((r) => r.order !== null)) {
          records.sort(
            (a, b) =>
              a.order! - b.order! ||
              a.comment.source.row - b.comment.source.row,
          );
          item.comments = records.map((r, index) => ({
            ...r.comment,
            position: index,
          }));
          if (new Set(records.map((r) => r.order)).size !== records.length)
            increment("DUPLICATE_ORDER");
        } else if (records.some((r) => r.order !== null))
          increment("MIXED_ORDER");
      }
  }
  if (!foundSheets || !result.stats.comments)
    throw new AppError(
      "No template comments were found. Export a populated Spectora template.",
    );
  result.stats.sections = result.sections.length;
  result.stats.items = result.sections.reduce((n, s) => n + s.items.length, 0);
  result.unmappedColumns = [...metadata];
  if (metadata.size)
    result.warnings.push({
      code: "METADATA_RETAINED",
      message: `${metadata.size} additional column(s) are preserved in each comment’s source: ${[...metadata].join(", ")}. Field options, defaults, photos, estimates, and behavior settings are available for review but are not active inspection controls in this editor.`,
    });
  if (!result.stats.richText)
    result.warnings.push({
      code: "NO_HTML_DETECTED",
      message:
        "No HTML markup was found. This may be a plain-text export or a template without formatting. Formatting absent from the file cannot be recovered.",
    });
  const other: Record<string, string> = {
    EMPTY_COMMENT_NAME:
      "Comment names are blank. They remain blank in storage; the editor labels them “Untitled comment”.",
    UNKNOWN_COMMENT_TYPE:
      "Unrecognized comment categories are preserved as source values and displayed using the default information style.",
    REPEATED_SECTION_BLOCK:
      "Repeated section names appear in separate row blocks. They are grouped by exact name in first-appearance order; the export contains no section IDs to distinguish identically named sections.",
    DUPLICATE_ORDER:
      "Duplicate order values occur within items. Ties retain original spreadsheet row order.",
    MIXED_ORDER:
      "Some items mix valid and missing/invalid order values. Those items retain spreadsheet row order rather than guessing an order.",
  };
  for (const [code, count] of warningCounts)
    result.warnings.push({
      code,
      message: `${count} occurrence(s). ${warningMessages[code] || other[code]}`,
    });
  return result;
}
