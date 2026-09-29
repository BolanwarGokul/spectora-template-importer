import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { parseSpectora } from "../src/lib/importer";

const files = (await readdir("samples")).filter((name) =>
  /\.(xlsx|xls)$/i.test(name),
);
assert.ok(
  files.length,
  "No actual workbook in samples/. Download the Excel file, not export.htm.",
);
for (const name of files) {
  const parsed = parseSpectora(
    await readFile(path.join("samples", name)),
    name,
  );
  const comments = parsed.sections.flatMap((s) =>
    s.items.flatMap((i) => i.comments),
  );
  assert.equal(
    comments.length,
    parsed.stats.rows,
    "Every populated source row must be imported.",
  );
  for (const comment of comments) {
    const sourceKey = Object.keys(comment.source.cells).find(
      (key) => key.trim().toLowerCase().replace(/\s+/g, " ") === "comment text",
    );
    assert.ok(sourceKey);
    assert.equal(
      comment.html,
      comment.source.cells[sourceKey],
      "Stored HTML must match the original cell.",
    );
  }
  console.log(
    JSON.stringify(
      {
        name,
        sha256: parsed.sourceHash,
        stats: parsed.stats,
        warnings: parsed.warnings,
        sections: parsed.sections.map((s) => ({
          name: s.name,
          items: s.items.length,
        })),
      },
      null,
      2,
    ),
  );
}
