-- Migration: Allow duplicate permit type names with different attributes
-- Description: Changes the unique constraint from permit_type_name only to 
--              the combination of permit_type_name and attribute_id
-- This allows creating permit types like "Mayor's Permit (Cellsite)" and "Mayor's Permit (Billboard)"

-- Drop the existing unique constraint on permit_type_name only
ALTER TABLE permit_types DROP INDEX permit_type_name;

-- Add a new unique constraint on the combination of permit_type_name and attribute_id
-- Note: NULL values in attribute_id are treated as distinct, so you can have:
-- - "Mayor's Permit" with attribute_id = NULL (only one)
-- - "Mayor's Permit" with attribute_id = 'ATTR_001' 
-- - "Mayor's Permit" with attribute_id = 'ATTR_002'
ALTER TABLE permit_types ADD UNIQUE INDEX unique_permit_type_attribute (permit_type_name, attribute_id);
