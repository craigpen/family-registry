# The iPhone and iPad Shortcut

An iPhone can't put a web app in its Share menu, so a Shortcut does the job: in Safari, **Share → Add to wish list** reads the page (name, photos, price) and opens the wish list's Add sheet filled in. It runs the same `extract.js` as the browser extension and the Android helper.

Apple only lets Shortcuts be shared after they're made on a device, so it's built **once**, on any iPhone or iPad, and then shared with the family as an iCloud link. Takes about five minutes.

## Build it (once)

It does two things: in **Safari** it reads the page (name, photos, price); from **any other app** (the Amazon app, say), which hands over only a link and a line of text, it opens the Add sheet with those, like **Paste a link**.

1. On the iPhone, open the **Shortcuts** app and tap **+** to make a new shortcut. Name it **Add to wish list**.
2. Tap the **(i)** (or the shortcut's name at the top, then **Details**) and switch on **Show in Share Sheet**. Back in the shortcut, the top line reads "Receive **Any** input from Share Sheet": tap **Any** and choose **Safari web pages**, **URLs** and **Text** (nothing else).
3. Add the action **Get Type** (search "type"). Its input is **Shortcut Input**.
4. Add **If**. Tap its condition: **Type** **is** and type `Safari web page`.
5. Inside the If (above **Otherwise**):
   - Add **Run JavaScript on Web Page**, with input **Shortcut Input**. Replace its sample script with the wish list's: in Safari, open `https://craigpen.github.io/family-registry/help#build-shortcut`, choose **iPhone or iPad**, tap **Copy the Shortcut script** (it only shows at that address), and paste it over the sample. (Safari on an iPad has no Select All on a page of code, so don't copy it from `shortcut.js` directly.)
   - Add **Open URLs**, with input **JavaScript Result**.
6. Inside **Otherwise** (above **End If**):
   - Add **Get URLs from Input**, with input **Shortcut Input**.
   - Add **Get Item from List**: **First Item** from **URLs**.
   - Add **URL Encode**, input **Item from List**. Then another **URL Encode**, input **Shortcut Input** (the shared text: it usually holds the product's name).
   - Add **Open URLs**. In its box type `https://craigpen.github.io/family-registry/add#url=`, insert the first **URL Encoded Text**, type `&text=`, and insert the second **URL Encoded Text**.
7. Tap **Done**.

## Try it

Open a product page in Safari (Amazon, Target, Etsy…), tap **Share**, scroll the list of actions, and tap **Add to wish list**. The wish list opens with the name, a photo and the price filled in. Check them and tap **Save**.

Then in the Amazon app: Share → **Add to wish list**. The wish list opens with the link and, usually, the name; add a photo or price by hand if they're missing.

The first time, iOS asks whether the shortcut may run JavaScript on that website. Choose **Always allow** (it asks once per shop).

## The family's copy

Built and shared on 20 Nov 2026 (Safari only; rebuilt with the other-apps branch above when shared again): https://www.icloud.com/shortcuts/6711720a4d424c78869b53c9829ef362 (`SHORTCUT_URL` in `app/src/setup.ts`). The iPhone/iPad setup offers it once the Home Screen app is set up, and the help page has it under Other ways. If it's ever rebuilt, put the new link there.

## Share it with the family

In the Shortcuts app, long-press **Add to wish list** → **Share** → **Copy iCloud Link**. Send that link to anyone with an iPhone or iPad. They tap it, then **Add Shortcut**.

## Good to know

- From **Safari** it reads the whole page. From another app (the Amazon app, say) it only gets a link and a line of text, so the photo and price usually need adding by hand. Without the Otherwise branch, sharing from another app fails with "couldn't convert from URL to Safari Web Page".
- Editing a shared shortcut doesn't change the copy others already have, and sharing it again gives a new iCloud link: put that in `SHORTCUT_URL` (`app/src/setup.ts`).
- It opens the wish list **in Safari**, not the Home Screen app (iOS doesn't allow otherwise). So the person needs to be signed in in Safari too: opening their personal link once in Safari does it.
- Photos come through as links to the shop's own pictures (Safari won't let the script copy them). If a shop later moves a picture, add your own photo.
- If shops change their pages and the details stop filling in, update `packages/extract/extract.js`, redeploy, and repeat step 4 with the new script. Then share the new iCloud link.
