import type { WorkBook } from "xlsx";
import path from "node:path";

// SheetJS 0.20.3 decodes XML twice for the OOXML t="str" cell representation.
// HTML-text exports need one XML decode: literal "&amp;" inside HTML must survive.
// Shared-string and inline-string cells are already handled correctly by SheetJS.
function decodeXml(text: string) {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,
    (entity) => {
      const named: Record<string, string> = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
      };
      if (named[entity]) return named[entity];
      const n = entity.startsWith("&#x")
        ? parseInt(entity.slice(3, -1), 16)
        : parseInt(entity.slice(2, -1), 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : entity;
    },
  );
}
function attrs(tag: string) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [
      m[1],
      decodeXml(m[2] ?? m[3]),
    ]),
  );
}
export function restoreExactStrings(workbook: WorkBook) {
  const files = (
    workbook as WorkBook & { files?: Record<string, { content: Uint8Array }> }
  ).files;
  if (!files?.["xl/workbook.xml"]) return;
  const text = (name: string) =>
    files[name] ? Buffer.from(files[name].content).toString("utf8") : "";
  const relationships = new Map(
    [
      ...text("xl/_rels/workbook.xml.rels").matchAll(
        /<(?:\w+:)?Relationship\b([^>]*?)\/?\s*>/g,
      ),
    ].map((m) => {
      const a = attrs(m[1]);
      return [a.Id, a.Target];
    }),
  );
  for (const match of text("xl/workbook.xml").matchAll(
    /<(?:\w+:)?sheet\b([^>]*?)\/?\s*>/g,
  )) {
    const a = attrs(match[1]),
      target = relationships.get(a["r:id"]);
    if (!target) continue;
    const sheet = workbook.Sheets[a.name];
    if (!sheet) continue;
    const file = target.startsWith("/")
      ? target.slice(1)
      : path.posix.normalize(path.posix.join("xl", target));
    for (const cell of text(file).matchAll(
      /<(?:\w+:)?c\b([^>]*?)>([\s\S]*?)<\/(?:\w+:)?c>/g,
    )) {
      const attributes = attrs(cell[1]);
      if (attributes.t !== "str" || !sheet[attributes.r]) continue;
      const value = cell[2].match(
        /<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v>/,
      );
      if (value)
        sheet[attributes.r].v = decodeXml(value[1]).replace(
          /_x([\da-f]{4})_/gi,
          (_, n) => String.fromCharCode(parseInt(n, 16)),
        );
    }
  }
}
