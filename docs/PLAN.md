# Family Registry: plan

Working name: **family-registry**. The public name is still open (see [Naming](#naming)).

A gift registry for a family: everyone keeps one rolling wish list, and the others can quietly say "I'll get this" without the person whose list it is ever finding out. It's built for Christmas and birthdays, and works on phones, tablets and computers.

## 1. Who it's for

- **First users:** one immediate family of 8, aged 9 to 81. Most are comfortable with technology; one grandparent is less so.
- **Devices:** Windows laptops, Android phones, and at least one iPhone/iPad (available for testing, but not the owner's own).
- **Later:** possibly a public release, where any family can set up its own group. The design must not depend on the owner running a server.

## 2. Principles

UX comes first. The app has to be easy for a 9-year-old and an 81-year-old, and pleasant to look at.

1. **Faces, not menus.** The home screen is the family. Tap a person to see their list.
2. **Nothing more than two taps deep.** Adding a gift takes three taps at most from opening the app.
3. **No passwords, no accounts, no jargon.** Use "I'll get this", not "claim" or "reserve"; "Ideas for Mom", not "suggestions".
4. **Undo instead of "Are you sure?"** Actions happen at once and show a short Undo.
5. **Large by default.** 18 px body text, tap targets of at least 48 px, plus a "Larger text" setting.
6. **Works offline.** Adding a gift in a store basement must work, and syncs later.
7. **Warm, rounded, gently playful.** Lots of space, soft colours, light seasonal touches, following the device's light or dark mode.
8. **No emoji.** Not in the interface, the copy or the data. Use one consistent set of drawn icons and the app's own illustrations, which look the same on every device and fit the visual style.
9. **The surprise is sacred.** Nothing on your own list may ever hint at whether it has been claimed.

## 3. What competitors teach us

We looked at Giftster, Giftful, GiftList and WishDeck (App Store listings, screenshots and reviews, November 2026).

| What we saw | What we'll do |
|---|---|
| All of them hide claims from the list owner. It's the main reason people install these apps. | It's our core feature too, done well. |
| Giftster's "Shop for" view: a list of people with avatars, then their items. Users call the old UI "drab" and "jerky". | Faces grid at home, smooth and colourful. |
| Giftster has two states, **Reserve** then **Mark purchased**. | "I'll get this" → "Bought it". |
| Giftster and GiftList let you **suggest gifts secretly** for someone else. A Giftster reviewer couldn't suggest ideas for elderly relatives who never made a list. | Surprise ideas work for anyone in the group, list or no list. |
| A parent managing a child's list in Giftster couldn't see what was already claimed. | Managers are not the recipient, so they see claims on a child's list. |
| Giftful and Giftster: auto-filling from a link often picks **the wrong photo** (an ad, a related item). Reviewers asked to use their own photo. | Use the product's structured data first, let the person pick from the candidates, and make "use my own photo" one tap. |
| Giftful: kids complain that signing in "takes so long". | Personal links: one tap and you're in. |
| GiftList: a temporary outage made a user think her lists were deleted. | Show sync status calmly, keep everything on the device, and offer export. |
| GiftList: "Most Wanted", tags, sizes, delivery addresses, a "My Gifts" history of received gifts. | The Really want mark, notes for sizes, and a Received history. |
| Secret Santa draws are popular (Giftster, GiftList, Elfster). | Later; a good fit for groups. |
| Group gifting and cash funds (GiftList). | Later. |
| Built-in shopping browser, price tracking, trending products (Giftful). | Not for us. We're a family app, not a shopping app. |

## 4. Features

### Version 1

**People and groups**
- **Groups**, such as "Our family" and "Family + in-laws". They're flat: each has its own members and organizers, and a person can be in several.
- **One person, one identity** across all their groups.
- **Organizers** (the creator plus any co-organizers) add people, send personal links, and reissue a lost link.
- **Managed people** for anyone not using the app (a toddler, a friend). They have a name, photo and list, kept by others.
- **Birthdays** on each person, plus Christmas, shown as a gentle countdown ("Birthday in 12 days").

**Lists**
- **One rolling list per person.** Items aren't tied to an occasion.
- **Each item has:** a title, a picture (photo or from the link), one or more links, a price, notes ("size M"), a **Really want** mark, and an optional "Seen at" store.
- **Audience:** a new item is visible to all of the owner's groups by default. It can be narrowed per list or per item.

**Giving**
- **I'll get this** → **Bought it**. Visible to everyone in the item's audience except the recipient. Can be undone.
- **Surprise ideas:** add an idea to someone else's list. Everyone except them sees it, and it can be claimed like any other item.
- **When the recipient deletes or edits a claimed item,** the claimer is told ("Dad removed the drone you were getting").
- **Received:** after the occasion has passed, the giver's app reveals bought items and they move into the recipient's **Received** history ("the unwrapping"), with who they were from. The recipient can also mark an item "Got it" themselves. See [Received](#received-the-unwrapping).

**Adding gifts**: see [section 7](#7-adding-gifts), including [importing an Amazon list](#importing-an-amazon-list) onto your own list, a child's list, or as secret ideas for someone.

**Other**
- **Occasion banner** at the top of the home screen: a short illustrated card for the nearest occasion, with a second line for the next one. States: Christmas countdown, someone's birthday (their face in the scene; tap for their list), your own birthday (no hints about gifts), on the day, a few days after ("See what you received"), and a calm default ("Add a few things to your list"). The scenes are our own layered SVGs in the app's colours, in light and dark versions, with gentle parallax from the pointer, phone tilt and scroll. Parallax is off when the device asks for reduced motion.
- "New since your last visit" dots on faces and items, instead of push notifications.
- A Larger text setting, and light/dark mode that follows the device.
- **Shared device** mode for a family tablet: "Who's using this?" with faces. See [Shared devices](#shared-devices).
- Export: a JSON backup of everything you can see.

### Later
- Secret Santa draw.
- Group gifts (chip in, with a progress bar).
- Barcode scanning in stores.
- Push notifications. Sending Web Push needs something running somewhere, so this is the first feature that would bring back a server. Decide then.
- Sharing a read-only list with someone outside the group via a link.
- Running our own Nostr relay.
- App Store and Play Store wrappers (Capacitor) if this goes public.

## 5. Identity, groups and links

The model follows hang-time's: memorable words that a key is derived from, so nobody ever sees a raw key.

- **Member words**: about 6 words from a friendly list (around 60+ bits). The person's Nostr secret key is a slow hash of them (scrypt, salted with `family-registry/member/v1`). The same words are used in every group, so a person is the same person everywhere.
- **Group words**: about 6 words. Everyone in the group has them. A group secret `G` is derived from them, and from `G`:
  - a **group tag** that marks the group's events on relays (`["h", tag]`);
  - a **group key** that encrypts the group's events (NIP-44 v2 with a derived 32-byte conversation key).
- **Personal link**: `https://<site>/#g=<group words>&m=<member words>&o=<organizer fingerprint>` (see [Roster](#roster) for `o`). Everything after `#` stays in the browser and is never sent to the web host. On first open, the app saves them and removes them from the address bar, except in Safari on iPhone/iPad during the install steps (see [the iOS gap](#invites-and-getting-set-up)).
- **Read-out form**: the link reads as a list of words (group words, then member words, then the 4 fingerprint words), so it can be dictated over the phone, as in hang-time.
- **The organizer keeps every member's words.** That doubles as the family backup: the group words plus everyone's member words rebuild everything on any device.
- **Co-organizers** get the same organizer view.
- **Reissuing a lost link:** the organizer gives the person new member words. Their items are republished under the new key and the roster points at the new key.
- **Pairing a new device:** on a signed-in device, choose **Add a device** to show a 6-digit code. The new device enters the code and fetches the identity, which was posted to the relays encrypted under a key derived from the code, with a 10-minute NIP-40 expiry. This is the backup for iPads and new phones.

**Threat model, as agreed:** this is family-grade. The data is gift ideas, not secrets. The surprise is protected **by the app** (your app never decrypts claims on your own items), not by cryptography against a determined family member who modifies the code. Strangers on public relays can't read anything.

### Invites and getting set up

Most invites go out **by message** from the organizer (text, WhatsApp, email, whatever the family uses), and the person sets themselves up from it with no help, on whatever device they have. Some people (Grandma) get set up in person. Both have to work first time.

**Who invites:** only organizers. Anyone can be made a co-organizer. A family member who wants someone added asks an organizer.

**1. The organizer adds the person.** In the organizer view: name, photo, birthday, groups. The app makes their member words and adds them to the roster. If the person is already in another of the organizer's groups, they keep their identity and just get the new group.

**2. The organizer sends the invite.** There's no server to send messages, so it goes out through whatever app the organizer already uses with that person. The app doesn't pick one:
- **Send invite** opens the device's own **Share menu** (the Web Share API, `navigator.share`). That menu lists the apps the organizer has: Messages/iMessage, WhatsApp, Gmail or Mail, Google Voice, Signal, Messenger and so on. It works on iPhone, iPad and Android, and in Chrome and Edge on Windows and Mac.
- Where there's no Share menu (Firefox, older browsers), the same spot shows **Email** (`mailto:`) and **Copy invite**.
- **Copy invite** is always there too, for anywhere else.
- **The message** is shown before sending and can be edited. It's written to work in a chat app and in an email:
  - a greeting and one line on what this is;
  - **the link**, with "Open this on the phone or tablet you use most";
  - three short steps (open the link, add it to your Home Screen, start your list);
  - a link to the illustrated **setup guide**;
  - "Keep this message. It's your way back in on a new phone. Please don't forward it: the link is yours."
  
  The share also carries a title ("Your spot on our family wish list"), which email apps use as the subject.
- **Set up in person** shows the personal link as a big QR code. The person points their phone camera at it, and the organizer taps through the install with them.
- For someone already set up who joins a second group, the invite says so ("You've been added to Family + in-laws"). Opening it adds the group to their existing identity.

**3. The person opens the link.** The **Welcome** screen greets them by name and face, then walks them through installing on *their* device, with drawn pictures of the exact buttons to tap. The app detects the device and browser and shows only the steps that apply:

| Where the link opened | What Welcome shows |
|---|---|
| Android, Chrome (or Samsung Internet) | One big **Install** button (the browser's install prompt). The installed app shares Chrome's storage, so they're already signed in. |
| iPhone/iPad, Safari | Three pictures: tap **Share**, scroll to **Add to Home Screen**, tap **Add**. See the iOS note below. |
| Inside an email app's own browser (Gmail, Outlook, Yahoo) or Facebook | "Open this in Safari / Chrome first", with a picture of that app's menu. In-app browsers can't install the app and keep their own storage. |
| Windows or Mac, Chrome or Edge | An **Install** button (or "Pin it" in Firefox and Safari), **plus** "Want it on your phone too? Scan this", a QR code of their own link. |
| Already installed | Skips straight to "Start your list". |

**The iOS gap.** A Home Screen web app on iPhone/iPad keeps its own storage, separate from Safari's. So the identity saved in Safari isn't there when the installed app first opens. Two layers handle this:
- In Safari, while showing the install steps, the app keeps the personal part in the address bar. That way **Add to Home Screen** saves the icon with the link built in, and the installed app signs itself in on first open. This is the first thing to test on the family iPhone/iPad.
- If that doesn't work, the installed app opens on "Welcome back. Type the code from Safari". Safari shows a **6-digit code**, which is the same mechanism as pairing a device.

**4. Done.** After installing, Welcome ends with "Add your first thing" and their (empty) list. The extras come later, as a gentle tip once they've added a few things, with steps for their device: the Android share helper, the iOS Shortcut, the browser extension. They're never part of first-time setup.

**More devices.** Opening the same invite link on another device makes that device them too. That's the normal way to add a laptop or tablet. Pairing codes are the backup for when the invite isn't to hand.

**The setup guide** is a public page on the site (`/help`). It holds no identity, so it's safe to forward or print. Like Welcome, it **detects the device it's opened on** and shows those steps first, with "Setting up a different device?" tabs for the others (iPhone/iPad, Android, Windows/Mac). It also covers "I got a new phone" and "It says I'm someone else". The invite message and Welcome both link to it. Welcome and the guide share one set of step illustrations, so they never disagree.

**Seeing who's joined.** On first open, the app publishes a small **joined** event (encrypted with the group key, holding a device count and a "last seen" date). The organizer view shows each person as **Invited**, **Joined**, or **Joined on 2 devices**, with **Resend invite** next to anyone who hasn't joined.

**What can go wrong:**
- **A forwarded link** makes the new holder that person. Fix: **Reissue link** (new member words, items republished), then resend.
- **A lost link or phone:** find the invite message, or ask an organizer to resend it. The organizer always has everyone's words.
- **A grown-up managed person.** A child with a list someone else has been keeping gets their own phone. **Give them their own link** hands over the identity that already holds their list.

**Where the organizer's copy of everyone's words lives:** in the organizer's app, encrypted to the organizer's own key and synced like everything else. Co-organizers can read it too. **Print family backup** makes a one-page sheet of every person's words and QR code, to keep somewhere safe.

## 6. Data on Nostr

There is no backend. The app is a static site that talks to several public relays and keeps a full copy on each device.

- **Event kind:** `30078` (NIP-78, app data, parameterised replaceable), with namespaced `d` tags, so edits replace the old version.
### Roster

- **Roster** (`d = roster`): signed by an organizer, encrypted with the group key. It lists members: public key, name, photo, birthday, managed or not, organizer or not, and each person's **helpers**: the people allowed to edit their list. A managed person always has helpers. A child who has the app can have them too (a parent helping a 9-year-old keep their list, or importing their Amazon list). Helpers aren't the recipient, so they see claims on that list, just as with a managed person. The child can see who their helpers are.
- **Anchor:** each personal link carries a short fingerprint of the issuing organizer's public key (`&o=`, 4 words). A device accepts roster events only from that key, or from keys that an accepted roster lists as organizers. The current roster is the newest one from an accepted organizer. This mainly matters for a public release; within the family, forging a roster means modifying the code, which the threat model already accepts.
- **Removing someone** gives the group new words. The organizer's app publishes the new group words to each remaining member, encrypted to their own key (NIP-44), so nobody needs a new link. Each owner's app re-wraps its own item keys under the new group key the next time it opens. The removed person keeps whatever they had already seen.

### Items

- **Item** (`d = item:<id>`, with `id` random): the content is encrypted with a random **item key K**. For each group in its audience, the event carries the group tag and K wrapped with that group's key. Fields: title, links, image (a URL or an embedded thumbnail), price, notes, reallyWant, seenAt, createdFor (the recipient), and a surprise flag.
- **One item, several signers.** A replaceable event can only be replaced by the key that signed it, but some items have several editors. So an item is **every event with that `d` tag from an allowed editor, and the newest one wins**. Allowed editors:
  - an item on your own list: you;
  - an item on someone else's list: anyone the roster lists as one of their helpers (always the case for a managed person);
  - a surprise idea: anyone in its audience except the recipient.
  Every editor can decrypt K, so every version uses the same K.
- **Deleting** publishes a tombstone: the same `d` tag with content `{"deleted": true}`. NIP-09 deletions don't fit, because they only cover your own events. A tombstone is just the newest version, so an edit made after it brings the item back.

### Claims

- **Claim:** signed by the claimer, encrypted with `HKDF(K, "hidden")`. Fields: state (`getting | bought | released`) and **occasion** (`christmas-2026`, `birthday-2027`…), which defaults to the recipient's next occasion and can be changed. Each claimer has their own claim event per item, so claims from different people sit side by side.
- **Blinded tag:** `d = claim:` + a truncated `HMAC(K, "claim-tag")`, not the item id. Strangers on relays can't link claims to items or count them. The recipient could compute the tag, but their app never does: it never fetches or decrypts claims on its own items or on surprise ideas for itself.
- **Undo** publishes the same claim with state `released`.

### Who gets it when two people claim

1. `bought` beats `getting`. Whoever has actually bought it keeps it.
2. Between two claims in the same state, the earlier `created_at` wins, and ties go to the lower pubkey.
3. Events dated more than an hour in the future are ignored until their time comes, so a phone with a wrong clock can't win every race.
4. The loser is told: "Mom got there first." If both have marked **Bought it**, nothing is resolved automatically; both see "You and Mom both bought this" and sort it out between themselves.

Offline claims are published with the time they were made, so a claim can "arrive late" and win under rule 2. Rules 1 and 4 keep that from undoing a purchase.

### Received (the unwrapping)

The recipient's app never reads claims, so it can't tell by itself that something was given. Instead the **giver's app reveals the gift**:

- **Reveal** (`d = given:<itemId>`): signed by the giver, encrypted with K, which the recipient can read. Fields: occasion, and "from" (the giver's name, which helps with thank-yous).
- The giver's app publishes it automatically the first time it opens after the claim's occasion has passed (the day after), for every claim marked `bought`. The giver can also tap **Given** early, for a gift handed over before the day.
- When the recipient's app sees a reveal, the item moves to **Received**. The recipient can also mark an item **Got it** themselves; that's an edit to their own item.

### Shared devices

A device normally holds one identity. A family iPad can be switched to **Shared device** mode in settings: it holds several identities, and on opening it shows **Who's using this?** with faces. Each identity has its own local database. This protects the surprise only as well as people pick their own face, which is the same family-grade trust as not peeking at someone else's phone.

### Photos

- Photos are shrunk on the device to a WebP thumbnail of 30 KB or less and embedded in the item. NIP-44 caps plaintext at 64 KB, and relays cap event sizes.
- For items from a link, the extension and the Android helper download the shop's chosen image and embed a thumbnail too, because shop image URLs break and block hotlinking. A web page can't do this (CORS stops it reading the image), so items from Paste link keep the shop's URL.
- **Relays:** 4 well-known public relays, configurable (`VITE_RELAYS`). Every write goes to all of them, and reads merge. Checked on 18 Nov 2026 with `tools/check-relays.mjs` (a 30 KB kind-30078 event, read back by `#h`): nos.lol, relay.primal.net, offchain.pub and nostr.mom are the defaults; relay.snort.social also works. relay.damus.io and relay.nostr.band timed out, and nostr.wine needs a paid signup. Rerun the check before the family beta.
- **Slots:** each replaceable event's `d` tag is unique per thing: `item:<id>`, `roster:<group tag prefix>` (an organizer's rosters for different groups mustn't replace each other), `joined:<device>:<group tag prefix>`, `vault`.
- **On the device:** IndexedDB (Dexie) holds the cache and an **outbox** of unsent events, so the app works offline and catches up later.

## 7. Adding gifts

Every path ends in the same **Add sheet**: "What is it?", a photo, a link, price, notes, Really want, and **For: Me ▾** (choosing someone else makes a surprise idea).

All the entry points open one URL, `/add#url=…&title=…&image=…&price=…&site=…`, which the web app (where the identity lives) fills in from. `image` may repeat, one per candidate photo.

| Situation | Android | iPhone / iPad | Desktop |
|---|---|---|---|
| Shopping online | **Share → Family Registry**: the [share helper](#android-share-helper) reads the page. Without the helper, the PWA's own web share target (GET) still takes the link and title. | **Share → Shortcut** (one-time install from an iCloud link; can read the page in Safari) or **Paste link** | **Browser extension** (Chrome/Edge/Firefox, MV3) that reads the page and opens the Add sheet; a bookmarklet for Safari on Mac; **Paste link** |
| Got a screenshot | **Share → Family Registry** with the image (web share target, POST, handled by the service worker) | + → photo | + → paste |
| In a store | + → camera, snap, type a few words, save. Works offline. | Same | n/a |
| Typing it in | + → "What is it?", optional photo or screenshot paste. A pasted URL fills itself in. | Same | Same |

### Link previews, with no server

The PWA is a web page, so the browser's same-origin rule stops its scripts from reading a shop's page. Instead of a server, each platform gets a small helper that runs on the device and *isn't* a web page:

| Platform | Helper | How it reads the page |
|---|---|---|
| Desktop | Browser extension (bookmarklet for Safari) | Host permissions / runs on the page |
| iPhone/iPad | Shortcut | Runs JavaScript on the page in Safari |
| Android | Share helper app | Native HTTP fetch, which CORS doesn't apply to |

Because the page is fetched from the family's own phone and home connection, shops see a normal visitor. That's more reliable than a datacenter server, which big shops often block.

**One extractor, three hosts.** A single `extract.js` turns a page into `{title, images[], price, currency, site}`. It prefers JSON-LD `Product`, then Open Graph / Twitter tags, then `<title>`. The extension, the Shortcut and the Android helper all run the same file, so they agree. **The person picks the photo** from the candidates, and "use my own photo" is one tap.

**When nothing can read the page** (Paste link, or Android without the helper), the app still does its best on the device: the title comes from the share text ("Check out LEGO Botanical Bonsai on Amazon …") or the URL slug (`/LEGO-Botanical-Bonsai-Tree/dp/…`), the site name comes from the domain, and the Add sheet makes **Add a photo** the obvious next step.

### Importing an Amazon list

Many people already keep Amazon lists, and not only for themselves: a parent often has one list per child. Amazon has no public API for lists, so import reads the list page itself, using the same helpers as link previews.

- **Desktop extension (main path):** on any Amazon list page, the toolbar button offers **Import this list**. Because the person is signed in to Amazon in that browser, private lists work too. It scrolls the page until every item has loaded, then reads each one: title, photo (an embedded thumbnail), price, link, Amazon's comment, and quantity. Items marked "highest" priority become **Really want**.
- **Several lists at once:** on Amazon's "Your Lists" page, the extension lists all of them, and each gets its own **Whose list is this?** choice (see below).
- **Android helper:** sharing a list from the Amazon app works the same way, but only for lists set to Shared or Public. Amazon sometimes shows a bot check to anything that isn't a normal browser, so if the helper can't read the list, it says so and suggests the computer.
- **iPhone/iPad:** a second Shortcut action can run the same reader on a list open in Safari, for shared lists. Test it before promising it.
- **The reader** sits in `packages/extract` next to `extract.js`, and is tested against saved copies of real list pages.

**Whose list is this?** Before anything is saved, the import shows faces and asks. It suggests an answer from the list's name ("Lily's birthday" suggests Lily):
- **Me:** the items go on your own list.
- **Someone whose list you help keep:** a managed person, or a child who has the app but whose list a parent helps with (see [Items](#items)). The items go on *their* list, as if they'd added them.
- **Anyone else:** the items become **secret ideas** for that person. Everyone but them sees the ideas and can claim them.

Then a review screen shows every item with a tick, all ticked, plus **Import 14 things**. There's no per-item form.

- **One-time import, not a sync.** Amazon changes its pages often, so a live sync would keep breaking. **Import again** brings in only new items: it skips anything whose Amazon product ID is already on the chosen list. The app remembers which person each Amazon list went to, so the next import of that list goes straight there.
- **Nothing goes back to Amazon.** Claiming in our app doesn't touch the Amazon list, so the surprise never leaks through Amazon's own "purchased" marks.

### Android share helper

A tiny native Android app whose only job is to read a shared product page and hand the details to the web app. It holds no identity and stores nothing.

1. It appears in the Share menu as **Family Registry** for shared text and links (`ACTION_SEND`, `text/plain`).
2. It takes the first URL from the shared text and keeps the rest as a title hint.
3. It shows a small card ("Getting details…") and fetches the page with a mobile Chrome user agent. It follows redirects (`amzn.to`, `a.co`), reads at most about 2 MB, and gives up after about 5 seconds.
4. It runs `extract.js` over the HTML in an off-screen WebView (using `DOMParser`, without running the shop's own scripts).
5. It opens `https://<site>/add#…` with `ACTION_VIEW`. Android sends that to the installed PWA when the link is in its scope, otherwise to Chrome. Then the helper closes.
6. If it's offline, times out or fails, it opens `/add` with just the URL and title hint. It never blocks adding a gift.

- **Permissions:** Internet only.
- **Code:** Kotlin, one activity, no libraries beyond AndroidX. It lives in `android-helper/` in this repo and copies `extract.js` in at build time. The site URL is fixed at build time.
- **Distribution:** GitHub Actions builds a signed APK and attaches it to a GitHub Release. The organizer view links to it. Installing means allowing "install unknown apps" once; the organizer can do that for anyone who'd find it confusing. Updates need the same signing key, so keep a backup of it with the family words.
- **Both share entries:** with the helper installed, the Share menu may show two Family Registry entries (the helper and the PWA). Give them distinct labels and check on a family phone whether it confuses anyone.
- **Public release:** a Play Store listing ($25 one-time) instead of the APK.

**iOS limits:** an installed web app can't appear in the Share menu, and links from the Shortcut open in Safari, not the installed app. So the person also needs to be signed in to the site in Safari (the personal link does this). We'll test the Shortcut and the paste fallback on a family iPhone/iPad and keep whichever feels better.

## 8. Platform and stack

- **Installable web app (PWA)** on every device: Add to Home Screen (iOS/Android), Install (Chrome/Edge). One codebase, no app stores.
- **Hosting:** GitHub Pages to start (free HTTPS, always on). A custom domain later. Running it from the owner's PC was ruled out: it would be offline whenever the PC is off.
- **Front end:** Vite + React + TypeScript, `vite-plugin-pwa` (Workbox), Radix UI primitives for accessible dialogs, sheets and menus, Motion for animation, plain CSS with design tokens.
- **Nostr:** `nostr-tools` (NIP-01, NIP-44 v2, NIP-40, NIP-78), as in hang-time.
- **Storage:** Dexie (IndexedDB), plus `navigator.storage.persist()`.
- **No server.** Link previews happen on the device (see [section 7](#link-previews-with-no-server)).
- **Extension:** a small MV3 extension (content script + toolbar button), built from the same repo.
- **Android share helper:** a one-activity Kotlin app in `android-helper/`, built as an APK by GitHub Actions.
- **Shared extractor:** `extract.js`, used by the extension, the iOS Shortcut and the Android helper.
- **Tests:** see [Engineering](#9-engineering).

## 9. Engineering

### Repo layout

One repo, npm workspaces:

| Folder | What's in it |
|---|---|
| `app/` | The PWA: screens, components, design tokens, illustrations. |
| `packages/core` | Pure TypeScript, no React, no DOM: word lists and key derivation, event formats and schemas, encryption, the claim rules, roster and editor checks, the sync engine and outbox. |
| `packages/extract` | `extract.js` and its tests against saved shop pages. |
| `extension/` | The MV3 browser extension. |
| `android-helper/` | The Kotlin share helper. |
| `shortcut/` | The iOS Shortcut's source and install notes. |
| `tools/` | The fake relay, the demo-family seeder, and release scripts. |

- **The logic lives in `core`, not the UI.** Everything that decides who wins a claim, who can see what and what gets published is plain functions there. The app only calls them and draws the result. That keeps the rules testable without a browser.
- **Shared code with hang-time:** copy the identity code and word list into `core` (with a note of where it came from) rather than depending on the other repo. Two apps tied to each other's internals is upkeep nobody wants.

### The data format is forever

Family data lives on relays, and old phones run old versions, so a careless change could strand real data.
- Every event's content carries a version (`v: 1`) and is checked against a schema when read (Valibot). Anything invalid, or from a version this app doesn't know, is skipped and logged, never crashed on.
- Fields are only ever added, never renamed or repurposed. Older apps ignore fields they don't know, and newer apps fill in defaults.
- The word lists, scrypt parameters, salts and HKDF labels are frozen. Changing any of them means a new versioned scheme alongside the old one.

### Testing

- **Fixed test vectors** (Vitest): known words → known keys → known tags and decrypted events. These tests are the alarm for an accidental format change.
- **Rules:** claim races (including offline claims arriving late and future-dated clocks), tombstones, multi-editor items, roster anchoring, group word rotation, and Received reveals.
- **Privacy tests:** the recipient's app must never request or decrypt claims on their own items or surprise ideas for them. This is checked at the relay-request level, not just in the UI. It guards the product's main promise.
- **A fake relay** (in-memory, in `tools/`) for all tests. Tests never touch public relays.
- **Whole-family end-to-end tests** (Playwright): several browser sessions as different people against the fake relay, at phone and desktop sizes. Two people claim the same item; someone goes offline and comes back; an invite is opened, installed and joined; a person is removed and the rest carry on.
- **Accessibility:** axe checks in Playwright, plus runs with Larger text and reduced motion.
- **Extractor tests:** saved copies of real product pages (Amazon, Target, Etsy, John Lewis and others). Refresh them now and then, since shops change.
- **Setup on real devices:** the invite → install → joined path on each platform in the [setup table](#invites-and-getting-set-up), including links opened from the Gmail and Outlook apps. The owner runs these from a short checklist in `docs/`.

### Environments and releases

- **Staging** is a second build at its own address, using a different namespace on the relays (its own salts and tags). Trying things out never touches the family's real data.
- **CI** (GitHub Actions): typecheck, lint, unit tests, end-to-end tests and build on every push. A merge to `main` deploys to GitHub Pages; a tag builds and signs the Android helper and the extension packages.
- **App updates:** the service worker waits, and the app shows a gentle "New version ready" toast; it never swaps itself mid-use.
- **Demo family data:** a seeder fills a dev or staging build with the mock-up's family, for development and screenshots.

### When something goes wrong

There's no server collecting errors. The app keeps a short local log (no gift contents). **Something wrong? Tell the organizer** packs the log and device details into a message the person sends through the share sheet or email.

## 10. Risks

| Risk | Mitigation |
|---|---|
| **Safari deletes a website's storage after 7 days without a visit** (for sites not added to the Home Screen). | Push for Add to Home Screen during onboarding. Everything lives on the relays anyway, and the personal link or a pairing code restores the identity in seconds. |
| On iPhone/iPad, the Home Screen app doesn't share Safari's storage, so a newly installed app isn't signed in. | Keep the personal link in the address bar during the install steps so the icon carries it, with the 6-digit code from Safari as backup. Test first on the family device. See [Invites](#invites-and-getting-set-up). |
| An invite link opens inside an email or Facebook app's own browser, which can't install the app. | Detect it and show "Open in Safari / Chrome" with a picture of that app's menu. |
| Public relays drop old events. | Write to several relays, republish your own items now and then, keep a full local copy, offer export, and possibly run our own relay later. |
| Link previews fail (blocked or wrong photo). | Read the page on the device (extension, Shortcut, Android helper), let people pick the photo, and make manual entry easy. |
| Google's developer verification for sideloaded Android apps (announced 2025, rolling out by country from 2026) blocks or complicates installing the helper. | Check the current rules before milestone 4; register under the free limited-distribution option if needed. Without the helper, Android sharing still works, just without photo and price. |
| The helper's signing key is lost, so updates can't install over the old app. | Back up the key alongside the family words. Worst case, uninstall and reinstall. |
| iOS Shortcut feels clunky. | Test on a family device before rollout, with Paste link as the fallback. |
| Someone peeks at claims by modifying the app. | Accepted (family-grade). |
| A person gets two identities (lost link, made a new one). | Organizer reissue flow: republish under the new key. |
| Image size limits on relays. | ≤ 30 KB thumbnails; shop images by URL. |

## 11. Milestones

0. **Look and feel**: clickable mock-ups (`mockups/index.html`), agree the visual direction. Done.
1. **Local app**: the workspace and CI, `core` with test vectors, the PWA shell, identity from a link, the Add sheet, your own list, offline storage. No sync yet. Done, except the device-specific Welcome steps, which move to milestone 2 with invites. Items are signed and queued in an outbox, ready for sync.
2. **Sync and invites**: groups, roster, items, encryption, multiple devices, the fake relay and whole-family tests, staging. The organizer view: add people, invites through the Share menu (with email and copy fallbacks), QR, Joined status, family backup. Welcome with device-specific install steps, the iOS sign-in handover, and the `/help` guide. Done, except: the iOS 6-digit-code fallback (it shares the pairing-code mechanism, so it moves to milestone 4), removing someone with group word rotation, and a hosted staging site (the build supports it: `VITE_NAMESPACE=staging`). Development uses a local stand-in relay, never the public ones. ← *we are here*
3. **Giving**: I'll get this / Bought it, surprise ideas, conflict handling, Received history, "new" dots.
4. **Adding everywhere**: Android share target, `extract.js`, the Android share helper, the browser extension, the iOS Shortcut, pairing codes, Amazon list import.
5. **Family beta**: deploy to GitHub Pages, run the device setup checklist, send the invites, onboard all 8, fix what hurts. Aim: ready well before Christmas 2026 (37 days from 18 Nov).
6. **Later list** as above; decide on a public release.

## Naming

Checked so far, and each one already has a gift app with that name or a near match:
- Giftwrap: GiftWrapp, plus the Nostr NIP-59 "gift wrap".
- Gifter: Gifter – Gift organizer.
- Wish Tree: WishTree.
- Unwrap: the closest matches are Unwrapped and Unwrapd.

Still to check: Under Wraps, Psst, Wishbone, Kinlist, Bough, Hearth.
