import { inScope } from './core.js';

export async function siteTabs(api, domain) {
  const result = [];
  for (const tab of await api.tabs.query({})) {
    if (tab.incognito) continue;
    const url = [tab.pendingUrl, tab.url].find(value => {
      try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && inScope(parsed.hostname, domain); }
      catch { return false; }
    });
    if (url) result.push({ id: tab.id, url });
  }
  return result;
}

export async function pauseTabs(api, tabs, pauseUrl) {
  const results = await Promise.allSettled(tabs.map(async tab => {
    await api.tabs.update(tab.id, { url: pauseUrl });
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const current = await api.tabs.get(tab.id);
      if (current.url === pauseUrl && current.status === 'complete') return;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    throw new Error('A tab could not pause. Dismiss any page navigation prompt and try again.');
  }));
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
}

export async function resumeTabs(api, tabs, pauseUrl) {
  const existing = new Map((await api.tabs.query({})).map(tab => [tab.id, tab]));
  for (const tab of tabs) {
    const current = existing.get(tab.id);
    // Do not recreate closed tabs or navigate a tab the user moved elsewhere.
    if (current && (current.url === pauseUrl || current.pendingUrl === pauseUrl)) {
      await api.tabs.update(tab.id, { url: tab.url });
    }
  }
}
