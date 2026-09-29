import { createClient, type Client } from '@libsql/client';
import { mkdirSync } from 'node:fs';

export const schema = `
CREATE TABLE IF NOT EXISTS sources (
 hash TEXT PRIMARY KEY, filename TEXT NOT NULL, bytes BLOB NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS templates (
 id TEXT PRIMARY KEY, workspace TEXT NOT NULL, name TEXT NOT NULL,
 source_hash TEXT NOT NULL REFERENCES sources(hash), source_name TEXT NOT NULL,
 parser_version TEXT NOT NULL, stats TEXT NOT NULL, warnings TEXT NOT NULL,
 unmapped_columns TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 copied_from TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS templates_workspace ON templates(workspace, created_at);
CREATE TABLE IF NOT EXISTS sections (
 id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
 name TEXT NOT NULL, position INTEGER NOT NULL, UNIQUE(template_id, position)
);
CREATE TABLE IF NOT EXISTS items (
 id TEXT PRIMARY KEY, section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
 template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
 name TEXT NOT NULL, position INTEGER NOT NULL, UNIQUE(section_id, position)
);
CREATE TABLE IF NOT EXISTS comments (
 id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
 template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
 name TEXT NOT NULL, html TEXT NOT NULL, kind TEXT NOT NULL, field_type TEXT NOT NULL,
 position INTEGER NOT NULL, source_row TEXT NOT NULL, warnings TEXT NOT NULL,
 UNIQUE(item_id, position)
);
CREATE INDEX IF NOT EXISTS sections_template ON sections(template_id);
CREATE INDEX IF NOT EXISTS items_template ON items(template_id);
CREATE INDEX IF NOT EXISTS comments_template ON comments(template_id);
`;

let client: Client | undefined;
let initializing: Promise<void> | undefined;
export async function database(): Promise<Client> {
  if (!client) {
    const url = process.env.DATABASE_URL || 'file:data/templates.db';
    if (process.env.VERCEL && url.startsWith('file:')) {
      throw new Error('A remote DATABASE_URL is required on Vercel. Local files are not durable there.');
    }
    if (url.startsWith('file:data/')) mkdirSync('data', { recursive: true });
    client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  const db = client;
  initializing ??= db.executeMultiple(schema).catch(error => { initializing = undefined; throw error; });
  await initializing;
  return db;
}
