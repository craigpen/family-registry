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

  var SEPARATORS = [' | ', ' – ', ' — ', ' - ', ', ', ': ', '; ', ' > ', ' » ', ' • ', ' · ', ' (', ' [', ' with '];
  var DANGLING = /\s+(for|with|and|or|the|of|in|to|a|an|by|&)$/i;

  /**
   * A reasonable name from a shop's long product title: the part before the first natural break
   * (" | ", a spaced dash, a comma, a colon or semicolon, ">", a bullet, an opening bracket, " with "), as long as that part
   * still reads like a name (two words or more). Titles that are short already are left alone.
   * The same rule lives in packages/core/src/guess.ts; test/short-titles.json keeps them in step.
   */
  function shortTitle(title, max) {
    max = max || 80;
    var t = String(title || '').replace(/\s+/g, ' ').trim();
    // A breadcrumb trail ("Home > Kitchen > Skillet") ends with the product: start from there.
    var crumbs = t.split(/ [>»] /);
    if (crumbs.length > 1 && crumbs[crumbs.length - 1].split(' ').length >= 2) t = crumbs[crumbs.length - 1];
    if (t.length <= 40) return t;
    var cuts = [];
    SEPARATORS.forEach(function (sep) {
      var from = 0, i;
      while ((i = t.indexOf(sep, from)) > 0) { cuts.push(i); from = i + 1; }
    });
    cuts.sort(function (a, b) { return a - b; });
    for (var k = 0; k < cuts.length; k++) {
      var head = t.slice(0, cuts[k]).replace(/[\s,;:|–—-]+$/, '');
      if (head.split(' ').length >= 2 && head.length >= 6) {
        if (head.length <= max) return head;
        break;
      }
    }
    if (t.length <= max) return t;
    // No good break: cut at a word before the limit, without a dangling "for" or "with".
    var cut = t.slice(0, max + 1);
    cut = cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:|–—(-]+$/, '');
    while (DANGLING.test(cut)) cut = cut.replace(DANGLING, '');
    return cut;
  }

  /** Amazon's own markup, for when its structured data is missing (it often is). */
  function amazon(doc, url) {
    // Computers get #productTitle; phones get #title. #title is only trusted on a product
    // address (/dp/ or /gp/product/), so carts and lists still count as "not a product".
    var onProductUrl = /\/(dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}/.test(url || '');
    var title = text(doc.querySelector('#productTitle')) || (onProductUrl ? text(doc.querySelector('#title, #title_feature_div h1')) : '');
    var images = [];
    // After a color is picked, Amazon swaps in a new main photo with a blank id: it's then the
    // selected item in #main-image-container.
    var main = doc.querySelector('#landingImage, #imgBlkFront, #main-image') ||
      doc.querySelector('#main-image-container li.image.selected .imgTagWrapper img') ||
      doc.querySelector('#main-image-container li.image .imgTagWrapper img');
    if (main) {
      var dyn = main.getAttribute('data-a-dynamic-image');
      if (dyn) { try { images = Object.keys(JSON.parse(dyn)); } catch (e) { /* ignore */ } }
      var hi = main.getAttribute('data-old-hires');
      if (hi) images.unshift(hi);
      if (!images.length && main.getAttribute('src')) images.push(main.getAttribute('src'));
    }
    // Only a real product page (with #productTitle) has a price that belongs to one product:
    // carts and lists are full of other .a-price figures (totals, monthly payments, ads).
    return { title: title, images: images, price: title ? amazonPrice(doc) : '', options: title ? amazonOptions(doc) : [] };
  }

  var AMAZON_PRICE_AREAS = ['#corePriceDisplay_desktop_feature_div', '#corePrice_desktop', '#corePrice_feature_div', '#apex_desktop', '#apex_offerDisplay_desktop',
    '#corePriceDisplay_mobile_feature_div', '#corePrice_mobile_feature_div', '#apex_mobile_feature_div', '#apex_mobile', '#buybox'];

  /** Amazon shows the price several ways, and some pages leave the usual hidden text empty. */
  function amazonPrice(doc) {
    var looksLikePrice = function (s) { return /\d/.test(s || '') ? s : ''; };
    for (var i = 0; i < AMAZON_PRICE_AREAS.length; i++) {
      var area = doc.querySelector(AMAZON_PRICE_AREAS[i]);
      if (!area) continue;
      // The main price, not a struck-out list price (.a-text-price) or a per-unit price.
      var prices = area.querySelectorAll('.a-price:not(.a-text-price)');
      for (var j = 0; j < prices.length; j++) {
        var p = prices[j];
        if (p.closest('.pricePerUnit, [data-a-strike="true"], .basisPrice')) continue;
        var off = looksLikePrice(text(p.querySelector('.a-offscreen')));
        if (off) return off;
        var whole = text(p.querySelector('.a-price-whole')).replace(/[.,]$/, '');
        if (/\d/.test(whole)) {
          var frac = text(p.querySelector('.a-price-fraction'));
          return text(p.querySelector('.a-price-symbol')) + whole + (frac ? '.' + frac : '');
        }
      }
    }
    var old = looksLikePrice(text(doc.querySelector('#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice, #price_inside_buybox, #newBuyBoxPrice, #kindle-price')));
    if (old) return old;
    var hidden = doc.querySelector('#twister-plus-price-data-price, #attach-base-product-price');
    return hidden && /\d/.test(hidden.getAttribute('value') || '') ? formatPrice(hidden.getAttribute('value'), attr(doc, '#attach-currency-of-preference', 'value') || 'USD') : '';
  }

  var LABELS = { color_name: 'Color', size_name: 'Size', style_name: 'Style', pattern_name: 'Pattern', configuration_name: 'Configuration', material_type: 'Material', flavor_name: 'Flavor', item_package_quantity: 'Pack' };
  var label = function (key) { return LABELS[key] || key.replace(/_name$/, '').replace(/_/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); }); };

  /** The size, color and so on chosen on an Amazon product page. */
  function amazonOptions(doc) {
    var out = [];
    var seen = {};
    var add = function (name, value) {
      value = (value || '').replace(/\s+/g, ' ').trim();
      if (!value || seen[name] || /^select|^choose/i.test(value)) return;
      seen[name] = true;
      out.push({ name: name, value: value.slice(0, 80) });
    };
    // Newer pages: "inline twister" rows.
    var inline = doc.querySelectorAll('[id^="inline-twister-expanded-dimension-text-"]');
    for (var i = 0; i < inline.length; i++) add(label(inline[i].id.replace('inline-twister-expanded-dimension-text-', '')), text(inline[i]));
    // Older pages: #variation_color_name .selection, and dropdowns for sizes.
    var rows = doc.querySelectorAll('[id^="variation_"]');
    for (var j = 0; j < rows.length; j++) {
      var key = rows[j].id.replace('variation_', '');
      var sel = rows[j].querySelector('.selection') || rows[j].querySelector('.a-dropdown-prompt');
      if (sel) add(label(key), text(sel));
    }
    return out;
  }

  var OPTION_NAMES = /\b(size|colou?r|style|width|length|fit|material|flavou?r|scent|pattern|finish|capacity|storage|edition)\b/i;

  /** Chosen options on other shops: dropdowns and selected buttons named size, color and so on. */
  function pageOptions(doc) {
    var out = [];
    var seen = {};
    var nameOf = function (el) {
      var raw;
      if (el.type === 'radio') {
        // A choice button's own label is the value ("Forest green"); its group says what it is.
        var fs = el.closest('fieldset');
        var legend = fs && fs.querySelector('legend');
        raw = (legend && text(legend)) || el.getAttribute('name') || el.getAttribute('data-option-name') || '';
      } else {
        var lbl = el.id ? doc.querySelector('label[for="' + el.id.replace(/"/g, '') + '"]') : null;
        raw = (lbl && text(lbl)) || el.getAttribute('aria-label') || el.getAttribute('name') || el.getAttribute('data-option-name') || '';
      }
      var m = raw.match(OPTION_NAMES);
      return m ? m[1].replace(/colour/i, 'Color').replace(/flavour/i, 'Flavor').replace(/^\w/, function (c) { return c.toUpperCase(); }) : '';
    };
    var add = function (name, value) {
      value = (value || '').replace(/\s+/g, ' ').trim();
      if (!name || !value || seen[name] || /^(select|choose|pick)\b/i.test(value) || value.length > 60) return;
      seen[name] = true;
      out.push({ name: name, value: value });
    };
    var selects = doc.querySelectorAll('select');
    for (var i = 0; i < selects.length; i++) {
      var s = selects[i];
      var opt = s.options && s.options[s.selectedIndex];
      if (opt && opt.value) add(nameOf(s), text(opt));
    }
    var radios = doc.querySelectorAll('input[type="radio"]:checked');
    for (var j = 0; j < radios.length; j++) {
      var r = radios[j];
      var l = r.id ? doc.querySelector('label[for="' + r.id.replace(/"/g, '') + '"]') : r.closest('label');
      add(nameOf(r), (l && text(l)) || r.getAttribute('value'));
    }
    return out.slice(0, 4);
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

    var title = '', images = [], price = '', currency = '', options = [];
    if (product) {
      if (typeof product.color === 'string') options.push({ name: 'Color', value: product.color });
      if (typeof product.size === 'string') options.push({ name: 'Size', value: product.size });
      title = String(product.name || '').trim();
      images = imageUrls(product.image);
      var pr = priceOf(product.offers || (product.hasVariant && arr(product.hasVariant)[0] && arr(product.hasVariant)[0].offers));
      price = pr.price; currency = pr.currency;
    }
    var host = '';
    try { host = new URL(url).hostname; } catch (e) { /* ignore */ }
    var a = { title: '', options: [] };
    if (/(^|\.)amazon\./.test(host) || /(^|\.)amzn\./.test(host)) {
      a = amazon(doc, url);
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
    // What's chosen on the page wins over what the product data says by default.
    var chosen = a.options.length ? a.options : pageOptions(doc);
    options = chosen.concat(options.filter(function (o) { return !chosen.some(function (c) { return c.name === o.name; }); }));
    if (!title) title = text(doc.querySelector('title')).replace(/\s*[|–—:-]\s*[^|–—:-]+$/, '');

    var seen = {};
    images = images.map(function (s) { return abs(s, url); })
      .filter(function (s) { return /^https:\/\//.test(s) && !seen[s] && (seen[s] = true); })
      .slice(0, MAX_IMAGES);

    return {
      url: url,
      title: shortTitle(title.replace(/^Amazon\.[a-z.]+\s*:\s*/i, '')),
      /** The shop's whole title, before shortening. */
      fullTitle: title.replace(/^Amazon\.[a-z.]+\s*:\s*/i, '').slice(0, 300),
      images: images,
      price: formatPrice(price, currency),
      currency: currency || '',
      site: siteName(doc, url),
      product: isProduct,
      options: options,
      /** Ready for the Notes field: "Size: L · Color: Navy". */
      notes: options.map(function (o) { return o.name + ': ' + o.value; }).join(' · '),
    };
  }

  /**
   * The list's own name. Tried in order of how reliable each place is, never "the first heading on
   * the page" (that once picked up "Chat history" from Amazon's assistant panel).
   */
  function amazonListName(doc) {
    var places = [
      '#profile-list-name', '#wl-list-title', '.wl-list-title', '[id^="list-name"]',
      // On "Your Lists", the list being shown is highlighted in the sidebar.
      '.wl-list.selected [id^="wl-list-entry-title-"]', '[aria-current="page"] [id^="wl-list-entry-title-"]',
    ];
    for (var i = 0; i < places.length; i++) {
      var t = text(doc.querySelector(places[i]));
      if (t) return t;
    }
    // "Amazon.com: Lily's birthday" -> "Lily's birthday" (unless it's just "Amazon.com").
    var title = text(doc.querySelector('title')).replace(/^Amazon(\.[a-z.]+)?\s*:?\s*/i, '').trim();
    return /^(wish ?list|your lists?|lists?|shopping list)?$/i.test(title) ? '' : title;
  }

  /**
   * Reads an Amazon list page ("wishlist"). Returns the list's name and its items as far as
   * they've loaded; the extension scrolls first so the whole list is on the page.
   */
  function readAmazonList(doc, url) {
    url = url || (doc.location && doc.location.href) || '';
    var name = amazonListName(doc) || 'Amazon list';
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
        id: id, asin: asin, title: shortTitle(title), fullTitle: title.slice(0, 300),
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

  var api = { extract: extract, readAmazonList: readAmazonList, formatPrice: formatPrice, shortTitle: shortTitle, version: 1 };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FamilyRegistryExtract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
