/*
 * Every word the app shows, in one place, so the wording is easy to review and change.
 *
 *   {name}         filled in by the screen (a person's name, a count, a shop...)
 *   **words**      shown in bold
 *   [words](key)   a link; the screen decides where it goes
 *   { one, many }  the screen picks by count ("1 wish", "3 wishes"); `zero` when there's one
 *
 * A comment above a text says where and when it shows, for anything that isn't obvious.
 * `node tools/copy-review.mjs` turns this file into the review page.
 * American English, no emoji.
 */

export interface Plural { zero?: string; one: string; many: string }

export const copy = {
  common: {
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    done: 'Done',
    continue: 'Continue',
    next: 'Next',
    ok: 'OK',
    /** Dismisses a tip that shows only until you've read it. */
    gotIt: 'Got it',
    undo: 'Undo',
    edit: 'Edit',
    settings: 'Settings',
    /** Joins names: "Mom and Dad". */
    and: ' and ',
    /** Stands in for a name that hasn't arrived yet. */
    someone: 'Someone',
    you: 'You',
    me: 'Me',
    /** The dot on a face or item that changed since your last look. */
    newDot: 'New since last visit',
  },

  nav: {
    label: 'Main',
    family: 'Family',
    add: 'Add a wish',
    mine: 'My list',
  },

  home: {
    /** Heading of the family screen. */
    hi: 'Hi {name}',
    people: 'People',
    /** Notice at the top of the family screen, until you tap OK. */
    removedWhileGetting: '{name} removed **{title}**, which you were getting.',
    /** Group chips, only when you're in more than one group. */
    groupsLabel: 'Show',
    everyone: 'Everyone',
    /** Family screen with nobody else on it, for the organizer. */
    emptyOrganizerTitle: 'Add your family',
    emptyOrganizerText: 'Add each person, then send them their own link.',
    addPeople: 'Add people',
    /** Family screen with nobody else on it, for everyone else. */
    emptyTitle: 'Nobody else yet',
    emptyText: 'Faces appear here as your family joins.',
    /** Under each face. */
    wishes: { zero: 'No wishes yet', one: '1 wish', many: '{n} wishes' } as Plural,
    /** On a face, when their birthday is within 60 days. */
    birthdayToday: 'Today!',
    birthdayIn: { one: 'in 1 day', many: 'in {n} days' } as Plural,
  },

  myList: {
    hi: 'Hi {name}',
    title: 'My list',
    /** Top of My list, until you tap Got it (once per device). */
    secretNote: 'You\'ll never see who\'s getting something on your list.',
    /** My list with nothing on it. */
    emptyTitle: 'What do you wish for?',
    emptyText: 'Add a photo, a link, or just a few words.',
    addFirst: 'Add your first wish',
    /** The section of things you've been given. */
    received: 'Received',
    /** Under a received item: who gave it and when. */
    receivedFrom: 'from {names} · {occasion}',
    receivedFallbackName: 'family',
    /** Under a received item you moved there yourself (I got it). */
    markedReceived: 'You marked this as received',
  },

  person: {
    /** Read out for the face on someone's list, for organizers and the helpers of a managed person: opens their details. */
    editFace: 'Change {name}\'s photo and birthday',
    /** Under their face, when they have a birthday set. */
    birthday: 'Birthday {date}',
    birthdayToday: 'today!',
    birthdayIn: 'in {n} days',
    /** Under the face of someone who doesn't use the app. */
    keptBy: 'List managed by {names}',
    keptByNobody: 'the family',
    /** Their list is empty. */
    emptyManaged: 'Nothing on {name}\'s list yet.',
    empty: '{name} hasn\'t added any wishes yet.',
    wishes: '{name}\'s wishes',
    /** Only for people who help manage this list. */
    addTo: 'Add to {name}\'s list',
    /** Heading over secret ideas, when there are any. */
    ideasTitle: 'Secret ideas for {name}',
    addIdea: 'Add a secret idea for {name}',
  },

  /** "Christmas", "Lily's birthday"; {year} is " 2027" only when it isn't this year or next. */
  occasion: {
    christmas: 'Christmas{year}',
    birthday: '{name}\'s birthday{year}',
    theirBirthday: 'their birthday{year}',
    unknown: 'the occasion',
  },

  item: {
    /** On cards in someone else's list: who's getting it. */
    upForGrabs: 'Up for grabs',
    youBought: 'You got this',
    youreGetting: 'You\'re getting this',
    boughtBy: '{name} got this',
    isGetting: '{name} is getting this',
    reallyWant: 'Really want',
    /** Item sheet line, when the heart is on. */
    ownerReallyWants: '{name} really wants this',
    youReallyWant: 'You really want this',
    /** Item sheet, secret ideas only. */
    yourIdea: 'Your secret idea. {owner} can\'t see it.',
    ideaFrom: 'Secret idea from {name}. {owner} can\'t see it.',
    viewAt: 'View at {site}',
    theShop: 'the shop',
    /** Occasion chips, when more than one is coming up. */
    occasionsLabel: 'For which occasion',
    claim: 'I\'ll get this',
    /** Item sheet, when you're the one getting it. */
    youBoughtFor: 'You got this for {occasion}.',
    youreGettingFor: 'You\'re getting this for {occasion}.',
    they: 'they',
    They: 'They',
    /** When someone else bought it as well as you. */
    boughtToo: '{names} got it too. May be worth checking.',
    iBoughtIt: 'I got it',
    givenAlready: 'I\'ve given it already',
    didntBuy: 'I didn’t get it after all',
    neverMind: 'Never mind',
    /** Item sheet, when someone else is getting it. */
    alreadyBought: '**{name}** already got this.',
    alsoGetting: '**{name}** is getting this.',
    /** ...and you had said you'd get it too. */
    bothBought: 'You and {name} both got this. May be worth checking.',
    gotThereFirst: '{name} got there first.',
    letGo: 'OK, let it go',
    /** For the owner (or their helpers). */
    backOnList: 'Back on my list',
    gotIt: 'I got it',
    removeIdea: 'Remove this idea',
    removeMine: 'Remove from my list',
    removeTheirs: 'Remove from {name}\'s list',
  },

  add: {
    /** Sheet headings. */
    editTitle: 'Edit',
    secretTitle: 'Secret idea for {name}',
    helperTitle: 'Add to {name}\'s list',
    mineTitle: 'Add to my list',
    /** Top of the sheet, for secret ideas. */
    secretBanner: '{name} won\'t see this. Everyone else will.',
    what: 'What is it?',
    /** Under the name, while it's very long. */
    shorten: 'Shorten to “{title}”',
    /** After a link or a helper filled things in. */
    filledFromLink: 'Filled in from the link.',
    filledFrom: 'Filled in from {site}.',
    /** In the browser extension's side panel: reading the page beside it. */
    checkingPage: 'Checking the page you\'re on…',
    fromPage: 'From the page you\'re on.',
    fromPageAt: 'From the page you\'re on ({site}).',
    somethingElse: 'Add something else',
    /** Side panel, beside an Amazon list. */
    listTitle: 'You\'re looking at an Amazon list',
    listText: '“{name}”{count}. Bring the whole list in: you choose whose list it goes on, and untick anything you don\'t want.',
    listCount: { one: ', 1 thing', many: ', {n} things' } as Plural,
    listCountMore: ', {n} or more things',
    importList: 'Import the whole list',
    /** Side panel, before it's allowed to read shop pages. */
    fillFromPage: 'Fill this in from the page you\'re on',
    /** When a shop offered several pictures. */
    pickPicture: 'Pick the best picture',
    picturesLabel: 'Pictures from the shop',
    picture: 'Picture {n}',
    myPhoto: 'My photo',
    yourPhoto: 'Your photo',
    photoOfItem: 'Photo of the item',
    removePhoto: 'Remove photo',
    addPhoto: 'Add a photo',
    /** Phones and tablets only: opens the camera. */
    takePhoto: 'Take a photo',
    /** Phones and tablets only, beside Take a photo: picks one already on the device. */
    choosePhoto: 'Choose a photo',
    pasteLink: 'Paste a link',
    photoUnreadable: 'Could not read that picture',
    photoTooDetailed: 'That picture is too detailed to shrink',
    link: 'Link (optional)',
    linkPlaceholder: 'https://…',
    price: 'Price',
    where: 'Where? (optional)',
    whereLabel: 'Where to get it',
    notes: 'Notes: size, color…',
    notesLabel: 'Notes',
    /** The heart toggle. */
    theyDLove: 'They’d love this',
    theyWant: '{name} really wants this',
    iWant: 'I really want this',
  },

  importing: {
    waitingTitle: 'Importing a list',
    waiting: 'Waiting for the list from your browser extension… If nothing happens, go back to the list page and click **Import this list** again.',
    adding: 'Adding {n} of {total}…',
    whoseTitle: 'Whose list is this?',
    summary: { one: '“{name}”, 1 thing', many: '“{name}”, {n} things' } as Plural,
    /** {whose} is "your" or "Lily's". */
    your: 'your',
    whose: '{name}\'s',
    goesMine: 'They go on your own list.',
    goesHelper: 'They go on {whose} list, which you help manage.',
    goesIdeas: 'They become secret ideas for {name}. Everyone else sees them; {name} won\'t.',
    /** Above the ticked list. */
    asIdeas: 'As secret ideas for {name}',
    onto: 'Onto {whose} list',
    alreadyThere: 'Already on the list',
    highest: 'Highest priority',
    importN: { one: 'Import 1 thing', many: 'Import {n} things' } as Plural,
  },

  /** Opened without a personal link. Most people never see this. */
  start: {
    title: 'Family wish lists',
    intro: 'To join your family, open the personal link they sent you. Look for a message from whoever set it up.',
    haveCode: 'I have a code from my other device',
    /** On the start screen, for someone whose personal link is gone. */
    lostLink: 'I lost my link',
    newFamily: 'Start a new family',
    codeTitle: 'Type the code',
    codeText: 'On your other device, open **Settings** and choose **Use it on another device**. Type the 6 numbers it shows.',
    /** On an iPhone's Home Screen app, which can't see Safari's sign-in. */
    codeTitleIos: 'One last step',
    codeTextIos: 'Go back to **Safari**. Your code is waiting on the page. Type it here.',
    otherWays: 'Other ways in',
    codeLabel: '6-digit code',
    codePlaceholder: '000 000',
    codeWrong: 'That code didn’t work. Codes last 10 minutes: get a new one on your other device and try again.',
    codeOffline: 'Couldn’t check the code. Are you online?',
    checking: 'Checking…',
    newTitle: 'Start a family',
    newText: 'You\'ll be the organizer: you add others and send them their links.',
    firstName: 'Your first name',
    start: 'Start',
    /** After I lost my link: the number to read out. */
    lostTitle: 'Read this number to whoever set up your family',
    lostText: 'They type it into the app on their phone or computer. Keep this screen open: it signs you in by itself.',
    lostCodeLabel: 'Your number',
    lostWaiting: 'Waiting for them…',
    /** After 10 minutes with nothing. */
    lostExpired: 'That number has run out.',
    lostNewNumber: 'Get a new number',
  },

  /** The first open after an invite link. */
  welcome: {
    finding: 'Finding your family…',
    hello: 'Welcome {name}!',
    helloAnon: 'Welcome!',
    inGroup: { one: 'You\'re in **{group}** with 1 other.', many: 'You\'re in **{group}** with {n} others.' } as Plural,
    pitch: 'See what everyone\'s wishing for, quietly pick something to get, and keep your own list.',
    firstName: 'Your first name',
    /** The one button on the greeting. */
    start: 'Let\'s go',
    /** iPhone install steps, under the steps. */
    iosHome: 'Then open it from your **Home Screen**, not from here. That\'s where it lives now.',
    iosCode: 'If it asks for a code, it\'s **{code}**.',
    /** On the last picture of the how-to. */
    addFirst: 'Add your first wish',
    seeFamily: 'See the family',
  },

  /** Once, after getting set up (or Not now): four quick pictures of how it works. */
  tour: {
    skip: 'Skip',
    next: 'Next',
    yourListTitle: 'Your wish list',
    yourListText: 'Add anything you\'d like: from a shop, a photo, or just an idea. Change it any time.',
    theirListsTitle: 'Everyone else\'s',
    theirListsText: 'Tap someone\'s face to see what they\'d like.',
    getThisTitle: 'Pick something to get',
    getThisText: 'Tap **I\'ll get this**. The family sees it\'s taken, so nobody doubles up. The person never finds out.',
    /** The little badge on that picture. */
    secretBadge: 'Hidden from them',
    receivedTitle: 'After the big day',
    receivedText: 'What they got moves to **Received**, so their list stays fresh for next time.',
    /** Names on the drawn wish cards. */
    sampleOne: 'Cozy slippers',
    sampleTwo: 'A good book',
    sampleThree: 'Garden gloves',
  },

  /**
   * Getting set up on this device: one path, picked for the device, after About you (and from Settings).
   * It turns green by itself when it's done, here or in the browser or Home Screen app it led to.
   */
  setup: {
    androidTitle: 'Get the app',
    androidText: 'One install puts the wish list on your home screen and adds **Add to wish list** to the Share menu, so things from a shop\'s app come with their photo and price.',
    buttonTitle: 'Add the wish list extension',
    buttonText: 'On any store product listing, click the gift icon in your toolbar and you can add it to your list. It also opens your whole wish list beside the page.',
    buttonDownload: '[Download the wish list extension](zip) and unzip it: on Windows, right-click it and choose **Extract All**; on a Mac, double-click it',
    buttonDevMode: 'Type **{page}** into the address bar and switch on **Developer mode**',
    buttonLoad: 'Click **Load unpacked** and choose the unzipped folder',
    buttonPin: 'Click the puzzle piece in the toolbar, then the pin next to the gift',
    /** Under the steps: why this page may not see an extension that's already added. */
    buttonAlready: 'Already added it? This page can\'t see it in a private or incognito window, so open the wish list in a normal window. If it still asks, remove it on **{page}** and add it again with the steps above.',
    /** In a private (incognito or InPrivate) window: setup can't work there. */
    privateTitle: 'Open it in a normal window',
    privateText: 'This looks like a private window. It forgets you as soon as it closes, and the wish list extension can\'t run in it.',
    privateCopy: 'Copy your link with the button below',
    privatePaste: 'Open a normal {browser} window and paste it into the address bar at the top',
    donePrivate: 'You\'re signed in in a normal window',
    donePrivateText: 'Use it there from now on, and set it up there.',
    /** The extension is in, but an older version that needs replacing. */
    updateTitle: 'Update the wish list extension',
    updateText: 'You have an older version. Updating takes a minute.',
    updateDownload: '[Download the new version](zip) and unzip it over the old folder, replacing the files',
    updateReload: 'Type **{page}** into the address bar and click the round arrow on **Family wish lists**',
    /** Once the gift button is in the Chrome Web Store: the one step. */
    buttonStore: 'Add to {browser}',
    iosTitle: 'Put it on your Home Screen',
    iosText: 'It goes on your Home Screen like any other app.',
    openInTitle: 'Open it in {browser}',
    openInAndroid: 'This browser can\'t put it on your home screen. Chrome can, and it\'s already on most Android phones.',
    openInWindows: 'It works best in Edge, which is already on your computer.',
    openInDesktop: 'It works best in Chrome or Edge.',
    openInCopy: 'Copy your link with the button below',
    openInPaste: 'Open **{browser}** and paste it into the address bar at the top',
    /** Under the open-in steps, on a Mac. */
    macNoChrome: 'No Chrome on this Mac? Get it free at **google.com/chrome** first.',
    /** Under every step that isn't done yet. */
    /** Next to a plain gray ring, never green. */
    waiting: 'Not done yet. A green check shows up here by itself once it is.',
    doneAndroid: 'The app is installed',
    doneAndroidText: 'Open Wish lists from your home screen from now on. In a shop\'s app, tap Share, then Add to wish list.',
    doneIos: 'Your Home Screen app is ready',
    doneIosText: 'Open it from the red gift on your Home Screen from now on.',
    doneOpenIn: 'You\'re signed in on {browser}',
    doneOpenInText: 'Use it there from now on.',
    /** Opened as an installed app already, or the gift button is in. */
    doneAlready: 'All set up here',
    doneButton: 'The wish list extension is installed',
    doneButtonText: 'On any store product listing, click the gift icon in your toolbar.',
    continue: 'Continue',
    notNow: 'Not now',
    /** Under Not now. */
    later: 'You can do this any time from Settings.',
  },

  /** The one-time "About you" step, right after the welcome greeting. Never shown again once you skip or finish it. */
  aboutYou: {
    title: 'A little about you',
    text: 'A photo helps everyone find you, and your birthday tells them when to start looking. Both are up to you.',
    /** When the organizer has already put a birthday in: the picker starts with it. */
    birthdayKnown: 'Your birthday is already in. Change it if it\'s not right.',
    done: 'Done',
    skip: 'Skip for now',
    /** Under the buttons. */
    later: 'You can change these any time in Settings.',
  },

  /** The round photo picker: on About you, in Settings, and on a person's details. */
  face: {
    /** The big round button when there's no photo yet. */
    add: 'Add a photo',
    /** Read out for the round button when there's a photo. */
    change: 'Change photo',
    remove: 'Remove photo',
    /** Under the round button on phones and tablets: opens the camera. */
    take: 'Take a photo',
    /** While the photo is being shrunk. */
    working: 'Getting it ready…',
    unreadable: 'Could not read that picture. Try another one.',
  },

  /** Device tabs on the setup steps and the help page. */
  devices: {
    label: 'Device',
    ios: 'iPhone or iPad',
    android: 'Android',
    desktop: 'Computer',
  },

  install: {
    /** When the link opened inside Gmail, Facebook and the like. */
    openInTitle: 'First, open this in {browser}',
    openInText: 'This little browser inside another app can\'t keep the app. Two taps fix it:',
    tapDots: 'Tap the **three dots** at the top',
    tapOpenIn: 'Tap **Open in {browser}**',
    wordingDiffers: 'The wording differs a little between apps',
    iosShare: 'Tap the **Share** button',
    iosShareHint: 'The square with an arrow, at the bottom of Safari (top right on iPad)',
    iosAdd: 'Scroll down and tap **Add to Home Screen**',
    iosConfirm: 'Tap **Add**, top right',
    iosConfirmHint: 'Then open it from your Home Screen',
    /** The Android app (an APK from this site). */
    appDownload: 'Tap [Download the app](apk)',
    appInstall: 'Open the downloaded file. Android asks to allow installs from this source: allow it, then tap **Install**',
    appShare: 'Then, in a shop\'s app, tap **Share** and choose **Add to wish list**.',
    androidTap: 'Tap **Install** below',
    androidAgain: 'Tap **Install** again in the box that pops up',
    deskInstall: 'Click **Install** below, or the install icon in the address bar',
    install: 'Install',
    /** When the browser offers no install prompt. */
    noButtonAndroid: 'No Install button? Open the browser\'s menu (the three dots) and choose **Install app** or **Add to Home screen**.',
    /** Only in Chrome and Edge (other browsers are sent to them instead). */
    noButtonDesktop: 'No Install button? It may be installed already: look for it in your Start menu or Dock. If not, click the install icon at the right end of the address bar.',
  },

  /** The words inside the small drawings of phone screens (they copy what the phone says). */
  drawings: {
    copy: 'Copy',
    addBookmark: 'Add Bookmark',
    addToHomeScreen: 'Add to Home Screen',
    cancel: 'Cancel',
    add: 'Add',
    appName: 'Wish lists',
    installApp: 'Install app?',
    install: 'Install',
    copyLink: 'Copy link',
    openIn: 'Open in {browser}',
  },

  /** Setting up on a computer: three ways, any or all. */
  desktop: {
    recommended: 'Recommended',
    /** Folded away under the recommended way, on the help page. */
    otherWays: 'Other ways',
    buttonTitle: 'The wish list extension',
    buttonText: 'On any store product listing, click the gift icon in your toolbar: the name, photo, price, size and color fill themselves in, and it\'s added right there. Choose who it\'s for: you, a child whose list you manage, or a secret idea for someone. It also opens your whole wish list in the browser\'s side panel, next to whatever you\'re looking at, and imports Amazon lists.',
    download: '[Download the wish list extension](zip) and unzip it.',
    openExtensions: 'Open **{page}** and switch on **Developer mode**.',
    loadUnpacked: 'Click **Load unpacked** and choose the unzipped folder. Then pin the gift to the toolbar.',
    /** In browsers other than Chrome and Edge. */
    noButton: 'The wish list extension works in **Chrome** and **Edge** for now. In this browser, use the wish list in a tab, and **Paste a link** to add things.',
    tabTitle: 'In a browser tab',
    tabText: 'Nothing to install: it works right here. Bookmark this page so it\'s easy to come back to.',
    windowTitle: 'As its own window',
    windowText: 'Opens like an app, with an icon in your Start menu or Dock.',
    installApp: 'Install as an app',
    /** When the browser offers no install prompt. */
    cantInstall: 'This browser can’t do this. Chrome and Edge can.',
  },

  /** The public setup guide at /help. */
  help: {
    /** Read out for the back arrow at the top of the help page (only for someone already set up on this device). */
    backToApp: 'Back to the app',
    title: 'Getting set up',
    firstDesktop: 'First, open the personal link you were sent. Then, on a computer:',
    firstPhone: 'First, open the personal link you were sent. Then put the app on your phone:',
    helpersTitle: 'Other ways: adding from shops, faster',
    helpersText: 'Optional. Each one reads a shop\'s page so the name, photo and price fill themselves in.',
    iosTitle: 'The Shortcut',
    iosText: 'Adds **Add to wish list** to Safari\'s Share menu. Ask whoever set up the family for the Shortcut link, tap it on your iPhone or iPad, then tap **Add Shortcut**.',
    iosOtherApps: 'In another app, use its Share → **Copy link**, then **Paste a link** in the wish list.',
    newPhoneQ: 'I got a new phone',
    newPhoneA: 'Open your invite message on the new phone and tap the link again. Can\'t find it? Ask whoever set up the family to send it again; they keep a copy for everyone.',
    addDeviceQ: 'Adding a tablet or computer',
    addDeviceA: 'On a device you\'re already using, open **Settings** and choose **Use it on another device**. On the new one, choose **I have a code from my other device** and type the 6 numbers.',
    someoneElseQ: 'It says I\'m someone else',
    someoneElseA: 'Someone else\'s link was opened on this device. Open your own link and choose to switch. Nothing is lost: everyone\'s lists are kept safely and come back.',
    canTheySeeQ: 'Can the person see what I\'m getting them?',
    canTheySeeA: 'No. Your own list never shows who\'s getting what, and secret ideas for you are hidden from you.',
    passwordQ: 'Is there a password?',
    passwordA: 'No. Your personal link is your way in. Keep it to yourself, and don\'t forward the invite.',
  },

  /** The organizer's People screen. */
  people: {
    sub: 'You\'re an organizer',
    title: 'People',
    you: 'You · organizer',
    organizerSuffix: ' · organizer',
    joined: 'Joined',
    joinedOn: 'Joined on {n} devices',
    /** Where they're set up, so you can see who might need a hand: "Joined: phone app, computer browser". */
    joinedWhere: 'Joined: {where}',
    phoneApp: 'phone app',
    phoneBrowser: 'phone browser',
    computerApp: 'computer app',
    computerButton: 'computer with the wish list extension',
    computerBrowser: 'computer browser',
    invited: 'Invited {when}, not opened yet',
    today: 'today',
    yesterday: 'yesterday',
    daysAgo: '{n} days ago',
    notInvited: 'Not invited yet',
    keptBy: 'Managed by {names}',
    nobodyYet: 'nobody yet',
    youLower: 'you',
    someoneLower: 'someone',
    editLabel: 'Edit {name}',
    invite: 'Invite',
    resend: 'Resend',
    /** On someone who's already set up somewhere (yours too): set up another phone, tablet or computer. */
    addDevice: 'Add a device',
    addSomeone: 'Add someone',
    newGroup: 'Start another group',
    printBackup: 'Print family backup',
  },

  invite: {
    heading: 'Invite {name}',
    /** The same sheet for someone who's already joined, opened from Add a device. */
    headingDevice: 'A new device for {name}',
    /** Above the message, every time. */
    hint: 'Change the message if you like.',
    messageLabel: 'Invite message',
    send: 'Send invite',
    /** Under Send invite, on phones (it opens the Share menu). */
    sendHint: 'Pick Messages, WhatsApp, email or any app you use',
    /** On computers without a Share menu. */
    email: 'Email it',
    copy: 'Copy',
    inPerson: 'In person',
    /** Under the invite buttons: for someone who lost their link and is showing a number. */
    byNumber: 'They lost their link',
    numberTitle: 'Type the number on {name}’s screen',
    numberHint: 'On their phone or computer, they open the app and choose **I lost my link**. It shows 6 numbers.',
    numberLabel: 'Their number',
    numberSend: 'Sign them in',
    numberSent: '{name}’s device is signing in now. It takes a few seconds.',
    numberFailed: 'Couldn’t send it. Are you online?',
    qrLabel: 'QR code for {name}\'s link',
    qrTitle: 'Point {name}\'s phone camera at this',
    qrHint: 'Then tap the link that pops up, and help with the install steps.',
    /** When this device doesn't have their words yet. */
    noWords: 'Their words aren\'t in your family backup on this device yet. If another organizer added them, wait a moment for it to sync.',
    subject: 'Your spot on our family wish list',
    /** The message itself: {intro} is one of the two below. */
    message: 'Hi {name}! {intro}\n\nHere\'s your link. Open it on the phone or tablet you use most:\n{link}\n\n1. Open the link\n2. It shows you how to keep it on your Home Screen (takes a minute)\n3. Add a few things you\'d like\n\nHelp with pictures: {help}\n\nKeep this message: it\'s how you get back in on a new phone. Please don\'t forward it. The link is just for you.\n\n{from}',
    introNew: 'I\'ve set up a wish list for the family, for Christmas and birthdays. You can see what everyone would like, quietly say "I\'ll get this", and keep your own list.',
    /** For someone already using it, added to another group. */
    introAdded: 'You\'ve been added to {group} on our family wish list.',
  },

  personSheets: {
    birthday: 'Birthday (optional)',
    month: 'Month',
    day: 'Day',
    monthLabel: 'Birthday month',
    dayLabel: 'Birthday day',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    addTitle: 'Add someone',
    theirName: 'Their name',
    wontUse: 'They won\'t use the app',
    wontUseHint: 'A young child, say. You manage their list, and can give them their own link later.',
    groups: 'Groups',
    addName: 'Add {name}',
    addThem: 'Add them',
    nameLabel: 'Name',
    helpersLabel: 'Who helps manage {name}\'s list',
    helpersHint: 'They can add to it and change it, and they see who\'s getting what on it.',
    doesntUse: 'Doesn\'t use the app',
    coOrganizer: 'Co-organizer',
    coOrganizerHint: 'Can add people and send invites, and holds the family backup.',
    newGroupTitle: 'Start another group',
    newGroupHint: 'Each group sees its own people\'s lists. You can add new people to it afterwards.',
    groupName: 'Group name',
    whosIn: 'Who\'s in it',
    startIt: 'Start it',
  },

  settings: {
    title: 'Settings',
    /** Top of Settings: your own photo and birthday. */
    aboutYou: 'About you',
    largerText: 'Larger text',
    /** Heading over this device's setup row and the other-device button. */
    devices: 'Your devices',
    thisPhone: 'This phone or tablet',
    thisComputer: 'This computer',
    /** Right side of that row. */
    setUp: 'Set up',
    notSetUp: 'Set it up',
    anotherDevice: 'Use it on another device',
    /** The other-device sheet: a QR code of the person's link first, then a code for computers, then the link. */
    qrLabel: 'QR code for your link',
    qrTitle: 'Point the other phone\'s camera at this',
    qrHint: 'Then tap the link that pops up. It opens signed in as you, and shows how to set it up there.',
    orCode: 'Or type a code',
    anotherIntro: 'Handy on a computer: open the wish list site there and choose **I have a code from my other device**. Then type:',
    offline: 'Couldn\'t reach the internet. Try again when you\'re online.',
    codeLabel: 'Pairing code',
    codeHint: 'It works for 10 minutes.',
    newCode: 'Get a new code',
    orLink: 'Or send yourself your link',
    orLinkText: 'Open it on the other device and you\'re in.',
    copyLink: 'Copy my link',
    linkCopied: 'Your link is copied',
    shopsFaster: 'More ways to add from shops',
    helpSetup: 'Help and questions',
  },

  backup: {
    title: 'Family backup',
    note: 'Keep it somewhere safe. Anyone holding it can open everyone\'s lists.',
    print: 'Print',
    notSynced: 'The backup hasn\'t synced to this device yet.',
    groupWords: 'Group words: **{words}** · organizer: **{organizer}**',
    qrLabel: 'QR code for {name}',
    noWords: 'Words not in the backup',
  },

  /** Only when something's wrong: silent otherwise. */
  sync: {
    offlineWaiting: 'No connection. Your changes are saved here and will go out when you’re back online.',
    offline: 'No connection. You’re seeing what was here last time.',
    stuck: 'Your latest changes are saved here, but haven’t reached the family yet. They’ll keep trying.',
  },

  /** On a list you can edit, while any names are very long. */
  shorten: {
    notice: { one: 'One name is very long, the way shops write them.', many: '{n} names are very long, the way shops write them.' } as Plural,
    button: 'Shorten',
    done: { one: 'Shortened 1 name', many: 'Shortened {n} names' } as Plural,
  },

  /** A link for a different person was opened on this device. */
  someoneElse: {
    title: 'This link is for someone else',
    text: 'This device is set up for {name}. Switch it to the person in the link? Nothing is lost: everyone\'s lists stay safe.',
    switch: 'Switch',
    stay: 'Stay as {name}',
    someone: 'someone',
    iAm: 'I am',
  },

  /** Full-screen waits. */
  working: {
    gettingReady: 'Getting things ready…',
    switching: 'Switching…',
    settingUp: 'Setting up your family…',
  },

  /** Short messages at the bottom (or top) of the screen. Most have Undo. */
  toasts: {
    /** After a photo change in Settings, with Undo. */
    photoSaved: 'Photo saved',
    photoRemoved: 'Photo removed',
    /** After picking both month and day in Settings (or clearing both), with Undo. */
    birthdaySaved: 'Birthday saved',
    joinedGroup: 'You\'ve joined another group',
    badLink: 'That link didn’t work. Ask for a new one.',
    saved: 'Saved',
    ideaAdded: 'Secret idea added for {name}',
    addedTo: 'Added to {name}\'s list',
    addedMine: 'Added to your list',
    removed: 'Removed',
    movedToReceived: 'Moved to Received',
    claimed: 'You\'re getting the {title}',
    markedBought: 'Marked as yours',
    released: 'Back on the list for others',
    givenReveal: '{name} will see it under Received, from you',
    imported: { one: 'Imported 1 thing', many: 'Imported {n} things' } as Plural,
    inviteCopied: 'Invite copied. Paste it anywhere',
    canScan: '{name} can scan it now',
    inviteSent: 'Invite for {name} is on its way',
    managedAdded: '{name} added. You manage their list.',
    groupStarted: '{name} started. Invite people from the list.',
    newVersion: 'New version ready',
    update: 'Update',
  },
};
