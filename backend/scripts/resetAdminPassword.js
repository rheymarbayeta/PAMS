const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAdminPassword() {
  const password = 'admin123';
  
  // Generate new hash
  const password_hash = await bcrypt.hash(password, 10);
  console.log('Generated password hash:', password_hash);
  
  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'pams_db',
  });

  try {
    // Update admin password
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [password_hash, 'admin']
    );

    if (result.affectedRows > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
    } else {
      console.log('⚠️  Admin user not found. Creating admin user...');
      
      // Get SuperAdmin role_id
      const [roles] = await connection.execute(
        'SELECT role_id FROM roles WHERE role_name = ?',
        ['SuperAdmin']
      );

      if (roles.length === 0) {
        console.error('❌ SuperAdmin role not found. Please run seed.sql first.');
        return;
      }

      // Create admin user
      await connection.execute(
        'INSERT INTO users (username, password_hash, full_name, role_id) VALUES (?, ?, ?, ?)',
        ['admin', password_hash, 'System Administrator', roles[0].role_id]
      );

      console.log('✅ Admin user created successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
    }

    // Verify the password works
    const [users] = await connection.execute(
      'SELECT password_hash FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length > 0) {
      const isValid = await bcrypt.compare(password, users[0].password_hash);
      if (isValid) {
        console.log('✅ Password verification successful!');
      } else {
        console.error('❌ Password verification failed!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetAdminPassword();

