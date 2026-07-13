/**
 * End-to-end test: Import products → List them → Verify they appear.
 * Uses fresh unique SKUs so no conflicts with soft-deleted products.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');

const HOST = 'localhost';
const PORT = 5000;

function request(method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname: HOST, port: PORT, path: urlPath, method, headers: headers || {} };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function createTestJsonFile() {
  const ts = Date.now();
  const data = [
    {
      name: 'E2E Test Alpha',
      sku: 'E2E-ALPHA-' + ts,
      category: 'E2E Test',
      brand: 'E2EBrand',
      unit: 'pcs',
      description: 'End-to-end import test product',
      mrp: 150,
      selling_price: 135,
      purchase_price: 100,
      gst_rate: 18,
      quantity: 75,
      min_stock: 10,
      image_url: 'https://picsum.photos/seed/e2e1/200/200'
    },
    {
      name: 'E2E Test Beta',
      sku: 'E2E-BETA-' + ts,
      category: 'E2E Test',
      brand: 'E2EBrand',
      unit: 'kg',
      description: 'Second E2E test product',
      mrp: 300,
      selling_price: 270,
      purchase_price: 200,
      gst_rate: 5,
      quantity: 40,
      min_stock: 5,
      image_url: 'https://picsum.photos/seed/e2e2/200/200'
    }
  ];
  const filePath = path.join(__dirname, 'e2e-import-' + ts + '.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('  Created test file:', path.basename(filePath));
  return filePath;
}

function multipartUpload(urlPath, filePath, fieldName, authToken, shopId) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Date.now();
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    let body = '';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + fileName + '"\r\n';
    body += 'Content-Type: application/json\r\n\r\n';

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf-8'),
      fileContent,
      Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8')
    ]);

    var headers = {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': bodyBuffer.length,
      'Authorization': 'Bearer ' + authToken
    };
    if (shopId) headers['x-shop-id'] = shopId;

    const options = { hostname: HOST, port: PORT, path: urlPath, method: 'POST', headers: headers };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  END-TO-END TEST: Import → List → Verify');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Login
  console.log('▶ 1. Login');
  const loginRes = await request('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );
  if (!loginRes.body?.token) { console.error('Login failed:', JSON.stringify(loginRes.body)); process.exit(1); }
  const TOKEN = loginRes.body.token;
  const userRole = loginRes.body.user?.role;
  console.log('   Role:', userRole);

  // Find a shop
  console.log('\n▶ 2. Get shop context');
  const shopsRes = await request('GET', '/api/shops?limit=5', { 'Authorization': 'Bearer ' + TOKEN });
  const SHOP_ID = shopsRes.body?.data?.[0]?._id || '';
  console.log('   Shop ID:', SHOP_ID);

  // Count products before import
  console.log('\n▶ 3. Products before import');
  const beforeRes = await request('GET', '/api/products?limit=100',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  const beforeCount = beforeRes.body?.pagination?.total || 0;
  console.log('   Count:', beforeCount);

  // Create test file and import
  console.log('\n▶ 4. Create and import test file');
  const testFile = createTestJsonFile();
  const importRes = await multipartUpload('/api/products/import', testFile, 'import', TOKEN, SHOP_ID);
  console.log('   Status:', importRes.status);
  console.log('   Success:', importRes.body?.success);
  console.log('   Message:', importRes.body?.message || '(none)');
  console.log('   Imported:', importRes.body?.data?.imported);
  console.log('   Skipped:', importRes.body?.data?.skipped);
  if (importRes.body?.data?.errors?.length > 0) {
    console.log('   ERRORS:', JSON.stringify(importRes.body.data.errors.slice(0, 5)));
  }

  // Wait for DB to settle
  await new Promise(r => setTimeout(r, 500));

  // List products AFTER import
  console.log('\n▶ 5. Products AFTER import');
  const afterRes = await request('GET', '/api/products?limit=100',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  const afterCount = afterRes.body?.pagination?.total || 0;
  console.log('   Count:', afterCount);
  console.log('   Expected:', beforeCount + (importRes.body?.data?.imported || 0));
  console.log('   Match:', afterCount === beforeCount + (importRes.body?.data?.imported || 0) ? '✓ YES' : '✘ NO');

  // Look for our test products
  const testProducts = (afterRes.body?.data || []).filter(p =>
    p.name && (p.name.includes('E2E Test') || p.name.includes('DIAG'))
  );
  console.log('\n▶ 6. Test products in list:', testProducts.length);
  testProducts.forEach(function(p) {
    console.log('   ✓ [' + (p.sku || '').substring(0, 30) + '] ' + p.name + ' | shopId=' + String(p.shopId));
  });

  if (testProducts.length === 0) {
    console.log('\n   ⚠ CRITICAL: Test products not found in list!');
    console.log('   Checking all visible products:');
    (afterRes.body?.data || []).slice(0, 5).forEach(function(p, i) {
      console.log('   ' + (i+1) + '. [' + (p.sku || '').substring(0, 30) + '] ' + p.name);
    });
  } else {
    console.log('\n   ✓ CONFIRMED: Imported products appear in product list');
  }

  // Cleanup
  console.log('\n▶ 7. Cleanup');
  const idsToDelete = testProducts.map(p => p._id);
  if (idsToDelete.length > 0) {
    const delRes = await request('POST', '/api/products/bulk-delete',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID, 'Content-Type': 'application/json' },
      JSON.stringify({ ids: idsToDelete }));
    console.log('   Deleted:', delRes.body?.data?.deletedCount || 0);
  }
  
  // Clean up temp file
  try { fs.unlinkSync(testFile); } catch(e) {}

  console.log('\n✓ TEST COMPLETE\n');
}

main().catch(err => console.error('Fatal:', err.message));
