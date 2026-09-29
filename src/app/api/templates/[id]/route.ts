import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AppError, getTemplate, saveEdit } from '@/lib/repository';
import { workspace, response, failure, requireSameOrigin } from '@/lib/http';

const editSchema=z.object({entity:z.enum(['template','section','item','comment']),entityId:z.string().min(1).max(200),version:z.number().int().positive(),name:z.string().min(1).max(500).refine(s=>s.trim().length>0).optional(),html:z.string().max(100000).optional()}).refine(v=>v.name!==undefined||v.html!==undefined);
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(req:NextRequest,ctx:Context) {
  try { const key=workspace(req); return response(await getTemplate(key,(await ctx.params).id),key); }
  catch(error) { return failure(error); }
}
export async function PATCH(req:NextRequest,ctx:Context) {
  try {
    requireSameOrigin(req);
    if(Number(req.headers.get('content-length'))>150000) throw new AppError('This edit is too large.',413);
    const parsed=editSchema.safeParse(await req.json());
    if(!parsed.success) throw new AppError('Enter a non-empty name (up to 500 characters) or comment (up to 100,000 characters).');
    const key=workspace(req),id=(await ctx.params).id;
    await saveEdit(key,id,parsed.data);
    return response(await getTemplate(key,id),key);
  } catch(error) { return failure(error); }
}
