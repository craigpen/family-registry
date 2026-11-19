// Builds the browser extension for Chrome/Edge (dist/extension: load it unpacked) and for
// Firefox (dist/extension-firefox), each with a zip. The shared extract.js is copied in, so
// every helper runs the same file.
//
// The two browsers want different manifests: Chrome runs background code as a
// "service_worker" and has a side panel; Firefox runs "scripts" and has neither the side panel
// API nor Chrome's settings. extension/manifest.json holds what they share, and each build
// adds its own parts, so neither browser shows warnings about the other's keys.
//
//   node tools/build-extension.mjs [app address] [--test-host=<pattern>]
//   e.g. node tools/build-extension.mjs http://localhost:5173/   (for trying it locally)
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const app = process.argv.slice(2).find(a => !a.startsWith('--'));
// Tests open the popup as a page, so it doesn't get the toolbar click's access to the tab:
// a test build may also allow the test shop's address.
const testHost = process.argv.find(a => a.startsWith('--test-host='))?.slice('--test-host='.length);
const base = JSON.parse(readFileSync(new URL('extension/manifest.json', root), 'utf8'));

const TARGETS = {
  chrome: {
    dir: 'dist/extension/',
    zip: v => `dist/family-wish-lists-chrome-${v}.zip`,
    files: ['popup.html', 'popup.css', 'popup.js', 'thumbs.js', 'background.js', 'sidepanel.html', 'sidepanel.js'],
    manifest: m => ({
      ...m,
      permissions: [...m.permissions, 'sidePanel'],
      side_panel: { default_path: 'sidepanel.html' },
      background: { service_worker: 'background.js' },
      // An incognito window gets its own copy of the extension. Otherwise the popup and side
      // panel run in the regular profile, and the site framed in them signs in as whoever uses
      // the regular window, not the person in the incognito one.
      incognito: 'split',
    }),
  },
  firefox: {
    dir: 'dist/extension-firefox/',
    zip: v => `dist/family-wish-lists-firefox-${v}.zip`,
    files: ['popup.html', 'popup.css', 'popup.js', 'thumbs.js', 'background.js'],
    manifest: m => ({
      ...m,
      background: { scripts: ['background.js'] },
      browser_specific_settings: {
        gecko: { id: 'wishlists@family-registry', strict_min_version: '121.0', data_collection_permissions: { required: ['none'] } },
      },
    }),
  },
};

function zipUp(dir, zip) {
  if (existsSync(zip)) rmSync(zip);
  // `zip` on CI (Linux); PowerShell's Compress-Archive on Windows.
  if (process.platform === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${dir.pathname.slice(1).replace(/\//g, '\\')}*' -DestinationPath '${zip.pathname.slice(1).replace(/\//g, '\\')}'`]);
  } else {
    execFileSync('zip', ['-qr', zip.pathname, '.'], { cwd: dir.pathname });
  }
}

for (const [name, t] of Object.entries(TARGETS)) {
  const out = new URL(t.dir, root);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of t.files) cpSync(new URL(`extension/${f}`, root), new URL(f, out));
  cpSync(new URL('packages/extract/extract.js', root), new URL('extract.js', out));
  cpSync(new URL('app/public/icon-192.png', root), new URL('icon.png', out));

  const manifest = t.manifest(structuredClone(base));
  if (testHost) manifest.host_permissions.push(testHost);
  writeFileSync(new URL('manifest.json', out), JSON.stringify(manifest, null, 2));

  if (app) {
    for (const f of t.files.filter(f => f.endsWith('.js'))) {
      const u = new URL(f, out);
      writeFileSync(u, readFileSync(u, 'utf8').replace(/const DEFAULT_APP = '[^']*';/, `const DEFAULT_APP = '${app}';`));
    }
  }

  const zip = new URL(t.zip(manifest.version), root);
  try {
    zipUp(out, zip);
    console.log(`${name}: ${t.dir} and ${zip.pathname.split('/').pop()}`);
  } catch {
    console.log(`${name}: ${t.dir} (zip skipped)`);
  }
}
