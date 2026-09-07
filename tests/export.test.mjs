import test from 'node:test';
import assert from 'node:assert/strict';
import { cookieExport } from '../src/shared/export.js';
test('export formats preserve fields and exclude unrelated domains', () => {
  const cookie = { name: 'session', value: 'synthetic-"value"\n', domain: '.dola.com', httpOnly: true, secure: true, session: true, path: '/', partitionKey: { topLevelSite: 'https://dola.com' } };
  for (const format of ['json', 'txt']) {
    const file = cookieExport([cookie, { domain: 'notdola.com', value: 'unrelated' }], 'dola.com', '../Work:/Account', format);
    assert.deepEqual(JSON.parse(file.text), [cookie]); assert.equal(file.filename, `dola.com-Work-Account-cookies.${format}`);
  }
  assert.throws(() => cookieExport([], 'dola.com', 'Work', 'json'), /No cookies/);
  assert.throws(() => cookieExport([cookie], 'dola.com', 'Work', 'exe'), /Choose JSON/);
});
