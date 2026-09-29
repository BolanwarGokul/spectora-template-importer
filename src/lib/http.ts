import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './repository';

const COOKIE = 'fieldnote_workspace';
export function workspace(req: NextRequest) {
  const previous = req.cookies.get(COOKIE)?.value;
  return previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString('hex');
}
export function response(data: unknown, key: string, status = 200) {
  const res = NextResponse.json(data, { status });
  res.cookies.set(COOKIE,key,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*365});
  res.headers.set('Cache-Control','no-store');
  return res;
}
export function requireSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin && origin !== req.nextUrl.origin) throw new AppError('Requests must come from this app.',403);
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('Cross-site requests are not allowed.',403);
}
export function failure(error: unknown) {
  if (error instanceof AppError) return NextResponse.json({error:error.message},{status:error.status});
  console.error(error instanceof Error ? error.message : 'Unexpected application error');
  return NextResponse.json({error:'The server could not finish this request. Your saved templates are unchanged. Please try again.'},{status:500});
}
