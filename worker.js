const PROXY_PREFIXES = ['/api', '/storage'];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function isProxied(pathname) {
  return PROXY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function proxy(request, env) {
  const url = new URL(request.url);
  const origin = (env.API_ORIGIN || '').trim().replace(/\/+$/, '');

  if (!origin || origin.includes('REPLACE_ME')) {
    return json(
      { message: "API_ORIGIN n'est pas configure. Lancez: npx wrangler secret put API_ORIGIN" },
      503
    );
  }

  let target;
  try {
    target = new URL(url.pathname + url.search, origin);
  } catch {
    return json({ message: 'API_ORIGIN invalide' }, 500);
  }

  if (target.origin === url.origin) {
    return json({ message: 'API_ORIGIN ne peut pas pointer vers ce Worker (boucle detectee)' }, 508);
  }

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-worker');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-proto');

  const init = {
    method: request.method,
    headers,
    redirect: 'follow',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  try {
    return await fetch(target.toString(), init);
  } catch (err) {
    return json({ message: 'Backend injoignable', error: String(err) }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (isProxied(pathname)) {
      return proxy(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
