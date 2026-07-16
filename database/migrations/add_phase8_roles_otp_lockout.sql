-- Phase 8: seed missing enterprise roles (align with DEFAULT_PERMISSIONS)

INSERT INTO roles (role_id, role_name) VALUES
(MD5('role-rights-and-rentals-manager'), 'Rights and Rentals Manager'),
(MD5('role-traffic-officer'), 'Traffic Officer'),
(MD5('role-citation-manager'), 'Citation Manager')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- OTP attempt tracking for portal brute-force protection
ALTER TABLE portal_otp_challenges
  ADD COLUMN attempt_count INT NOT NULL DEFAULT 0 AFTER otp_hash,
  ADD COLUMN locked_until DATETIME NULL AFTER attempt_count;
