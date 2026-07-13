/**
 * Deep diagnosis: Find exactly which shop has active products,
 * and check if products match the user's shop context.
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
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  DEEP DIAGNOSIS: Active products & shop context');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Login
  const login = await req('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );
  if (!login.body?.token) { console.error('Login failed'); process.exit(1); }
  const TOKEN = login.body.token;
  console.log('✓ Logged in as:', login.body.user?.role, '(' + login.body.user?.email + ')');
  console.log('  User shopId from login:', JSON.stringify(login.body.user?.shopId));

  // Get all shops with their IDs
  const shopsRes = await req('GET', '/api/shops?limit=50', { 'Authorization': 'Bearer ' + TOKEN });
  const shops = shopsRes.body?.data || [];
  console.log('\n▶ All shops in system (' + shops.length + '):');
  shops.forEach(function(s) {
    console.log('  ' + s._id + ' | ' + s.name + ' | status=' + s.status + ' | business=' + s.businessType);
  });

  // Check each shop for ACTIVE products specifically
  console.log('\n▶ ACTIVE products per shop (what frontend shows):');
  let totalActive = 0;
  for (const shop of shops) {
    const res = await req('GET', '/api/products?limit=200',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': shop._id });
    
    const activeProducts = res.body?.data || [];
    const total = res.body?.pagination?.total || 0;
    
    if (total > 0) {
      console.log('\n  ── ' + shop.name + ' (' + shop._id.substring(0,12) + '...) ──');
      console.log('     Active products: ' + total);
      totalActive += total;
      activeProducts.slice(0, 5).forEach(function(p, i) {
        console.log('     ' + (i+1) + '. [' + p.sku.substring(0,25) + '] ' + p.name.substring(0,35) + ' | stock=' + (p.inventory?.quantity || 0));
      });
    }
  }

  console.log('\n  TOTAL active products: ' + totalActive);

  // Now simulate what the frontend does: get products WITHOUT x-shop-id
  // For a shop admin, the backend uses req.user.shopId
  // Let's check if the user has a shopId that matches any shop
  console.log('\n▶ Checking user shop context:');
  const meRes = await req('GET', '/api/auth/me', { 'Authorization': 'Bearer ' + TOKEN });
  const user = meRes.body?.user;
  if (user) {
    console.log('  User role:', user.role);
    console.log('  User shopId:', user.shopId);

    if (user.shopId) {
      // Check if this shop has products
      const userShopProducts = await req('GET', '/api/products?limit=200',
        { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': user.shopId });
      console.log('  Products in user shop:', userShopProducts.body?.pagination?.total || 0);
    } else {
      console.log('  ⚠ User has NO shopId (super admin)');
    }
  }

  // Check if there's an issue with shopId format
  console.log('\n▶ Testing shopId format matching:');
  // Pick the first shop with active products
  for (const shop of shops) {
    const res = await req('GET', '/api/products?limit=3',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': shop._id });
    
    const products = res.body?.data || [];
    if (products.length > 0) {
      const p = products[0];
      console.log('  Shop: ' + shop.name);
      console.log('  Request x-shop-id: ' + shop._id);
      console.log('  Product.shopId: ' + p.shopId);
      console.log('  Match: ' + (String(shop._id) === String(p.shopId) ? '✓ YES' : '✘ NO'));
      break;
    }
  }

  console.log('\n✓ Done\n');
}

main().catch(e => console.error('Error:', e.message));
