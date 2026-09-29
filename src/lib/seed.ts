import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseSpectora } from "./importer";
import { listTemplates, storeImport } from "./repository";

export async function seedWorkspace(workspace: string) {
  if ((await listTemplates(workspace)).length) return;
  const directory = path.join(process.cwd(), "samples");
  const files = await readdir(directory).catch(() => []);
  const sample = files
    .sort()
    .find((f) => /\.(xls|xlsx)$/i.test(f) && !/^synthetic/i.test(f));
  if (!sample) return;
  const bytes = await readFile(path.join(directory, sample));
  const parsed = parseSpectora(bytes, sample);
  parsed.name = "Residential Template";
  await storeImport(workspace, parsed, bytes, true);
}
