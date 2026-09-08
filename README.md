# Switchboard

A privacy-first extension for **Chrome and Firefox** to seamlessly manage and switch between multiple accounts on the same website. 

*No servers, no analytics, no account creation automation, and no remote code.*

## Features
- **Multi-Account Management:** Save and seamlessly switch between different logins for the same website.
- **Local Storage Only:** Your credentials and cookies never leave your machine.
- **Browser-Native Approaches:** Utilizes Firefox's native Container Tabs and Chrome's Cookie API to isolate sessions.
- **Export Cookies:** Export your session cookies as JSON or TXT for specific containers or accounts.

## How it Works

| Browser | Approach | Current limits |
| --- | --- | --- |
| **Chrome** (132+) | Save and restore named cookie snapshots; one active account per website across all normal windows. | Experimental. Cookies only; websites using other storage (IndexedDB, localStorage) may not switch correctly. |
| **Firefox** (140+) | Native container tabs for simultaneous accounts in the same window. | Websites can still expire logins or connect account activity across IPs. |

*Note: Nothing here guarantees invisibility, protection from bans, or permanent authentication. Compatibility must be checked per website.*

## Installation

### Chrome (Manual Unpacked)
1. [Download the latest release ZIP](https://github.com/HeinMynn/switchboard-extension/releases/latest) and extract the `dist/chrome` folder (or build it from source).
2. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select the extracted `dist/chrome` folder.
4. Pin Switchboard to your toolbar.

### Firefox (Temporary Add-on)
*Note: Temporary add-ons are removed when Firefox restarts. A signed add-on is required for permanent installation.*
1. [Download the latest release ZIP](https://github.com/HeinMynn/switchboard-extension/releases/latest) and extract the `dist/firefox` folder (or build it from source).
2. Open `about:debugging#/runtime/this-firefox` and click **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.

## Usage (Quick Start)
1. Open the Switchboard popup and select a website.
2. **Chrome:** Sign in normally, open the popup, and click **Add account** -> **Save account**. To add a second account, click **Add account** -> **Create & open**, sign in, and click **Save login**. Use **Switch & refresh** to swap between them.
3. **Firefox:** Click **Add account**, enter a name, and click **Create & open**. Sign in within the new color-coded container tab. Repeat for additional accounts. Use the **Open** button to launch a specific account's container.

## Encrypted backups

Use **Backup Data** or **Restore Data** in the popup to open the backup page. Choose and confirm a password of at least 12 characters, then download a `switchboard-backup-YYYY-MM-DD.swb` file. Native Web Crypto uses AES-256-GCM and PBKDF2-SHA-256 with 600,000 iterations, a fresh 16-byte salt, and a fresh 12-byte IV. No encryption libraries or uploads are used. Lost passwords cannot be recovered.

Chrome backups contain all saved account snapshots plus current cookies for connected websites. Firefox backups contain every saved container's cookies, including external sign-in providers, and request website access to collect them. Normal Firefox tabs are excluded. Other website storage, such as localStorage and IndexedDB, is not included.

To restore, choose the file, unlock it, review the websites, confirm the overwrite, and allow access. Use the same browser type as the backup; cross-browser conversion is not supported. Close affected Chrome tabs first. Chrome restores live cookies and keeps saved snapshots separately. Firefox creates new containers and remaps cookies to their IDs; old containers remain untouched. Unrelated extension settings and unrelated websites' cookies are preserved.

If restoration is interrupted, open the backup page, close affected Chrome tabs, and use **Recover restore**. Normal account operations are blocked while a restore journal remains. Backups cannot prevent website session expiry or revocation. Native browser prompts and real cross-device login validity require manual verification.

## Privacy & Security Safeguards
- **Strict Permissions:** Chrome requests website access only when you connect a website. Firefox requests optional access only during explicit cookie exports.
- **No Cloud Sync:** Chrome snapshots store sensitive cookie values locally (`storage.local`) unencrypted. Firefox stores only labels and container IDs. None of this is synced, uploaded, or accessible to content scripts.
- **Safe Recovery:** Chrome switches are serialized with a recovery journal to prevent data loss during a switch.
- **Forget Accounts:** Removing an account deletes Switchboard's entry but does not log you out on the website's server. 

*Protect your local machine and exported cookie files, as they grant access to your accounts.*

## Development & Building

Node.js 20+ is required. No dependency installation (`npm install`) is needed.

```bash
# Build the extensions (outputs to dist/chrome and dist/firefox)
npm run build

# Run the test suite
npm test
```

## Updating & Changelog
For detailed version history, update instructions, and compatibility changes, please see the [CHANGELOG.md](CHANGELOG.md).
