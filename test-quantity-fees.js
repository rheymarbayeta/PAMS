#!/usr/bin/env node

const http = require('http');

// Helper function to make HTTP requests
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5040,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTFhMmIzYzRkNWU2ZjdnOGg5aTBqIiwidXNlcm5hbWUiOiJyaGV5bWFyIiwicm9sZUlkIjoicm9sZS0yNmFjMjVmODkzNWFmMTdmMGVmOSIsImlhdCI6MTc3NTYyODA5MywiZXhwIjoxNzc1NzE0NDkzfQ.K0IDNZ459_eIa9OjlEl-7F4-oelsGEcPa_6yFqg2_QY'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing Quantity-Based Fees Feature\n');

  try {
    // 1. Get first application
    console.log('1️⃣  Getting applications...');
    const appRes = await request('GET', '/api/applications?limit=1');
    if (!appRes.data.data || appRes.data.data.length === 0) {
      console.log('❌ No applications found');
      return;
    }

    const appId = appRes.data.data[0].id;
    const appRef = appRes.data.data[0].reference_number;
    console.log(`✅ Found application: ${appRef} (ID: ${appId})\n`);

    // 2. Get application details
    console.log('2️⃣  Getting application details...');
    const detailRes = await request('GET', `/api/applications/${appId}`);
    const app = detailRes.data.data;
    console.log(`✅ Status: ${app.status}, Stage: ${app.stage}`);
    console.log(`   Permit Type: ${app.permit_type_name}\n`);

    // 3. Check if permit type supports quantity
    console.log('3️⃣  Checking quantity fee configuration...');
    const feeRes = await request('GET', `/api/quantity-fees?permit_type_id=${app.permit_type_id}`);
    if (feeRes.data.data && feeRes.data.data.length > 0) {
      console.log('✅ Quantity fees configured:');
      feeRes.data.data.forEach(fee => {
        console.log(`   - ${fee.quantity_type}: ${fee.fee_formula}`);
      });
    } else {
      console.log('⚠️  No quantity fees configured for this permit type');
    }

    // 4. Try to assess with quantity
    console.log('\n4️⃣  Testing assessment with quantity parameter...');
    const assessRes = await request('POST', `/api/applications/${appId}/assess`, {
      quantity_entered: 50,
      quantity_unit: 'sqm',
      notes: 'Test quantity-based fee calculation'
    });

    if (assessRes.status === 200 || assessRes.status === 201) {
      console.log('✅ Assessment submitted successfully');
      console.log(`   Response: ${JSON.stringify(assessRes.data, null, 2)}`);
    } else {
      console.log(`❌ Assessment failed with status ${assessRes.status}`);
      console.log(`   Error: ${JSON.stringify(assessRes.data)}`);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

test();
