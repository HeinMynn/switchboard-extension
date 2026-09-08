# Submission checks — Switchboard 0.5.0

- Automated tests: 24 passed, 0 failed (mocked browser APIs).
- Build: completed for Chrome and Firefox.
- Mozilla web-ext lint: 0 errors, 0 notices, 1 warning.
- Warning: KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION. The data_collection_permissions key requires Android Firefox 142, while the inherited minimum is 140. This release is intended for desktop Firefox; do not select Android distribution. Resolve the minimum-version/platform warning if mobile distribution is later considered.
- Public-store review/signing: not performed.
- Latest Chrome tab refresh with live Dola accounts: not verified.
- Store images: still to be captured and provided.
- Public privacy-policy hosting: still required.

The validator was run locally against dist/firefox using Mozilla's web-ext package from npm. No store account or upload was used. Passing the validator is not store approval.
