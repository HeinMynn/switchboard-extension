import { origins, siteFromInput } from './core.js';
import { isGoogleSite, unsupportedGoogleMessage } from './google-site.js';

// Persist the intent before the permission prompt can dismiss the popup.
export async function prepareConnection(api, input) {
  const { domain } = siteFromInput(input);
  if (isGoogleSite(domain)) throw new Error(unsupportedGoogleMessage);
  await api.storage.local.set({ pendingConnection: domain });
  await finishConnection(api);
}

export async function finishConnection(api) {
  const { pendingConnection: domain } = await api.storage.local.get('pendingConnection');
  if (domain && isGoogleSite(domain)) {
    await api.storage.local.set({ pendingConnection: null });
    return;
  }
  if (!domain || !await api.permissions.contains({ origins: origins(domain) })) return;
  const { accountsState = { sites: {}, pending: null } } = await api.storage.local.get('accountsState');
  accountsState.sites[domain] ||= { accounts: [], active: null };
  await api.storage.local.set({ accountsState, lastSite: domain, pendingConnection: null });
}
