import { ChromeAccounts } from './engine.js';
import { registerWelcome } from './onboarding.js';
import { prepareConnection, finishConnection } from './connection.js';
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
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return false;
  const task = enqueue(async () => {
    if (message.action === 'prepare-connect') return prepareConnection(chrome, message.site);
    if (message.action === 'finish-connect') return finishConnection(chrome);
    if (message.action === 'cancel-connect') return chrome.storage.local.set({ pendingConnection: null });
    return engine.handle(message);
  });
  task.then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message }));
  return true;
});
