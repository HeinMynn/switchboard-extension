import { siteFromInput, accountName, origins } from './core.js';
import { cookieExport } from './export.js';
import { registerWelcome } from './onboarding.js';
registerWelcome(browser);
let queue = Promise.resolve();
async function handle(message) {
  const { domain, url } = siteFromInput(message.site || 'dola.com');
  const { pockets = [] } = await browser.storage.local.get('pockets');
  const identities = await browser.contextualIdentities.query({});
  const existing = new Set(identities.map(i => i.cookieStoreId));
  const accounts = pockets.filter(p => existing.has(p.id));
  const target = accounts.find(a => a.id === message.id && a.domain === domain);
  if (message.action === 'remove-site') {
    const remaining = accounts.filter(a => a.domain !== domain);
    const sites = [...new Set(remaining.map(a => a.domain))].sort();
    const next = sites[0] || null;
    await browser.storage.local.set({ pockets: remaining, lastSite: next });
    return { mode: 'firefox', domain: next, sites, accounts: remaining.filter(a => a.domain === next), active: null, pending: null };
  }
  if (message.action === 'export') {
    if (!target) throw new Error('Account not found.');
    if (!await browser.permissions.contains({ origins: origins(domain) })) throw new Error('Allow website access to export its cookies.');
    const cookies = await browser.cookies.getAll({ domain, storeId: target.id, partitionKey: {} });
    return cookieExport(cookies, domain, target.name, message.format);
  }
  if (message.action === 'new') {
    const name = accountName(message.name);
    if (accounts.some(a => a.domain === domain && a.name.toLowerCase() === name.toLowerCase())) throw new Error('Choose a different account name.');
    const colors = ['blue', 'orange', 'green', 'pink', 'purple', 'turquoise'];
    const identity = await browser.contextualIdentities.create({ name: `${name} · ${domain}`, color: colors[accounts.length % colors.length], icon: 'fingerprint' });
    accounts.push({ id: identity.cookieStoreId, name, domain });
    try { await browser.storage.local.set({ pockets: accounts }); }
    catch (error) { await browser.contextualIdentities.remove(identity.cookieStoreId); throw error; }
    await browser.tabs.create({ url, cookieStoreId: identity.cookieStoreId });
  } else if (message.action === 'rename') {
    if (!target) throw new Error('Account not found.');
    const name = accountName(message.name);
    if (accounts.some(a => a.domain === domain && a.id !== target.id && a.name.toLowerCase() === name.toLowerCase())) throw new Error('Choose a different account name.');
    const previous = identities.find(i => i.cookieStoreId === target.id).name;
    await browser.contextualIdentities.update(target.id, { name: `${name} · ${domain}` });
    target.name = name;
    try { await browser.storage.local.set({ pockets: accounts }); }
    catch (error) {
      await browser.contextualIdentities.update(target.id, { name: previous });
      throw error;
    }
  } else if (message.action === 'open') {
    if (!target) throw new Error('Choose an account to open.');
    await browser.tabs.create({ url, cookieStoreId: target.id });
  } else if (message.action === 'forget') {
    if (!target) throw new Error('Account not found.');
    // Keep the Firefox container and its browser-owned login data intact.
    accounts.splice(accounts.indexOf(target), 1);
    await browser.storage.local.set({ pockets: accounts });
  } else if (message.action !== 'list') throw new Error('Unknown action.');
  return { mode: 'firefox', domain, sites: [...new Set(accounts.map(a => a.domain))], accounts: accounts.filter(a => a.domain === domain), active: null, pending: null };
}
browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browser.runtime.id || sender.url !== browser.runtime.getURL('popup.html')) return;
  const task = queue.then(() => handle(message));
  queue = task.catch(() => {});
  return task.then(data => ({ ok: true, data }), error => ({ ok: false, error: error.message }));
});
