import { ChromeAccounts } from './engine.js';
import { registerWelcome } from './onboarding.js';
import { prepareConnection, finishConnection } from './connection.js';
import { gatherBackup, restoreBackup, recoverBackup } from './backup-state.js';
registerWelcome(chrome);
const engine = new ChromeAccounts(chrome);
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
let queue = Promise.resolve();
function enqueue(work) {
  const task = queue.then(() => ready).then(work);
  queue = task.catch(() => {});
  return task;
}
chrome.permissions.onAdded.addListener(() => { enqueue(() => finishConnection(chrome)); });
enqueue(() => finishConnection(chrome));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const backupPage = sender.url?.split('#')[0] === chrome.runtime.getURL('backup.html');
  if (sender.id !== chrome.runtime.id || (backupPage ? !['backup-export', 'backup-restore', 'backup-recover'].includes(message.action) : sender.url !== chrome.runtime.getURL('popup.html') || message.action.startsWith('backup-'))) return false;
  const task = enqueue(async () => {
    if (message.action === 'backup-recover') return recoverBackup(chrome, 'chrome', engine);
    if ((await chrome.storage.local.get('backupRestoreJournal')).backupRestoreJournal) throw new Error('Recover the interrupted restore from Backup Data before continuing.');
    if (message.action === 'backup-export') return gatherBackup(chrome, 'chrome');
    if (message.action === 'backup-restore') return restoreBackup(chrome, 'chrome', message.payload, engine);
    if (message.action === 'prepare-connect') return prepareConnection(chrome, message.site);
    if (message.action === 'finish-connect') return finishConnection(chrome);
    if (message.action === 'cancel-connect') return chrome.storage.local.set({ pendingConnection: null });
    return engine.handle(message);
  });
  task.then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message }));
  return true;
});
