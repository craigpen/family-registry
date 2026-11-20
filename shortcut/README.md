# The iPhone and iPad Shortcut

An iPhone can't put a web app in its Share menu, so a Shortcut does the job: in Safari, **Share → Add to wish list** reads the page (name, photos, price) and opens the wish list's Add sheet filled in. It runs the same `extract.js` as the browser extension and the Android helper.

Apple only lets Shortcuts be shared after they're made on a device, so it's built **once**, on any iPhone or iPad, and then shared with the family as an iCloud link. Takes about five minutes.

## Build it (once)

1. On the iPhone, open the **Shortcuts** app and tap **+** to make a new shortcut. Name it **Add to wish list**.
2. Tap the **(i)** (or the shortcut's name at the top, then **Details**) and switch on **Show in Share Sheet**. Under share sheet types, choose only **Safari web pages**.
3. Add the action **Run JavaScript on Web Page**. Its input should be **Shortcut Input**.
4. Replace the sample script with the contents of the script below:
   - In Safari, open `https://craigpen.github.io/family-registry/help`, choose **iPhone or iPad**, open **Other ways: adding from shops, faster**, and tap **Copy the Shortcut script**. (Safari on an iPad has no Select All on a page of code, so don't try copying it from `shortcut.js` directly.)
   - Paste it into the action, over the sample script. (It's the shared reader plus a few lines at the end.)
5. Add the action **Open URLs**. Its input is the **JavaScript Result** from the step before.
6. Tap **Done**.

## Try it

Open a product page in Safari (Amazon, Target, Etsy…), tap **Share**, scroll the list of actions, and tap **Add to wish list**. The wish list opens with the name, a photo and the price filled in. Check them and tap **Save**.

The first time, iOS asks whether the shortcut may run JavaScript on that website. Choose **Always allow** (it asks once per shop).

## The family's copy

Built and shared on 20 Nov 2026: https://www.icloud.com/shortcuts/6711720a4d424c78869b53c9829ef362 (`SHORTCUT_URL` in `app/src/setup.ts`). The iPhone/iPad setup offers it once the Home Screen app is set up, and the help page has it under Other ways. If it's ever rebuilt, put the new link there.

## Share it with the family

In the Shortcuts app, long-press **Add to wish list** → **Share** → **Copy iCloud Link**. Send that link to anyone with an iPhone or iPad. They tap it, then **Add Shortcut**.

## Good to know

- It only works from **Safari**. In another app (say the Amazon app), use that app's Share → **Copy link**, then **Paste a link** in the wish list. The title, shop and price usually still fill in from the link itself.
- It opens the wish list **in Safari**, not the Home Screen app (iOS doesn't allow otherwise). So the person needs to be signed in in Safari too: opening their personal link once in Safari does it.
- Photos come through as links to the shop's own pictures (Safari won't let the script copy them). If a shop later moves a picture, add your own photo.
- If shops change their pages and the details stop filling in, update `packages/extract/extract.js`, redeploy, and repeat step 4 with the new script. Then share the new iCloud link.
