import test from 'node:test';
import assert from 'node:assert/strict';

test('Firefox creates and reopens isolated containers, without deleting native data on forget', async () => {
  let listener;
  let pockets = [];
  let connectedSites = [];
  const identities = [];
  const opened = [];
  let exportedFrom;
  globalThis.browser = {
    runtime: { id: 'test', getURL: p => `moz-extension://test/${p}`, onInstalled: { addListener: () => {} }, onMessage: { addListener: fn => { listener = fn; } } },
    storage: { local: { get: async () => structuredClone({ pockets, connectedSites }), set: async data => {
      if ('pockets' in data) pockets = structuredClone(data.pockets);
      if ('connectedSites' in data) connectedSites = structuredClone(data.connectedSites);
    } } },
    contextualIdentities: {
      query: async () => structuredClone(identities),
      update: async (id, options) => Object.assign(identities.find(i => i.cookieStoreId === id), options),
      create: async options => { const identity = { ...options, cookieStoreId: `firefox-container-${identities.length + 1}` }; identities.push(identity); return identity; },
      remove: async () => { throw new Error('Native container should not be deleted by forget'); }
    },
    tabs: { create: async d => { opened.push(d); } },
    permissions: { contains: async () => true },
    cookies: { getAll: async details => { exportedFrom = details; return [{ domain: '.dola.com', name: 'session', value: 'synthetic' }]; } }
  };
  await import('../dist/firefox/background.js');
  const sender = { id: 'test', url: 'moz-extension://test/popup.html' };
  const send = (action, extra = {}) => listener({ action, site: 'dola.com', ...extra }, sender);
  const first = await send('new', { name: 'Personal' });
  assert.equal(first.ok, true);
  const second = await send('new', { name: 'Work' });
  assert.equal(second.ok, true); assert.notEqual(opened[0].cookieStoreId, opened[1].cookieStoreId);
  const id = first.data.accounts[0].id;
  await send('open', { id }); assert.equal(opened[2].cookieStoreId, id);
  const duplicate = await send('new', { name: 'personal' }); assert.equal(duplicate.ok, false);
  const renamed = await send('rename', { id, name: 'Home' });
  assert.equal(renamed.ok, true); assert.equal(pockets.find(a => a.id === id).name, 'Home');
  assert.equal(identities.find(i => i.cookieStoreId === id).name, 'Home · dola.com');
  const exported = await send('export', { id, format: 'json' });
  assert.equal(exported.ok, true); assert.equal(exportedFrom.storeId, id); assert.equal(exportedFrom.domain, 'dola.com');
  assert.equal(JSON.parse(exported.data.text)[0].value, 'synthetic');
  await send('forget', { id }); assert.equal(pockets.length, 1); assert.equal(identities.length, 2);
  const removed = await send('remove-site');
  assert.equal(removed.ok, true); assert.equal(removed.data.domain, null);
  assert.equal(pockets.length, 0); assert.equal(identities.length, 2);
  await send('connect', { site: 'example.com' });
  await send('connect', { site: 'example.org' });
  assert.deepEqual((await send('list')).data.sites, ['example.com', 'example.org']);
  await send('new', { site: 'example.com', name: 'Temporary' });
  const temporary = (await send('list', { site: 'example.com' })).data.accounts[0];
  await send('forget', { site: 'example.com', id: temporary.id });
  assert.deepEqual((await send('list')).data.sites, ['example.com', 'example.org']);
  await send('remove-site', { site: 'example.com' });
  assert.deepEqual((await send('list')).data.sites, ['example.org']);
  assert.equal(listener({ action: 'list' }, { id: 'test', url: 'https://dola.com' }), undefined);
  delete globalThis.browser;
});
