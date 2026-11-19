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
    haveWords: 'I have my words',
    newFamily: 'Start a new family',
    codeTitle: 'Type the code',
    codeText: 'On your other device, open **Settings** and choose **Add a device**. Type the 6 numbers it shows.',
    /** On an iPhone's Home Screen app, which can't see Safari's sign-in. */
    codeTitleIos: 'One last step',
    codeTextIos: 'Go back to **Safari**. Your code is waiting on the page. Type it here.',
    otherWays: 'Other ways in',
    codeLabel: '6-digit code',
    codePlaceholder: '000 000',
    codeWrong: 'That code didn’t work. Codes last 10 minutes: get a new one on your other device and try again.',
    codeOffline: 'Couldn’t check the code. Are you online?',
    checking: 'Checking…',
    wordsTitle: 'Type your words',
    wordsText: 'All {n} of them, in order. Spaces, commas or new lines are all fine.',
    wordsLabel: 'Your words',
    wordsCount: '{n} of {need} words',
    newTitle: 'Start a family',
    newText: 'You\'ll be the organizer: you add others and send them their links.',
    firstName: 'Your first name',
    start: 'Start',
  },

  /** The first open after an invite link. */
  welcome: {
    finding: 'Finding your family…',
    hello: 'Welcome {name}!',
    helloAnon: 'Welcome!',
    inGroup: { one: 'You\'re in **{group}** with 1 other.', many: 'You\'re in **{group}** with {n} others.' } as Plural,
    pitch: 'See what everyone\'s wishing for, quietly pick something to get, and keep your own list.',
    firstName: 'Your first name',
    chooseDesktop: 'Choose how to use it here',
    putOnPhone: 'Put it on my phone',
    justBrowser: 'Just use it in the browser',
    notNow: 'Not now, just look around',
    desktopTitle: 'How would you like to use it?',
    phoneTitle: 'Put it on your phone',
    showingFor: 'Showing steps for {device}. Not right?',
    forIos: 'iPhone and iPad',
    forAndroid: 'Android',
    forDesktop: 'a computer',
    /** iPhone install steps, under the steps. */
    iosHome: 'Then open it from your **Home Screen**, not from here. That\'s where it lives now.',
    iosCode: 'If it asks for a code, it\'s **{code}**.',
    iDidIt: 'I\'ve done it',
    skip: 'Skip for now',
    allSet: 'You\'re all set!',
    allSetName: 'You\'re all set, {name}!',
    doneHomeScreen: 'It lives on your Home Screen now. Look for the red gift icon. You\'re signed in, so there\'s nothing to remember.',
    doneWindow: 'It\'s in your Start menu or Dock now. You\'re signed in, so there\'s nothing to remember.',
    doneBrowser: 'Bookmark this page so it\'s easy to come back to. You\'re signed in, so there\'s nothing to remember.',
    addFirst: 'Add your first wish',
    seeFamily: 'See the family',
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
    androidTap: 'Tap **Install** below',
    androidAgain: 'Tap **Install** again in the box that pops up',
    deskInstall: 'Click **Install** below, or the install icon in the address bar',
    install: 'Install',
    /** When the browser offers no install prompt. */
    noButtonAndroid: 'No Install button? Open the browser\'s menu (the three dots) and choose **Install app** or **Add to Home screen**.',
    noButtonDesktop: 'No Install button? This browser can\'t install apps (Firefox and Safari on a computer can\'t). Bookmark this page instead, or open it in Chrome or Edge.',
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
    intro: 'Use it whichever way suits you, any or all. It\'s the same wish list each way.',
    recommended: 'Recommended',
    buttonTitle: 'As a button in your browser',
    buttonText: 'On any shop\'s page, click the gift in the toolbar: the name, photo, price, size and color fill themselves in, and it\'s added right there. Choose who it\'s for: you, a child whose list you manage, or a secret idea for someone. The button also opens your whole wish list in the browser\'s side panel, next to whatever you\'re looking at, and imports Amazon lists.',
    download: '[Download the gift button](zip) and unzip it.',
    openExtensions: 'Open **{page}** and switch on **Developer mode**.',
    loadUnpacked: 'Click **Load unpacked** and choose the unzipped folder. Then pin the gift to the toolbar.',
    /** In browsers other than Chrome and Edge. */
    noButton: 'The gift button works in **Chrome** and **Edge** for now. In this browser, use the wish list in a tab, and **Paste a link** to add things.',
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
    title: 'Getting set up',
    firstDesktop: 'First, open the personal link you were sent. Then, on a computer:',
    firstPhone: 'First, open the personal link you were sent. Then put the app on your phone:',
    helpersTitle: 'Adding from shops, faster',
    helpersText: 'Optional. Each one reads a shop\'s page so the name, photo and price fill themselves in.',
    androidTitle: 'The Android helper',
    androidText: 'Adds **Add to wish list** to the Share menu in shop apps and Chrome.',
    androidStep1: 'On the phone, tap [Download the helper](apk).',
    androidStep2: 'Open the downloaded file. Android asks to allow installing from this source: allow it, then tap **Install**.',
    androidStep3: 'In a shop, tap **Share** and choose **Add to wish list**.',
    iosTitle: 'The Shortcut',
    iosText: 'Adds **Add to wish list** to Safari\'s Share menu. Ask whoever set up the family for the Shortcut link, tap it on your iPhone or iPad, then tap **Add Shortcut**.',
    iosOtherApps: 'In another app, use its Share → **Copy link**, then **Paste a link** in the wish list.',
    newPhoneQ: 'I got a new phone',
    newPhoneA: 'Open your invite message on the new phone and tap the link again. Can\'t find it? Ask whoever set up the family to send it again; they keep a copy for everyone.',
    addDeviceQ: 'Adding a tablet or computer',
    addDeviceA: 'On a device you\'re already using, open **Settings** and choose **Add a device**. On the new one, choose **I have a code from my other device** and type the 6 numbers.',
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
    addSomeone: 'Add someone',
    newGroup: 'Start another group',
    printBackup: 'Print family backup',
  },

  invite: {
    heading: 'Invite {name}',
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
    largerText: 'Larger text',
    otherDevice: 'On another phone, tablet or computer',
    /** Always, under that heading. */
    otherDeviceNote: 'To use it on another phone or computer, choose Add a device.',
    addDevice: 'Add a device',
    offline: 'Couldn\'t reach the internet. Try again when you\'re online.',
    codeLabel: 'Pairing code',
    codeHint: 'On the other device, choose **I have a code from my other device** and type this. It works for 10 minutes.',
    copyLink: 'Copy my link',
    linkCopied: 'Your link is copied',
    showWords: 'Show my words',
    hideWords: 'Hide my words',
    wordsLabel: 'Your words',
    shopsFaster: 'Add from shops faster',
    helpSetup: 'Help with setting up',
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
