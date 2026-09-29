import { NextRequest } from "next/server";
import { listTemplates } from "@/lib/repository";
import { workspace, response, failure } from "@/lib/http";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const key = workspace(req);
    return response(await listTemplates(key), key);
  } catch (error) {
    return failure(error);
  }
}
