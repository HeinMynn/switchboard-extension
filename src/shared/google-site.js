import { siteFromInput, inScope } from './core.js';

const googleDomains = ['google.com', 'gmail.com', 'googlemail.com', 'youtube.com', 'youtu.be',
  'youtube-nocookie.com', 'googleusercontent.com', 'googleapis.com', 'gstatic.com',
  'google.co.uk', 'google.co.in', 'google.co.jp', 'google.com.au', 'google.com.sg',
  'google.com.my', 'google.co.th', 'google.com.hk', 'google.com.tw', 'google.co.kr',
  'google.co.id', 'google.com.vn', 'google.com.br', 'google.com.mx', 'google.ca',
  'google.de', 'google.fr', 'google.es', 'google.it', 'google.nl', 'google.ch'];

export const unsupportedGoogleMessage = 'Google services, including Gmail and YouTube, are not supported by Switchboard. Use Google’s account menu to switch accounts.';

export function isGoogleSite(input) {
  try {
    const { domain } = siteFromInput(input);
    return domain.endsWith('.google') || googleDomains.some(root => inScope(domain, root));
  } catch { return false; }
}

export function chromeConnectionSite(input) {
  const site = siteFromInput(input);
  if (['gmail.com', 'mail.google.com', 'accounts.google.com'].includes(site.domain)) {
    return { domain: 'google.com', url: 'https://mail.google.com/' };
  }
  return site;
}
