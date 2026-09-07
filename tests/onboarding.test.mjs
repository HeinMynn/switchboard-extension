import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWelcome } from '../src/shared/onboarding.js';

test('welcome opens once on install or upgrade and never on browser updates', async () => {
  let listener; let data = {}; const opened = [];
  const api = {
    runtime: { getURL: path => `extension://${path}`, onInstalled: { addListener: fn => { listener = fn; } } },
    storage: { local: { get: async () => data, set: async value => { data = { ...data, ...value }; } } },
    tabs: { create: async value => { opened.push(value); } }
  };
  registerWelcome(api);
  await listener({ reason: 'chrome_update' }); assert.equal(opened.length, 0);
  await Promise.all([listener({ reason: 'install' }), listener({ reason: 'update' })]);
  assert.deepEqual(opened, [{ url: 'extension://welcome.html' }]);
  registerWelcome(api); await listener({ reason: 'update' }); assert.equal(opened.length, 1);
  assert.equal(data.welcomeShown, true);
});

test('failed welcome opening can retry on a later install event', async () => {
  let listener; let data = {}; let fail = true;
  registerWelcome({
    runtime: { getURL: path => path, onInstalled: { addListener: fn => { listener = fn; } } },
    storage: { local: { get: async () => data, set: async value => { data = value; } } },
    tabs: { create: async () => { if (fail) throw new Error('No window'); } }
  });
  await listener({ reason: 'install' }); assert.equal(data.welcomeShown, undefined);
  fail = false; await listener({ reason: 'update' }); assert.equal(data.welcomeShown, true);
});
