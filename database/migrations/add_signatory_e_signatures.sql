-- E-signature image URLs for signatories (stored as /api/settings/logo/... paths)
INSERT INTO system_settings (setting_id, setting_key, setting_value, description)
VALUES
  (MD5('setting-treasurer-signature'), 'municipal_treasurer_signature', '', 'E-signature image URL for Municipal Treasurer'),
  (MD5('setting-permit-sig-signature'), 'permit_signatory_signature', '', 'E-signature image URL for permit signatory'),
  (MD5('setting-permit-by-signature'), 'permit_by_signatory_signature', '', 'E-signature image URL for permit BY signatory'),
  (MD5('setting-citation-cert-signature'), 'citation_certified_by_signature', '', 'E-signature image URL for citation certified-by signatory')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
