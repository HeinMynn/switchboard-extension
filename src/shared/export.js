import { inScope } from './core.js';

export function cookieExport(cookies, domain, name, format) {
  if (!['json', 'txt'].includes(format)) throw new Error('Choose JSON or TXT.');
  const scoped = cookies.filter(cookie => inScope(cookie.domain, domain));
  if (!scoped.length) throw new Error('No cookies to export. Sign in and save your login first.');
  const label = name.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'account';
  return {
    filename: `${domain}-${label}-cookies.${format}`,
    mimeType: format === 'json' ? 'application/json' : 'text/plain',
    text: JSON.stringify(scoped, null, 2) + '\n'
  };
}
