-- ============================================
-- Add Treasurer Role
-- ============================================
-- Purpose: Add Treasurer role for payment recording
-- This role should be assigned to staff responsible for recording payments

INSERT INTO Roles (role_name) VALUES ('Treasurer')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- Update payment endpoint to allow Treasurer role
-- Note: Also update the authorization in /backend/routes/applications.js if using Treasurer role:
-- router.post('/:id/payment', authorize('SuperAdmin', 'Admin', 'Treasurer'), async (req, res) => {
