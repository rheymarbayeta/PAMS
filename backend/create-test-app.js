const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: '192.168.11.26',
    port: 3310,
    user: 'root',
    password: 'dalaguete1000',
    database: 'pams_db'
  });
  
  try {
    // Get a permit type
    const [types] = await conn.execute('SELECT permit_type_id, permit_type_name FROM permit_types LIMIT 1');
    if (types.length === 0) {
      console.log('❌ No permit types found');
      process.exit(1);
    }
    
    const permitType = types[0];
    console.log(`✅ Using permit type: ${permitType.permit_type_name}`);
    
    // Get a user for creator
    const [users] = await conn.execute('SELECT user_id, username FROM users LIMIT 1');
    const creator = users[0];
    console.log(`✅ Using creator: ${creator.username}`);
    
    // Get an entity
    const [entities] = await conn.execute('SELECT entity_id, entity_name FROM entities LIMIT 1');
    let entityId = entities[0]?.entity_id;
    
    if (!entityId) {
      // Create atest entity
      entityId = uuidv4();
      await conn.execute(
        'INSERT INTO entities (entity_id, entity_name, entity_type) VALUES (?, ?, ?)',
        [entityId, 'Test Entity', 'Business']
      );
      console.log('✅ Created test entity');
    }
    
    // Create a test application
    const appId = uuidv4();
    const appNum = `TEST-${Date.now()}`;
    
    await conn.execute(
      `INSERT INTO applications (
        application_id, application_number, entity_id, permit_type, 
        creator_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [appId, appNum, entityId, permitType.permit_type_name, creator.user_id, 'Submitted']
    );
    
    console.log(`✅ Created test application: ${appNum} (ID: ${appId})`);
    console.log(`   Permit Type: ${permitType.permit_type_name}`);
    console.log(`   Entity: ${entities[0]?.entity_name || 'Test Entity'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
})();
