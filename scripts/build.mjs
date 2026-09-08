import { mkdir, cp, writeFile } from 'node:fs/promises';
import { createIcons } from './icons.mjs';
const icons = Object.fromEntries([16, 32, 48, 128].map(size => [size, `icons/icon-${size}.png`]));
const common = {
  manifest_version: 3, name: 'Switchboard', version: '1.0.0',
  description: 'Named local account sessions: cookie switching in Chrome, containers in Firefox.',
  icons,
  action: { default_popup: 'popup.html', default_title: 'Switchboard', default_icon: icons },
  incognito: 'not_allowed'
};
for (const browser of ['chrome', 'firefox']) {
  const dir = `dist/${browser}`;
  await mkdir(dir, { recursive: true });
  await cp('src/shared', dir, { recursive: true });
  await cp(`src/${browser}`, dir, { recursive: true });
  await createIcons(`${dir}/icons`);
  const manifest = browser === 'chrome' ? {
    ...common, minimum_chrome_version: '132', permissions: ['storage', 'cookies', 'tabs'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    background: { service_worker: 'background.js', type: 'module' }
  } : {
    ...common, permissions: ['storage', 'cookies', 'contextualIdentities', 'activeTab'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    background: { scripts: ['background.js'], type: 'module' },
    browser_specific_settings: { gecko: { id: 'switchboard@local.invalid', strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] } } }
  };
  await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
}
console.log('Built dist/chrome and dist/firefox.');
