function isLocalHostRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

export async function scrapeWowheadPage(url: string, cacheApiBase: string = ''): Promise<string> {
  const parsed = new URL(url);

  if (!parsed.hostname.includes('wowhead.com')) {
    throw new Error('Only wowhead.com URLs are supported.');
  }

  // Prefer backend endpoint when available (works on hosted envs).
  if (cacheApiBase) {
    const normalizedBase = cacheApiBase.replace(/\/$/, '');
    const apiUrl = `${normalizedBase}/wowhead/scrape?url=${encodeURIComponent(url)}`;
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });

    if (!apiResponse.ok) {
      throw new Error(`Failed to scrape via backend (${apiResponse.status})`);
    }

    return await apiResponse.text();
  }

  // Local Angular dev server proxy: /guide -> https://www.wowhead.com/...
  const proxiedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  const proxyUrl = proxiedPath.startsWith('/guide') ? proxiedPath : `/guide${proxiedPath}`;

  if (isLocalHostRuntime()) {
    const proxiedResponse = await fetch(proxyUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });

    if (!proxiedResponse.ok) {
      throw new Error(`Failed to scrape via local proxy (${proxiedResponse.status})`);
    }

    return await proxiedResponse.text();
  }

  throw new Error('No scrape backend configured. Browser direct fetch is blocked by CORS.');
}
