import {tryOnDeps} from '@/lib/fit/server/tryon-deps';
import {tryOnConfig} from '@/lib/fit/server/config';
import {handleTryOn} from '@/lib/fit/server/tryon';

const NO_STORE = {'cache-control': 'no-store'};

/** Whether the try-on button should show at all. */
export async function GET() {
  return Response.json({available: tryOnConfig().available}, {headers: NO_STORE});
}

export async function POST(request: Request) {
  const deps = await tryOnDeps();
  if (!deps) return Response.json({error: 'unavailable'}, {status: 503, headers: NO_STORE});
  const r = await handleTryOn(deps, {contentLength: Number(request.headers.get('content-length')) || null, readForm: () => request.formData()});
  if (r.image) return new Response(r.image, {status: 200, headers: {...NO_STORE, 'content-type': r.image.type || 'image/png', 'x-tryon-model': r.model ?? '', 'x-tryon-prompt': r.promptVersion ?? ''}});
  return Response.json(r.json, {status: r.status, headers: NO_STORE});
}
