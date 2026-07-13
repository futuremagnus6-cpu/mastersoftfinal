/**
 * Diagnose: Import products then list them to see if they show up.
 * Tests both super admin (with x-shop-id) and shop admin (with JWT user) flows.
 */
const http = require('http');
const path = require('path');

const HOST = 'localhost';
const PORT = 5000;
const tempDir = __dirname;

// ─── HTTP helpers ────────────────────────────────────────────────────
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

function multipartUpload(urlPath, filePath, fieldName, authToken, shopId) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Date.now();
    const fileContent = require('fs').readFileSync(filePath);
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

// ─── Main test ───────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DIAGNOSE: Import → List Products Flow');
  console.log('═══════════════════════════════════════════════════════\n');

  // Login
  console.log('▶ Step 1: Login as super admin');
  const loginRes = await request('POST', '/api/auth/login',
    { 'Content-Type': 'application/json' },
    JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );
  if (!loginRes.body || !loginRes.body.token) {
    console.error('✘ Login failed:', JSON.stringify(loginRes.body));
    process.exit(1);
  }
  const TOKEN = loginRes.body.token;
  console.log('✓ Logged in as:', loginRes.body.user?.role || 'unknown');

  // Get user profile
  console.log('\n▶ Step 2: Get user profile');
  const meRes = await request('GET', '/api/auth/me', { 'Authorization': 'Bearer ' + TOKEN });
  if (meRes.body && meRes.body.user) {
    console.log('  User role:', meRes.body.user.role);
    console.log('  User shopId:', JSON.stringify(meRes.body.user.shopId));
  }

  // Find a shop ID
  console.log('\n▶ Step 3: Get a shop ID');
  const shopsRes = await request('GET', '/api/shops?limit=5', { 'Authorization': 'Bearer ' + TOKEN });
  let SHOP_ID = '';
  if (shopsRes.body && shopsRes.body.data && shopsRes.body.data.length > 0) {
    SHOP_ID = shopsRes.body.data[0]._id;
    console.log('✓ Using shop:', shopsRes.body.data[0].name, '(' + SHOP_ID + ')');
  } else {
    console.error('✘ No shops found');
    process.exit(1);
  }

  // Check product count before import
  console.log('\n▶ Step 4: List products BEFORE import');
  const listBefore = await request('GET', '/api/products?limit=50',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  console.log('  Products before import:', listBefore.body?.pagination?.total || 0);
  if (listBefore.body?.data?.length > 0) {
    console.log('  First few:', listBefore.body.data.slice(0, 3).map(p => p.sku + ': ' + p.name).join(', '));
  }

  // Import via file upload
  console.log('\n▶ Step 5: Import products via file upload');
  const jsonPath = path.join(tempDir, 'test-json-array.json');
  if (require('fs').existsSync(jsonPath)) {
    const importRes = await multipartUpload('/api/products/import', jsonPath, 'import', TOKEN, SHOP_ID);
    console.log('  Status:', importRes.status);
    if (importRes.body?.success) {
      console.log('  ✓ Imported:', importRes.body.data?.imported);
      console.log('  Skipped:', importRes.body.data?.skipped);
      if (importRes.body.data?.errors?.length > 0) {
        console.log('  Errors:', JSON.stringify(importRes.body.data.errors.slice(0, 3)));
      }
    } else {
      console.log('  ✘ Failed:', importRes.body?.message || JSON.stringify(importRes.body));
    }
  } else {
    console.log('  ⚠ Test file not found:', jsonPath);
  }

  // Check product count after import
  console.log('\n▶ Step 6: List products AFTER import (wait 1s)');
  await new Promise(r => setTimeout(r, 1000));
  const listAfter = await request('GET', '/api/products?limit=50',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  console.log('  Products after import:', listAfter.body?.pagination?.total || 0);
  
  if (listAfter.body?.data?.length > 0) {
    console.log('\n  ── Products in list ──');
    listAfter.body.data.slice(0, 10).forEach(function(p, i) {
      console.log('  ' + (i+1) + '. [' + p.sku + '] ' + p.name + ' | shopId=' + String(p.shopId).substring(0,12) + '...');
    });
    
    // Check if our test products are in the list
    const testProducts = listAfter.body.data.filter(p => p.sku && p.sku.startsWith('TST-'));
    if (testProducts.length > 0) {
      console.log('\n  ✓ FOUND ' + testProducts.length + ' test product(s) in the list!');
    } else {
      console.log('\n  ⚠ No test products (TST-*) found in the list');
      console.log('  Check: shopId of products might differ from query shopId');
    }
  } else {
    console.log('  ⚠ No products found at all!');
  }

  // Now simulate what the FRONTEND does - NO x-shop-id header (shop admin flow)
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TEST 2: Without x-shop-id (simulating shop admin)');
  console.log('═══════════════════════════════════════════════════════\n');

  const listNoHeader = await request('GET', '/api/products?limit=50',
    { 'Authorization': 'Bearer ' + TOKEN });  // No x-shop-id!
  console.log('  Products (no x-shop-id):', listNoHeader.body?.pagination?.total || 0);

  if (listNoHeader.body?.pagination?.total !== listAfter.body?.pagination?.total) {
    console.log('  ⚠ DIFFERENCE! x-shop-id gives different results than no header!');
    console.log('  With x-shop-id:', listAfter.body?.pagination?.total);
    console.log('  Without:', listNoHeader.body?.pagination?.total);
  } else {
    console.log('  ✓ Same count, x-shop-id not needed for this user');
  }

  // Cleanup: Delete test products
  console.log('\n▶ Cleanup: Removing test products...');
  const testIds = listAfter.body?.data?.filter(p => p.sku && p.sku.startsWith('TST-')).map(p => p._id) || [];
  if (testIds.length > 0) {
    const delRes = await request('POST', '/api/products/bulk-delete',
      { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID, 'Content-Type': 'application/json' },
      JSON.stringify({ ids: testIds }));
    console.log('  Deleted:', delRes.body?.data?.deletedCount || 0);
  } else {
    console.log('  No test products to clean up');
  }

  console.log('\n✓ Done!\n');
}

main().catch(err => console.error('Error:', err.message));
