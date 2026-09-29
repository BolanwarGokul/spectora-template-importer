import { NextRequest } from 'next/server';
import { copyTemplate, getTemplate } from '@/lib/repository';
import { workspace, response, failure, requireSameOrigin } from '@/lib/http';
export const runtime='nodejs';
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}) {
  try { requireSameOrigin(req); const key=workspace(req); const id=await copyTemplate(key,(await ctx.params).id); return response(await getTemplate(key,id),key,201); }
  catch(error) { return failure(error); }
}
