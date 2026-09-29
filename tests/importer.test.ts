import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseSpectora } from "../src/lib/importer";
import { renderHtml } from "../src/lib/rich-content";

const headings = [
  "Section Name",
  "Item Name",
  "Comment Name",
  "Comment Text",
  "Comment Type",
  "Order (w/i item)",
  "Answer Type",
  "Multiple Choice Options",
];
function workbook(rows: unknown[][], type: XLSX.BookType = "xlsx") {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([headings, ...rows]),
    "Template",
  );
  return XLSX.write(book, { type: "buffer", bookType: type }) as Buffer;
}
const row = (
  name = "Finding",
  text = "<p>A <strong>careful</strong> observation.</p>",
  order: unknown = 1,
) => ["Roof", "Covering", name, text, "defect", order, "text", ""];

test("retains exact source text, hierarchy, category, and non-core metadata", () => {
  const raw =
    '<p>  Café &amp; plumbing — <a href="https://example.com/guide?q=1">guide</a></p>';
  const result = parseSpectora(
    workbook([
      [
        "Plumbing",
        "Fixtures",
        " Water pressure ",
        raw,
        "info",
        1,
        "checkbox",
        "Low, Normal, High",
      ],
    ]),
    "sample.xlsx",
  );
  assert.equal(result.sections[0].name, "Plumbing");
  const comment = result.sections[0].items[0].comments[0];
  assert.equal(comment.name, " Water pressure ");
  assert.equal(comment.html, raw);
  assert.equal(comment.kind, "info");
  assert.equal(
    comment.source.cells["Multiple Choice Options"],
    "Low, Normal, High",
  );
  assert.equal(comment.source.row, 2);
  assert.equal(result.stats.links, 1);
  assert.equal(result.stats.comments, 1);
  assert.ok(result.warnings.some((w) => w.code === "METADATA_RETAINED"));
});
test("preserves section/item first-appearance order and explicit comment ordering", () => {
  const result = parseSpectora(
    workbook([
      row("Second", "<p>Two</p>", 2),
      row("First", "<p>One</p>", 1),
      ["Exterior", "Trim", "Third", "<p>Three</p>", "info", 1, "text", ""],
      ["Roof", "Drainage", "Fourth", "<p>Four</p>", "info", 1, "text", ""],
    ]),
    "sample.xlsx",
  );
  assert.deepEqual(
    result.sections.map((s) => s.name),
    ["Roof", "Exterior"],
  );
  assert.deepEqual(
    result.sections[0].items.map((i) => i.name),
    ["Covering", "Drainage"],
  );
  assert.deepEqual(
    result.sections[0].items[0].comments.map((c) => c.name),
    ["First", "Second"],
  );
  assert.ok(result.warnings.some((w) => w.code === "REPEATED_SECTION_BLOCK"));
});
test("duplicate comment names are separate records; ties remain stable", () => {
  const result = parseSpectora(
    workbook([row("Same", "<p>One</p>"), row("Same", "<p>Two</p>")]),
    "sample.xlsx",
  );
  const comments = result.sections[0].items[0].comments;
  assert.equal(comments.length, 2);
  assert.notEqual(comments[0].id, comments[1].id);
  assert.equal(comments[1].html, "<p>Two</p>");
  assert.ok(result.warnings.some((w) => w.code === "DUPLICATE_ORDER"));
});
test("mixed order values preserve row order and report the ambiguity", () => {
  const result = parseSpectora(
    workbook([row("First", "", 7), row("Second", "", "")]),
    "sample.xlsx",
  );
  assert.deepEqual(
    result.sections[0].items[0].comments.map((c) => c.name),
    ["First", "Second"],
  );
  assert.ok(result.warnings.some((w) => w.code === "MIXED_ORDER"));
});
test("accepts BIFF .xls as well as .xlsx", () => {
  const result = parseSpectora(workbook([row()], "biff8"), "legacy.xls");
  assert.equal(result.stats.comments, 1);
});
test("does not silently drop blank comment text or a numeric zero", () => {
  const result = parseSpectora(
    workbook([row("Empty", "", 1), row("Zero", 0 as unknown as string, 2)]),
    "sample.xlsx",
  );
  assert.equal(result.stats.comments, 2);
  assert.equal(result.sections[0].items[0].comments[1].html, "0");
});
test("rejects unsupported files and a saved HTML download page", () => {
  assert.throws(
    () => parseSpectora(Buffer.from("bad"), "sample.pdf"),
    /Choose a Spectora/,
  );
  assert.throws(
    () =>
      parseSpectora(Buffer.from("<html>Download ready</html>"), "sample.xls"),
    /saved download page/,
  );
});
test("rejects missing hierarchy instead of assigning comments to a guessed parent", () => {
  assert.throws(
    () =>
      parseSpectora(
        workbook([["", "Covering", "Finding", "Text"]]),
        "sample.xlsx",
      ),
    /row 2 is missing/,
  );
});
test("rejects unknown populated sheets rather than silently skipping them", () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([headings, row()]),
    "Template",
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([["Important notes"], ["Keep these"]]),
    "Notes",
  );
  assert.throws(
    () =>
      parseSpectora(
        XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
        "sample.xlsx",
      ),
    /Notes.*does not contain/,
  );
});
test("rejects formulas and duplicate headers explicitly", () => {
  const book = XLSX.utils.book_new(),
    sheet = XLSX.utils.aoa_to_sheet([headings, row()]);
  sheet.D2 = { t: "s", f: '"hello"', v: "hello" };
  XLSX.utils.book_append_sheet(book, sheet, "Template");
  assert.throws(
    () =>
      parseSpectora(
        XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
        "formula.xlsx",
      ),
    /contains a formula/,
  );
  const duplicate = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    duplicate,
    XLSX.utils.aoa_to_sheet([[...headings, "Comment Text"], row()]),
    "Template",
  );
  assert.throws(
    () =>
      parseSpectora(
        XLSX.write(duplicate, { type: "buffer", bookType: "xlsx" }),
        "duplicate.xlsx",
      ),
    /duplicate column/,
  );
});
test("safe preview keeps links/formatting but never executes active content", () => {
  const raw =
    '<p style="color:#336699;position:fixed">Safe <strong>bold</strong></p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a><img src="x" onerror="alert(1)"><iframe src="https://example.com"></iframe>';
  const html = renderHtml(raw);
  assert.ok(html.includes("<strong>bold</strong>"));
  assert.ok(html.includes("https://example.com"));
  assert.ok(html.includes("noopener noreferrer"));
  assert.ok(!/script|onerror|javascript:|iframe|position:fixed/i.test(html));
  const result = parseSpectora(workbook([row("Unsafe", raw)]), "sample.xlsx");
  assert.equal(result.sections[0].items[0].comments[0].html, raw);
  assert.ok(result.warnings.some((w) => w.code === "UNSAFE_CONTENT"));
  assert.ok(result.warnings.some((w) => w.code === "EMBED_NOT_RENDERED"));
});
