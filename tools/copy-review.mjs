// Builds the wording review page from app/src/copy.ts: every text, with the note above it
// saying where and when it shows, plus any suggested changes listed below.
//
//   node tools/copy-review.mjs      (writes dist/copy-review.html)
//
// The page saves each choice and edit, and they're read back to update copy.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const srcUrl = new URL('app/src/copy.ts', root);
const { copy } = await import(srcUrl.href); // Node runs the TypeScript directly (types are stripped)

// The notes: a /** ... */ line right above a section or a text.
const notes = {};
let section = '';
let pending = '';
for (const line of readFileSync(srcUrl, 'utf8').split('\n')) {
  const note = /^\s*\/\*\*\s*(.*?)\s*\*\/\s*$/.exec(line);
  if (note) { pending = note[1]; continue; }
  const sec = /^ {2}(\w+): \{/.exec(line);
  const key = /^ {4}(\w+):/.exec(line);
  if (sec) { section = sec[1]; if (pending) notes[section] = pending; }
  else if (key && section && pending) notes[`${section}.${key[1]}`] = pending;
  pending = '';
}

/**
 * Suggested changes, by text id: { choice?: 'keep' | 'once' | 'remove', text?, why }.
 * The first review's suggestions were all settled and applied (2026-11-19).
 */
const suggestions = {};

const items = [];
function walk(node, path) {
  if (typeof node === 'string' || Array.isArray(node) || (node && typeof node === 'object' && 'many' in node)) {
    const [sec] = path.split('.');
    items.push({ id: path, section: sec, note: notes[path] ?? '', value: node, suggestion: suggestions[path] ?? null });
    return;
  }
  for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
}
walk(copy, '');
for (const id of Object.keys(suggestions)) if (!items.some(i => i.id === id)) throw new Error(`Suggestion for a text that doesn't exist: ${id}`);

const sections = [...new Set(items.map(i => i.section))].map(id => ({ id, note: notes[id] ?? '' }));
const data = JSON.stringify({ built: new Date().toISOString().slice(0, 10), sections, items }).replace(/</g, '\\u003c');
const page = readFileSync(new URL('tools/copy-review.html', root), 'utf8').replace('"__DATA__"', () => data);
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/copy-review.html', root), page);
console.log(`dist/copy-review.html: ${items.length} texts in ${sections.length} sections, ${Object.keys(suggestions).length} suggestions`);
