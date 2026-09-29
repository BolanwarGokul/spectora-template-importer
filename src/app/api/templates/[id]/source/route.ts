import { NextRequest, NextResponse } from "next/server";
import { originalFile } from "@/lib/repository";
import { workspace, failure } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const file = await originalFile(workspace(req), (await ctx.params).id);
    return new NextResponse(file.bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
