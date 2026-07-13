/**
 * Test: Check if imported products are created as active or inactive.
 * Compares: directly created vs imported via file upload.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');

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

function multipartUpload(url, filePath, fieldName, token, shopId) {
  return new Promise((resolve, reject) => {
    const boundary = '----' + Date.now();
    const content = fs.readFileSync(filePath);
    const name = path.basename(filePath);
    let h = '';
    h += '--' + boundary + '\r\n';
    h += 'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + name + '"\r\n';
    h += 'Content-Type: application/json\r\n\r\n';
    const buf = Buffer.concat([Buffer.from(h, 'utf-8'), content, Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8')]);
    const headers = { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': buf.length, 'Authorization': 'Bearer ' + token };
    if (shopId) headers['x-shop-id'] = shopId;
    const opts = { hostname: HOST, port: PORT, path: url, method: 'POST', headers: headers };
    const r = http.request(opts, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch(e) { resolve({ status: res.statusCode, body: d }); } }); });
    r.on('error', reject);
    r.write(buf);
    r.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST: Are imported products created as ACTIVE or INACTIVE?');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Login
  const login = await req('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );
  if (!login.body?.token) { console.error('Login failed'); process.exit(1); }
  const TOKEN = login.body.token;
  const shops = await req('GET', '/api/shops?limit=10', { 'Authorization': 'Bearer ' + TOKEN });
  const shop = shops.body?.data?.[0];
  if (!shop) { console.error('No shops'); process.exit(1); }
  const SHOP_ID = shop._id;
  console.log('Shop:', shop.name, '(' + SHOP_ID + ')');

  // 1. Create product directly
  console.log('\n▶ Test 1: Create product directly via POST /api/products');
  const ts = Date.now();
  const createRes = await req('POST', '/api/products',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID, 'Content-Type': 'application/json' },
    JSON.stringify({
      name: 'Direct-Create-Test-' + ts,
      sku: 'DIRECT-' + ts,
      category: 'Testing',
      pricing: { mrp: 100, sellingPrice: 90, purchasePrice: 70, gstRate: 18 },
      inventory: { quantity: 50, minStockLevel: 10 },
      shopId: SHOP_ID
    })
  );
  if (createRes.body?.success) {
    const p = createRes.body.data;
    console.log('  Created:', p.name);
    console.log('  isActive:', p.isActive);
    console.log('  shopId:', p.shopId);
    console.log('  ✓ ACTIVE:', p.isActive === true ? 'YES' : 'NO - PROBLEM!');
  } else {
    console.log('  ✘ Failed:', createRes.body?.message);
  }

  // 2. Import via file upload
  console.log('\n▶ Test 2: Import product via file upload (simulating frontend)');
  const importData = [
    { name: 'File-Import-Test-' + ts, sku: 'FILEIMPORT-' + ts, category: 'Testing', brand: 'Test', unit: 'pcs',
      mrp: 200, selling_price: 180, purchase_price: 140, gst_rate: 18, quantity: 100, min_stock: 10 }
  ];
  const importPath = path.join(__dirname, 'import-test-' + ts + '.json');
  fs.writeFileSync(importPath, JSON.stringify(importData, null, 2));
  
  const importRes = await multipartUpload('/api/products/import', importPath, 'import', TOKEN, SHOP_ID);
  console.log('  Status:', importRes.status);
  console.log('  Message:', importRes.body?.message);
  console.log('  Imported:', importRes.body?.data?.imported);
  console.log('  Skipped:', importRes.body?.data?.skipped);

  // 3. Now check if the imported product shows in the list
  console.log('\n▶ Test 3: List active products (what frontend shows)');
  const listRes = await req('GET', '/api/products?limit=100',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  console.log('  Total active:', listRes.body?.pagination?.total || 0);
  const testProducts = (listRes.body?.data || []).filter(p => String(p.shopId) === String(SHOP_ID) && p.name && (p.name.includes('Test-' + ts) || p.name.includes('DIAG') || p.name.includes('DIRECT') || p.name.includes('FILEIMPORT')));
  console.log('  Found test products in active list:', testProducts.length);
  testProducts.forEach(function(p) {
    console.log('  ✓ [' + p.sku.substring(0,25) + '] ' + p.name.substring(0,30) + ' | isActive=' + p.isActive);
  });

  // 4. Check ALL products (including inactive) for same shop
  console.log('\n▶ Test 4: ALL products (including inactive) for this shop');
  const allRes = await req('GET', '/api/products?active=all&limit=100',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  console.log('  Total (all):', allRes.body?.pagination?.total || 0);
  const allTest = (allRes.body?.data || []).filter(p => p.sku && (p.sku.includes('' + ts) || p.sku.startsWith('TST-') || p.sku.startsWith('E2E-') || p.name.includes('DIAG')));
  console.log('  Found test products:', allTest.length);
  allTest.forEach(function(p) {
    console.log('  [' + p.sku.substring(0,25) + '] ' + p.name.substring(0,30) + ' | active=' + p.isActive);
  });

  // 5. Cleanup
  console.log('\n▶ Cleanup');
  const ids = allTest.map(p => p._id);
  if (ids.length > 0) {
    const del = await req('POST', '/api/products/bulk-delete',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID, 'Content-Type': 'application/json' },
      JSON.stringify({ ids }));
    console.log('  Deleted:', del.body?.data?.deletedCount || 0);
  }
  try { fs.unlinkSync(importPath); } catch(e) {}

  console.log('\n✓ Done\n');
}

main().catch(e => console.error('Error:', e.message));
