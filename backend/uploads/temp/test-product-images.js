/**
 * Check product image data: what's stored vs how it's displayed.
 */
const http = require('http');
const HOST = 'localhost';
const PORT = 5000;

function req(m, u, h, b) {
  return new Promise((res, rej) => {
    const opts = { hostname: HOST, port: PORT, path: u, method: m, headers: h || {} };
    const r = http.request(opts, (resp) => { let d = ''; resp.on('data', c => d += c); resp.on('end', () => { try { res({ status: resp.statusCode, body: JSON.parse(d) }); } catch(e) { res({ status: resp.statusCode, body: d }); } }); });
    r.on('error', rej); if (b) r.write(b); r.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DIAGNOSE: Product images storage vs display');
  console.log('═══════════════════════════════════════════════════════════\n');

  const login = await req('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );
  if (!login.body?.token) { console.log('Login failed'); return; }
  const TOKEN = login.body.token;

  // Get first shop
  const shops = await req('GET', '/api/shops?limit=10', { 'Authorization': 'Bearer ' + TOKEN });
  const shop = (shops.body?.data || [])[0];
  if (!shop) { console.log('No shops'); return; }
  const SHOP_ID = shop._id;
  console.log('Shop:', shop.name, '(' + SHOP_ID + ')');

  // List ALL products (including inactive) for this shop
  const all = await req('GET', '/api/products?active=all&limit=200',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  const products = all.body?.data || [];
  console.log('\nTotal products:', all.body?.pagination?.total || 0);

  // Check image fields on each product
  console.log('\n▶ Image analysis:');
  let withImages = 0;
  let withoutImages = 0;
  let brokenUrls = 0;

  for (const p of products) {
    const imgs = p.images || [];
    if (imgs.length === 0) {
      withoutImages++;
    } else {
      withImages++;
      const img = imgs[0];
      console.log('\n  Product:', p.name.substring(0, 40));
      console.log('    SKU:', p.sku);
      console.log('    Images array length:', imgs.length);
      imgs.forEach(function(img, i) {
        console.log('    [' + i + '] url:', img.url ? img.url.substring(0, 80) : '(empty)');
        console.log('         type:', img.type);
        console.log('         isMain:', img.isMain);
        // Check if url is absolute
        if (img.url && !img.url.startsWith('http://') && !img.url.startsWith('https://') && !img.url.startsWith('/uploads')) {
          console.log('         ⚠ UNSUPPORTED URL FORMAT');
          brokenUrls++;
        }
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('  Products with images:  ' + withImages);
  console.log('  Products without images: ' + withoutImages);
  console.log('  Products with broken URLs: ' + brokenUrls);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(e => console.error('Error:', e.message));
