# Changelog

Changes to Switchboard are listed here, newest first. Earlier entries summarize the version history recorded in the README; they do not imply a published store release or Git tag.

## 1.0.1 — 2026-09-08

### UI & UX Improvements
- **Zero-State Auto-Open:** Automatically skip the "No websites yet" dropdown and present the active tab's domain ready for connection when you first use the extension.
- **Inline Forms:** The "Add website" form now swaps in-place with the website dropdown, keeping the interface compact and eliminating vertical shifting.
- **Header Actions:** Moved website panel actions to the header row, maximizing dropdown width to better display long domains.
- **Refined Icons & Labels:** Upgraded to crisp SVG minus and plus icons for the "Remove" and "New" buttons. Renamed "Remove saved account" to simply "Remove" to save space.

## 1.0.0 — 2026-09-08

- Add **Backup Data** and **Restore Data** with password-encrypted `.swb` files using native Web Crypto, PBKDF2-SHA-256 (600,000 iterations), and AES-256-GCM.
- Back up Chrome's saved cookie snapshots and current cookies separately. Back up all cookies in saved Firefox containers, including external sign-in providers.
- Validate decrypted backups before mutation, remap Firefox accounts into new containers, and journal restores for rollback and recovery.
- Require explicit overwrite confirmation and website permissions before restore. Chrome requires affected tabs to be closed. Restore supports the same browser type across devices; it does not copy other website storage or guarantee valid logins.

- Redesign backup and restore with separate views, account counts, password visibility controls, and a guided review step.
- Add a welcome-page restore shortcut for users who already have a backup.

## 0.6.0 — 2026-09-08

### Added

- Select the active tab's website automatically when it is in the saved website list.
- Prefill the active website address when the user clicks **Add website**, without automatically selecting or connecting unsaved websites.
- Show an immediate unsupported-site message and disable **Connect** for recognized Google service domains, including Gmail, YouTube, their subdomains, and `.google` domains.

### Changed

- Start without a default website. Use `example.com` in the welcome page and address examples.
- Use clearer, consistent labels throughout the popup and setup guide: **Save my current login**, **Start new login**, **Save login again**, **Remove saved account**, **Reload list**, and **Switch**.
- Show **Save login** as the primary action for an unsaved selected Chrome account. Once saved, keep **Open** primary and show a smaller **Save login again** button.
- Remove the separate saved-login update panel.
- Place the switching notice below **Your accounts** and the connection instructions below the website address field.
- Request Firefox's `activeTab` permission to read the active website when the popup opens.
- Link the popup and setup guide to the public privacy policy.

### Fixed

- Finish Chrome website connections in the background after permission approval, even if the popup closes during the prompt.
- Keep connected websites in the saved list when they have no accounts or their last account is removed.
- Disable Chrome cookie export for accounts with no saved cookies.

### Compatibility

- Google services are unsupported. Attempts to adapt cookie scope and Gmail redirects did not establish reliable live account switching. Use Google's own account menu instead.
- Existing Google entries are not automatically deleted. The unsupported-site check prevents new connections; it does not migrate existing saved sessions.
- Chrome still saves and restores cookies only. Website login expiry and other browser storage can affect compatibility. Login saving remains manual, with an additional snapshot taken when switching away from a nonempty session.
- Automated checks use mocked browser APIs and do not prove live website compatibility.

## 0.5.0

- Refresh existing Chrome website tabs during account switching without closing and recreating them.
- Pause tabs while replacing cookies, preserve tab IDs and windows, and resume them after the switch.
- Journal interrupted switches and support rollback and recovery.

## 0.4.0

- Add a bundled welcome page with browser-specific setup instructions.
- Show the guide once on installation or eligible updates, and allow reopening it from the popup.

## 0.3.3

- Add **Remove website** to delete a website's saved entries while preserving live website logins and Firefox containers.

## 0.3.2

- Add Switchboard icons for the toolbar, extension manager, and popup.

## 0.3.1

- Rename the extension to Switchboard while retaining existing storage keys and the Firefox extension ID.

## 0.3.0

- Export cookies as `.json` or `.txt`, both containing formatted JSON.
- Export Chrome saved snapshots or the selected Firefox container's website cookies.

## 0.2.1

- Rename saved accounts without changing account IDs or saved sessions.
- Update Firefox container labels when accounts are renamed.
