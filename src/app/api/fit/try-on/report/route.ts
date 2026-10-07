import {tryOnDeps} from '@/lib/fit/server/tryon-deps';
import {handleReport} from '@/lib/fit/server/tryon';

export async function POST(request: Request) {
  const deps = await tryOnDeps();
  if (!deps) return Response.json({error: 'unavailable'}, {status: 503, headers: {'cache-control': 'no-store'}});
  let token: unknown;
  try { token = ((await request.json()) as {token?: unknown})?.token; } catch { token = undefined; }
  const r = await handleReport(deps, {token});
  return Response.json(r.json, {status: r.status, headers: {'cache-control': 'no-store'}});
}
