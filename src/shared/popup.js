import { siteFromInput, origins } from './core.js';
const api = globalThis.browser || chrome;
const firefox = Boolean(globalThis.browser?.contextualIdentities);
const $ = id => document.getElementById(id);
let selectedSite = 'dola.com';
let current = { accounts: [] };
let busy = false;
function status(text, error = false) { $('status').textContent = text; $('status').hidden = !text; $('status').className = error ? 'error' : ''; }
async function send(action, extra = {}) {
  if (!selectedSite) {
    if (action === 'list') return { accounts: [], sites: [], active: null, pending: null };
    throw new Error('Add a website first.');
  }
  const response = await api.runtime.sendMessage({ action, site: selectedSite, ...extra });
  if (!response?.ok) throw new Error(response?.error || 'The extension did not respond. Try reopening it.');
  return response.data;
}
async function run(work) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button, input, select').forEach(b => b.disabled = true);
  document.body.setAttribute('aria-busy', 'true');
  try { await work(); } catch (error) { status(error.message, true); }
  finally { busy = false; document.querySelectorAll('button, input, select').forEach(b => { if (!b.dataset.locked) b.disabled = false; }); document.body.removeAttribute('aria-busy'); }
}
function savedTime(timestamp) {
  if (!timestamp) return 'Sign in, then save your login';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Saved just now';
  if (minutes < 60) return `Saved ${minutes} min ago`;
  if (minutes < 1440) return `Saved ${Math.floor(minutes / 60)} hr ago`;
  return `Saved ${new Date(timestamp).toLocaleDateString()}`;
}
function actionButton(text, action, account, primary = false) {
  const b = document.createElement('button'); b.textContent = text;
  if (primary) b.className = 'primary';
  b.addEventListener('click', () => run(async () => {
    if (action === 'forget' && !confirm(`Forget “${account.name}”? ${firefox ? 'Its Firefox container and login will remain.' : 'Its saved login will be removed. The current website login will remain.'}`)) return;
    if (action === 'restore' && !confirm('Restore this saved login and refresh the website’s tabs? Unsaved page work and current login changes will not be saved.')) return;
    status(action === 'switch' ? `Switching to ${account.name}…` : 'Working…');
    const data = await send(action, { id: account.id, openAfter: ['switch', 'restore'].includes(action), refreshTabs: !firefox });
    render(data);
    status(data.notice || (['switch', 'restore', 'open'].includes(action) ? `${account.name} opened. Check the account shown on the website.` : action === 'save' ? 'Login saved on this device.' : 'Saved account removed.'));
  })); return b;
}
function renderAccounts() {
  $('accounts').replaceChildren();
  const query = $('search').value.trim().toLowerCase();
  const accounts = [...current.accounts].sort((a, b) => Number(b.id === current.active) - Number(a.id === current.active)).filter(a => a.name.toLowerCase().includes(query));
  if (!accounts.length) {
    const p = document.createElement('div'); p.className = 'empty';
    const title = document.createElement('strong'); title.textContent = query ? 'No matching accounts' : 'Make room for your accounts';
    const detail = document.createElement('span'); detail.textContent = query ? 'Try a different name.' : firefox ? 'Add your first account to open a separate container.' : 'Already signed in? Add an account to save that login.';
    if (!selectedSite) { title.textContent = 'No websites yet'; detail.textContent = 'Connect a website above to start adding accounts.'; }
    p.append(title, detail); $('accounts').append(p);
  }
  for (const a of accounts) {
    const active = a.id === current.active;
    const card = document.createElement('article'); card.className = `account${active ? ' selected' : ''}`;
    const head = document.createElement('div'); head.className = 'account-head';
    const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = Array.from(a.name)[0]?.toUpperCase() || 'A';
    const copy = document.createElement('div'); copy.className = 'account-copy';
    const name = document.createElement('strong'); name.textContent = a.name;
    if (active) { const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'Selected'; name.append(badge); }
    const meta = document.createElement('small'); meta.textContent = firefox ? 'Separate container' : savedTime(a.savedAt);
    if (a.savedAt) meta.title = new Date(a.savedAt).toLocaleString();
    copy.append(name, meta);
    let btnText = firefox || active ? 'Open' : 'Switch & refresh';
    let btnAction = firefox || active ? 'open' : 'switch';
    if (!firefox && active && !a.count) { btnText = 'Save account'; btnAction = 'save'; }
    head.append(avatar, copy, actionButton(btnText, btnAction, a, true));
    const more = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Manage account';
    const row = document.createElement('div'); row.className = 'row';
    if (!firefox && active && a.count) row.append(actionButton('Restore saved login', 'restore', a));
    const rename = document.createElement('button'); rename.textContent = 'Rename';
    const form = document.createElement('form'); form.className = 'rename-form'; form.hidden = true;
    const input = document.createElement('input'); input.value = a.name; input.required = true; input.maxLength = 60; input.setAttribute('aria-label', `New name for ${a.name}`);
    const controls = document.createElement('div'); controls.className = 'row';
    const save = document.createElement('button'); save.textContent = 'Save name'; save.className = 'primary'; save.type = 'submit';
    const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.type = 'button';
    cancel.addEventListener('click', () => { form.hidden = true; rename.focus(); });
    input.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); form.hidden = true; rename.focus(); } });
    rename.addEventListener('click', () => { form.hidden = false; input.value = a.name; input.focus(); input.select(); });
    form.addEventListener('submit', event => {
      event.preventDefault();
      run(async () => {
        const data = await send('rename', { id: a.id, name: input.value });
        $('search').value = ''; render(data); status('Account renamed.');
      });
    });
    controls.append(save, cancel); form.append(input, controls);
    const exportButton = document.createElement('button'); exportButton.textContent = 'Export cookies';
    const exportWarning = document.createElement('p');
    if (!firefox && !a.count) {
      exportButton.disabled = true;
      exportButton.dataset.locked = 'true';
      exportWarning.className = 'hint warning-text';
      exportWarning.textContent = 'Save account first to export the cookies.';
    }
    const exportForm = document.createElement('form'); exportForm.className = 'rename-form'; exportForm.hidden = true;
    const exportNote = document.createElement('p'); exportNote.className = 'hint';
    exportNote.textContent = (firefox ? 'Exports this website’s cookies from this account’s container.' : 'Exports this account’s last saved cookies. Use Save again first for the latest login.') + ' Both formats contain JSON. Keep the file private: cookies can grant access to your account.';
    const format = document.createElement('select'); format.setAttribute('aria-label', 'Cookie export format');
    for (const [value, text] of [['json', 'JSON (.json)'], ['txt', 'JSON text (.txt)']]) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; format.append(option);
    }
    const download = document.createElement('button'); download.type = 'submit'; download.className = 'primary'; download.textContent = 'Download';
    const exportCancel = document.createElement('button'); exportCancel.type = 'button'; exportCancel.textContent = 'Cancel';
    exportCancel.addEventListener('click', () => { exportForm.hidden = true; exportButton.focus(); });
    exportButton.addEventListener('click', () => { exportForm.hidden = false; form.hidden = true; format.focus(); });
    exportForm.addEventListener('submit', event => {
      event.preventDefault(); if (busy) return;
      // Firefox only requests cookie host access after the explicit export gesture.
      const permission = firefox ? api.permissions.request({ origins: origins(selectedSite) }) : Promise.resolve(true);
      run(async () => {
        if (!await permission) throw new Error('Website access was not granted. No cookies were exported.');
        const result = await send('export', { id: a.id, format: format.value });
        const url = URL.createObjectURL(new Blob([result.text], { type: result.mimeType + ';charset=utf-8' }));
        const link = document.createElement('a'); link.href = url; link.download = result.filename;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        exportForm.hidden = true; status('Export sent to your browser’s downloads.');
      });
    });
    const exportActions = document.createElement('div'); exportActions.className = 'row'; exportActions.append(download, exportCancel);
    exportForm.append(exportNote, format, exportActions);
    row.append(rename, exportButton, actionButton('Forget account', 'forget', a)); 
    more.append(summary, row);
    if (!firefox && !a.count) more.append(exportWarning);
    more.append(form, exportForm);
    card.append(head, more); $('accounts').append(card);
  }
}
function render(data) {
  current = data;
  $('websites').replaceChildren();
  for (const domain of [...new Set([selectedSite, ...(data.sites || [])].filter(Boolean))].sort()) {
    const option = document.createElement('option'); option.value = domain; option.textContent = domain; $('websites').append(option);
  }
  $('websites').value = selectedSite;
  if (!selectedSite) {
    const option = document.createElement('option'); option.textContent = 'No websites yet'; option.value = ''; $('websites').append(option);
    $('site-form').hidden = false; $('site').value = '';
  }
  $('remove-site').hidden = !selectedSite;
  $('add-account').hidden = !selectedSite;
  $('open').hidden = firefox || !selectedSite;
  $('recover').hidden = !data.pending; $('count').textContent = data.accounts.length;
  $('search').hidden = data.accounts.length < 5 && !$('search').value;
  renderAccounts();
  const active = data.accounts.find(a => a.id === data.active);
  $('save-panel').hidden = firefox || !active;
  $('save-heading').textContent = active?.savedAt ? 'Keep this login up to date' : 'Finish setting up your account';
  $('save-hint').textContent = active?.savedAt ? 'Save again after signing in or changing your login.' : 'Sign in on the website, then save it here.';
  $('save').textContent = active?.savedAt ? 'Save again' : 'Save account';
  $('add-options').hidden = firefox || Boolean(active); updateAddForm();
}
function method() { return firefox || current.active ? 'new' : document.querySelector('input[name="method"]:checked').value; }
function updateAddForm() {
  const fresh = method() === 'new'; $('new').textContent = fresh ? 'Create & open' : 'Save account';
  $('add-hint').textContent = firefox ? 'A new container tab will open. Sign in there once.' : fresh ? 'Save your work first. This site’s open tabs will refresh with a fresh session for you to sign in.' : 'Sign in on the website first, then save that login under this name.';
}
$('mode').textContent = firefox ? 'Separate accounts. One window.' : 'Your logins, ready to switch.';
$('notice').textContent = firefox ? 'Open multiple accounts together in separate tabs.' : 'Switching refreshes this site’s tabs in every window. Save unfinished work first.';
$('help').textContent = firefox ? 'Add an account, sign in in its container tab, and use Open to return. Firefox manages login storage.' : 'Save a login once, then use Switch & refresh. Existing tabs briefly pause and reload with the selected login. Save again after login changes and before quitting Chrome. To restore the selected account after a restart, use Manage account → Restore saved login. Chrome compatibility varies by website.';
$('open').hidden = firefox;
$('welcome').addEventListener('click', () => run(async () => {
  await api.tabs.create({ url: api.runtime.getURL('welcome.html') });
}));
$('remove-site').addEventListener('click', () => run(async () => {
  const removed = selectedSite;
  if (!confirm(`Remove ${removed} and its ${current.accounts.length} saved account(s) from Switchboard? ${firefox ? 'Firefox containers and their logins will remain in Firefox.' : 'Saved cookie snapshots will be deleted. Current website cookies and logins will remain.'} Website permissions remain unchanged.`)) return;
  const data = await send('remove-site');
  selectedSite = data.domain; $('search').value = ''; $('new-form').hidden = true;
  render(data); status(`${removed} removed from Switchboard.`);
}));
$('change-site').addEventListener('click', () => { $('site-form').hidden = !$('site-form').hidden; if (!$('site-form').hidden) { $('site').value = selectedSite; $('site').focus(); $('site').select(); } });
$('site-form').addEventListener('submit', event => {
  event.preventDefault(); if (busy) return;
  let site; try { site = siteFromInput($('site').value); } catch (error) { status(error.message, true); return; }
  // Request within the submit gesture, before awaiting other work.
  const permission = firefox ? Promise.resolve(true) : api.permissions.request({ origins: origins(site.domain) });
  run(async () => {
    if (!await permission) throw new Error('Website access was not granted.');
    selectedSite = site.domain; await api.storage.local.set({ lastSite: selectedSite });
    $('search').value = ''; $('new-form').hidden = true;
    render(await send('list')); $('site-form').hidden = true; status('Website connected.');
  });
});
$('websites').addEventListener('change', () => run(async () => {
  selectedSite = $('websites').value; $('search').value = ''; $('new-form').hidden = true;
  await api.storage.local.set({ lastSite: selectedSite }); render(await send('list')); status('');
}));
$('search').addEventListener('input', renderAccounts);
$('refresh').addEventListener('click', () => run(async () => { render(await send('list')); status('Accounts refreshed.'); }));
$('save').addEventListener('click', () => run(async () => { render(await send('save')); status('Login saved on this device.'); }));
$('add-account').addEventListener('click', () => { $('new-form').hidden = false; updateAddForm(); $('name').focus(); });
$('cancel-add').addEventListener('click', () => { $('new-form').hidden = true; $('add-account').focus(); });
document.querySelectorAll('input[name="method"]').forEach(input => input.addEventListener('change', updateAddForm));
$('new-form').addEventListener('submit', event => {
  event.preventDefault(); const action = method();
  run(async () => {
    const data = await send(action, { name: $('name').value, openAfter: action === 'new', refreshTabs: !firefox });
    render(data); $('name').value = ''; $('new-form').hidden = true;
    status(data.notice || (action === 'new' ? firefox ? 'Account opened in its own container. Sign in there.' : 'New account opened. Sign in, then click Save account here.' : 'Account saved.'));
  });
});
$('open').addEventListener('click', () => run(async () => { await send('open'); status('Website opened.'); }));
$('recover').addEventListener('click', () => run(async () => { render(await send('recover')); status('Previous login recovered.'); }));
run(async () => {
  const { lastSite } = await api.storage.local.get('lastSite'); if (lastSite !== undefined) selectedSite = lastSite;
  render(await send('list'));
  if (!firefox && selectedSite && !await api.permissions.contains({ origins: origins(selectedSite) })) { $('site-form').hidden = false; $('site').value = selectedSite; status('Click Connect to enable this website.'); }
});
