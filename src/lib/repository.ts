import { randomUUID } from "node:crypto";
import type { Client, InStatement, Row, Transaction } from "@libsql/client";
import { database } from "./db";
import { renderHtml, richWarnings } from "./rich-content";
import type {
  ImportResult,
  Template,
  TemplateCard,
  SectionNode,
  ItemNode,
} from "./types";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const str = (row: Row, key: string) => String(row[key] ?? "");
const json = <T>(row: Row, key: string): T => JSON.parse(str(row, key));
type Db = Client | Transaction;

export async function listTemplates(
  workspace: string,
): Promise<TemplateCard[]> {
  const db = await database();
  const { rows } = await db.execute({
    sql: "SELECT * FROM templates WHERE workspace=? ORDER BY created_at DESC",
    args: [workspace],
  });
  return rows.map((row) => ({
    id: str(row, "id"),
    name: str(row, "name"),
    stats: json(row, "stats"),
    version: Number(row.version),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
    copiedFrom: row.copied_from ? str(row, "copied_from") : null,
    sourceName: str(row, "source_name"),
    warningCount: json<unknown[]>(row, "warnings").length,
  }));
}

export async function getTemplate(
  workspace: string,
  id: string,
  connection?: Db,
): Promise<Template> {
  const db = connection ?? (await database());
  const { rows } = await db.execute({
    sql: "SELECT * FROM templates WHERE id=? AND workspace=?",
    args: [id, workspace],
  });
  if (!rows[0])
    throw new AppError("This template was not found in your workspace.", 404);
  const r = rows[0];
  const sectionRows = await db.execute({
    sql: "SELECT * FROM sections WHERE template_id=? ORDER BY position",
    args: [id],
  });
  const itemRows = await db.execute({
    sql: "SELECT * FROM items WHERE template_id=? ORDER BY position",
    args: [id],
  });
  const commentRows = await db.execute({
    sql: "SELECT * FROM comments WHERE template_id=? ORDER BY position",
    args: [id],
  });
  const sections: SectionNode[] = sectionRows.rows.map((s) => ({
    id: str(s, "id"),
    name: str(s, "name"),
    position: Number(s.position),
    items: [],
  }));
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const itemMap = new Map<string, ItemNode>();
  for (const i of itemRows.rows) {
    const item = {
      id: str(i, "id"),
      name: str(i, "name"),
      position: Number(i.position),
      comments: [],
    };
    itemMap.set(item.id, item);
    sectionMap.get(str(i, "section_id"))!.items.push(item);
  }
  for (const c of commentRows.rows)
    itemMap.get(str(c, "item_id"))!.comments.push({
      id: str(c, "id"),
      name: str(c, "name"),
      position: Number(c.position),
      html: str(c, "html"),
      renderedHtml: renderHtml(str(c, "html")),
      kind: str(c, "kind"),
      fieldType: str(c, "field_type"),
      source: json(c, "source_row"),
      warnings: json(c, "warnings"),
    });
  return {
    id,
    name: str(r, "name"),
    sourceName: str(r, "source_name"),
    sourceHash: str(r, "source_hash"),
    parserVersion: str(r, "parser_version"),
    stats: json(r, "stats"),
    warnings: json(r, "warnings"),
    unmappedColumns: json(r, "unmapped_columns"),
    sections,
    version: Number(r.version),
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
    copiedFrom: r.copied_from ? str(r, "copied_from") : null,
  };
}

async function insertInto(
  db: Db,
  workspace: string,
  data: ImportResult,
  bytes: Buffer | null,
  copiedFrom: string | null,
) {
  const quota = await db.execute({
    sql: "SELECT count(*) AS n FROM templates WHERE workspace=?",
    args: [workspace],
  });
  if (Number(quota.rows[0].n) >= 20)
    throw new AppError(
      "This demo workspace is limited to 20 templates. Please use an existing template.",
      429,
    );
  const id = randomUUID(),
    now = new Date().toISOString();
  const statements: InStatement[] = [];
  if (bytes)
    statements.push({
      sql: "INSERT OR IGNORE INTO sources(hash,filename,bytes) VALUES(?,?,?)",
      args: [data.sourceHash, data.sourceName, bytes],
    });
  statements.push({
    sql: `INSERT INTO templates(id,workspace,name,source_hash,source_name,parser_version,stats,warnings,unmapped_columns,version,copied_from,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?)`,
    args: [
      id,
      workspace,
      data.name,
      data.sourceHash,
      data.sourceName,
      data.parserVersion,
      JSON.stringify(data.stats),
      JSON.stringify(data.warnings),
      JSON.stringify(data.unmappedColumns),
      copiedFrom,
      now,
      now,
    ],
  });
  for (const s of data.sections) {
    const sid = randomUUID();
    statements.push({
      sql: "INSERT INTO sections(id,template_id,name,position) VALUES(?,?,?,?)",
      args: [sid, id, s.name, s.position],
    });
    for (const i of s.items) {
      const iid = randomUUID();
      statements.push({
        sql: "INSERT INTO items(id,section_id,template_id,name,position) VALUES(?,?,?,?,?)",
        args: [iid, sid, id, i.name, i.position],
      });
      for (const c of i.comments)
        statements.push({
          sql: "INSERT INTO comments(id,item_id,template_id,name,html,kind,field_type,position,source_row,warnings) VALUES(?,?,?,?,?,?,?,?,?,?)",
          args: [
            randomUUID(),
            iid,
            id,
            c.name,
            c.html,
            c.kind,
            c.fieldType,
            c.position,
            JSON.stringify(c.source),
            JSON.stringify(c.warnings),
          ],
        });
    }
  }
  await db.batch(statements);
  return id;
}

export async function storeImport(
  workspace: string,
  data: ImportResult,
  bytes: Buffer,
  seed = false,
) {
  const db = await database(),
    tx = await db.transaction("write");
  try {
    if (seed) {
      const existing = await tx.execute({
        sql: "SELECT id FROM templates WHERE workspace=? LIMIT 1",
        args: [workspace],
      });
      if (existing.rows.length) {
        await tx.commit();
        return String(existing.rows[0].id);
      }
    }
    const id = await insertInto(tx, workspace, data, bytes, null);
    await tx.commit();
    return id;
  } finally {
    tx.close();
  }
}

export async function copyTemplate(workspace: string, id: string) {
  const db = await database(),
    tx = await db.transaction("write");
  try {
    const original = await getTemplate(workspace, id, tx);
    const copy = { ...original, name: `${original.name} — Copy` };
    const copyId = await insertInto(tx, workspace, copy, null, id);
    await tx.commit();
    return copyId;
  } finally {
    tx.close();
  }
}

export type Edit = {
  entity: "template" | "section" | "item" | "comment";
  entityId: string;
  version: number;
  name?: string;
  html?: string;
};
export async function saveEdit(
  workspace: string,
  templateId: string,
  edit: Edit,
) {
  const db = await database(),
    tx = await db.transaction("write");
  try {
    const changed = await tx.execute({
      sql: "UPDATE templates SET version=version+1,updated_at=? WHERE id=? AND workspace=? AND version=?",
      args: [new Date().toISOString(), templateId, workspace, edit.version],
    });
    if (changed.rowsAffected !== 1)
      throw new AppError(
        "This template changed in another tab. Reload it before saving so no work is overwritten.",
        409,
      );
    let result;
    if (edit.entity === "template") {
      if (edit.entityId !== templateId || edit.name === undefined)
        throw new AppError("Invalid template edit.");
      result = await tx.execute({
        sql: "UPDATE templates SET name=? WHERE id=?",
        args: [edit.name, templateId],
      });
    } else if (edit.entity === "comment") {
      result = await tx.execute({
        sql: "UPDATE comments SET name=COALESCE(?,name),html=COALESCE(?,html),warnings=COALESCE(?,warnings) WHERE id=? AND template_id=?",
        args: [
          edit.name ?? null,
          edit.html ?? null,
          edit.html === undefined
            ? null
            : JSON.stringify(richWarnings(edit.html)),
          edit.entityId,
          templateId,
        ],
      });
    } else {
      if (edit.name === undefined) throw new AppError("A name is required.");
      const table = edit.entity === "section" ? "sections" : "items";
      result = await tx.execute({
        sql: `UPDATE ${table} SET name=? WHERE id=? AND template_id=?`,
        args: [edit.name, edit.entityId, templateId],
      });
    }
    if (result.rowsAffected !== 1)
      throw new AppError(
        "This field was not found in the selected template.",
        404,
      );
    await tx.commit();
    return edit.version + 1;
  } finally {
    tx.close();
  }
}

export async function originalFile(workspace: string, id: string) {
  const db = await database();
  const { rows } = await db.execute({
    sql: "SELECT s.bytes,t.source_name FROM sources s JOIN templates t ON t.source_hash=s.hash WHERE t.id=? AND t.workspace=?",
    args: [id, workspace],
  });
  if (!rows[0]) throw new AppError("Source file not found.", 404);
  return {
    bytes: rows[0].bytes as ArrayBuffer,
    name: str(rows[0], "source_name"),
  };
}
