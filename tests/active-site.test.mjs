import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSite } from '../src/shared/active-site.js';
import { chromeConnectionSite } from '../src/shared/google-site.js';

test('Chrome Gmail uses the shared Google scope while Firefox retains its container website', () => {
  for (const host of ['gmail.com', 'mail.google.com', 'accounts.google.com']) {
    assert.equal(chromeConnectionSite(host).domain, 'google.com');
    assert.equal(activeSite({ url: `https://${host}/` }, ['mail.google.com'], true), 'google.com');
  }
  assert.equal(activeSite({ url: 'https://mail.google.com/' }, [], false), 'mail.google.com');
  assert.equal(chromeConnectionSite('mail.google.com.example.org').domain, 'mail.google.com.example.org');
});

test('active website matches the most specific saved scope', () => {
  assert.equal(activeSite({ url: 'https://chat.dola.com/chat/123' }, ['dola.com']), 'dola.com');
  assert.equal(activeSite({ url: 'https://app.example.com/' }, ['example.com', 'app.example.com']), 'app.example.com');
  assert.equal(activeSite({ url: 'https://notdola.com/' }, ['dola.com']), 'notdola.com');
});

test('new websites preserve their hostname without guessing public suffixes', () => {
  assert.equal(activeSite({ url: 'https://www.example.co.uk/path' }), 'example.co.uk');
  assert.equal(activeSite({ url: 'https://tenant.example.com/' }), 'tenant.example.com');
  assert.equal(activeSite({ url: 'https://old.example/', pendingUrl: 'https://new.example/' }), 'new.example');
});

test('private, internal, and unreadable tabs keep the previous selection', () => {
  for (const tab of [undefined, {}, { url: 'chrome://extensions' }, { url: 'about:blank' },
    { url: 'file:///example.html' }, { url: 'https://example.com', incognito: true }]) {
    assert.equal(activeSite(tab), null);
  }
});
