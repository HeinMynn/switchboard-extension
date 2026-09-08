import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareConnection, finishConnection } from '../dist/chrome/connection.js';
import { ChromeAccounts } from '../dist/chrome/engine.js';

function fixture() {
  const data = { lastSite: 'dola.com' };
  let granted = false;
  const api = {
    storage: { local: {
      get: async () => ({ ...data }),
      set: async value => Object.assign(data, value)
    } },
    permissions: { contains: async () => granted }
  };
  return { api, data, grant: () => { granted = true; } };
}

test('permission grant completes connection after the popup is gone', async () => {
  const { api, data, grant } = fixture();
  await prepareConnection(api, 'example.com');
  assert.equal(data.lastSite, 'dola.com');
  assert.equal(data.pendingConnection, 'example.com');
  grant();
  await finishConnection(api);
  assert.equal(data.lastSite, 'example.com');
  assert.equal(data.pendingConnection, null);
});

test('grant arriving before preparation still connects the website', async () => {
  const { api, data, grant } = fixture();
  grant();
  await finishConnection(api);
  await prepareConnection(api, 'https://www.example.com/path');
  assert.equal(data.lastSite, 'example.com');
  assert.equal(data.pendingConnection, null);
});

test('ungranted permission does not change the selected website', async () => {
  const { api, data } = fixture();
  await prepareConnection(api, 'example.com');
  await finishConnection(api);
  assert.equal(data.lastSite, 'dola.com');
  assert.equal(data.accountsState, undefined);
});

test('connected empty websites survive selection changes and worker reloads until removed', async () => {
  const { api, data, grant } = fixture();
  grant();
  await prepareConnection(api, 'example.com');
  await prepareConnection(api, 'example.org');
  const engine = new ChromeAccounts(api);
  assert.deepEqual((await engine.handle({ action: 'list', site: 'dola.com' })).sites,
    ['example.com', 'example.org']);
  await engine.handle({ action: 'remove-site', site: 'example.com' });
  assert.deepEqual(Object.keys(data.accountsState.sites), ['example.org']);
  await prepareConnection(api, 'example.org');
  assert.deepEqual(Object.keys(data.accountsState.sites), ['example.org']);
});
