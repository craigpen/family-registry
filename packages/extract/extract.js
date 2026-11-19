/*
 * extract.js: reads a product page into { title, images, price, currency, site, url }.
 *
 * ONE FILE, THREE HOSTS (PLAN.md "Link previews, with no server"): the browser extension,
 * the Android share helper (in a WebView, over fetched HTML) and the iOS Shortcut ("Run
 * JavaScript on Web Page") all run this exact file. Keep it plain ES2019 with no imports.
 *
 * Order of trust: JSON-LD Product, then Open Graph / Twitter tags, then microdata and a few
 * well-known shops' markup, then <title>. The person picks the photo from `images`.
 *
 * Also: readAmazonList(document) for importing an Amazon list (PLAN.md "Importing an Amazon list").
 */
(function (root) {
  'use strict';

  var MAX_IMAGES = 6;

  function text(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function attr(doc, sel, name) { var el = doc.querySelector(sel); return el ? (el.getAttribute(name || 'content') || '').trim() : ''; }
  function abs(url, base) { if (!url) return ''; try { return new URL(url, base).href; } catch (e) { return ''; } }
  function arr(x) { return x == null ? [] : Array.isArray(x) ? x : [x]; }

  /** All JSON-LD objects on the page, with @graph flattened. */
  function jsonLd(doc) {
    var out = [];
    var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      var data;
      try { data = JSON.parse(scripts[i].textContent || ''); } catch (e) { continue; }
      var queue = arr(data);
      while (queue.length) {
        var node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        out.push(node);
        if (node['@graph']) queue = queue.concat(arr(node['@graph']));
      }
    }
    return out;
  }

  function isType(node, type) {
    return arr(node['@type']).some(function (t) { return String(t).toLowerCase() === type; });
  }

  function imageUrls(x) {
    return arr(x).map(function (i) { return typeof i === 'string' ? i : i && (i.url || i.contentUrl) || ''; }).filter(Boolean);
  }

  function priceOf(offers) {
    var list = arr(offers);
    for (var i = 0; i < list.length; i++) {
      var o = list[i] || {};
      var p = o.price != null ? o.price : o.lowPrice != null ? o.lowPrice : o.priceSpecification && o.priceSpecification.price;
      if (p != null && p !== '') return { price: String(p), currency: o.priceCurrency || (o.priceSpecification && o.priceSpecification.priceCurrency) || '' };
      if (o.offers) { var inner = priceOf(o.offers); if (inner.price) return inner; }
    }
    return { price: '', currency: '' };
  }

  var SYMBOLS = { USD: '$', CAD: '$', AUD: '$', NZD: '$', GBP: '£', EUR: '€', JPY: '¥', INR: '₹' };

  /** "39.95" + "USD" -> "$39.95"; prices already with a symbol pass through. */
  function formatPrice(price, currency) {
    if (!price) return '';
    var p = String(price).trim();
    if (/[^\d.,\s]/.test(p)) return p;
    var n = Number(p.replace(/,/g, ''));
    if (!isFinite(n)) return p;
    var shown = n % 1 === 0 ? String(n) : n.toFixed(2);
    var sym = SYMBOLS[(currency || '').toUpperCase()];
    return sym ? sym + shown : currency ? shown + ' ' + currency : shown;
  }

  function siteName(doc, url) {
    var og = attr(doc, 'meta[property="og:site_name"]');
    if (og) return og;
    try {
      var host = new URL(url).hostname.replace(/^(www|m|smile)\./, '');
      var parts = host.split('.');
      var base = parts.length >= 3 && /^(co|com|org|net)$/.test(parts[parts.length - 2]) ? parts[parts.length - 3] : parts[parts.length - 2] || host;
      return base.charAt(0).toUpperCase() + base.slice(1);
    } catch (e) { return ''; }
  }

  /** Amazon's own markup, for when its structured data is missing (it often is). */
  function amazon(doc) {
    var title = text(doc.querySelector('#productTitle'));
    var images = [];
    var main = doc.querySelector('#landingImage, #imgBlkFront, #main-image');
    if (main) {
      var dyn = main.getAttribute('data-a-dynamic-image');
      if (dyn) { try { images = Object.keys(JSON.parse(dyn)); } catch (e) { /* ignore */ } }
      var hi = main.getAttribute('data-old-hires');
      if (hi) images.unshift(hi);
      if (!images.length && main.getAttribute('src')) images.push(main.getAttribute('src'));
    }
    // Only a real product page (with #productTitle) has a price that belongs to one product:
    // carts and lists are full of other .a-price figures (totals, monthly payments, adverts).
    var price = title ? text(doc.querySelector('#corePrice_feature_div .a-offscreen, #corePriceDisplay_desktop_feature_div .a-offscreen, #apex_desktop .a-price .a-offscreen, #priceblock_ourprice')) : '';
    return { title: title, images: images, price: price };
  }

  /**
   * Reads a product page. `doc` is a Document (live page, or one from DOMParser);
   * `url` is the page's address (for relative links and the shop name).
   */
  function extract(doc, url) {
    url = url || (doc.location && doc.location.href) || '';
    var product = null;
    var nodes = jsonLd(doc);
    for (var i = 0; i < nodes.length; i++) {
      if (isType(nodes[i], 'product')) { product = nodes[i]; break; }
      if (isType(nodes[i], 'productgroup')) product = product || nodes[i];
    }

    var title = '', images = [], price = '', currency = '';
    if (product) {
      title = String(product.name || '').trim();
      images = imageUrls(product.image);
      var pr = priceOf(product.offers || (product.hasVariant && arr(product.hasVariant)[0] && arr(product.hasVariant)[0].offers));
      price = pr.price; currency = pr.currency;
    }
    var host = '';
    try { host = new URL(url).hostname; } catch (e) { /* ignore */ }
    var a = { title: '' };
    if (/(^|\.)amazon\./.test(host) || /(^|\.)amzn\./.test(host)) {
      a = amazon(doc);
      title = title || a.title;
      images = images.concat(a.images);
      if (!price && a.price) price = a.price;
    }
    title = title || attr(doc, 'meta[property="og:title"]') || attr(doc, 'meta[name="twitter:title"]') || text(doc.querySelector('[itemprop="name"]'));
    images = images.concat(
      attr(doc, 'meta[property="og:image:secure_url"]'), attr(doc, 'meta[property="og:image"]'),
      attr(doc, 'meta[name="twitter:image"]'), attr(doc, 'meta[name="twitter:image:src"]'),
      attr(doc, '[itemprop="image"]', 'content') || attr(doc, 'img[itemprop="image"]', 'src'),
      attr(doc, 'link[rel="image_src"]', 'href'),
    );
    if (!price) {
      price = attr(doc, 'meta[property="product:price:amount"]') || attr(doc, 'meta[property="og:price:amount"]') || attr(doc, '[itemprop="price"]', 'content') || text(doc.querySelector('[itemprop="price"]'));
      currency = currency || attr(doc, 'meta[property="product:price:currency"]') || attr(doc, 'meta[property="og:price:currency"]') || attr(doc, '[itemprop="priceCurrency"]', 'content');
    }
    // Is this one product? Structured product data, a product og:type, a product price tag,
    // a microdata Product, or Amazon's product title. Carts, lists and home pages say none of these.
    var isProduct = !!product || !!a.title || /product/i.test(attr(doc, 'meta[property="og:type"]')) ||
      !!attr(doc, 'meta[property="product:price:amount"]') || !!doc.querySelector('[itemtype*="schema.org/Product"]');
    if (!title) title = text(doc.querySelector('title')).replace(/\s*[|–—:-]\s*[^|–—:-]+$/, '');

    var seen = {};
    images = images.map(function (s) { return abs(s, url); })
      .filter(function (s) { return /^https:\/\//.test(s) && !seen[s] && (seen[s] = true); })
      .slice(0, MAX_IMAGES);

    return {
      url: url,
      title: title.replace(/^Amazon\.[a-z.]+\s*:\s*/i, '').slice(0, 200),
      images: images,
      price: formatPrice(price, currency),
      currency: currency || '',
      site: siteName(doc, url),
      product: isProduct,
    };
  }

  /**
   * Reads an Amazon list page ("wishlist"). Returns the list's name and its items as far as
   * they've loaded; the extension scrolls first so the whole list is on the page.
   */
  function readAmazonList(doc, url) {
    url = url || (doc.location && doc.location.href) || '';
    var name = text(doc.querySelector('#profile-list-name, #wl-list-title, .wl-list-title, h1')) || 'Amazon list';
    var rows = doc.querySelectorAll('li[data-itemid], li.g-item-sortable');
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var li = rows[i];
      var id = li.getAttribute('data-itemid') || '';
      var link = li.querySelector('a[id^="itemName_"], h2 a, h3 a');
      var title = link ? (link.getAttribute('title') || text(link)) : '';
      if (!title) continue;
      var href = link ? abs(link.getAttribute('href') || '', url) : '';
      var params = li.getAttribute('data-reposition-action-params') || '';
      var asin = (params.match(/ASIN:([A-Z0-9]{10})/) || href.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || '';
      var img = li.querySelector('img');
      var price = li.getAttribute('data-price');
      var priceText = price && price !== '-Infinity' && Number(price) > 0 ? price : text(li.querySelector('.a-price .a-offscreen'));
      var priority = text(li.querySelector('[id^="itemPriorityLabel_"], [id^="itemPriority_"]')).toLowerCase();
      var comment = text(li.querySelector('[id^="itemComment_"]'));
      var wanted = Number(text(li.querySelector('[id^="itemRequested_"]'))) || 1;
      items.push({
        id: id, asin: asin, title: title.slice(0, 200),
        url: asin ? 'https://' + (url ? new URL(url).hostname : 'www.amazon.com') + '/dp/' + asin : href,
        image: img ? abs(img.getAttribute('src') || '', url) : '',
        price: /^\d/.test(priceText || '') ? formatPrice(priceText, 'USD') : priceText || '',
        highest: priority === 'highest' || priority === 'high',
        notes: [comment, wanted > 1 ? 'Would like ' + wanted : ''].filter(Boolean).join(' · '),
      });
    }
    var done = !!doc.querySelector('#endOfListMarker, #no-items-section-anywhere');
    return { name: name, url: url, items: items, complete: done };
  }

  var api = { extract: extract, readAmazonList: readAmazonList, formatPrice: formatPrice, version: 1 };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FamilyRegistryExtract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
