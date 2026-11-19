// Builds the browser extension into dist/extension (load it unpacked) and a zip for
// Chrome/Edge and Firefox. The shared extract.js is copied in, so every helper runs the same file.
//
//   node tools/build-extension.mjs [app address]
//   e.g. node tools/build-extension.mjs http://localhost:5173/   (for trying it locally)
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const out = new URL('dist/extension/', root);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const f of ['manifest.json', 'popup.html', 'popup.css', 'popup.js', 'background.js', 'sidepanel.html', 'sidepanel.js']) cpSync(new URL(`extension/${f}`, root), new URL(f, out));
cpSync(new URL('packages/extract/extract.js', root), new URL('extract.js', out));
cpSync(new URL('app/public/icon-192.png', root), new URL('icon.png', out));

const app = process.argv[2];
// Tests open the popup as a page, so it doesn't get the toolbar click's access to the tab:
// a test build may also allow the test shop's address.
const testHost = process.argv.find(a => a.startsWith('--test-host='))?.slice('--test-host='.length);
if (testHost) {
  const m = new URL('manifest.json', out);
  const manifest = JSON.parse(readFileSync(m, 'utf8'));
  manifest.host_permissions.push(testHost);
  writeFileSync(m, JSON.stringify(manifest, null, 2));
}
if (app && !app.startsWith('--')) {
  const js = new URL('popup.js', out);
  writeFileSync(js, readFileSync(js, 'utf8').replace(/const DEFAULT_APP = '[^']*';/, `const DEFAULT_APP = '${app}';`));
  for (const f of ['background.js', 'sidepanel.js']) {
    const u = new URL(f, out);
    writeFileSync(u, readFileSync(u, 'utf8').replace(/const DEFAULT_APP = '[^']*';/, `const DEFAULT_APP = '${app}';`));
  }
}

const version = JSON.parse(readFileSync(new URL('manifest.json', out), 'utf8')).version;
const zip = new URL(`dist/family-wish-lists-extension-${version}.zip`, root);
if (existsSync(zip)) rmSync(zip);
try {
  // `zip` on CI (Linux); PowerShell's Compress-Archive on Windows.
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out.pathname.slice(1).replace(/\//g, '\\')}*' -DestinationPath '${zip.pathname.slice(1).replace(/\//g, '\\')}'`]);
  } else {
    execFileSync('zip', ['-qr', zip.pathname, '.'], { cwd: out.pathname });
  }
  console.log(`dist/extension/ and ${zip.pathname.split('/').pop()}`);
} catch {
  console.log('dist/extension/ (zip skipped)');
}
