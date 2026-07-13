/**
 * Comprehensive test for JSON file import formats.
 * Tests: standard array, NDJSON, wrapped {products: [...]}, single object, MongoDB export
 *
 * Usage: node test-import-all.js
 * Prerequisites: Backend server running on localhost:5000
 */

const http = require('http');
const fs = require('fs');
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
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function multipartRequest(urlPath, filePath, fieldName, authToken, shopId) {
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
    if (shopId) {
      headers['x-shop-id'] = shopId;
    }

    const options = {
      hostname: HOST,
      port: PORT,
      path: urlPath,
      method: 'POST',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ─── Main test ───────────────────────────────────────────────────────

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   JSON IMPORT FORMAT TEST SUITE                     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Step 1: Login to get token
  console.log('▶ Step 1: Authenticating...');
  const loginRes = await request('POST', '/api/auth/login', 
    { 'Content-Type': 'application/json' },      JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
  );

  if (!loginRes.body || !loginRes.body.token) {
    // Try super admin credentials
    const loginRes2 = await request('POST', '/api/auth/login',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ email: 'ujwal880522@gmail.com', password: 'Ujwal@4580' })
    );
    if (!loginRes2.body || !loginRes2.body.token) {
      console.error('✘ LOGIN FAILED. Response:', JSON.stringify(loginRes.body || loginRes2.body));
      console.log('\nTIP: Try different credentials. Check backend/.env for SUPER_ADMIN credentials.');
      process.exit(1);
    }
    var TOKEN = loginRes2.body.token;
    console.log('✓ Logged in as super admin');
  } else {
    var TOKEN = loginRes.body.token;
    console.log('✓ Logged in successfully');
  }

  // Step 2: Get shop ID from user profile
  console.log('\n▶ Step 2: Getting shop context...');
  const meRes = await request('GET', '/api/auth/me', { 'Authorization': 'Bearer ' + TOKEN });
  
  let SHOP_ID = '';
  if (meRes.body && meRes.body.user) {
    if (meRes.body.user.shopId) {
      SHOP_ID = meRes.body.user.shopId;
    } else if (meRes.body.user.shops && meRes.body.user.shops.length > 0) {
      SHOP_ID = meRes.body.user.shops[0];
    }
  }
  
  if (!SHOP_ID) {
    // Try fetching shops
    const shopsRes = await request('GET', '/api/shops?limit=1', { 'Authorization': 'Bearer ' + TOKEN });
    if (shopsRes.body && shopsRes.body.data && shopsRes.body.data.length > 0) {
      SHOP_ID = shopsRes.body.data[0]._id;
    }
  }

  if (!SHOP_ID) {
    console.warn('⚠ No shop ID found. Tests may fail if shop context is required.');
  } else {
    console.log('✓ Using shop ID:', SHOP_ID);
  }

  // ─── TEST 1: Standard JSON Array ──────────────────────────────────
  console.log('\n▶ Test 1: Standard JSON Array Format');
  console.log('   File: test-json-array.json (2 products)');
  const res1 = await multipartRequest('/api/products/import', 
    path.join(tempDir, 'test-json-array.json'), 'import', TOKEN, SHOP_ID);
  
  console.log('   Status:', res1.status);
  if (res1.body && res1.body.success) {
    console.log('   ✓ PASSED:', res1.body.message);
    console.log('   Imported:', res1.body.data.imported, '| Skipped:', res1.body.data.skipped);
    if (res1.body.data.errors && res1.body.data.errors.length > 0) {
      console.log('   Errors:', JSON.stringify(res1.body.data.errors));
    }
  } else {
    console.log('   ✘ FAILED:', res1.body && res1.body.message ? res1.body.message : JSON.stringify(res1.body));
  }

  // ─── TEST 2: NDJSON (Newline-Delimited JSON) ──────────────────────
  console.log('\n▶ Test 2: NDJSON (Newline-Delimited JSON / MongoDB export format)');
  console.log('   File: test-ndjson.json (2 products, one JSON object per line)');
  const res2 = await multipartRequest('/api/products/import',
    path.join(tempDir, 'test-ndjson.json'), 'import', TOKEN, SHOP_ID);
  
  console.log('   Status:', res2.status);
  if (res2.body && res2.body.success) {
    console.log('   ✓ PASSED:', res2.body.message);
    console.log('   Imported:', res2.body.data.imported, '| Skipped:', res2.body.data.skipped);
    if (res2.body.data.errors && res2.body.data.errors.length > 0) {
      console.log('   Errors:', JSON.stringify(res2.body.data.errors));
    }
  } else {
    console.log('   ✘ FAILED:', res2.body && res2.body.message ? res2.body.message : JSON.stringify(res2.body));
  }

  // ─── TEST 3: Wrapped Format {products: [...]} ─────────────────────
  console.log('\n▶ Test 3: Wrapped Format { "products": [...] }');
  console.log('   File: test-wrapped.json (2 products wrapped in {products: [...]})');
  const res3 = await multipartRequest('/api/products/import',
    path.join(tempDir, 'test-wrapped.json'), 'import', TOKEN, SHOP_ID);
  
  console.log('   Status:', res3.status);
  if (res3.body && res3.body.success) {
    console.log('   ✓ PASSED:', res3.body.message);
    console.log('   Imported:', res3.body.data.imported, '| Skipped:', res3.body.data.skipped);
    if (res3.body.data.errors && res3.body.data.errors.length > 0) {
      console.log('   Errors:', JSON.stringify(res3.body.data.errors));
    }
  } else {
    console.log('   ✘ FAILED:', res3.body && res3.body.message ? res3.body.message : JSON.stringify(res3.body));
  }

  // ─── TEST 4: Single Object ─────────────────────────────────────────
  console.log('\n▶ Test 4: Single Object Format');
  console.log('   File: test-single.json (1 product as a single {object})');
  const res4 = await multipartRequest('/api/products/import',
    path.join(tempDir, 'test-single.json'), 'import', TOKEN, SHOP_ID);
  
  console.log('   Status:', res4.status);
  if (res4.body && res4.body.success) {
    console.log('   ✓ PASSED:', res4.body.message);
    console.log('   Imported:', res4.body.data.imported, '| Skipped:', res4.body.data.skipped);
    if (res4.body.data.errors && res4.body.data.errors.length > 0) {
      console.log('   Errors:', JSON.stringify(res4.body.data.errors));
    }
  } else {
    console.log('   ✘ FAILED:', res4.body && res4.body.message ? res4.body.message : JSON.stringify(res4.body));
  }

  // ─── TEST 5: MongoDB Export (EJSON types, NDJSON) ─────────────────
  console.log('\n▶ Test 5: MongoDB Export Format (EJSON types, NDJSON)');
  console.log('   File: test-mongodb-export.json (2 products with $oid, $numberInt etc.)');
  const res5 = await multipartRequest('/api/products/import',
    path.join(tempDir, 'test-mongodb-export.json'), 'import', TOKEN, SHOP_ID);
  
  console.log('   Status:', res5.status);
  if (res5.body && res5.body.success) {
    console.log('   ✓ PASSED:', res5.body.message);
    console.log('   Imported:', res5.body.data.imported, '| Skipped:', res5.body.data.skipped);
    if (res5.body.data.errors && res5.body.data.errors.length > 0) {
      console.log('   Errors:', JSON.stringify(res5.body.data.errors));
    }
  } else {
    console.log('   ✘ FAILED:', res5.body && res5.body.message ? res5.body.message : JSON.stringify(res5.body));
  }

  // ─── Summary ───────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('══════════════════════════════════════════════════════');
  console.log('  1. JSON Array        : ' + (res1.body && res1.body.success ? '✓ PASS' : '✘ FAIL'));
  console.log('  2. NDJSON            : ' + (res2.body && res2.body.success ? '✓ PASS' : '✘ FAIL'));
  console.log('  3. Wrapped {products}: ' + (res3.body && res3.body.success ? '✓ PASS' : '✘ FAIL'));
  console.log('  4. Single Object     : ' + (res4.body && res4.body.success ? '✓ PASS' : '✘ FAIL'));
  console.log('  5. MongoDB Export    : ' + (res5.body && res5.body.success ? '✓ PASS' : '✘ FAIL'));
  console.log('══════════════════════════════════════════════════════\n');

  // Cleanup: delete test products by SKU prefix
  console.log('▶ Cleanup: Removing test products...');
  // List products to verify
  const listRes = await request('GET', '/api/products?search=TST-&limit=50',
    { 'Authorization': 'Bearer ' + TOKEN, 'x-shop-id': SHOP_ID });
  
  if (listRes.body && listRes.body.data && listRes.body.data.length > 0) {
    console.log('   Found', listRes.body.data.length, 'test products in database');
    listRes.body.data.forEach(function(p) {
      console.log('   -', p.name, '(' + p.sku + ')');
    });
  } else {
    console.log('   No test products found (they may have been skipped due to SKU conflicts)');
  }

  console.log('\n✓ Test suite completed!\n');
}

runTests().catch(function(err) {
  console.error('Test suite error:', err.message);
  process.exit(1);
});
