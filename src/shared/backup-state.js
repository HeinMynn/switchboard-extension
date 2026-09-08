import { accountName, siteFromInput, inScope, origins, toSetDetails } from './core.js';

export function validateBackup(value, mode) {
  const fail = () => { throw new Error('Invalid backup contents.'); };
  if (!value || value.format !== 'switchboard' || value.version !== 1) fail();
  if (value.browser !== mode) throw new Error(`Restore this backup in ${value.browser === 'firefox' ? 'Firefox' : 'Chrome'}. Cross-browser restore is not supported.`);
  const { pockets, connectedSites, lastSite, liveCookies } = value;
  if (!Array.isArray(pockets) || pockets.length > 1000 || !Array.isArray(connectedSites) || connectedSites.length > 1000 || !Array.isArray(liveCookies)) fail();
  const validDomain = d => typeof d === 'string' && siteFromInput(d).domain === d;
  if (!connectedSites.every(validDomain) || new Set(connectedSites).size !== connectedSites.length || (lastSite !== null && !connectedSites.includes(lastSite))) fail();
  if (mode === 'chrome' && connectedSites.some((d, i) => connectedSites.slice(i + 1).some(other => inScope(d, other) || inScope(other, d)))) throw new Error('Backup contains overlapping website scopes.');
  const ids = new Set();
  let cookieCount = 0;
  function cookies(list, domain) {
    if (!Array.isArray(list)) fail();
    cookieCount += list.length;
    if (cookieCount > 100000) fail();
    for (const c of list) {
      if (!c || typeof c.domain !== 'string' || !siteFromInput(c.domain.replace(/^\./, '')).domain || (mode === 'chrome' && !inScope(c.domain, domain))
        || typeof c.name !== 'string' || typeof c.value !== 'string' || typeof c.path !== 'string' || !c.path.startsWith('/')
        || ['secure', 'httpOnly', 'hostOnly', 'session'].some(k => typeof c[k] !== 'boolean')
        || !['no_restriction', 'lax', 'strict', 'unspecified'].includes(c.sameSite)
        || (!c.session && !Number.isFinite(c.expirationDate))) fail();
      if (c.partitionKey !== undefined && (!c.partitionKey || typeof c.partitionKey.topLevelSite !== 'string'
        || (c.partitionKey.hasCrossSiteAncestor !== undefined && typeof c.partitionKey.hasCrossSiteAncestor !== 'boolean'))) fail();
      const details = toSetDetails(c, '0');
      if (details && new URL(details.url).hostname !== c.domain.replace(/^\./, '')) fail();
    }
  }
  for (const p of pockets) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || !connectedSites.includes(p.domain)
      || accountName(p.name) !== p.name || typeof p.active !== 'boolean'
      || (p.savedAt !== null && (!Number.isFinite(p.savedAt) || p.savedAt < 0))) fail();
    ids.add(p.id); cookies(p.cookies, p.domain);
  }
  for (const domain of connectedSites) {
    if (pockets.filter(p => p.domain === domain && p.active).length > 1) fail();
    const names = pockets.filter(p => p.domain === domain).map(p => p.name.toLowerCase());
    if (new Set(names).size !== names.length) fail();
  }
  if (mode === 'firefox' && liveCookies.length) fail();
  if (mode === 'chrome' && (liveCookies.length !== connectedSites.length || new Set(liveCookies.map(s => s.domain)).size !== connectedSites.length)) fail();
  for (const site of liveCookies) {
    if (!connectedSites.includes(site.domain)) fail();
    cookies(site.cookies, site.domain);
  }
  return value;
}

export function backupOrigins(payload) {
  const domains = [...payload.connectedSites, ...(payload.browser === 'firefox'
    ? payload.pockets.flatMap(p => p.cookies.map(c => c.domain.replace(/^\./, ''))) : [])];
  return [...new Set(domains.flatMap(origins))];
}

export async function gatherBackup(api, mode) {
  const state = await api.storage.local.get(['accountsState', 'pockets', 'connectedSites', 'lastSite', 'backupRestoreJournal']);
  if (state.backupRestoreJournal || state.accountsState?.pending) throw new Error('Recover the interrupted operation before backing up.');
  const payload = { format: 'switchboard', version: 1, browser: mode, createdAt: new Date().toISOString(), pockets: [], connectedSites: [], lastSite: null, liveCookies: [] };
  if (mode === 'chrome') {
    payload.connectedSites = Object.keys(state.accountsState?.sites || {});
    for (const [domain, site] of Object.entries(state.accountsState?.sites || {})) {
      for (const a of site.accounts) payload.pockets.push({ id: a.id, name: a.name, domain, savedAt: a.savedAt, active: a.id === site.active, cookies: a.cookies });
      await requireAccess(api, domain);
      payload.liveCookies.push({ domain, cookies: (await api.cookies.getAll({ domain, partitionKey: {} })).filter(c => inScope(c.domain, domain)) });
    }
  } else {
    if (!await api.permissions.contains({ origins: ['http://*/*', 'https://*/*'] })) throw new Error('Allow website access to include all Firefox container cookies.');
    payload.connectedSites = [...new Set([...(state.connectedSites || []), ...(state.pockets || []).map(p => p.domain)])];
    const existing = new Set((await api.contextualIdentities.query({})).map(c => c.cookieStoreId));
    for (const p of state.pockets || []) {
      if (!existing.has(p.id)) throw new Error(`The Firefox container for ${p.name} is missing. Remove its stale entry before backing up.`);
      await requireAccess(api, p.domain);
      payload.pockets.push({ id: p.id, name: p.name, domain: p.domain, savedAt: null, active: false,
        cookies: await api.cookies.getAll({ storeId: p.id, partitionKey: {} }) });
    }
  }
  payload.lastSite = payload.connectedSites.includes(state.lastSite) ? state.lastSite : payload.connectedSites[0] || null;
  return validateBackup(payload, mode);
}

async function requireAccess(api, domain) {
  if (!await api.permissions.contains({ origins: origins(domain) })) throw new Error(`Allow website access for ${domain} first.`);
}

export async function recoverBackup(api, mode, engine) {
  const { backupRestoreJournal: journal } = await api.storage.local.get('backupRestoreJournal');
  if (!journal) return;
  if (mode === 'chrome') {
    for (const site of journal.liveCookies) { await requireAccess(api, site.domain); await engine.requireClosed(site.domain); }
    for (const site of journal.liveCookies) await engine.replaceCookies(site.domain, site.cookies);
  } else {
    const existing = new Set((await api.contextualIdentities.query({})).map(c => c.cookieStoreId));
    for (const id of journal.createdIds) if (existing.has(id)) await api.contextualIdentities.remove(id);
  }
  await api.storage.local.set({ ...journal.previous, backupRestoreJournal: null });
}

export async function restoreBackup(api, mode, payload, engine) {
  validateBackup(payload, mode);
  const state = await api.storage.local.get(['accountsState', 'pockets', 'connectedSites', 'lastSite', 'pendingConnection', 'backupRestoreJournal']);
  if (state.backupRestoreJournal || state.accountsState?.pending) throw new Error('Recover the interrupted operation before restoring.');
  const requested = backupOrigins(payload);
  if (requested.length && !await api.permissions.contains({ origins: requested })) throw new Error('Allow access to all websites in this backup first.');
  const previous = { accountsState: state.accountsState || { sites: {}, pending: null }, pockets: state.pockets || [],
    connectedSites: state.connectedSites || [], lastSite: state.lastSite ?? null, pendingConnection: state.pendingConnection ?? null };
  const journal = { previous, liveCookies: [], createdIds: [] };
  // Existing containers and unrelated websites are never deleted by restore.
  if (mode === 'chrome') {
    for (const domain of payload.connectedSites) {
      await engine.requireClosed(domain);
      journal.liveCookies.push({ domain, cookies: await engine.readCookies(domain) });
    }
  }
  await api.storage.local.set({ backupRestoreJournal: journal });
  try {
    if (mode === 'chrome') {
      const sites = {};
      const [store] = (await api.cookies.getAllCookieStores()).filter(s => s.id === '0');
      if (!store) throw new Error('The normal Chrome cookie store is unavailable.');
      for (const domain of payload.connectedSites) {
        sites[domain] = { active: payload.pockets.find(p => p.domain === domain && p.active)?.id || null,
          accounts: payload.pockets.filter(p => p.domain === domain).map(p => ({ id: p.id, name: p.name, savedAt: p.savedAt,
            cookies: p.cookies.map(c => ({ ...c, storeId: store.id })) })) };
      }
      for (const site of payload.liveCookies) {
        await engine.requireClosed(site.domain);
        await engine.replaceCookies(site.domain, site.cookies.map(c => ({ ...c, storeId: store.id })));
      }
      await api.storage.local.set({ accountsState: { sites, pending: null }, pockets: [], connectedSites: payload.connectedSites,
        lastSite: payload.lastSite, pendingConnection: null, backupRestoreJournal: null });
    } else {
      const mapping = new Map(), pockets = [];
      for (const p of payload.pockets) {
        const container = await api.contextualIdentities.create({ name: p.name, color: 'blue', icon: 'fingerprint' });
        journal.createdIds.push(container.cookieStoreId);
        await api.storage.local.set({ backupRestoreJournal: journal });
        mapping.set(p.id, container.cookieStoreId);
        pockets.push({ id: container.cookieStoreId, name: p.name, domain: p.domain });
      }
      for (const p of payload.pockets) for (const c of p.cookies) {
        const details = toSetDetails(c, mapping.get(p.id));
        if (details && !await api.cookies.set(details)) throw new Error('Firefox could not restore a cookie.');
      }
      await api.storage.local.set({ pockets, connectedSites: payload.connectedSites, lastSite: payload.lastSite, backupRestoreJournal: null });
    }
  } catch (error) {
    try { await recoverBackup(api, mode, engine); }
    catch { throw new Error('Restore was interrupted. Close the affected website tabs, then use Recover restore on the backup page.'); }
    throw new Error(`Restore failed; your previous configuration was kept. ${error.message}`);
  }
}
