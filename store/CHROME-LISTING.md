# Chrome Web Store draft

Status: prepared for publisher review, not submitted.

Publisher name: UNDECIDED — to be supplied by the publisher.
Support email: UNDECIDED — to be supplied by the publisher.
Public privacy-policy URL: NOT HOSTED YET.

## Name
Switchboard

## Short description
A privacy-first, 100% local account and session manager. Easily save, switch, and manage multiple accounts for any website.

## Detailed description
**Switchboard: The 100% Local, Privacy-First Account Manager**

Tired of constantly logging in and out of different accounts? Fed up with juggling multiple incognito windows or creating entirely new browser profiles just to check your secondary email, work dashboard, or alternate social media accounts? 

Switchboard is a powerful, seamless, and purely local account manager designed to let you switch between multiple accounts on any website with just a single click. By taking snapshots of your active sessions, Switchboard lets you maintain an infinite number of active accounts for any website, perfectly isolated and ready to go.

**HOW IT WORKS ON CHROME**
Switchboard utilizes advanced cookie snapshot technology to save and restore your sessions. When you are logged into an account, you can save a "snapshot" of your active cookies. Switchboard safely stores this session state locally. When you want to switch accounts, Switchboard instantly swaps out the active cookies with your saved snapshot and refreshes your current tab. 
* Note: Switchboard maintains one active account per website across all normal Chrome windows at a time, keeping your browsing experience clean, focused, and uninterrupted.

**🚀 CORE FEATURES**
* **Instant Account Switching:** Jump between your personal, work, and client accounts in seconds.
* **Cookie Snapshots:** Save exact replicas of your login sessions and restore them on demand.
* **Seamless Tab Refresh:** When you switch accounts, Switchboard instantly refreshes your active tabs so you can pick up exactly where you left off.
* **Export & Portability:** Need advanced control? Manually export your saved cookie snapshots as standard JSON files for backup or developer testing.
* **Full Account Control:** Rename, forget, and manage your saved accounts easily from a clean, intuitive popup interface.

**🛡️ 100% LOCAL & PRIVACY-FIRST**
We believe that your accounts, credentials, and cookies belong to you and you alone. Switchboard is built from the ground up to respect your privacy and security.
* **Zero Analytics & Zero Tracking:** We do not track your usage, clicks, or browsing habits.
* **No Servers & No Cloud Sync:** Your data never leaves your machine. There are no centralized servers, no cloud databases, and no remote syncing.
* **Completely Offline:** Switchboard operates entirely on your physical device and doesn't require an internet connection to manage your data. 
* **No Remote Code:** What you install is what you get. We do not inject or download external scripts.

**👨‍💻 WHO IS THIS FOR?**
* **Freelancers & Agencies:** Easily switch between different client accounts on platforms like AWS, WordPress, Shopify, and more without mixing up sessions.
* **Social Media Managers:** Toggle between brand accounts on X, Reddit, Instagram, and LinkedIn with a single click.
* **Developers & QA Testers:** Test multiple user roles (Admin, Editor, Guest) on your local dev environments simultaneously without constantly clearing your cache.
* **Everyday Users:** Keep your work life and personal life separate without the hassle of multiple browsers.

**⚠️ IMPORTANT TECHNICAL NOTES**
Save unfinished page work before switching, as your active tabs will be reloaded. Switchboard's Chrome support is cookie-based; websites using other local storage methods (like IndexedDB) may not switch perfectly. Switchboard does not guarantee permanent authentication or protection from account restrictions, and is not affiliated with the websites you use.

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
