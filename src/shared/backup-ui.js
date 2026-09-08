import { encryptBackup, decryptBackup } from './backup-crypto.js';
import { validateBackup, backupOrigins } from './backup-state.js';
import { origins } from './core.js';
const api = globalThis.browser || chrome;
const mode = globalThis.browser?.contextualIdentities ? 'firefox' : 'chrome';
const $ = id => document.getElementById(id);
let busy = false, pending = null, exportOrigins = [], recoveryOrigins = [];
function showPanel() {
  const restore = location.hash === '#decrypt-form';
  $('backup-panel').hidden = restore; $('restore-panel').hidden = !restore;
  for (const [id, selected] of [['backup-nav', !restore], ['restore-nav', restore]]) {
    if (selected) $(id).setAttribute('aria-current', 'page'); else $(id).removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', showPanel); showPanel();
function syncRestoreButton() { $('restore-all').disabled = busy || !pending || !$('overwrite').checked; }
$('overwrite').addEventListener('change', syncRestoreButton);
$('show-passwords').addEventListener('change', () => {
  for (const id of ['backup-password', 'backup-confirm']) $(id).type = $('show-passwords').checked ? 'text' : 'password';
});
$('backup-note').textContent = mode === 'firefox'
  ? 'Firefox will ask for website access to include cookies from your saved containers, including sign-in providers. Cookies from ordinary tabs are excluded.'
  : 'Includes saved logins and current cookies for your connected websites. Your accounts stay on this device.';
$('restore-note').textContent = mode === 'chrome'
  ? 'Close all tabs for the websites in the backup before restoring. Their current cookies will be replaced. Other websites are left alone.'
  : 'Your accounts will be restored into new Firefox containers. Existing containers and their logins will stay in Firefox.';
async function send(action, extra = {}) {
  const result = await api.runtime.sendMessage({ action, ...extra });
  if (!result?.ok) throw new Error(result?.error || 'The extension did not respond.');
  return result.data;
}
async function run(work) {
  if (busy) return;
  busy = true; document.body.setAttribute('aria-busy', 'true'); $('progress').hidden = false;
  document.querySelectorAll('button,input').forEach(e => e.disabled = true);
  $('status').className = ''; $('status').textContent = 'Working… Keep this page open.';
  try { await work(); } catch (e) { $('status').className = 'error'; $('status').textContent = e.message; }
  finally {
    busy = false; document.body.removeAttribute('aria-busy'); $('progress').hidden = true;
    document.querySelectorAll('button,input').forEach(e => e.disabled = false);
    syncRestoreButton();
    $('backup-password').value = ''; $('backup-confirm').value = ''; $('restore-password').value = '';
    $('show-passwords').checked = false;
    for (const id of ['backup-password', 'backup-confirm']) $(id).type = 'password';
  }
}
async function refreshSites() {
  const s = await api.storage.local.get(['accountsState', 'pockets', 'connectedSites', 'backupRestoreJournal']);
  const sites = mode === 'chrome' ? Object.keys(s.accountsState?.sites || {})
    : [...(s.connectedSites || []), ...(s.pockets || []).map(p => p.domain)];
  exportOrigins = mode === 'firefox' ? ['http://*/*', 'https://*/*'] : [...new Set(sites.flatMap(origins))];
  recoveryOrigins = [...new Set((s.backupRestoreJournal?.liveCookies || []).flatMap(s => origins(s.domain)))];
  const count = mode === 'chrome' ? Object.values(s.accountsState?.sites || {}).reduce((n, site) => n + site.accounts.length, 0) : (s.pockets || []).length;
  $('current-summary').textContent = `${count} saved account${count === 1 ? '' : 's'} · ${new Set(sites).size} website${new Set(sites).size === 1 ? '' : 's'}`;
  $('recovery-panel').hidden = !s.backupRestoreJournal;
}
api.storage.onChanged.addListener(() => { refreshSites().catch(() => {}); });
$('backup-form').addEventListener('submit', event => {
  event.preventDefault(); if (busy) return;
  const password = $('backup-password').value;
  if (password !== $('backup-confirm').value) { $('status').textContent = 'Passwords do not match.'; return; }
  // Permission requests must remain directly inside the user's click gesture.
  const permission = exportOrigins.length ? api.permissions.request({ origins: exportOrigins }) : Promise.resolve(true);
  run(async () => {
    if (!await permission) throw new Error('Website access is required to include all cookies. No backup was created.');
    const payload = await send('backup-export');
    const encrypted = await encryptBackup(payload, password);
    const url = URL.createObjectURL(new Blob([encrypted], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `switchboard-backup-${new Date().toISOString().slice(0, 10)}.swb`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('status').textContent = 'Encrypted backup sent to your downloads. Keep the file and password safe.';
  });
});
$('backup-file').addEventListener('change', () => {
  pending = null; $('restore-review').hidden = true; $('overwrite').checked = false;
  $('unlock-fields').hidden = !$('backup-file').files.length;
  $('restore-password').value = ''; syncRestoreButton();
  if (!$('unlock-fields').hidden) $('restore-password').focus();
});
$('decrypt-form').addEventListener('submit', event => {
  event.preventDefault(); if (busy) return;
  const file = $('backup-file').files[0], password = $('restore-password').value;
  pending = null; $('restore-review').hidden = true;
  run(async () => {
    if (!file || !file.name.toLowerCase().endsWith('.swb') || file.size > 64 * 1024 * 1024) throw new Error('Choose a .swb file smaller than 64 MB.');
    pending = validateBackup(await decryptBackup(await file.text(), password), mode);
    $('restore-summary').textContent = `${pending.pockets.length} accounts across ${pending.connectedSites.length} websites: ${pending.connectedSites.join(', ') || 'none'}.`;
    $('overwrite').checked = false; $('restore-review').hidden = false;
    $('restore-review').focus();
    $('status').textContent = 'Backup unlocked. Review the websites and confirm before restoring.';
  });
});
$('cancel-restore').addEventListener('click', () => { pending = null; $('restore-review').hidden = true; $('status').textContent = 'Restore cancelled.'; });
$('restore-all').addEventListener('click', () => {
  if (busy || !pending) return;
  if (!$('overwrite').checked) { $('status').textContent = 'Confirm that you want to replace your configuration.'; return; }
  const payload = pending, requested = backupOrigins(payload);
  const permission = requested.length ? api.permissions.request({ origins: requested }) : Promise.resolve(true);
  run(async () => {
    if (!await permission) throw new Error('Website access was not granted. Nothing was restored.');
    await send('backup-restore', { payload });
    pending = null; $('restore-review').hidden = true; $('backup-file').value = ''; $('unlock-fields').hidden = true;
    await refreshSites(); $('status').textContent = 'Backup restored. Reopen Switchboard to see your accounts.';
  });
});
$('recover-restore').addEventListener('click', () => {
  if (busy) return;
  const permission = recoveryOrigins.length ? api.permissions.request({ origins: recoveryOrigins }) : Promise.resolve(true);
  run(async () => {
    if (!await permission) throw new Error('Website access is required for recovery.');
    await send('backup-recover'); $('status').textContent = 'Recovery complete. Your previous configuration is available.';
  });
});
run(async () => { await refreshSites(); $('status').textContent = ''; });
