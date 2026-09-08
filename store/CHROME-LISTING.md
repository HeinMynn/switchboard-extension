# Chrome Web Store draft

Status: prepared for publisher review, not submitted.

Publisher name: UNDECIDED — to be supplied by the publisher.
Support email: UNDECIDED — to be supplied by the publisher.
Public privacy-policy URL: NOT HOSTED YET.

## Name
Switchboard

## Short description
A privacy-first, 100% local session manager. Seamlessly save, switch, and manage multiple accounts for any website in one browser.

## Detailed description
**Switchboard: The Privacy-First Account Manager**

Stop juggling multiple incognito windows, browser profiles, or constantly logging in and out. Switchboard is a purely local account manager that lets you seamlessly switch between multiple accounts on any website with a single click.

By taking precise snapshots of your active sessions, Switchboard allows you to maintain multiple independent accounts for any website—perfectly isolated and ready to use in your existing tabs.

**HOW IT WORKS**
Switchboard uses local cookie snapshots to save and restore your sessions. When you switch accounts, the extension instantly swaps your active cookies with your saved snapshot and refreshes your current tab. Switchboard maintains one active account per website across all your normal Chrome windows, keeping your workflow focused and uninterrupted.

**CORE FEATURES**
• **Instant Account Switching:** Jump between personal, work, and client accounts in seconds.
• **Session Snapshots:** Save exact replicas of your logins and restore them on demand.
• **Seamless Tab Refresh:** Switchboard automatically reloads your active tabs so you can pick up exactly where you left off.
• **Export & Portability:** Need advanced control? Export your saved cookie snapshots as standard JSON files for backup or developer testing.
• **Full Control:** Rename, remove, and manage your saved accounts from a clean, intuitive interface.

**100% LOCAL & PRIVACY-FIRST**
Your accounts, credentials, and cookies belong to you. Switchboard is built from the ground up to respect your privacy.
• **Zero Tracking:** We do not track your usage, clicks, or browsing habits.
• **No Cloud Sync:** Your data never leaves your machine. There are no centralized servers or remote databases.
• **Completely Offline:** Switchboard operates entirely on your physical device.
• **No Remote Code:** We do not inject or download external scripts.

**WHO IS THIS FOR?**
• **Freelancers & Agencies:** Switch between client accounts on AWS, WordPress, Shopify, and more without mixing up sessions.
• **Social Media Managers:** Toggle between brand accounts on X, Reddit, Instagram, and LinkedIn instantly.
• **Developers & QA:** Test multiple user roles on local dev environments simultaneously without clearing your cache.
• **Everyday Users:** Keep your work and personal life separate without the hassle of multiple browsers.

**PERMISSIONS EXPLAINED**
Transparency is our priority. Switchboard requires:
• **Cookies:** To read, clear, and restore session data when you switch accounts.
• **Host Permissions:** To save and switch accounts on the websites you choose.
• **Storage:** To securely save your session snapshots locally on your device.
• **Tabs:** To automatically refresh your current page and apply the selected session.

*(Note: Save unfinished page work before switching, as active tabs will be reloaded. Websites using local storage methods like IndexedDB may not switch perfectly.)*

## Single purpose
Let users locally organize and switch their own saved website login sessions.

## Permission justifications
- storage: Save account labels, website choices, cookie snapshots, and interrupted-operation recovery records locally. No sync storage is used.
- cookies: Read, save, remove, and restore cookies for a user-selected website when saving or switching accounts; export the chosen saved snapshot on request.
- tabs: Identify matching website tabs across normal browser windows and track their URL, ID, and loading status while pausing and resuming them during an account switch. No browsing-history database is read.
- Optional host permissions (HTTP/HTTPS): Users may manage different websites; host access is requested for the specific selected website and its subdomains when connected, not for all sites at installation.
- Remote code: None. All scripts, styles, and images are bundled. No eval, remote JavaScript, or remote SDKs.

## Privacy fields — check against the current dashboard
Disclose authentication information (cookies and session tokens) and web history/browsing activity (website domains and tab URLs), including local processing. Account labels can contain personal information if users enter it; disclose this in the policy and classify it honestly in the dashboard. Do not select a blanket statement that the extension does not handle user data just because processing is local.

The publisher must personally review and accept any policy certifications. No data is sold, transferred to the developer, used for advertising, or used for credit or lending decisions.

## Still required
- Publisher identity, support email, and account registration.
- Public privacy-policy URL (the bundled extension URL is not sufficient).
- Store screenshots and promotional assets required by the live dashboard.
- Final live-browser verification of the 0.5.0 tab refresh flow.
- Choose public/unlisted visibility and target distribution regions.
