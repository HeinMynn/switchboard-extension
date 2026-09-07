# Switchboard submission preparation

## Current status

The release ZIPs and source archive are prepared locally. Nothing has been uploaded, submitted, signed, or published. The publisher reports both developer account registrations complete. Both dashboards are signed out in the agent-accessible browser; sign-in is needed before uploading. A public privacy-policy URL is still required.

The automated suite passes 24 tests using mocked browser APIs. The user reported earlier Dola switching working, but the new tab-refresh flow has not been independently tested with live Dola accounts. Complete that check before public release.

Mozilla's local validator completed with zero errors and one Android minimum-version warning. See VALIDATION.md. Publisher name, support email, and Firefox license remain undecided at the publisher's request.

## Developer setup

1. Chrome developer registration: completed by the publisher. Sign in to the dashboard in the accessible browser to continue.
2. Mozilla developer registration: completed by the publisher. Sign in to the Developer Hub in the accessible browser to continue.
3. Choose a public publisher name, support email, and license for the Firefox listing.
4. Host the privacy policy at a public HTTPS URL. Use src/shared/privacy.html as the content source; when hosted separately it needs welcome.css and its referenced icon assets, or convert it to a plain policy page. Do not submit a local file or chrome-extension URL as the public policy URL.
5. Capture store screenshots using synthetic accounts, with no private cookies or real account details. The current store dashboard determines required dimensions and assets.

## Uploads

- Chrome: dist/switchboard-chrome.zip
- Firefox: dist/switchboard-firefox.zip
- Readable source/build instructions: dist/switchboard-source.zip
- Store icon: dist/chrome/icons/icon-128.png
- Listing copy and permission justifications: store/CHROME-LISTING.md and store/FIREFOX-LISTING.md

## Final verification

Test Chrome switching A/B in multiple tabs and windows, saved-login restoration after restart, failed-switch recovery, canceling navigation prompts, and JSON/TXT downloads. Test Firefox concurrent containers, rename, export permissions, and removal without deleting native containers. Verify the install welcome page and privacy link in both browsers. Automated tests do not replace these checks.

Review each store's validation messages. Resolve errors rather than submitting around them. Review all declarations and legal certifications against actual behavior. Store approval is not guaranteed.

## Official references checked

- Chrome account registration: https://developer.chrome.com/docs/webstore/register
- Chrome publishing: https://developer.chrome.com/docs/webstore/publish
- Chrome privacy disclosures: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- Chrome listing assets: https://developer.chrome.com/docs/webstore/images
- Firefox submission: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- Firefox policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
