import { NextRequest } from "next/server";
import { parseSpectora, MAX_FILE_BYTES } from "@/lib/importer";
import { AppError, getTemplate, storeImport } from "@/lib/repository";
import { workspace, response, failure, requireSameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    if (Number(req.headers.get("content-length")) > MAX_FILE_BYTES + 8192)
      throw new AppError("This file exceeds the 4 MB upload limit.", 413);
    const form = await req.formData(),
      file = form.get("file");
    if (!(file instanceof File))
      throw new AppError("Choose a Spectora spreadsheet to import.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = parseSpectora(bytes, file.name);
    const key = workspace(req);
    if (req.nextUrl.searchParams.get("commit") !== "true")
      return response(parsed, key);
    const name = form.get("name");
    if (typeof name === "string") {
      if (!name.trim() || name.length > 500)
        throw new AppError("Enter a template name of 1–500 characters.");
      parsed.name = name;
    }
    const id = await storeImport(key, parsed, bytes);
    return response(await getTemplate(key, id), key, 201);
  } catch (error) {
    return failure(error);
  }
}
