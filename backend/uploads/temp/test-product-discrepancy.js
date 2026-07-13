/**
 * Diagnose: Products in DB vs Products shown in frontend.
 * Compares: active=all (all products), default (active only),
 * with/without x-shop-id, and checks shopId values.
 */
const http = require('http');
const HOST = 'localhost';
const PORT = 5000;

function req(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path: url, method, headers: headers || {} };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, body: data }); } });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DIAGNOSE: Products in DB vs products shown in UI');
  console.log('═══════════════════════════════════════════════════════\n');

  // Login as super admin
  const login = await req('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );
  if (!login.body?.token) { console.error('Login failed'); process.exit(1); }
  const TOKEN = login.body.token;
  console.log('✓ Logged in');

  // Get shops
  const shops = await req('GET', '/api/shops?limit=10', { 'Authorization': 'Bearer ' + TOKEN });
  const shopList = shops.body?.data || [];
  console.log('\n▶ Available shops:', shopList.length);
  shopList.forEach(function(s, i) {
    console.log('  ' + (i+1) + '. ' + s._id + ' | ' + s.name + ' | status=' + s.status);
  });

  if (shopList.length === 0) { console.error('No shops'); process.exit(1); }

  // For EACH shop, count products
  console.log('\n▶ Products per shop:');
  for (const shop of shopList) {
    const allRes = await req('GET', '/api/products?active=all&limit=5',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': shop._id });
    const activeRes = await req('GET', '/api/products?limit=5',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': shop._id });

    const allTotal = allRes.body?.pagination?.total || 0;
    const activeTotal = activeRes.body?.pagination?.total || 0;

    console.log('\n  ── Shop: ' + shop.name + ' (' + shop._id.substring(0,12) + '...) ──');
    console.log('     ALL products (incl inactive): ' + allTotal);
    console.log('     ACTIVE products (frontend):   ' + activeTotal);
    if (allTotal > activeTotal) {
      console.log('     ⚠ ' + (allTotal - activeTotal) + ' product(s) soft-deleted!');
    }

    // Show first few products
    if (allRes.body?.data?.length > 0) {
      console.log('     First few products:');
      allRes.body.data.slice(0, 8).forEach(function(p, i) {
        console.log('     ' + (i+1) + '. [' + p.sku.substring(0,25) + '] ' + p.name.substring(0,30) + ' | active=' + p.isActive);
      });
    }
  }

  // Also test: what does the shop admin see? (No x-shop-id header, simulating frontend shop admin)
  // For super admin without x-shop-id: sees ALL products across all shops
  console.log('\n▶ Super admin WITHOUT x-shop-id (all shops combined):');
  const noHeaderRes = await req('GET', '/api/products?active=all&limit=5',
    { 'Authorization': 'Bearer ' + TOKEN });
  console.log('  Total (all shops, inactive): ' + (noHeaderRes.body?.pagination?.total || 0));

  const noHeaderActive = await req('GET', '/api/products?limit=5',
    { 'Authorization': 'Bearer ' + TOKEN });
  console.log('  Total (all shops, active only): ' + (noHeaderActive.body?.pagination?.total || 0));

  // Check shopId distribution
  console.log('\n▶ ShopID distribution across all products:');
  const allProducts = await req('GET', '/api/products?active=all&limit=200',
    { 'Authorization': 'Bearer ' + TOKEN });
  if (allProducts.body?.data?.length > 0) {
    const counts = {};
    allProducts.body.data.forEach(function(p) {
      const sid = String(p.shopId);
      counts[sid] = (counts[sid] || 0) + 1;
    });
    Object.entries(counts).forEach(function([sid, count]) {
      const shopMatch = shopList.find(function(s) { return String(s._id) === sid; });
      const shopName = shopMatch ? shopMatch.name : sid.substring(0,12);
      console.log('  ' + shopName + ': ' + count + ' products');
    });
  }

  console.log('\n✓ Done\n');
}

main().catch(e => console.error('Error:', e.message));
