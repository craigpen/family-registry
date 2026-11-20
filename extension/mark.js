// Runs on the wish list site's own pages only: tells the site the gift button is installed,
// so its setup step can show a green check. Nothing is read from the page.
document.documentElement.dataset.wishButton = chrome.runtime.getManifest().version;
