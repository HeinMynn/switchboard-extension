const api = globalThis.browser || globalThis.chrome;
const firefox = Boolean(globalThis.browser?.contextualIdentities);
const text = (id, value) => { document.getElementById(id).textContent = value; };
text('browser-label', firefox ? 'Setup guide · Firefox' : 'Setup guide · Chrome');
if (!firefox) {
  text('example-action', 'Switch & refresh');
  text('step-three', 'Save your work in this website’s tabs; they will refresh automatically. Choose Add account → Create & open, sign in, then return to Switchboard and click Save login.');
  text('routine-text', 'Save unfinished work, then choose Switch & refresh beside the account you want. Your existing tabs return to their previous URLs with the selected login. Check the account shown on the website. Save again after login changes and before quitting Chrome.');
  text('restore-text', 'If the selected login needs restoring, save unfinished work and choose Manage account → Restore saved login. Existing tabs refresh automatically. If a switch is interrupted, use Recover previous session.');
}
if (firefox) {
  text('intro', 'Give each account its own container tab. Keep them open together, in the same browser window.');
  text('example-action', 'Open');
  text('step-one', 'Open Firefox’s Extensions menu and pin Switchboard to the toolbar. Click the green switch icon to open it.');
  text('step-two-title', 'Create your first container');
  text('step-two', 'Choose a website, select Add account, and give it a name. Click Create & open, then sign in in the new container tab. Firefox keeps its login storage separate.');
  text('step-three-title', 'Add another account');
  text('step-three', 'Repeat Add account → Create & open with a different name. Sign in to your other account in that tab. You can keep both tabs open at the same time.');
  text('routine-text', 'Choose Open beside an account to return to its container. Firefox manages its login storage automatically. Use Switchboard to open the right container each time.');
  text('export-text', 'Choose Manage account → Export cookies, then .json or .txt. Both contain JSON. Allow website access when asked; only that website’s cookies from the chosen container are exported. Keep the file private.');
  text('remove-text', 'Forget account and Remove website remove entries from Switchboard. Firefox containers and their cookies remain. Log out on the website to sign out; remove containers through Firefox to delete their stored data.');
  text('restore-title', 'Using a temporary installation?');
  text('restore-text', 'Firefox removes temporary add-ons on restart. A signed add-on is required for ordinary permanent installation. Do not rely on a temporary installation for long-term saved account entries.');
  text('limits', 'Firefox and website settings determine how long you stay signed in. Websites can expire or revoke sessions. Containers separate login storage; they do not hide your identity or guarantee protection from bans.');
}
document.getElementById('start').addEventListener('click', async () => {
  try { await api.action.openPopup(); }
  catch { text('start-status', 'Click the Switchboard icon in your browser’s Extensions menu to get started. Pin it to keep it within reach.'); }
});
