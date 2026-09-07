import test from 'node:test';
import assert from 'node:assert/strict';
import { ChromeAccounts } from '../dist/chrome/engine.js';
import { siteFromInput, inScope, toSetDetails, cookieKey } from '../src/shared/core.js';

function cookie(value = 'A', extra = {}) {
  return { domain: '.dola.com', path: '/', name: 'session', value, secure: true,
    httpOnly: true, hostOnly: false, sameSite: 'lax', session: true, storeId: '0', ...extra };
}
function fixture(initial = [cookie()]) {
  let jar = structuredClone(initial);
  let data = {};
  const control = { tabs: [], allowed: true, failValue: null, writes: 0, opened: [] };
  const api = {
    storage: { local: {
      get: async () => structuredClone(data),
      set: async value => { data = { ...data, ...structuredClone(value) }; control.writes++; }
    } },
    permissions: { contains: async () => control.allowed },
    runtime: { getURL: path => `chrome-extension://test/${path}` },
    tabs: {
      query: async () => control.tabs, create: async value => control.opened.push(value),
      get: async id => control.tabs.find(tab => tab.id === id),
      update: async (id, changes) => Object.assign(control.tabs.find(tab => tab.id === id), changes, { pendingUrl: undefined, status: 'complete' })
    },
    cookies: {
      getAll: async ({ domain }) => structuredClone(jar.filter(c => inScope(c.domain, domain))),
      remove: async d => {
        const url = new URL(d.url);
        const index = jar.findIndex(c => c.name === d.name && inScope(url.hostname, c.domain.replace(/^\./, '')) && url.pathname.startsWith(c.path)
          && JSON.stringify(c.partitionKey) === JSON.stringify(d.partitionKey));
        if (index >= 0) jar.splice(index, 1);
        return index >= 0 ? d : undefined;
      },
      set: async d => {
        if (d.value === control.failValue) throw new Error('injected set failure');
        const c = { ...d, domain: d.domain || new URL(d.url).hostname, hostOnly: !d.domain, session: d.expirationDate === undefined };
        delete c.url;
        jar = jar.filter(old => cookieKey(old) !== cookieKey(c)); jar.push(c); return c;
      }
    }
  };
  return { engine: new ChromeAccounts(api), api, control, jar: () => structuredClone(jar),
    setJar: value => { jar = structuredClone(value); }, state: () => structuredClone(data.accountsState) };
}
const msg = (action, extra = {}) => ({ action, site: 'dola.com', ...extra });

test('website scope excludes lookalike domains and unrelated domains', () => {
  assert.equal(siteFromInput('https://www.dola.com/chat/').domain, 'dola.com');
  assert.equal(inScope('.login.dola.com', 'dola.com'), true);
  assert.equal(inScope('notdola.com', 'dola.com'), false);
  assert.equal(inScope('dola.com.evil.test', 'dola.com'), false);
  for (const value of ['file:///tmp/x', 'https://user:pass@dola.com', 'http://localhost:8000', '*.com']) assert.throws(() => siteFromInput(value));
});
test('restoration preserves security flags, partitions, host-only scope and session expiry', () => {
  const c = cookie('secret', { domain: 'dola.com', hostOnly: true, name: '__Host-session', partitionKey: { topLevelSite: 'https://dola.com', hasCrossSiteAncestor: false } });
  const d = toSetDetails(c, '0');
  assert.equal(d.domain, undefined); assert.equal(d.expirationDate, undefined);
  assert.equal(d.secure, true); assert.equal(d.httpOnly, true); assert.equal(d.sameSite, 'lax');
  assert.deepEqual(d.partitionKey, c.partitionKey);
  assert.equal(toSetDetails(cookie('old', { session: false, expirationDate: 5 }), '0', 10), null);
  assert.equal(toSetDetails(cookie('valid', { session: false, expirationDate: 15 }), '0', 10).expirationDate, 15);
});
test('save, new, sign in and switch keep both account snapshots', async () => {
  const f = fixture();
  const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  assert.equal(JSON.stringify(a).includes('"value"'), false, 'popup never receives credentials');
  await f.engine.handle(msg('new', { name: 'Work' }));
  assert.equal(f.jar().length, 0);
  f.setJar([cookie('B')]);
  await f.engine.handle(msg('save'));
  await f.engine.handle(msg('switch', { id: a.active }));
  assert.equal(f.jar()[0].value, 'A');
  assert.deepEqual(f.state().sites['dola.com'].accounts.map(a => a.cookies[0].value), ['A', 'B']);
});
test('all site tabs including pending navigation block mutations', async () => {
  for (const tab of [{ url: 'https://dola.com/chat' }, { url: 'about:blank', pendingUrl: 'https://auth.dola.com/' }]) {
    const f = fixture(); f.control.tabs = [tab];
    await assert.rejects(f.engine.handle(msg('new', { name: 'Work' })), /Close all/);
    assert.equal(f.jar()[0].value, 'A'); assert.equal(f.control.writes, 0);
  }
});
test('permission revocation fails before any mutation', async () => {
  const f = fixture(); f.control.allowed = false;
  await assert.rejects(f.engine.handle(msg('new', { name: 'Work' })), /Website access/);
  assert.equal(f.control.writes, 0); assert.equal(f.jar()[0].value, 'A');
});
test('failed restore rolls back live cookies and preserves saved accounts', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('new', { name: 'Work' }));
  f.setJar([cookie('B')]); await f.engine.handle(msg('save'));
  f.control.failValue = 'A';
  await assert.rejects(f.engine.handle(msg('switch', { id: a.active })), /Previous cookies were restored/);
  assert.equal(f.jar()[0].value, 'B'); assert.equal(f.state().pending, null);
  assert.equal(f.state().sites['dola.com'].accounts.length, 2);
});
test('interrupted transaction is recoverable by a fresh worker', async () => {
  const f = fixture();
  await f.api.storage.local.set({ accountsState: { sites: {}, pending: { domain: 'dola.com', before: [cookie('original')] } } });
  f.setJar([cookie('partial')]);
  const fresh = new ChromeAccounts(f.api);
  await assert.rejects(fresh.handle(msg('new', { name: 'Work' })), /needs recovery/);
  await fresh.handle(msg('recover'));
  assert.equal(f.jar()[0].value, 'original'); assert.equal(f.state().pending, null);
});
test('new account preserves an unmanaged existing login before clearing cookies', async () => {
  const f = fixture(); await f.engine.handle(msg('new', { name: 'Work' }));
  const accounts = f.state().sites['dola.com'].accounts;
  assert.equal(accounts.length, 2); assert.equal(accounts[0].cookies[0].value, 'A');
});
test('forget does not log out the live account or touch other sites', async () => {
  const f = fixture([cookie(), cookie('other', { domain: '.example.com' })]);
  const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('forget', { id: a.active }));
  assert.equal(f.jar().length, 2); assert.equal(f.state().sites['dola.com'].accounts.length, 0);
});
test('overlapping website scopes cannot overwrite each other', async () => {
  const f = fixture(); await f.engine.handle(msg('save', { name: 'Personal' }));
  await assert.rejects(f.engine.handle({ action: 'new', site: 'auth.dola.com', name: 'Work' }), /overlaps/);
});
test('empty browser session does not erase a previously saved outgoing login on switch', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  const b = await f.engine.handle(msg('new', { name: 'Work' }));
  f.setJar([cookie('B')]); await f.engine.handle(msg('save'));
  await f.engine.handle(msg('switch', { id: a.active }));
  f.setJar([]);
  await f.engine.handle(msg('switch', { id: b.active }));
  assert.equal(f.state().sites['dola.com'].accounts[0].cookies[0].value, 'A');
});
test('expired cookies are omitted and partitioned cookies remain distinct', async () => {
  const f = fixture([]);
  const cookies = [cookie('base'), cookie('partition', { partitionKey: { topLevelSite: 'https://dola.com', hasCrossSiteAncestor: true } }), cookie('expired', { name: 'old', session: false, expirationDate: 1 })];
  await f.engine.replaceCookies('dola.com', cookies);
  assert.equal(f.jar().length, 2); assert.equal(f.jar()[1].value, 'partition');
});

test('switch and open waits for the account commit', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('new', { name: 'Work' })); f.setJar([cookie('B')]);
  f.api.tabs.create = async ({ url }) => {
    assert.equal(url, 'https://dola.com/'); assert.equal(f.state().sites['dola.com'].active, a.active);
    assert.equal(f.state().pending, null); assert.equal(f.jar()[0].value, 'A'); f.control.opened.push(url);
  };
  await f.engine.handle(msg('switch', { id: a.active, openAfter: true })); assert.equal(f.control.opened.length, 1);
});

test('tab opening failure preserves the committed account', async () => {
  const f = fixture(); f.api.tabs.create = async () => { throw new Error('Window closed'); };
  const result = await f.engine.handle(msg('new', { name: 'Work', openAfter: true }));
  assert.match(result.notice, /could not open/); assert.equal(result.active, f.state().sites['dola.com'].active);
  assert.equal(f.jar().length, 0); assert.equal(f.state().pending, null);
});

test('renaming preserves the saved session and rejects duplicate names', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  const before = f.state().sites['dola.com'].accounts[0];
  const renamed = await f.engine.handle(msg('rename', { id: a.active, name: ' Home ' }));
  assert.equal(renamed.accounts[0].name, 'Home');
  assert.deepEqual(f.state().sites['dola.com'].accounts[0], { ...before, name: 'Home' });
  assert.equal(renamed.active, a.active); assert.equal(f.jar()[0].value, 'A');
  await f.engine.handle(msg('new', { name: 'Work' }));
  await assert.rejects(f.engine.handle(msg('rename', { id: a.active, name: 'work' })), /different account name/);
});

test('export reads the chosen saved account without changing live cookies', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('new', { name: 'Work' })); f.setJar([cookie('B')]);
  const before = f.state(); const file = await f.engine.handle(msg('export', { id: a.active, format: 'txt' }));
  assert.equal(JSON.parse(file.text)[0].value, 'A'); assert.equal(f.jar()[0].value, 'B'); assert.deepEqual(f.state(), before);
  await assert.rejects(f.engine.handle(msg('export', { id: 'missing', format: 'json' })), /Account not found/);
});

test('removing a website preserves other sites and live cookies, including without host access', async () => {
  const f = fixture(); await f.engine.handle(msg('save', { name: 'Personal' }));
  const state = f.state(); state.sites['example.com'] = { accounts: [], active: null };
  await f.api.storage.local.set({ accountsState: state }); f.control.allowed = false;
  const result = await f.engine.handle(msg('remove-site'));
  assert.deepEqual(result.sites, ['example.com']); assert.equal(result.domain, 'example.com');
  assert.equal(f.state().sites['dola.com'], undefined); assert.equal(f.jar()[0].value, 'A');
  await f.engine.handle({ action: 'remove-site', site: 'example.com' });
  assert.equal((await f.api.storage.local.get()).lastSite, null);
  assert.deepEqual(f.state().sites, {});
});

test('refresh switching pauses every site tab before cookies change and reuses their IDs', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('new', { name: 'Work' })); f.setJar([cookie('B')]);
  f.control.tabs = [{ id: 1, url: 'https://dola.com/chat/one', windowId: 1 }, { id: 2, url: 'https://www.dola.com/chat/two', windowId: 2 }, { id: 3, url: 'https://example.com/' }, { id: 4, url: 'https://dola.com/', incognito: true }];
  const original = structuredClone(f.control.tabs);
  const remove = f.api.cookies.remove;
  f.api.cookies.remove = async details => {
    assert.ok(f.control.tabs.slice(0, 2).every(tab => tab.url.includes('switching.html#')));
    return remove(details);
  };
  await f.engine.handle(msg('switch', { id: a.active, refreshTabs: true, openAfter: true }));
  assert.equal(f.jar()[0].value, 'A'); assert.equal(f.control.opened.length, 0);
  assert.deepEqual(f.control.tabs.map(t => [t.id, t.url]), original.map(t => [t.id, t.url]));
  assert.equal(f.state().pending, null);
});

test('failed cookie switch restores the outgoing login and paused tabs', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('new', { name: 'Work' })); f.setJar([cookie('B')]);
  f.control.tabs = [{ id: 1, url: 'https://dola.com/chat/' }]; f.control.failValue = 'A';
  await assert.rejects(f.engine.handle(msg('switch', { id: a.active, refreshTabs: true })), /Previous cookies were restored/);
  assert.equal(f.jar()[0].value, 'B'); assert.equal(f.control.tabs[0].url, 'https://dola.com/chat/');
  assert.equal(f.state().pending, null);
});

test('recovery resumes tabs after a committed switch without undoing the new login', async () => {
  const f = fixture(); const a = await f.engine.handle(msg('save', { name: 'Personal' }));
  await f.engine.handle(msg('new', { name: 'Work' })); f.setJar([cookie('B')]);
  f.control.tabs = [{ id: 1, url: 'https://dola.com/chat/' }];
  const update = f.api.tabs.update;
  f.api.tabs.update = async (id, changes) => { if (changes.url.startsWith('https:')) throw new Error('resume blocked'); return update(id, changes); };
  const result = await f.engine.handle(msg('switch', { id: a.active, refreshTabs: true }));
  assert.equal(result.pending, 'dola.com'); assert.equal(f.state().pending.phase, 'resume');
  f.api.tabs.update = update;
  await new ChromeAccounts(f.api).handle(msg('recover'));
  assert.equal(f.jar()[0].value, 'A'); assert.equal(f.state().sites['dola.com'].active, a.active);
  assert.equal(f.control.tabs[0].url, 'https://dola.com/chat/'); assert.equal(f.state().pending, null);
});
