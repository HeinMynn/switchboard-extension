# Switchboard

An installable first version of a local account manager for **Chrome and Firefox**. Dola is the default website. No servers, analytics, account creation automation, or remote code.

## What works differently

| Browser | Approach | Current limits |
| --- | --- | --- |
| Chrome 132+ | Save and restore named cookie snapshots; one active account per website across all normal windows | Experimental. Cookies only; websites that use other login storage may not switch correctly. |
| Firefox 140+ | Native container tabs for simultaneous accounts in the same window | Websites can still expire logins or connect account activity. |

**Dola was reported working by the user with version 0.1.0.** The 0.2.0 UX update has been checked with synthetic accounts, not additional live Dola logins. Other websites remain unverified. Firefox containers provide the broader foundation; Chrome compatibility must be checked per website. Nothing here guarantees invisibility, protection from bans, or permanent authentication.

## Updating

Version **0.5.0** adds **Switch & refresh** in Chrome. Existing tabs for the website, including its subdomains in other normal windows, briefly show a local switching page and then return to their previous URLs with the selected account. Tab IDs and windows are preserved; private and unrelated tabs are untouched. If no matching tab exists, a new one opens. Save unfinished work first: navigating refreshes the page and loses unsaved input. Background site activity can still interfere, so live compatibility should be checked. Firefox retains its separate container behavior.

The switch journal includes the original tab URLs for recovery. Cookie restoration completes before tabs resume. After a committed switch, recovery resumes remaining tabs without reverting the selected account. Tabs the user closed or navigated elsewhere are not recreated or redirected.

Version **0.4.0** adds a bundled welcome page with browser-specific setup and usage instructions. It opens once after installation, or once on update for existing installations that have not seen it. Later updates and browser restarts do not reopen it. Use **Setup guide** at the bottom of the popup to reopen it anytime. The page works offline and its **Open Switchboard** button opens the extension popup (with toolbar instructions if the browser cannot open it).

Version **0.3.3** adds **Remove website** below the website picker. Confirmation removes the website and all its saved entries from Switchboard. Live cookies, Firefox containers, website logins, and website permissions remain unchanged. Removing the last website shows the add-website screen, including after reopening the popup. Export any saved snapshots you want to keep before removal.

Version **0.3.2** adds the Switchboard icon to the toolbar, extension manager, and popup. Reload the existing extension after updating its files. Pin Switchboard using the browser's Extensions menu if it is not visible on the toolbar.

Version **0.3.1** renames the extension to **Switchboard**. Reload the same installation to retain saved accounts. The original Firefox extension ID and storage keys are intentionally preserved.

Version **0.3.0** adds **Manage account → Export cookies**. Choose **JSON (.json)** or **JSON text (.txt)**, then **Download**. Both contain a formatted JSON array of cookie objects with their browser-provided fields. Chrome exports the chosen saved snapshot; use **Save again** for current cookies. Firefox exports the selected website's live cookies from the chosen container, requesting optional website access on export. No account is switched or modified. Export files are unencrypted and can grant account access; keep them private.
 
Version **0.2.1** adds **Manage account → Rename**. Edit the name inline and choose **Save name** (or Enter); Cancel/Escape discards the edit. Saved sessions and account IDs are preserved. Firefox's container label updates too.

Reload the existing unpacked extension from `chrome://extensions` after rebuilding, or replace files in the folder you originally loaded with the updated Chrome package and reload. Keep the same folder and extension installation to retain saved accounts. Do not remove and reinstall the extension. The saved-data format and Chrome permissions are unchanged; Firefox adds optional website access for export.

The popup has **Switch & refresh**, a saved-website picker, the selected account first, relative save times, account search for lists of five or more, and a separate save reminder. **Manage account** holds restore and forget actions. Chrome refreshes existing site tabs when switching. Save unfinished work first.

## Install locally

Run `npm run build` (Node.js 20+; no dependency installation needed).

### Chrome

1. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
2. Select the `dist/chrome` folder, then pin Switchboard.
3. Open its popup, leave `dola.com` selected, and click **Connect** when prompted to grant site access.
4. Sign in to Dola normally. In the popup choose **Add account**, enter a name, leave **Save the login already open** selected, and click **Save account**.
5. To add another account, save unfinished work in **all Dola tabs in every Chrome window**. Choose **Add account**, enter a different name, and click **Create & open**. Existing site tabs refresh automatically.
6. Sign in to the second account in the opened tab, then return to the popup and click **Save login**.
7. To switch back, click **Switch & refresh** next to the first account. Verify the displayed identity before doing anything in the website.

Use **Save again** after login changes and before quitting Chrome. Snapshots are saved explicitly and before switching away when live cookies are nonempty; they are not continuously synchronized. To reapply the selected snapshot after a restart, save unfinished work and choose **Manage account → Restore saved login**. Restore intentionally replaces current cookies without overwriting the saved snapshot.

If the site still shows the old account, stop using Chrome switching for it. Login information in localStorage, IndexedDB, service workers, sessionStorage, and separate identity-provider domains is not isolated or copied. The extension never clears those stores. Background site activity and tabs opened during a switch can interfere; closing site tabs reduces races but cannot provide native isolation.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`.
2. Open Switchboard, choose a website, click **Add account**, enter a name, and click **Create & open**.
3. Sign in in the new container tab. Repeat for another account. Use each entry's **Open** button to return to its container.

Firefox manages each container's cookies and site storage. Accounts can stay open together in one window. **Temporary add-ons are removed on Firefox restart**; this is a development installation, not a persistent distribution method. A signed add-on is required for ordinary permanent Firefox installation. Signing/publication has not been performed. Do not rely on a temporary installation for long-term saved accounts.

## Data and safeguards

- Chrome requests website access only when you connect a website; the permission includes its subdomains. Use a site's own domain, such as `dola.com`, not a public suffix such as `co.uk`. Chrome's tabs permission checks for open site tabs in every window.
- Chrome snapshots contain sensitive cookie values in `storage.local`, without additional encryption. They are not synced or uploaded. Explicit export sends cookies to the trusted extension popup for local download; ordinary UI messages contain metadata only. Content scripts cannot access this storage; none are installed. Someone with access to the browser profile may access these credentials.
- Firefox stores account labels and container IDs only. Export reads cookie values for the requested website and container after website permission is granted.
- Chrome switches are serialized. A recovery journal is written before changing cookies; failed restores attempt rollback. After interruption, the popup requires **Recover previous session** before other operations. There is no automatic session restoration at startup.
- A first **Create & open** operation backs up any existing site cookies as a **Previous session** entry before clearing them. Cookies for unrelated websites are left alone.
- Expiry dates, Secure, HttpOnly, SameSite, host-only scope, paths, and partition keys are preserved on restore. Expired cookies are skipped; cookie expiry is never extended. Session cookies remain session cookies in the browser, with a local snapshot available for manual restore.
- **Forget** deletes the extension's saved entry. It does not log out a website. In Firefox it leaves the container intact and accessible from Firefox's own container controls. To log out, use the website's logout, then forget the Chrome snapshot. Remove Firefox containers through Firefox if you want their native data deleted.
- Logging out or account revocation may invalidate every saved copy of that session. Browser clear-on-exit settings and server expiration can require signing in again.

## Validation

Run `npm test` for mocked browser-API tests of scope boundaries, cookie flags and partitions, permission failure, open-tab blocking, switching, rollback, interrupted-worker recovery, and snapshot preservation. These tests do not establish live website compatibility.

Before relying on a website, check two authorized accounts: save A, create/save B, switch A/B, check identity and access, restart the browser, restore, and finally confirm website logout invalidates the login as expected. Include any external sign-in provider and background activity in the check. Firefox should also be checked with simultaneous tabs and a signed installation across restart.

## Sources

- [Chrome cookies API](https://developer.chrome.com/docs/extensions/reference/api/cookies)
- [Firefox contextual identities](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/contextualIdentities)
- [Dola terms](https://www.dola.com/legal/terms/en) and [privacy policy](https://www.dola.com/legal/privacy/en)
