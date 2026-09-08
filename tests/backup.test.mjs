import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptBackup, decryptBackup } from '../src/shared/backup-crypto.js';
import { validateBackup, gatherBackup, restoreBackup, recoverBackup } from '../src/shared/backup-state.js';
import { ChromeAccounts } from '../dist/chrome/engine.js';

const cookie = (value = 'secret', extra = {}) => ({ domain: '.example.com', path: '/', name: 'sid', value,
  secure: true, httpOnly: true, hostOnly: false, session: true, sameSite: 'lax', storeId: 'old-store', ...extra });
const payload = browser => ({ format: 'switchboard', version: 1, browser, connectedSites: ['example.com'], lastSite: 'example.com',
  savedAccounts: [{ id: 'old-store', name: 'Work', domain: 'example.com', active: browser === 'chrome', savedAt: null, cookies: [cookie()] }],
  liveCookies: browser === 'chrome' ? [{ domain: 'example.com', cookies: [cookie('live')] }] : [] });

test('native encryption round trips Unicode and randomizes salt/IV; wrong passwords and tampering fail', async () => {
  const original = { secret: 'private 🔒', accounts: ['工作'] };
  const first = await encryptBackup(original, 'a strong password');
  const second = await encryptBackup(original, 'a strong password');
  assert.notEqual(first, second); assert.equal(first.includes('private'), false);
  assert.deepEqual(await decryptBackup(first, 'a strong password'), original);
  await assert.rejects(decryptBackup(first, 'wrong'), /Incorrect password/);
  const changed = JSON.parse(first);
  changed.ciphertext = (changed.ciphertext[0] === 'A' ? 'B' : 'A') + changed.ciphertext.slice(1);
  await assert.rejects(decryptBackup(JSON.stringify(changed), 'a strong password'), /Incorrect password/);
  changed.iterations = 1;
  await assert.rejects(decryptBackup(JSON.stringify(changed), 'a strong password'), /Unsupported/);
});

test('validation rejects foreign cookie scopes, duplicate identities, invalid dates and cross-browser imports', () => {
  assert.equal(validateBackup(payload('chrome'), 'chrome').savedAccounts.length, 1);
  const www = payload('chrome'); www.savedAccounts[0].cookies[0] = cookie('www', { domain: 'www.example.com', hostOnly: true });
  assert.doesNotThrow(() => validateBackup(www, 'chrome'));
  for (const mutate of [p => p.savedAccounts[0].cookies[0].domain = '.unrelated.com',
    p => p.savedAccounts.push(p.savedAccounts[0]), p => p.savedAccounts[0].cookies[0].path = 'bad',
    p => { p.savedAccounts[0].cookies[0].session = false; }, p => p.lastSite = 'other.com']) {
    const p = payload('chrome'); mutate(p); assert.throws(() => validateBackup(p, 'chrome'));
  }
  assert.throws(() => validateBackup(payload('firefox'), 'chrome'), /Cross-browser/);
});

function fixture(mode) {
  let data = { lastSite: 'previous.com', connectedSites: ['previous.com'], savedAccounts: [] };
  let jar = [cookie('original', { storeId: '0' })];
  const identities = [{ cookieStoreId: 'existing', name: 'Keep me' }];
  const writes = [], removed = [];
  const control = { fail: false, tabs: [] };
  const api = {
    storage: { local: { get: async () => structuredClone(data), set: async value => { data = { ...data, ...structuredClone(value) }; } } },
    permissions: { contains: async () => true },
    contextualIdentities: {
      query: async () => structuredClone(identities),
      create: async details => { const c = { ...details, cookieStoreId: `new-${identities.length}` }; identities.push(c); return c; },
      remove: async id => { removed.push(id); identities.splice(identities.findIndex(c => c.cookieStoreId === id), 1); }
    },
    tabs: { query: async () => control.tabs },
    cookies: {
      getAllCookieStores: async () => [{ id: '0' }],
      getAll: async () => structuredClone(jar),
      remove: async () => { jar = []; return {}; },
      set: async details => {
        if (control.fail && details.value !== 'original') throw new Error('injected failure');
        writes.push(details);
        const c = { ...details, domain: details.domain || new URL(details.url).hostname, hostOnly: !details.domain, session: details.expirationDate === undefined };
        delete c.url; jar.push(c); return c;
      }
    }
  };
  return { api, control, writes, removed, identities, data: () => data, jar: () => jar, engine: new ChromeAccounts(api) };
}

test('Firefox remaps container IDs and cookie destinations without deleting old containers', async () => {
  const f = fixture('firefox');
  const imported = payload('firefox');
  imported.savedAccounts[0].cookies.push(cookie('provider', { domain: 'login.provider.com', hostOnly: true }),
    cookie('expired', { session: false, expirationDate: 1 }));
  await restoreBackup(f.api, 'firefox', imported);
  assert.equal(f.data().savedAccounts[0].id, 'new-1');
  assert.equal(f.writes[0].storeId, 'new-1');
  assert.equal(f.writes[0].url, 'https://example.com/');
  assert.equal(f.writes[1].url, 'https://login.provider.com/');
  assert.equal(f.writes[1].domain, undefined);
  assert.equal(f.writes[1].storeId, 'new-1');
  assert.equal(f.writes.length, 2);
  assert.equal(f.identities[0].cookieStoreId, 'existing');
  assert.equal(f.data().backupRestoreJournal, null);
});

test('Firefox export reads each saved container including external sign-in cookies', async () => {
  const f = fixture('firefox');
  await f.api.storage.local.set({ savedAccounts: [{ id: 'existing', domain: 'example.com', name: 'Personal' }], connectedSites: ['example.com'], lastSite: 'example.com' });
  f.api.cookies.getAll = async details => {
    assert.equal(details.storeId, 'existing'); assert.equal(details.domain, undefined);
    return [cookie('provider', { domain: '.provider.com', storeId: 'existing' })];
  };
  const result = await gatherBackup(f.api, 'firefox');
  assert.equal(result.savedAccounts[0].cookies[0].domain, '.provider.com');
});

test('denied permissions and malformed imports leave configuration untouched', async () => {
  const f = fixture('chrome'); f.api.permissions.contains = async () => false;
  const before = structuredClone(f.data());
  await assert.rejects(restoreBackup(f.api, 'chrome', payload('chrome'), f.engine), /Allow access/);
  const invalid = payload('chrome'); invalid.savedAccounts[0].cookies[0].domain = '.elsewhere.com';
  await assert.rejects(restoreBackup(f.api, 'chrome', invalid, f.engine), /Invalid/);
  assert.deepEqual(f.data(), before); assert.equal(f.writes.length, 0);
});

test('Firefox failure cleans up newly created containers and keeps previous settings', async () => {
  const f = fixture('firefox'); f.control.fail = true;
  await assert.rejects(restoreBackup(f.api, 'firefox', payload('firefox')), /previous configuration was kept/);
  assert.equal(f.data().lastSite, 'previous.com');
  assert.deepEqual(f.removed, ['new-1']);
  assert.equal(f.identities.length, 1);
});

test('Chrome restores distinct saved and live cookies and remaps cookie store IDs', async () => {
  const f = fixture('chrome');
  await restoreBackup(f.api, 'chrome', payload('chrome'), f.engine);
  assert.equal(f.jar()[0].value, 'live');
  assert.equal(f.jar()[0].storeId, '0');
  assert.equal(f.data().accountsState.sites['example.com'].accounts[0].cookies[0].value, 'secret');
  assert.equal(f.data().accountsState.sites['example.com'].accounts[0].cookies[0].storeId, '0');
  assert.equal(f.data().backupRestoreJournal, null);
  const exported = await gatherBackup(f.api, 'chrome');
  assert.equal(exported.savedAccounts[0].cookies[0].value, 'secret');
  assert.equal(exported.liveCookies[0].cookies[0].value, 'live');
});

test('Chrome refuses open tabs before mutation and rolls cookies back on failure', async () => {
  const f = fixture('chrome'); f.control.tabs = [{ url: 'https://example.com/' }];
  await assert.rejects(restoreBackup(f.api, 'chrome', payload('chrome'), f.engine), /Close all/);
  assert.equal(f.data().backupRestoreJournal, undefined);
  f.control.tabs = []; f.control.fail = true;
  await assert.rejects(restoreBackup(f.api, 'chrome', payload('chrome'), f.engine), /previous configuration was kept/);
  assert.equal(f.jar()[0].value, 'original');
  assert.equal(f.data().lastSite, 'previous.com');
});

test('persisted restore journal recovers after worker restart', async () => {
  const f = fixture('chrome');
  await f.api.storage.local.set({ backupRestoreJournal: { previous: { lastSite: 'old.example' },
    liveCookies: [{ domain: 'example.com', cookies: [cookie('original', { storeId: '0' })] }], createdIds: [] } });
  await recoverBackup(f.api, 'chrome', new ChromeAccounts(f.api));
  assert.equal(f.data().lastSite, 'old.example');
  assert.equal(f.data().backupRestoreJournal, null);
});
