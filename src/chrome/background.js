import { ChromeAccounts } from './engine.js';
import { registerWelcome } from './onboarding.js';
registerWelcome(chrome);
const engine = new ChromeAccounts(chrome);
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return false;
  const task = queue.then(() => ready).then(() => engine.handle(message));
  queue = task.catch(() => {});
  task.then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message }));
  return true;
});
