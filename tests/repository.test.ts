import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import * as XLSX from "xlsx";
import { parseSpectora } from "../src/lib/importer";
import {
  storeImport,
  getTemplate,
  copyTemplate,
  saveEdit,
  listTemplates,
  originalFile,
} from "../src/lib/repository";

process.env.DATABASE_URL = `file:${path.join(mkdtempSync(path.join(tmpdir(), "fieldnote-tests-")), "test.db").replaceAll("\\", "/")}`;
function fixture() {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    b,
    XLSX.utils.aoa_to_sheet([
      [
        "Section Name",
        "Item Name",
        "Comment Name",
        "Comment Text",
        "Comment Type",
      ],
      [
        "Roof",
        "Covering",
        "Condition",
        "<p>Original <strong>wording</strong>.</p>",
        "info",
      ],
    ]),
    "Template",
  );
  return XLSX.write(b, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

test("imports, saves, and reopens persisted records through a fresh database connection", async () => {
  const bytes = fixture(),
    parsed = parseSpectora(bytes, "sample.xlsx");
  const id = await storeImport("owner", parsed, bytes);
  const template = await getTemplate("owner", id),
    comment = template.sections[0].items[0].comments[0];
  await saveEdit("owner", id, {
    entity: "comment",
    entityId: comment.id,
    version: 1,
    html: "<p>Saved edit</p>",
    name: "Edited condition",
  });
  const fresh = createClient({ url: process.env.DATABASE_URL! });
  const rows = await fresh.execute({
    sql: "SELECT name,html,source_row FROM comments WHERE id=?",
    args: [comment.id],
  });
  assert.equal(rows.rows[0].name, "Edited condition");
  assert.equal(rows.rows[0].html, "<p>Saved edit</p>");
  assert.equal(
    JSON.parse(String(rows.rows[0].source_row)).cells["Comment Text"],
    "<p>Original <strong>wording</strong>.</p>",
  );
  fresh.close();
  const original = await originalFile("owner", id);
  assert.ok(Buffer.from(original.bytes).equals(bytes));
});
test("copy has distinct IDs and editing it leaves the original unchanged", async () => {
  const bytes = fixture(),
    id = await storeImport(
      "copies",
      parseSpectora(bytes, "sample.xlsx"),
      bytes,
    );
  const copyId = await copyTemplate("copies", id),
    original = await getTemplate("copies", id),
    copy = await getTemplate("copies", copyId);
  assert.notEqual(original.sections[0].id, copy.sections[0].id);
  assert.notEqual(
    original.sections[0].items[0].id,
    copy.sections[0].items[0].id,
  );
  const target = copy.sections[0].items[0].comments[0];
  assert.notEqual(target.id, original.sections[0].items[0].comments[0].id);
  await saveEdit("copies", copyId, {
    entity: "comment",
    entityId: target.id,
    version: 1,
    html: "Copy-only wording",
  });
  assert.equal(
    (await getTemplate("copies", id)).sections[0].items[0].comments[0].html,
    original.sections[0].items[0].comments[0].html,
  );
  assert.equal(
    (await getTemplate("copies", copyId)).sections[0].items[0].comments[0].html,
    "Copy-only wording",
  );
});
test("optimistic concurrency rejects stale saves without overwriting content", async () => {
  const bytes = fixture(),
    id = await storeImport(
      "version",
      parseSpectora(bytes, "sample.xlsx"),
      bytes,
    );
  await saveEdit("version", id, {
    entity: "template",
    entityId: id,
    version: 1,
    name: "First save",
  });
  await assert.rejects(
    saveEdit("version", id, {
      entity: "template",
      entityId: id,
      version: 1,
      name: "Stale save",
    }),
    /another tab/,
  );
  assert.equal((await getTemplate("version", id)).name, "First save");
});
test("workspace isolation applies to reads, writes, copies and original downloads", async () => {
  const bytes = fixture(),
    id = await storeImport(
      "private",
      parseSpectora(bytes, "sample.xlsx"),
      bytes,
    );
  await assert.rejects(getTemplate("stranger", id), /not found/);
  await assert.rejects(copyTemplate("stranger", id), /not found/);
  await assert.rejects(originalFile("stranger", id), /not found/);
  await assert.rejects(
    saveEdit("stranger", id, {
      entity: "template",
      entityId: id,
      version: 1,
      name: "Bad",
    }),
  );
  assert.equal((await listTemplates("stranger")).length, 0);
});
test("failed entity edits roll back the version increment atomically", async () => {
  const bytes = fixture(),
    id = await storeImport(
      "atomic",
      parseSpectora(bytes, "sample.xlsx"),
      bytes,
    );
  await assert.rejects(
    saveEdit("atomic", id, {
      entity: "section",
      entityId: "missing",
      version: 1,
      name: "Bad",
    }),
    /not found/,
  );
  assert.equal((await getTemplate("atomic", id)).version, 1);
});
