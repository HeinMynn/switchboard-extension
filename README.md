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
1. Download or build the `dist/chrome` folder.
2. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select the `dist/chrome` folder.
4. Pin Switchboard to your toolbar.

### Firefox (Temporary Add-on)
*Note: Temporary add-ons are removed when Firefox restarts. A signed add-on is required for permanent installation.*
1. Download or build the `dist/firefox` folder.
2. Open `about:debugging#/runtime/this-firefox` and click **Load Temporary Add-on**.
3. Select `dist/firefox/manifest.json`.

## Usage (Quick Start)
1. Open the Switchboard popup and select a website.
2. **Chrome:** Sign in normally, open the popup, and click **Add account** -> **Save account**. To add a second account, click **Add account** -> **Create & open**, sign in, and click **Save login**. Use **Switch & refresh** to swap between them.
3. **Firefox:** Click **Add account**, enter a name, and click **Create & open**. Sign in within the new color-coded container tab. Repeat for additional accounts. Use the **Open** button to launch a specific account's container.

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
