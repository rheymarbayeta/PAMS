-- Phase 6: link portal payment intents to recorded payments

ALTER TABLE portal_payment_intents
  ADD COLUMN payment_id VARCHAR(64) NULL AFTER reference_no;
