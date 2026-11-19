# CLAUDE.md

A family gift registry: everyone keeps one rolling wish list, and others can secretly say "I'll get this". The full design is in [docs/PLAN.md](docs/PLAN.md); read it before changing anything substantial. Working name only; the public name is undecided.

## Decisions so far (agreed with the owner, 2026-11-18)

- **No backend.** Nostr relays hold the data, the same approach as `../hang-time`. A static PWA is hosted on GitHub Pages. No server at all: link previews are read on the device by small helpers (browser extension, iOS Shortcut, a tiny Android share-helper app) sharing one `extract.js`. The Cloudflare Worker idea was dropped.
- **Identity: memorable words**, and keys are derived from them (6 words each, scrypt; written fresh rather than copied from hang-time, whose version is weaker and GPL). The organizer sends each person a personal link (`#g=<group words>&m=<member words>&o=<organizer fingerprint>`) and keeps a copy of everyone's words. That's also the family backup.
- **Security is family-grade on purpose.** The recipient's own app never decrypts claims on their items; it doesn't need to resist a family member who modifies the code. Don't over-engineer this.
- **Groups are flat** (for example "Our family" and "Family + in-laws"). One identity per person across groups. New lists go to all of a person's groups by default.
- **One rolling list per person**, plus surprise ideas, managed people (kids, non-users), I'll get this → Bought it, and a Received history after the occasion.
- **UX is the top priority.** First users are 8 family members aged 9 to 81. Use faces, not menus; no passwords; big text; undo instead of confirmation dialogs; works offline; warm, rounded and gently playful. No emoji anywhere: use drawn icons and the app's own illustrations.
- **Input paths:** Android share (helper app, with the PWA share target as fallback), an iOS Shortcut or Paste link, a desktop browser extension (MV3), and the in-store camera. The owner has no iOS device, but a family iPhone/iPad is available for testing.

## Layout

npm workspaces:

- `packages/core`: pure TypeScript, no React or DOM. Word list, key derivation, links, event formats and schemas (Valibot), encryption (NIP-44), link guessing. All the rules live here.
- `app`: the PWA (Vite + React + TypeScript, vite-plugin-pwa, Radix Dialog, Dexie, Phosphor icons, self-hosted Fraunces and Nunito).
- `packages/extract`: `extract.js`, plain ES2019 with no imports, shared by every helper: the extension, the Android helper (in a WebView) and the iOS Shortcut. Tests run it over sample pages in `test/pages`.
- `extension`: the MV3 browser extension (popup only). `node tools/build-extension.mjs [app address]` builds `dist/extension` and a zip.
- `android-helper`: the Kotlin share helper. No Java here: GitHub Actions builds it (`.github/workflows/android.yml`); a tag `android-v*` publishes a release.
- `shortcut/README.md`: how to build the iOS Shortcut once on an iPhone; the app build publishes its script as `shortcut.js`.
- `e2e`: Playwright tests against the production build, at phone and desktop sizes, including the real extension in Chromium.
- `tools`: `make-wordlist.mjs` (already run; its output is frozen) and `make-icons.mjs` (renders `app/public/icon.svg` to PNGs).
- `docs/PLAN.md`: requirements, data model, milestones.
- `mockups/index.html`: the clickable mock-up (milestone 0). It's the visual reference for the app.

## Working here

- `npm run dev` (app at http://localhost:5173, with a stand-in relay on port 4791 so nothing reaches public relays), `npm test` (Vitest), `npm run e2e` (Playwright: builds, starts the stand-in relay, and runs whole-family tests across separate browser contexts), `npm run typecheck`, `npm run check` (all of them).
- The app's state is worked out from events (`packages/core/src/family.ts`, `deriveState`); the app stores events (newest per replaceable slot) and an outbox. Writes go through `app/src/items.ts`, `people.ts` and `identity.ts`.
- **The data format is frozen.** `packages/core/test/vectors.test.ts` pins the word list, key derivation and event format. If it fails, fix the change, never the expected values, and never run Vitest with `-u` on it.
- Event content is versioned (`v: 1`). Only ever add optional fields.
- Repo: `craigpen/family-registry` (private). CI runs on every push. Deploying to GitHub Pages is a manual workflow for now (see `.github/workflows/deploy.yml`).
- Commit and push as meaningful steps complete.
