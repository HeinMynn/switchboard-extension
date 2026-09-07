# Chrome Web Store draft

Status: prepared for publisher review, not submitted.

Publisher name: UNDECIDED — to be supplied by the publisher.
Support email: UNDECIDED — to be supplied by the publisher.
Public privacy-policy URL: NOT HOSTED YET.

## Name
Switchboard

## Short description
Save named website logins, switch accounts in your existing tabs, and export cookies locally.

## Detailed description
Keep your website accounts organized in one browser with Switchboard.

Save a login under a name you recognize, then return to it with Switch & refresh. Switchboard briefly pauses the selected website's tabs, restores the chosen saved cookies, and returns those tabs to their previous pages. One account is active per website across normal Chrome windows.

Features:
- Save and rename account sessions for websites you choose.
- Switch accounts while keeping the same tabs and windows.
- Export a saved cookie snapshot as JSON or TXT containing JSON.
- Remove saved accounts or websites from Switchboard.
- Recover an interrupted switch.
- Follow the built-in setup guide.

Data stays on your device. Switchboard handles authentication cookies, account labels, website domains, and tab URLs for its account-management features. There are no analytics, advertisements, automatic uploads, or developer-operated servers. Saved snapshots and exports contain sensitive cookie data without additional encryption. Protect your device and exported files.

Save unfinished page work before switching: the website's tabs are reloaded. Chrome support is cookie-based; websites using other login storage may not switch correctly. Websites can expire or revoke logins. Switchboard does not guarantee permanent authentication, invisibility, or protection from account restrictions. It is not affiliated with the websites you use.

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
