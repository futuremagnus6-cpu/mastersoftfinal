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
  const login = await req('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' }));
  if (!login.body?.token) { console.log('Login failed'); return; }
  const TOKEN = login.body.token;

  // Find rushia shop
  const shops = await req('GET', '/api/shops?limit=20&search=rushia', { 'Authorization': 'Bearer ' + TOKEN });
  let rushia = (shops.body?.data || []).find(s => s.name && s.name.toLowerCase().includes('rushia'));
  if (!rushia) {
    console.log('rushia shop not found by name search');
    // Try all shops
    const allShops = await req('GET', '/api/shops?limit=50', { 'Authorization': 'Bearer ' + TOKEN });
    allShops.body?.data?.forEach(s => console.log('  Shop:', s.name, '(' + s._id + ')'));
    // Just use any shop with products
    for (const s of allShops.body?.data || []) {
      const r = await req('GET', '/api/products?active=all&limit=1', { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': s._id });
      const total = r.body?.pagination?.total || 0;
      if (total > 10) {
        rushia = s;
        console.log('Using shop with', total, 'products:', s.name);
        break;
      }
    }
    if (!rushia) { console.log('No shop with 10+ products found'); return; }
  } else {
    console.log('Found rushia:', rushia.name, '(' + rushia._id + ')');
  }
  const SHOP_ID = rushia._id;

  // Get ALL products (active and inactive)
  const all = await req('GET', '/api/products?active=all&limit=200', { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  const products = all.body?.data || [];
  const total = all.body?.pagination?.total || 0;
  console.log('Total products:', total);

  // Analyze images
  let withImg = 0, without = 0, sample = 0;
  for (const p of products) {
    const imgs = p.images || [];
    if (imgs.length === 0) {
      without++;
    } else {
      withImg++;
      sample++;
      if (sample <= 3) {
        console.log('\n  [' + p.sku + '] ' + p.name.substring(0, 35));
        imgs.forEach((img, i) => {
          console.log('    img[' + i + ']: url=' + (img.url ? img.url.substring(0, 70) : '(none)') + ' type=' + img.type);
        });
      }
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  Rushia:');
  console.log('  Products with images:   ' + withImg);
  console.log('  Products WITHOUT images: ' + without);
  console.log('  Total:                  ' + total);
  console.log('══════════════════════════════════════════\n');
}

main().catch(e => console.error('Error:', e.message));
