import { NextRequest } from "next/server";
import { seedWorkspace } from "@/lib/seed";
import { workspace, response, failure, requireSameOrigin } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const key = workspace(req);
    await seedWorkspace(key);
    return response({ ready: true }, key);
  } catch (error) {
    return failure(error);
  }
}
