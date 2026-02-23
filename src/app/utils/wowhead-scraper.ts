export async function scrapeWowheadPage(url: string): Promise<string> {
  const parsed = new URL(url);

  if (!parsed.hostname.includes('wowhead.com')) {
    throw new Error('Only wowhead.com URLs are supported.');
  }

  const proxiedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  const proxyUrl = proxiedPath.startsWith('/guide') ? proxiedPath : `/guide${proxiedPath}`;

  // Prefer local proxy to avoid browser CORS issues.
  try {
    const proxiedResponse = await fetch(proxyUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
    });

    if (proxiedResponse.ok) {
      return await proxiedResponse.text();
    }
  } catch {
    // Fallback to direct URL below.
  }

  const directResponse = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'text/html' },
  });

  if (!directResponse.ok) {
    throw new Error(`Failed to scrape URL (${directResponse.status})`);
  }

  return await directResponse.text();
}
