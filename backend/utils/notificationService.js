const pool = require('../config/database');

// This will be set by server.js
let io = null;
let emitNotificationFn = null;

const setSocketIO = (socketIO, emitFn) => {
  io = socketIO;
  emitNotificationFn = emitFn;
};

/**
 * Create a notification for a user
 * @param {number} userId - Recipient user ID
 * @param {string} message - Notification message
 * @param {string|null} link - Optional link to related resource
 */
const createNotification = async (userId, message, link = null) => {
  try {
    const [result] = await pool.execute(
      'INSERT INTO Notifications (user_id, message, link) VALUES (?, ?, ?)',
      [userId, message, link]
    );

    // Emit real-time notification
    if (emitNotificationFn) {
      emitNotificationFn(userId, {
        notification_id: result.insertId,
        user_id: userId,
        message,
        link,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Create notifications for all users with a specific role
 * @param {string} roleName - Role name
 * @param {string} message - Notification message
 * @param {string|null} link - Optional link
 */
const notifyRole = async (roleName, message, link = null) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id FROM Users 
       INNER JOIN Roles ON Users.role_id = Roles.role_id 
       WHERE Roles.role_name = ?`,
      [roleName]
    );

    for (const user of users) {
      await createNotification(user.user_id, message, link);
    }
  } catch (error) {
    console.error('Error notifying role:', error);
  }
};

module.exports = { createNotification, notifyRole, setSocketIO };

