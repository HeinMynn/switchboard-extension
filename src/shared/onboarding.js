export function registerWelcome(api) {
  let pending;
  const showOnce = () => pending ||= (async () => {
    const { welcomeShown } = await api.storage.local.get('welcomeShown');
    if (welcomeShown) return;
    await api.tabs.create({ url: api.runtime.getURL('welcome.html') });
    await api.storage.local.set({ welcomeShown: true });
  })().finally(() => { pending = null; });
  api.runtime.onInstalled.addListener(details => {
    if (['install', 'update'].includes(details.reason)) {
      return showOnce().catch(() => { /* The guide remains available from the popup. */ });
    }
  });
}
