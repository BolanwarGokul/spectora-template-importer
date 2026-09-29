import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseSpectora } from "../src/lib/importer";
import {
  storeImport,
  getTemplate,
  saveEdit,
  copyTemplate,
  originalFile,
} from "../src/lib/repository";
import { database } from "../src/lib/db";

async function main() {
  assert.ok(
    process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:"),
    "Set a remote DATABASE_URL and DATABASE_AUTH_TOKEN first.",
  );
  // Creates two synthetic records in an isolated test workspace; never touches reviewer data.
  const workspace = `remote-check-${randomUUID()}`;
  const bytes = await readFile("tests/fixtures/synthetic-qa.xlsx");
  const parsed = parseSpectora(bytes, "synthetic-qa.xlsx");
  parsed.name = "Synthetic remote persistence check";
  const id = await storeImport(workspace, parsed, bytes);
  const original = await getTemplate(workspace, id);
  await saveEdit(workspace, id, {
    entity: "section",
    entityId: original.sections[0].id,
    version: original.version,
    name: "Remote saved section",
  });
  const copyId = await copyTemplate(workspace, id);
  const copy = await getTemplate(workspace, copyId);
  await saveEdit(workspace, copyId, {
    entity: "section",
    entityId: copy.sections[0].id,
    version: copy.version,
    name: "Copy-only section",
  });
  assert.equal(
    (await getTemplate(workspace, id)).sections[0].name,
    "Remote saved section",
  );
  assert.equal(
    (await getTemplate(workspace, copyId)).sections[0].name,
    "Copy-only section",
  );
  assert.notEqual(original.sections[0].id, copy.sections[0].id);
  assert.ok(
    Buffer.from((await originalFile(workspace, id)).bytes).equals(bytes),
  );
  console.log(
    "Remote database verified: import, saved edit, independent copy, original source bytes.",
  );
  (await database()).close();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
