import { inScope, siteFromInput } from './core.js';
import { chromeConnectionSite } from './google-site.js';

export function activeSite(tab, savedSites = [], chromeMode = false) {
  if (!tab || tab.incognito) return null;
  try {
    const url = new URL(tab.pendingUrl || tab.url);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const { domain } = chromeMode ? chromeConnectionSite(url.href) : siteFromInput(url.href);
    // Prefer the closest saved scope; never guess a registrable domain.
    return savedSites.filter(site => site && inScope(domain, site))
      .sort((a, b) => b.length - a.length)[0] || domain;
  } catch { return null; }
}
