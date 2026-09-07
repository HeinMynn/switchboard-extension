import { siteFromInput, inScope, origins, cookieUrl, cookieKey, toSetDetails, accountName } from './core.js';
import { cookieExport } from './export.js';
import { siteTabs, pauseTabs, resumeTabs } from './tab-refresh.js';

export class ChromeAccounts {
  constructor(api) { this.api = api; }
  async load() {
    const { accountsState } = await this.api.storage.local.get('accountsState');
    return accountsState || { sites: {}, pending: null };
  }
  async persist(state) { await this.api.storage.local.set({ accountsState: state }); }
  async checkPermission(domain) {
    if (!await this.api.permissions.contains({ origins: origins(domain) })) {
      throw new Error('Website access is needed. Choose Add website, enter this address, and click Connect.');
    }
  }
  async readCookies(domain) {
    // An empty partition filter includes both partitioned and unpartitioned cookies.
    const cookies = await this.api.cookies.getAll({ domain, partitionKey: {} });
    return cookies.filter(c => inScope(c.domain, domain));
  }
  async requireClosed(domain) {
    const tabs = await this.api.tabs.query({});
    const matching = tabs.filter(t => !t.incognito && [t.url, t.pendingUrl].some(value => {
      try { return inScope(new URL(value).hostname, domain); } catch { return false; }
    }));
    if (matching.length) throw new Error(`Close all ${matching.length} tab(s) for ${domain} in every Chrome window, then try again. Save any unfinished work first.`);
  }
  async replaceCookies(domain, cookies) {
    const current = await this.readCookies(domain);
    // Longest paths first: remove() resolves same-name cookies by URL/path.
    current.sort((a, b) => b.path.length - a.path.length);
    for (const c of current) {
      const details = { url: cookieUrl(c), name: c.name, storeId: c.storeId };
      if (c.partitionKey) details.partitionKey = c.partitionKey;
      await this.api.cookies.remove(details);
    }
    if ((await this.readCookies(domain)).length) throw new Error('The website changed cookies during switching. Stop any background activity and retry.');
    for (const c of cookies) {
      if (!inScope(c.domain, domain)) throw new Error('Saved session contains a cookie outside this website.');
      const details = toSetDetails(c, c.storeId);
      if (details && !await this.api.cookies.set(details)) throw new Error('Chrome could not restore a cookie.');
    }
    const actual = await this.readCookies(domain);
    const expected = cookies.filter(c => toSetDetails(c, c.storeId));
    const indexed = new Map(actual.map(c => [cookieKey(c), c]));
    if (actual.length !== expected.length || expected.some(c => indexed.get(cookieKey(c))?.value !== c.value)) {
      throw new Error('Cookie verification failed. The session was not fully restored.');
    }
  }
  metadata(state, domain) {
    const site = state.sites[domain] || { accounts: [], active: null };
    return { mode: 'chrome', domain, sites: Object.keys(state.sites), active: site.active, pending: state.pending?.domain || null,
      accounts: site.accounts.map(({ id, name, savedAt, cookies }) => ({ id, name, savedAt, count: cookies.length })) };
  }
  async handle(message) {
    const { domain, url } = siteFromInput(message.site || 'dola.com');
    const state = await this.load();
    if (message.action === 'list') return this.metadata(state, domain);
    if (state.pending && message.action !== 'recover') throw new Error(`An interrupted switch for ${state.pending.domain} needs recovery first.`);
    if (message.action === 'remove-site') {
      delete state.sites[domain];
      const next = Object.keys(state.sites).sort()[0] || null;
      await this.api.storage.local.set({ accountsState: state, lastSite: next });
      return this.metadata(state, next);
    }
    if (message.action === 'recover') {
      if (!state.pending) return this.metadata(state, domain);
      const pending = state.pending;
      if (pending.phase !== 'resume') {
        await this.checkPermission(pending.domain);
        await this.requireClosed(pending.domain);
        await this.replaceCookies(pending.domain, pending.before);
        pending.phase = 'resume';
        await this.persist(state);
      }
      if (pending.tabs?.length) await resumeTabs(this.api, pending.tabs, pending.pauseUrl);
      state.pending = null;
      await this.persist(state);
      return this.metadata(state, domain);
    }
    await this.checkPermission(domain);
    for (const existing of Object.keys(state.sites)) {
      if (existing !== domain && (inScope(existing, domain) || inScope(domain, existing))) {
        throw new Error(`This website overlaps ${existing}. Use that saved website address instead.`);
      }
    }
    const site = state.sites[domain] ||= { accounts: [], active: null };
    const target = site.accounts.find(a => a.id === message.id);
    if (message.action === 'export') {
      if (!target) throw new Error('Account not found.');
      return cookieExport(target.cookies, domain, target.name, message.format);
    }
    if (message.action === 'rename') {
      if (!target) throw new Error('Account not found.');
      const name = accountName(message.name);
      if (site.accounts.some(a => a.id !== target.id && a.name.toLowerCase() === name.toLowerCase())) throw new Error('Choose a different account name.');
      target.name = name;
      await this.persist(state);
      return this.metadata(state, domain);
    }
    if (message.action === 'open') {
      await this.api.tabs.create({ url });
      return this.metadata(state, domain);
    }
    if (message.action === 'forget') {
      if (!target) throw new Error('Account not found.');
      site.accounts = site.accounts.filter(a => a.id !== target.id);
      if (site.active === target.id) site.active = null;
      await this.persist(state);
      return this.metadata(state, domain);
    }
    if (message.action === 'save') {
      const active = site.accounts.find(a => a.id === site.active);
      const name = active ? active.name : accountName(message.name);
      if (!active && site.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) throw new Error('Choose a different account name.');
      const cookies = await this.readCookies(domain);
      if (!cookies.length) throw new Error('No cookies found. Open the website and sign in first.');
      const account = active || { id: crypto.randomUUID(), name };
      Object.assign(account, { cookies, savedAt: Date.now() });
      if (!active) site.accounts.push(account);
      site.active = account.id;
      await this.persist(state);
      return this.metadata(state, domain);
    }
    if (!['new', 'switch', 'restore'].includes(message.action)) throw new Error('Unknown action.');
    if (message.action !== 'new' && !target) throw new Error('Account not found.');
    if (message.action === 'switch' && target.id === site.active) throw new Error('This account is already selected. Use Restore saved if you need its saved cookies.');
    const name = message.action === 'new' ? accountName(message.name) : null;
    if (name && site.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) throw new Error('Choose a different account name.');
    const tabs = message.refreshTabs ? await siteTabs(this.api, domain) : [];
    if (!message.refreshTabs) await this.requireClosed(domain);
    let before = await this.readCookies(domain);
    const pauseUrl = tabs.length ? this.api.runtime.getURL(`switching.html#${crypto.randomUUID()}`) : null;
    // Persist recovery data BEFORE the first cookie mutation. Committed metadata stays intact.
    state.pending = { domain, before, tabs, pauseUrl };
    await this.persist(state);
    let nextState;
    let mutated = false;
    try {
      if (tabs.length) await pauseTabs(this.api, tabs, pauseUrl);
      await this.requireClosed(domain);
      // Capture any final cookie changes made while the pages were unloading.
      before = await this.readCookies(domain);
      state.pending.before = before;
      await this.persist(state);
      nextState = structuredClone(state);
      const nextSite = nextState.sites[domain];
      const active = nextSite.accounts.find(a => a.id === nextSite.active);
      if (message.action !== 'restore' && before.length) {
        if (active) Object.assign(active, { cookies: before, savedAt: Date.now() });
        else nextSite.accounts.push({ id: crypto.randomUUID(), name: `Previous session ${new Date().toLocaleString()}`, cookies: before, savedAt: Date.now() });
      }
      const next = message.action === 'new' ? { id: crypto.randomUUID(), name, cookies: [], savedAt: null } : target;
      if (message.action === 'new') nextSite.accounts.push(next);
      mutated = true;
      await this.replaceCookies(domain, next.cookies);
      nextSite.active = next.id;
      nextState.pending = tabs.length ? { ...state.pending, phase: 'resume' } : null;
      await this.persist(nextState);
    } catch {
      try {
        if (mutated) { await this.requireClosed(domain); await this.replaceCookies(domain, before); }
        state.pending.phase = 'resume';
        await this.persist(state);
        if (tabs.length) await resumeTabs(this.api, tabs, pauseUrl);
        state.pending = null;
        await this.persist(state);
      } catch { throw new Error('Switch failed and recovery is needed. Close the website tabs and click Recover previous session.'); }
      throw new Error('Switch failed. Previous cookies were restored; saved accounts were preserved.');
    }
    if (tabs.length) {
      try {
        await resumeTabs(this.api, tabs, pauseUrl);
        nextState.pending = null;
        await this.persist(nextState);
      } catch {
        nextState.pending = { domain, before, tabs, pauseUrl, phase: 'resume' };
        const result = this.metadata(nextState, domain);
        result.notice = 'Account switched. Some tabs could not refresh; use Recover previous session to resume them.';
        return result;
      }
    }
    const result = this.metadata(nextState, domain);
    if (message.openAfter && !tabs.length) {
      try { await this.api.tabs.create({ url }); }
      catch { result.notice = 'Account selected, but the tab could not open. Use Open website to continue.'; }
    }
    return result;
  }
}
