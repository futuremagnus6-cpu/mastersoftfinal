const cheerio = require('cheerio');

/**
 * Attempt to extract product data from an HTML page.
 * Returns an array of product objects with standardised fields,
 * or null if no products could be extracted.
 */
function scrapeProductsFromHtml(html, sourceUrl) {
  if (!html || typeof html !== 'string') return null;

  const $ = cheerio.load(html);

  // Strip script/style tags for text-based parsing
  const $clean = cheerio.load(html);
  $clean('script, style, noscript, iframe, svg').remove();

  let products = null;

  // Strategy 1: JSON-LD structured data (most reliable)
  products = extractJsonLd($);
  if (products && products.length > 0) return resolveImageUrls(products, sourceUrl);

  // Strategy 2: HTML tables with obvious product columns (name, price, etc.)
  products = extractFromTables($);
  if (products && products.length > 0) return resolveImageUrls(products, sourceUrl);

  // Strategy 3: Product cards / grid items
  products = extractFromProductCards($);
  if (products && products.length > 0) return resolveImageUrls(products, sourceUrl);

  // Strategy 4: Flat text pattern matching (for simple PHP listing pages)
  // Pass both $clean (for text) and original $ (for image search)
  products = extractFromFlatText($clean, $);
  if (products && products.length > 0) return resolveImageUrls(products, sourceUrl);

  // Strategy 5: Ultra-aggressive scan — find ANY repeated price-like numbers
  // in the page body and pair them with nearby text as product names
  products = extractAnyPriceProducts($clean, $);
  if (products && products.length > 0) return resolveImageUrls(products, sourceUrl);

  return null;
}

/**
 * Resolve relative image URLs to absolute URLs based on the source page URL.
 */
function resolveImageUrls(products, sourceUrl) {
  if (!sourceUrl || !products) return products;
  try {
    // Use the full source URL as the base, so relative paths like ./image.jpg resolve correctly
    return products.map(function(p) {
      if (p.images && p.images.length > 0) {
        p.images = p.images.map(function(img) {
          if (img && img.url && !img.url.startsWith('http://') && !img.url.startsWith('https://') && !img.url.startsWith('data:') && !img.url.startsWith('blob:')) {
            try {
              img.url = new URL(img.url, sourceUrl).href;
            } catch (e) {
              // Keep original if resolution fails
            }
          }
          return img;
        });
      }
      return p;
    });
  } catch (e) {
    return products;
  }
}

/**
 * Extract products from JSON-LD structured data embedded in the page.
 */
function extractJsonLd($) {
  const products = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
          const productList = item['@type'] === 'ItemList'
            ? (item.itemListElement || []).map(function(e) { return e.item || e; })
            : [item];

          for (const p of productList) {
            if (p.name) {
              const offers = p.offers || {};
              const price = parseFloat(offers.price || offers.lowPrice || 0) || 0;

              products.push({
                name: String(p.name).trim(),
                description: String(p.description || '').trim(),
                sku: String(p.sku || '').trim(),
                brand: p.brand ? (typeof p.brand === 'object' ? String(p.brand.name || '') : String(p.brand)) : '',
                pricing: {
                  mrp: price,
                  sellingPrice: price,
                  purchasePrice: 0,
                  gstRate: 18,
                },
                images: p.image ? normalizeImageUrls(Array.isArray(p.image) ? p.image : [p.image]) : [],
                category: String((p.category || '')).trim(),
              });
            }
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON-LD blocks
    }
  });

  return products.length > 0 ? products : null;
}

/**
 * Extract products from HTML tables containing pricing data.
 * Looks for tables with columns like Name/Product, MRP/Price, etc.
 */
function extractFromTables($) {
  const products = [];

  $('table').each(function() {
    const $table = $(this);
    const rows = $table.find('tr');

    if (rows.length < 2) return;

    // Detect column headers
    const headers = [];
    rows.first().find('th, td').each(function() {
      headers.push($(this).text().trim().toLowerCase());
    });

    // Check if headers look like product data
    const hasProductName = headers.some(function(h) { return /product|name|item|title/.test(h); });
    const hasPrice = headers.some(function(h) { return /price|mrp|rate|cost|amount|selling/.test(h); });

    if (!hasProductName && !hasPrice) return;

    // Identify column indices
    const nameIdx = headers.findIndex(function(h) { return /product|name|item|title|desc/.test(h); });
    const mrpIdx = headers.findIndex(function(h) { return /mrp|max.*retail/.test(h); });
    const priceIdx = headers.findIndex(function(h) { return /price|selling|sp|rate/.test(h) && !/purchase/.test(h); });
    const purchaseIdx = headers.findIndex(function(h) { return /purchase|buying|cost|dp|distributor/.test(h); });
    const skuIdx = headers.findIndex(function(h) { return /sku|code|id|barcode/.test(h); });
    const qtyIdx = headers.findIndex(function(h) { return /qty|quantity|stock/.test(h); });
    const categoryIdx = headers.findIndex(function(h) { return /category|type|group/.test(h); });

    // Parse rows
    rows.slice(1).each(function() {
      const cells = $(this).find('td');
      if (cells.length < 2) return;

      const name = nameIdx >= 0 ? $(cells[nameIdx]).text().trim() : '';
      if (!name) return;

      const product = {
        name: name,
        sku: skuIdx >= 0 ? $(cells[skuIdx]).text().trim() : '',
        category: categoryIdx >= 0 ? $(cells[categoryIdx]).text().trim() : '',
        pricing: {
          mrp: mrpIdx >= 0 ? parseFloat($(cells[mrpIdx]).text().replace(/[\u20B9$,\s]/g, '')) || 0 : 0,
          sellingPrice: priceIdx >= 0 ? parseFloat($(cells[priceIdx]).text().replace(/[\u20B9$,\s]/g, '')) || 0 : 0,
          purchasePrice: purchaseIdx >= 0 ? parseFloat($(cells[purchaseIdx]).text().replace(/[\u20B9$,\s]/g, '')) || 0 : 0,
          gstRate: 18,
        },
        inventory: {
          quantity: qtyIdx >= 0 ? parseInt($(cells[qtyIdx]).text().replace(/[^0-9.-]/g, '')) || 0 : 0,
          minStockLevel: 10,
        },
        images: [],
      };

      // Look for images inside cells
      $(cells[nameIdx >= 0 ? nameIdx : 0]).find('img').each(function() {
        var src = $(this).attr('src');
        if (src) product.images.push({ url: src, type: 'link' });
      });

      // If mrp is missing but price is set, use price as mrp
      if (product.pricing.mrp <= 0 && product.pricing.sellingPrice > 0) {
        product.pricing.mrp = product.pricing.sellingPrice;
      }
      // If selling price is missing, use mrp
      if (product.pricing.sellingPrice <= 0 && product.pricing.mrp > 0) {
        product.pricing.sellingPrice = product.pricing.mrp;
      }

      products.push(product);
    });
  });

  return products.length > 0 ? products : null;
}

/**
 * Extract products from common product card/listing patterns.
 * Looks for repeated divs/sections with product names and prices.
 */
function extractFromProductCards($) {
  const products = [];

  // Target common product card selectors specifically
  var selectors = [
    '.product-card', '.product-item', '.product-grid-item',
    '.product', '.prod-item', '.prod-card',
    'li.product', 'li.item',
    '[class*="product-card"]', '[class*="product-item"]',
    '[class*="product-grid"]',
    // More generic patterns
    '[class*="prod-"]', '[class*="Prod-"]',
    '[class*="item-card"]', '[class*="ItemCard"]',
    '[class*="listing-item"]', '[class*="list-item"]',
    '[class*="catalog-item"]', '[class*="catalog-card"]',
    '[class*="shop-item"]',
    // Grid/flex item patterns
    '.col', '.column', '.grid-item', '[class*="grid-item"]',
    '[class*="col-"]',
    // Table-like div listings
    '.row', '[class*="listing"]', '[class*="List"]',
    '.item', '.single-item',
    // Common platform patterns
    '.entry', '.post', '.article',
    '.card', '.tile',
    'li', // any list item as last resort
  ];

  // Also look for repeated sections with price data
  var allCards = $(selectors.join(', '));

  // Cap card count for performance on large pages
  if (allCards.length > 500) {
    allCards = allCards.slice(0, 500);
  }

  // If no product cards found, try finding patterns by repeated price elements
  if (allCards.length < 2) {
    var priceElements = $('[class*="price"], [class*="Price"]');
    if (priceElements.length >= 2) {
      // Try to find parent containers with multiple children that have prices
      var parents = {};
      priceElements.each(function() {
        var $p = $(this).closest('div, li, section').parent();
        if ($p.length) {
          var key = $p.length + '-' + ($p.attr('class') || '') + '-' + ($p[0].tagName || '');
          parents[key] = (parents[key] || 0) + 1;
        }
      });

      // Find the most common parent container
      var bestParent = null;
      var bestCount = 0;
      for (var key in parents) {
        if (parents[key] > bestCount && parents[key] >= 2) {
          bestCount = parents[key];
          bestParent = key;
        }
      }

      // Use that parent's children as product containers
      if (bestParent) {
        var bestParts = bestParent.split('-');
        $('[class*="' + bestParts[0] + '"]').first().parent().children().each(function() {
          var $el = $(this);
          if ($el.find('[class*="price"], [class*="Price"]').length > 0) {
            allCards = allCards.add(this);
          }
        });
      }
    }
  }

  allCards.each(function() {
    var $el = $(this);

    // Skip very large elements (likely page wrappers)
    var elText = $el.text().trim();
    if (elText.length > 3000) return;

    var nameEl = $el.find('.name, .product-name, .title, [class*="name"], [class*="title"], h2, h3, h4, strong').first();
    var priceEl = $el.find('.price, .product-price, .selling-price, .sale-price, [class*="price"], [class*="rate"]').first();
    var mrpEl = $el.find('.mrp, .regular-price, .original-price, [class*="mrp"], [class*="original"]').first();
    var imgEl = $el.find('img').first();
    var descEl = $el.find('.description, .desc, .short-desc, p').first();

    var name = nameEl.length ? nameEl.text().trim() : '';
    // Also try the element's own text for the name if no child name element
    if (!name || name.length < 2) {
      // Try finding name as the first strong/bold text or just the first text node
      var ownStrong = $el.children('strong, b').first();
      if (ownStrong.length) name = ownStrong.text().trim();
    }
    if (!name || name.length > 200 || name.length < 2) return;

    // Try to extract price even without a price element — search the element's text
    var allText = $el.text();
    var priceFromText = 0;
    var priceMatch = allText.match(/[₹\u20B9]\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!priceMatch) priceMatch = allText.match(/Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!priceMatch) priceMatch = allText.match(/INR\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!priceMatch) priceMatch = allText.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!priceMatch) priceMatch = allText.match(/(?:price|sell|rate|₹|rs|mrp)[:\s]*([\d,]+(?:\.\d{1,2})?)/i);
    if (priceMatch) priceFromText = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;

    var priceText = priceEl.length ? priceEl.text().replace(/[₹\u20B9$,\s]/g, '') : '';
    var price = parseFloat(priceText) || priceFromText || 0;

    var mrpText = mrpEl.length ? mrpEl.text().replace(/[\u20B9$,\s]/g, '') : '';
    var mrp = parseFloat(mrpText) || price;

    var images = [];
    if (imgEl.length) {
      var src = imgEl.attr('src');
      if (src && !src.includes('data:') && !src.includes('placeholder')) {
        images.push({ url: src, type: 'link' });
      }
    }

    products.push({
      name: name,
      description: descEl.length ? descEl.text().trim().substring(0, 500) : '',
      pricing: {
        mrp: mrp || price,
        sellingPrice: price || mrp,
        purchasePrice: 0,
        gstRate: 18,
      },
      images: images,
      inventory: { quantity: 0, minStockLevel: 10 },
    });
  });

  return products.length > 0 ? products : null;
}

/**
 * Extract products from flat text content when no structured HTML is found.
 * Handles PHP-style product listing pages where product data appears as
 * text with repeated label-value patterns.
 * @param {object} $clean - cheerio instance with scripts/styles stripped (for text)
 * @param {object} $original - original cheerio instance (for image search)
 */
function extractFromFlatText($clean, $original) {
  var products = [];
  var bodyText = $clean('body').text() || '';

  // Normalize whitespace: replace multiple newlines with single newline
  bodyText = bodyText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n');

  // Strategy A: Look for the MRP/DP/SP pattern (Riyansh-style)
  // Format: ProductName (multiple lines possible)\nMRP\nDP\nSP\nValue1\nValue2\nValue3
  // Key insight: the labels "MRP", "DP", "SP" appear in sequence, then the values follow

  var mrpDpSpRegex = /MRP\s*\n\s*DP\s*\n\s*SP\s*\n\s*([\d,.]+)\s*\n\s*([\d,.]+)\s*\n\s*([\d,.]+)/gi;
  var match;
  var matchPositions = [];

  // Collect all value positions first
  while ((match = mrpDpSpRegex.exec(bodyText)) !== null) {
    matchPositions.push({
      valueStart: match.index,
      valueEnd: match.index + match[0].length,
      mrp: parseFloat(match[1].replace(/,/g, '')) || 0,
      dp: parseFloat(match[2].replace(/,/g, '')) || 0,
      sp: parseFloat(match[3].replace(/,/g, '')) || 0,
    });
  }

  // For each match, extract the product name by looking backwards
  for (var i = 0; i < matchPositions.length; i++) {
    var pos = matchPositions[i];
    var nameStart = 0;
    if (i > 0) {
      nameStart = matchPositions[i - 1].valueEnd;
    }

    var rawName = bodyText.substring(nameStart, pos.valueStart).trim();
    // Remove any standalone labels from the name
    rawName = rawName.replace(/\b(?:MRP|DP|SP|Rs\.?|₹)\b/gi, '').trim();
    // Clean up multiple spaces/newlines
    rawName = rawName.replace(/\s+/g, ' ').trim();

    if (rawName && rawName.length > 1 && rawName.length < 300) {
      // Clean up: strip navigation/header text from the beginning
      // Split on common product section markers and take the last meaningful part
      var cleanedName = rawName;
      var splitMarkers = ['Our Products', 'Products', 'All Products', 'Product List', 'Product Catalog'];
      for (var m = 0; m < splitMarkers.length; m++) {
        var idx = cleanedName.lastIndexOf(splitMarkers[m]);
        if (idx >= 0) {
          cleanedName = cleanedName.substring(idx + splitMarkers[m].length).trim();
          break;
        }
      }
      // Also remove common menu/nav words at the start
      cleanedName = cleanedName.replace(/^(Toggle|Home|About|Shop|Contact|Login|Signup|Cart|[A-Z][a-z]+\s+Menu)\s*/i, '').trim();

      if (!cleanedName) cleanedName = rawName;

      // Check for duplicate names
      var isDuplicate = products.some(function(p) {
        return p.name === cleanedName || p.name.indexOf(cleanedName) >= 0 || cleanedName.indexOf(p.name) >= 0;
      });
      if (!isDuplicate) {
        products.push({
          name: cleanedName,
          sku: '',
          category: 'Uncategorized',
          description: '',
          pricing: {
            mrp: pos.mrp,
            sellingPrice: pos.sp || pos.dp || pos.mrp,
            purchasePrice: pos.dp,
            gstRate: 18,
          },
          inventory: {
            quantity: 0,
            minStockLevel: 10,
          },
          images: [],
        });
      }
    }
  }

  // Add images to Strategy A products if any found
  if (products.length > 0) {
    addImagesFromOriginalHtml(products, $original);
    return products;
  }

  // Strategy B: Generic price-number pattern matching for other formats
  // Look for: ProductName followed by 1-3 numbers on subsequent lines
  var lineBasedRegex = /^([A-Za-z][A-Za-z0-9\s&.\-',/()]{2,100})\s*[\n:]\s*([\d,.]+)\s*[\n]\s*([\d,.]+)\s*(?:[\n]\s*([\d,.]+))?/gm;

  while ((match = lineBasedRegex.exec(bodyText)) !== null) {
    var name = match[1].trim();
    var val1 = parseFloat(match[2].replace(/,/g, '')) || 0;
    var val2 = parseFloat(match[3].replace(/,/g, '')) || 0;
    var val3 = match[4] ? parseFloat(match[4].replace(/,/g, '')) || 0 : 0;

    if (name && name.length > 2 && val1 > 0) {
      // Skip if looks like header/navigation text
      if (/^(home|about|contact|products|welcome|login|signup|search|cart|account|shop|category|price|sort|filter|page)/i.test(name)) continue;

      var isDup = products.some(function(p) { return p.name === name; });
      if (!isDup) {
        products.push({
          name: name,
          sku: '',
          category: 'Uncategorized',
          description: '',
          pricing: {
            mrp: val1,
            sellingPrice: val2 || val1,
            purchasePrice: val3 || 0,
            gstRate: 18,
          },
          inventory: { quantity: 0, minStockLevel: 10 },
          images: [],
        });
      }
    }
  }

  // Add images to Strategy B products if any found
  if (products.length > 0) {
    addImagesFromOriginalHtml(products, $original);
    return products;
  }

  // Strategy C: Inline product patterns like "Name - ₹Price" or "Name Rs. Price"
  // Works on pages where product info is all on one line
  if (products.length === 0) {
    var inlinePatterns = [
      /([A-Z][A-Za-z0-9\s&.\-',/()]{2,80})\s*[-–:](?:\s*₹|\s*Rs\.?\s*|\s*INR\s*|\s*\$\s*)\s*([\d,]+(?:\.\d{1,2})?)/gi,
      /([A-Z][A-Za-z0-9\s&.\-',/()]{2,80})\s+₹\s*([\d,]+(?:\.\d{1,2})?)/gi,
      /([A-Z][A-Za-z0-9\s&.\-',/()]{2,80})\s+Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/gi,
      /([A-Z][A-Za-z0-9\s&.\-',/()]{2,80})\s+\(₹\s*([\d,]+(?:\.\d{1,2})?)\)/gi,
      /([A-Z][A-Za-z0-9\s&.\-',/()]{2,80})\s+\(Rs\.?\s*([\d,]+(?:\.\d{1,2})?)\)/gi,
    ];

    for (var pi = 0; pi < inlinePatterns.length; pi++) {
      var inlineMatch;
      while ((inlineMatch = inlinePatterns[pi].exec(bodyText)) !== null) {
        var pName = inlineMatch[1].trim();
        var pPrice = parseFloat(inlineMatch[2].replace(/,/g, '')) || 0;

        if (pName.length > 2 && pPrice > 0 && !/^(home|about|contact|welcome|login|signup|search|cart|account|total|subtotal)/i.test(pName)) {
          var isDup = products.some(function(p) { return p.name === pName; });
          if (!isDup) {
            products.push({
              name: pName,
              sku: '',
              category: 'Uncategorized',
              description: '',
              pricing: { mrp: pPrice, sellingPrice: pPrice, purchasePrice: 0, gstRate: 18 },
              inventory: { quantity: 0, minStockLevel: 10 },
              images: [],
            });
          }
        }
      }
      if (products.length > 0) break;
    }
  }

  // Add images to Strategy C products if any found
  if (products.length > 0) {
    addImagesFromOriginalHtml(products, $original);
    return products;
  }

  return null;
}

/**
 * Extract product images from the original HTML and assign to products.
 * Used by flat-text parsing which doesn't have structured product cards.
 */
function addImagesFromOriginalHtml(products, $original) {
  if (!products || products.length === 0 || !$original) return;

  var allImages = [];
  $original('body').find('img').each(function() {
    var src = $original(this).attr('src');
    if (src) {
      var srcLower = src.toLowerCase();
      var isProductImage = !src.includes('data:') && !src.includes('placeholder') && !src.includes('logo') && !src.includes('banner') && !src.includes('icon') && !src.includes('spacer') && !src.includes('blank') && !src.includes('pixel');
      var hasImageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].some(function(ext) { return srcLower.includes(ext); });
      var hasProductPath = srcLower.includes('/product') || srcLower.includes('/image') || srcLower.includes('/photo') || srcLower.includes('/upload') || srcLower.includes('/images') || srcLower.includes('/img') || srcLower.includes('/photos');
      if (isProductImage && (hasImageExt || hasProductPath)) {
        allImages.push(src);
      }
    }
  });

  // Deduplicate
  var seen = {};
  var uniqueImages = [];
  for (var imgIdx = 0; imgIdx < allImages.length; imgIdx++) {
    if (!seen[allImages[imgIdx]]) {
      seen[allImages[imgIdx]] = true;
      uniqueImages.push(allImages[imgIdx]);
    }
  }

  // Assign images to products (cycling through available images)
  if (uniqueImages.length > 0) {
    for (var pIdx = 0; pIdx < products.length; pIdx++) {
      var imgUrl = uniqueImages[pIdx % uniqueImages.length];
      products[pIdx].images = [{ url: imgUrl, type: 'link' }];
    }
  }
}

/**
 * Ultra-aggressive strategy: scrape ANY price-looking numbers from the page
 * and pair them with the nearest text that looks like a product name.
 * Used as the last resort when all other strategies fail.
 */
function extractAnyPriceProducts($clean, $original) {
  var products = [];
  var bodyText = $clean('body').text() || '';
  bodyText = bodyText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n');

  // Split into lines and find any line that contains a price indicator
  var lines = bodyText.split('\n').filter(function(l) { return l.trim(); });

  // Indian price patterns: ₹, Rs., INR followed by number
  var priceIndicators = /[₹\u20B9]|Rs\.?\s*\d|INR\s*\d|MRP\s*[:]?\s*\d/i;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.length < 3 || line.length > 300) continue;

    // Check if this line has a price indicator
    if (!priceIndicators.test(line)) continue;

    // Skip known non-product lines
    if (/^(home|about|contact|welcome|login|signup|search|cart|account|total|subtotal|shipping|tax|checkout)/i.test(line)) continue;
    if (/^(copyright|©|all rights|terms|privacy|powered|designed)/i.test(line)) continue;
    if (line.length < 10) continue; // too short to be meaningful

    // Extract price
    var priceMatch = line.match(/[₹\u20B9]\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!priceMatch) priceMatch = line.match(/Rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!priceMatch) priceMatch = line.match(/INR\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (!priceMatch) priceMatch = line.match(/MRP\s*[:]?\s*([\d,]+(?:\.\d{1,2})?)/i);

    if (!priceMatch) continue;
    var price = parseFloat(priceMatch[1].replace(/,/g, '')) || 0;
    if (price <= 0 || price > 9999999) continue;

    // Extract name: everything before the price indicator, cleaned up
    var name = line.replace(/[₹\u20B9]\s*[\d,]+(?:\.\d{1,2})?.*$/, '').trim();
    name = name.replace(/Rs\.?\s*[\d,]+(?:\.\d{1,2})?.*$/i, '').trim();
    name = name.replace(/INR\s*[\d,]+(?:\.\d{1,2})?.*$/i, '').trim();
    name = name.replace(/MRP\s*[:]?\s*[\d,]+(?:\.\d{1,2})?.*$/i, '').trim();

    // Clean up: remove trailing dashes, colons, and whitespace
    name = name.replace(/[-–:;.,|]+\s*$/, '').trim();
    // Remove leading noise
    name = name.replace(/^[-–:;.,|\s]+/, '').trim();

    if (!name || name.length < 2 || name.length > 150) continue;

    // Skip if it looks like generic text, not a product
    if (/^(price|mrp|rate|cost|total|qty|quantity|stock|brand|category|sort|filter|page|prev|next)/i.test(name)) continue;

    // Deduplicate
    var isDup = products.some(function(p) { return p.name === name; });
    if (!isDup) {
      products.push({
        name: name,
        sku: '',
        category: 'Uncategorized',
        description: '',
        pricing: { mrp: price, sellingPrice: price, purchasePrice: 0, gstRate: 18 },
        inventory: { quantity: 0, minStockLevel: 10 },
        images: [],
      });
    }
  }

  if (products.length > 0) {
    addImagesFromOriginalHtml(products, $original);
    return products;
  }

  return null;
}

/**
 * Normalize image URLs - convert strings to object format.
 */
function normalizeImageUrls(urls) {
  return urls
    .filter(function(u) { return u && typeof u === 'string' && u.trim(); })
    .map(function(u) { return { url: u.trim(), type: 'link' }; });
}

module.exports = { scrapeProductsFromHtml };
