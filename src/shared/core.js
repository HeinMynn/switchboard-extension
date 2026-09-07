export function siteFromInput(input) {
  const raw = String(input || '').trim();
  const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('Enter a public website address without a port or credentials.');
  }
  const domain = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(domain)) {
    throw new Error('Enter a website such as dola.com.');
  }
  return { domain, url: `https://${domain}/` };
}
export function inScope(host, domain) {
  host = host.toLowerCase().replace(/^\./, '');
  return host === domain || host.endsWith(`.${domain}`);
}
export function origins(domain) { return [`http://*.${domain}/*`, `https://*.${domain}/*`]; }
export function cookieUrl(c) {
  return `${c.secure ? 'https' : 'http'}://${c.domain.replace(/^\./, '')}${c.path || '/'}`;
}
export function cookieKey(c) {
  return JSON.stringify([c.domain, c.path, c.name, c.partitionKey?.topLevelSite ?? null,
    c.partitionKey?.hasCrossSiteAncestor ?? null]);
}
export function toSetDetails(c, storeId, now = Date.now() / 1000) {
  if (!c.session && c.expirationDate !== undefined && c.expirationDate <= now) return null;
  const result = { url: cookieUrl(c), name: c.name, value: c.value, path: c.path,
    secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, storeId };
  if (!c.hostOnly) result.domain = c.domain;
  if (!c.session && c.expirationDate !== undefined) result.expirationDate = c.expirationDate;
  if (c.partitionKey) result.partitionKey = { ...c.partitionKey };
  return result;
}
export function accountName(value) {
  const name = String(value || '').trim();
  if (!name || name.length > 60) throw new Error('Use an account name between 1 and 60 characters.');
  return name;
}
