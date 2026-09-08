import { readFile, writeFile } from 'node:fs/promises';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
if (process.env.RELEASE_TAG !== `v${version}`) throw new Error('Release tag must match package.json version.');
for (const browser of ['chrome', 'firefox']) {
  const manifest = JSON.parse(await readFile(`dist/${browser}/manifest.json`, 'utf8'));
  if (manifest.version !== version) throw new Error(`${browser} manifest version does not match package.json.`);
}
const changelog = await readFile('CHANGELOG.md', 'utf8');
const section = changelog.split(/^## /m).find(value => value.split('\n')[0].split(' ')[0] === version);
if (!section) throw new Error('Add a changelog entry for this version before releasing.');
await writeFile('dist/release-notes.md', section.slice(section.indexOf('\n') + 1).trim()
  + '\n\nThese ZIPs are extension packages. GitHub releases do not publish to browser stores or sign the Firefox extension.\n');
