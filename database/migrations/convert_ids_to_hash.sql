-- Migration: Convert all INT AUTO_INCREMENT IDs to hash-based VARCHAR IDs
-- This migration converts all primary keys from INT AUTO_INCREMENT to VARCHAR(64) for hash-based IDs
-- Generated hashes will use UUID or similar hash format instead of sequential numbers

USE pams_db;

-- 1. Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- ROLES TABLE
-- ============================================
-- Step 1: Add new hash column
ALTER TABLE Roles 
ADD COLUMN role_id_hash VARCHAR(64) UNIQUE;

-- Step 2: Populate hash column with values (using MD5 of role_id for demonstration)
UPDATE Roles SET role_id_hash = MD5(CONCAT('role-', role_id));

-- Step 3: Drop old foreign key references from Users table
ALTER TABLE Users DROP FOREIGN KEY users_ibfk_1;

-- Step 4: Drop old primary key and rename columns
ALTER TABLE Roles 
DROP PRIMARY KEY,
CHANGE COLUMN role_id role_id_old INT,
CHANGE COLUMN role_id_hash role_id VARCHAR(64) PRIMARY KEY;

-- Step 5: Recreate index
ALTER TABLE Roles ADD INDEX idx_role_name (role_name);

-- ============================================
-- USERS TABLE
-- ============================================
-- Step 1: Add new hash columns
ALTER TABLE Users 
ADD COLUMN user_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN role_id_hash VARCHAR(64);

-- Step 2: Populate hash columns
UPDATE Users u 
JOIN Roles r ON u.role_id = r.role_id_old
SET u.user_id_hash = MD5(CONCAT('user-', u.user_id)),
    u.role_id_hash = r.role_id;

-- Step 3: Drop old columns and constraints
ALTER TABLE Users 
DROP FOREIGN KEY users_ibfk_2,
DROP FOREIGN KEY users_ibfk_3,
DROP FOREIGN KEY users_ibfk_4;

ALTER TABLE Users 
DROP PRIMARY KEY,
CHANGE COLUMN user_id user_id_old INT,
CHANGE COLUMN role_id role_id_old INT,
CHANGE COLUMN user_id_hash user_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN role_id_hash role_id VARCHAR(64) NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE Users 
ADD FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE RESTRICT;

-- Step 5: Drop old columns and recreate indexes
ALTER TABLE Users 
DROP COLUMN user_id_old,
DROP COLUMN role_id_old;

ALTER TABLE Users ADD INDEX idx_username (username);
ALTER TABLE Users ADD INDEX idx_role_id (role_id);

-- ============================================
-- ENTITIES TABLE
-- ============================================
ALTER TABLE Entities 
ADD COLUMN entity_id_hash VARCHAR(64) UNIQUE;

UPDATE Entities SET entity_id_hash = MD5(CONCAT('entity-', entity_id));

ALTER TABLE Entities 
DROP PRIMARY KEY,
CHANGE COLUMN entity_id entity_id_old INT,
CHANGE COLUMN entity_id_hash entity_id VARCHAR(64) PRIMARY KEY;

ALTER TABLE Entities ADD INDEX idx_entity_name (entity_name);

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
-- Step 1: Add new hash columns
ALTER TABLE Applications 
ADD COLUMN application_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN entity_id_hash VARCHAR(64),
ADD COLUMN creator_id_hash VARCHAR(64),
ADD COLUMN assessor_id_hash VARCHAR(64),
ADD COLUMN approver_id_hash VARCHAR(64);

-- Step 2: Populate hash columns
UPDATE Applications a
LEFT JOIN Entities e ON a.entity_id = e.entity_id_old
LEFT JOIN Users u1 ON a.creator_id = u1.user_id_old
LEFT JOIN Users u2 ON a.assessor_id = u2.user_id_old
LEFT JOIN Users u3 ON a.approver_id = u3.user_id_old
SET a.application_id_hash = MD5(CONCAT('app-', a.application_id)),
    a.entity_id_hash = COALESCE(e.entity_id, ''),
    a.creator_id_hash = COALESCE(u1.user_id, ''),
    a.assessor_id_hash = COALESCE(u2.user_id, ''),
    a.approver_id_hash = COALESCE(u3.user_id, '');

-- Step 3: Drop old columns
ALTER TABLE Applications 
DROP FOREIGN KEY applications_ibfk_1,
DROP FOREIGN KEY applications_ibfk_2,
DROP FOREIGN KEY applications_ibfk_3,
DROP FOREIGN KEY applications_ibfk_4;

ALTER TABLE Applications 
DROP PRIMARY KEY,
CHANGE COLUMN application_id application_id_old INT,
CHANGE COLUMN entity_id entity_id_old INT,
CHANGE COLUMN creator_id creator_id_old INT,
CHANGE COLUMN assessor_id assessor_id_old INT,
CHANGE COLUMN approver_id approver_id_old INT,
CHANGE COLUMN application_id_hash application_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN entity_id_hash entity_id VARCHAR(64) NOT NULL,
CHANGE COLUMN creator_id_hash creator_id VARCHAR(64) NOT NULL,
CHANGE COLUMN assessor_id_hash assessor_id VARCHAR(64),
CHANGE COLUMN approver_id_hash approver_id VARCHAR(64);

-- Step 4: Add foreign keys
ALTER TABLE Applications 
ADD FOREIGN KEY (entity_id) REFERENCES Entities(entity_id) ON DELETE RESTRICT,
ADD FOREIGN KEY (creator_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
ADD FOREIGN KEY (assessor_id) REFERENCES Users(user_id) ON DELETE SET NULL,
ADD FOREIGN KEY (approver_id) REFERENCES Users(user_id) ON DELETE SET NULL;

-- Step 5: Drop old columns and recreate indexes
ALTER TABLE Applications 
DROP COLUMN application_id_old,
DROP COLUMN entity_id_old,
DROP COLUMN creator_id_old,
DROP COLUMN assessor_id_old,
DROP COLUMN approver_id_old;

ALTER TABLE Applications ADD INDEX idx_status (status);
ALTER TABLE Applications ADD INDEX idx_entity_id (entity_id);
ALTER TABLE Applications ADD INDEX idx_creator_id (creator_id);
ALTER TABLE Applications ADD INDEX idx_assessor_id (assessor_id);
ALTER TABLE Applications ADD INDEX idx_approver_id (approver_id);

-- ============================================
-- APPLICATION_PARAMETERS TABLE
-- ============================================
ALTER TABLE Application_Parameters 
ADD COLUMN parameter_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN application_id_hash VARCHAR(64);

UPDATE Application_Parameters ap
JOIN Applications a ON ap.application_id = a.application_id_old
SET ap.parameter_id_hash = MD5(CONCAT('param-', ap.parameter_id)),
    ap.application_id_hash = a.application_id;

ALTER TABLE Application_Parameters 
DROP FOREIGN KEY application_parameters_ibfk_1;

ALTER TABLE Application_Parameters 
DROP PRIMARY KEY,
CHANGE COLUMN parameter_id parameter_id_old INT,
CHANGE COLUMN application_id application_id_old INT,
CHANGE COLUMN parameter_id_hash parameter_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN application_id_hash application_id VARCHAR(64) NOT NULL;

ALTER TABLE Application_Parameters 
ADD FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE;

ALTER TABLE Application_Parameters 
DROP COLUMN parameter_id_old,
DROP COLUMN application_id_old;

ALTER TABLE Application_Parameters ADD INDEX idx_application_id (application_id);
ALTER TABLE Application_Parameters ADD INDEX idx_param_name (param_name);

-- ============================================
-- FEES_CATEGORIES TABLE
-- ============================================
ALTER TABLE Fees_Categories 
ADD COLUMN category_id_hash VARCHAR(64) UNIQUE;

UPDATE Fees_Categories SET category_id_hash = MD5(CONCAT('cat-', category_id));

ALTER TABLE Fees_Categories 
DROP PRIMARY KEY,
CHANGE COLUMN category_id category_id_old INT,
CHANGE COLUMN category_id_hash category_id VARCHAR(64) PRIMARY KEY;

ALTER TABLE Fees_Categories ADD INDEX idx_category_name (category_name);

-- ============================================
-- FEES_CHARGES TABLE
-- ============================================
ALTER TABLE Fees_Charges 
ADD COLUMN fee_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN category_id_hash VARCHAR(64);

UPDATE Fees_Charges fc
JOIN Fees_Categories fc2 ON fc.category_id = fc2.category_id_old
SET fc.fee_id_hash = MD5(CONCAT('fee-', fc.fee_id)),
    fc.category_id_hash = fc2.category_id;

ALTER TABLE Fees_Charges 
DROP FOREIGN KEY fees_charges_ibfk_1;

ALTER TABLE Fees_Charges 
DROP PRIMARY KEY,
CHANGE COLUMN fee_id fee_id_old INT,
CHANGE COLUMN category_id category_id_old INT,
CHANGE COLUMN fee_id_hash fee_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN category_id_hash category_id VARCHAR(64) NOT NULL;

ALTER TABLE Fees_Charges 
ADD FOREIGN KEY (category_id) REFERENCES Fees_Categories(category_id) ON DELETE RESTRICT;

ALTER TABLE Fees_Charges 
DROP COLUMN fee_id_old,
DROP COLUMN category_id_old;

ALTER TABLE Fees_Charges ADD INDEX idx_category_id (category_id);

-- ============================================
-- ASSESSED_FEES TABLE
-- ============================================
ALTER TABLE Assessed_Fees 
ADD COLUMN assessed_fee_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN application_id_hash VARCHAR(64),
ADD COLUMN fee_id_hash VARCHAR(64),
ADD COLUMN assessed_by_user_id_hash VARCHAR(64);

UPDATE Assessed_Fees af
JOIN Applications a ON af.application_id = a.application_id_old
JOIN Fees_Charges fc ON af.fee_id = fc.fee_id_old
JOIN Users u ON af.assessed_by_user_id = u.user_id_old
SET af.assessed_fee_id_hash = MD5(CONCAT('afee-', af.assessed_fee_id)),
    af.application_id_hash = a.application_id,
    af.fee_id_hash = fc.fee_id,
    af.assessed_by_user_id_hash = u.user_id;

ALTER TABLE Assessed_Fees 
DROP FOREIGN KEY assessed_fees_ibfk_1,
DROP FOREIGN KEY assessed_fees_ibfk_2,
DROP FOREIGN KEY assessed_fees_ibfk_3;

ALTER TABLE Assessed_Fees 
DROP PRIMARY KEY,
CHANGE COLUMN assessed_fee_id assessed_fee_id_old INT,
CHANGE COLUMN application_id application_id_old INT,
CHANGE COLUMN fee_id fee_id_old INT,
CHANGE COLUMN assessed_by_user_id assessed_by_user_id_old INT,
CHANGE COLUMN assessed_fee_id_hash assessed_fee_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN application_id_hash application_id VARCHAR(64) NOT NULL,
CHANGE COLUMN fee_id_hash fee_id VARCHAR(64) NOT NULL,
CHANGE COLUMN assessed_by_user_id_hash assessed_by_user_id VARCHAR(64) NOT NULL;

ALTER TABLE Assessed_Fees 
ADD FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
ADD FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT,
ADD FOREIGN KEY (assessed_by_user_id) REFERENCES Users(user_id) ON DELETE RESTRICT;

ALTER TABLE Assessed_Fees 
DROP COLUMN assessed_fee_id_old,
DROP COLUMN application_id_old,
DROP COLUMN fee_id_old,
DROP COLUMN assessed_by_user_id_old;

ALTER TABLE Assessed_Fees ADD INDEX idx_application_id (application_id);
ALTER TABLE Assessed_Fees ADD INDEX idx_fee_id (fee_id);

-- ============================================
-- AUDIT_TRAIL TABLE
-- ============================================
ALTER TABLE Audit_Trail 
ADD COLUMN log_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN user_id_hash VARCHAR(64),
ADD COLUMN application_id_hash VARCHAR(64);

UPDATE Audit_Trail at2
LEFT JOIN Users u ON at2.user_id = u.user_id_old
LEFT JOIN Applications a ON at2.application_id = a.application_id_old
SET at2.log_id_hash = MD5(CONCAT('log-', at2.log_id)),
    at2.user_id_hash = COALESCE(u.user_id, ''),
    at2.application_id_hash = COALESCE(a.application_id, '');

ALTER TABLE Audit_Trail 
DROP FOREIGN KEY audit_trail_ibfk_1,
DROP FOREIGN KEY audit_trail_ibfk_2;

ALTER TABLE Audit_Trail 
DROP PRIMARY KEY,
CHANGE COLUMN log_id log_id_old INT,
CHANGE COLUMN user_id user_id_old INT,
CHANGE COLUMN application_id application_id_old INT,
CHANGE COLUMN log_id_hash log_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN user_id_hash user_id VARCHAR(64) NOT NULL,
CHANGE COLUMN application_id_hash application_id VARCHAR(64);

ALTER TABLE Audit_Trail 
ADD FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
ADD FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE SET NULL;

ALTER TABLE Audit_Trail 
DROP COLUMN log_id_old,
DROP COLUMN user_id_old,
DROP COLUMN application_id_old;

ALTER TABLE Audit_Trail ADD INDEX idx_user_id (user_id);
ALTER TABLE Audit_Trail ADD INDEX idx_application_id (application_id);
ALTER TABLE Audit_Trail ADD INDEX idx_action (action);
ALTER TABLE Audit_Trail ADD INDEX idx_timestamp (timestamp);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
ALTER TABLE Notifications 
ADD COLUMN notification_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN user_id_hash VARCHAR(64);

UPDATE Notifications n
JOIN Users u ON n.user_id = u.user_id_old
SET n.notification_id_hash = MD5(CONCAT('notif-', n.notification_id)),
    n.user_id_hash = u.user_id;

ALTER TABLE Notifications 
DROP FOREIGN KEY notifications_ibfk_1;

ALTER TABLE Notifications 
DROP PRIMARY KEY,
CHANGE COLUMN notification_id notification_id_old INT,
CHANGE COLUMN user_id user_id_old INT,
CHANGE COLUMN notification_id_hash notification_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN user_id_hash user_id VARCHAR(64) NOT NULL;

ALTER TABLE Notifications 
ADD FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE;

ALTER TABLE Notifications 
DROP COLUMN notification_id_old,
DROP COLUMN user_id_old;

ALTER TABLE Notifications ADD INDEX idx_user_id (user_id);
ALTER TABLE Notifications ADD INDEX idx_is_read (is_read);
ALTER TABLE Notifications ADD INDEX idx_created_at (created_at);

-- ============================================
-- MESSAGES TABLE
-- ============================================
ALTER TABLE Messages 
ADD COLUMN message_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN sender_id_hash VARCHAR(64),
ADD COLUMN recipient_id_hash VARCHAR(64),
ADD COLUMN application_context_id_hash VARCHAR(64);

UPDATE Messages m
JOIN Users u1 ON m.sender_id = u1.user_id_old
JOIN Users u2 ON m.recipient_id = u2.user_id_old
LEFT JOIN Applications a ON m.application_context_id = a.application_id_old
SET m.message_id_hash = MD5(CONCAT('msg-', m.message_id)),
    m.sender_id_hash = u1.user_id,
    m.recipient_id_hash = u2.user_id,
    m.application_context_id_hash = COALESCE(a.application_id, '');

ALTER TABLE Messages 
DROP FOREIGN KEY messages_ibfk_1,
DROP FOREIGN KEY messages_ibfk_2,
DROP FOREIGN KEY messages_ibfk_3;

ALTER TABLE Messages 
DROP PRIMARY KEY,
CHANGE COLUMN message_id message_id_old INT,
CHANGE COLUMN sender_id sender_id_old INT,
CHANGE COLUMN recipient_id recipient_id_old INT,
CHANGE COLUMN application_context_id application_context_id_old INT,
CHANGE COLUMN message_id_hash message_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN sender_id_hash sender_id VARCHAR(64) NOT NULL,
CHANGE COLUMN recipient_id_hash recipient_id VARCHAR(64) NOT NULL,
CHANGE COLUMN application_context_id_hash application_context_id VARCHAR(64);

ALTER TABLE Messages 
ADD FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
ADD FOREIGN KEY (recipient_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
ADD FOREIGN KEY (application_context_id) REFERENCES Applications(application_id) ON DELETE SET NULL;

ALTER TABLE Messages 
DROP COLUMN message_id_old,
DROP COLUMN sender_id_old,
DROP COLUMN recipient_id_old,
DROP COLUMN application_context_id_old;

ALTER TABLE Messages ADD INDEX idx_sender_id (sender_id);
ALTER TABLE Messages ADD INDEX idx_recipient_id (recipient_id);
ALTER TABLE Messages ADD INDEX idx_application_context_id (application_context_id);
ALTER TABLE Messages ADD INDEX idx_timestamp (timestamp);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
ALTER TABLE Payments 
ADD COLUMN payment_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN application_id_hash VARCHAR(64),
ADD COLUMN recorded_by_user_id_hash VARCHAR(64);

UPDATE Payments p
JOIN Applications a ON p.application_id = a.application_id_old
JOIN Users u ON p.recorded_by_user_id = u.user_id_old
SET p.payment_id_hash = MD5(CONCAT('pay-', p.payment_id)),
    p.application_id_hash = a.application_id,
    p.recorded_by_user_id_hash = u.user_id;

ALTER TABLE Payments 
DROP FOREIGN KEY payments_ibfk_1,
DROP FOREIGN KEY payments_ibfk_2;

ALTER TABLE Payments 
DROP PRIMARY KEY,
CHANGE COLUMN payment_id payment_id_old INT,
CHANGE COLUMN application_id application_id_old INT,
CHANGE COLUMN recorded_by_user_id recorded_by_user_id_old INT,
CHANGE COLUMN payment_id_hash payment_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN application_id_hash application_id VARCHAR(64) NOT NULL,
CHANGE COLUMN recorded_by_user_id_hash recorded_by_user_id VARCHAR(64) NOT NULL;

ALTER TABLE Payments 
ADD FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
ADD FOREIGN KEY (recorded_by_user_id) REFERENCES Users(user_id) ON DELETE RESTRICT;

ALTER TABLE Payments 
DROP COLUMN payment_id_old,
DROP COLUMN application_id_old,
DROP COLUMN recorded_by_user_id_old;

ALTER TABLE Payments ADD INDEX idx_application_id (application_id);
ALTER TABLE Payments ADD INDEX idx_official_receipt_no (official_receipt_no);

-- ============================================
-- PERMIT_TYPES TABLE
-- ============================================
ALTER TABLE Permit_Types 
ADD COLUMN permit_type_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN attribute_id_hash VARCHAR(64);

UPDATE Permit_Types pt
LEFT JOIN Attributes a ON pt.attribute_id = a.attribute_id_old
SET pt.permit_type_id_hash = MD5(CONCAT('ptype-', pt.permit_type_id)),
    pt.attribute_id_hash = COALESCE(a.attribute_id, '');

ALTER TABLE Permit_Types 
DROP PRIMARY KEY,
CHANGE COLUMN permit_type_id permit_type_id_old INT,
CHANGE COLUMN attribute_id attribute_id_old INT,
CHANGE COLUMN permit_type_id_hash permit_type_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN attribute_id_hash attribute_id VARCHAR(64);

ALTER TABLE Permit_Types 
DROP COLUMN permit_type_id_old,
DROP COLUMN attribute_id_old;

ALTER TABLE Permit_Types ADD INDEX idx_permit_type_name (permit_type_name);
ALTER TABLE Permit_Types ADD INDEX idx_is_active (is_active);

-- ============================================
-- PERMIT_TYPE_FEES TABLE
-- ============================================
ALTER TABLE Permit_Type_Fees 
ADD COLUMN permit_type_fee_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN permit_type_id_hash VARCHAR(64),
ADD COLUMN fee_id_hash VARCHAR(64);

UPDATE Permit_Type_Fees ptf
JOIN Permit_Types pt ON ptf.permit_type_id = pt.permit_type_id_old
JOIN Fees_Charges fc ON ptf.fee_id = fc.fee_id_old
SET ptf.permit_type_fee_id_hash = MD5(CONCAT('ptfee-', ptf.permit_type_fee_id)),
    ptf.permit_type_id_hash = pt.permit_type_id,
    ptf.fee_id_hash = fc.fee_id;

ALTER TABLE Permit_Type_Fees 
DROP FOREIGN KEY permit_type_fees_ibfk_1,
DROP FOREIGN KEY permit_type_fees_ibfk_2;

ALTER TABLE Permit_Type_Fees 
DROP PRIMARY KEY,
CHANGE COLUMN permit_type_fee_id permit_type_fee_id_old INT,
CHANGE COLUMN permit_type_id permit_type_id_old INT,
CHANGE COLUMN fee_id fee_id_old INT,
CHANGE COLUMN permit_type_fee_id_hash permit_type_fee_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN permit_type_id_hash permit_type_id VARCHAR(64) NOT NULL,
CHANGE COLUMN fee_id_hash fee_id VARCHAR(64) NOT NULL;

ALTER TABLE Permit_Type_Fees 
ADD FOREIGN KEY (permit_type_id) REFERENCES Permit_Types(permit_type_id) ON DELETE CASCADE,
ADD FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT;

ALTER TABLE Permit_Type_Fees 
DROP COLUMN permit_type_fee_id_old,
DROP COLUMN permit_type_id_old,
DROP COLUMN fee_id_old;

ALTER TABLE Permit_Type_Fees ADD INDEX idx_permit_type_id (permit_type_id);
ALTER TABLE Permit_Type_Fees ADD INDEX idx_fee_id (fee_id);

-- ============================================
-- ATTRIBUTES TABLE
-- ============================================
ALTER TABLE Attributes 
ADD COLUMN attribute_id_hash VARCHAR(64) UNIQUE;

UPDATE Attributes SET attribute_id_hash = MD5(CONCAT('attr-', attribute_id));

ALTER TABLE Attributes 
DROP PRIMARY KEY,
CHANGE COLUMN attribute_id attribute_id_old INT,
CHANGE COLUMN attribute_id_hash attribute_id VARCHAR(64) PRIMARY KEY;

ALTER TABLE Attributes ADD INDEX idx_attribute_name (attribute_name);
ALTER TABLE Attributes ADD INDEX idx_is_active (is_active);

-- ============================================
-- ASSESSMENT_RULES TABLE
-- ============================================
ALTER TABLE Assessment_Rules 
ADD COLUMN rule_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN permit_type_id_hash VARCHAR(64);

UPDATE Assessment_Rules ar
JOIN Permit_Types pt ON ar.permit_type_id = pt.permit_type_id_old
SET ar.rule_id_hash = MD5(CONCAT('rule-', ar.rule_id)),
    ar.permit_type_id_hash = pt.permit_type_id;

ALTER TABLE Assessment_Rules 
DROP FOREIGN KEY assessment_rules_ibfk_1;

ALTER TABLE Assessment_Rules 
DROP PRIMARY KEY,
CHANGE COLUMN rule_id rule_id_old INT,
CHANGE COLUMN permit_type_id permit_type_id_old INT,
CHANGE COLUMN rule_id_hash rule_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN permit_type_id_hash permit_type_id VARCHAR(64) NOT NULL;

ALTER TABLE Assessment_Rules 
ADD FOREIGN KEY (permit_type_id) REFERENCES Permit_Types(permit_type_id) ON DELETE CASCADE;

ALTER TABLE Assessment_Rules 
DROP COLUMN rule_id_old,
DROP COLUMN permit_type_id_old;

ALTER TABLE Assessment_Rules ADD INDEX idx_permit_type_id (permit_type_id);
ALTER TABLE Assessment_Rules ADD INDEX idx_attribute (attribute);
ALTER TABLE Assessment_Rules ADD INDEX idx_is_active (is_active);

-- ============================================
-- ASSESSMENT_RULE_FEES TABLE
-- ============================================
ALTER TABLE Assessment_Rule_Fees 
ADD COLUMN rule_fee_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN rule_id_hash VARCHAR(64);

UPDATE Assessment_Rule_Fees arf
JOIN Assessment_Rules ar ON arf.rule_id = ar.rule_id_old
SET arf.rule_fee_id_hash = MD5(CONCAT('rfee-', arf.rule_fee_id)),
    arf.rule_id_hash = ar.rule_id;

ALTER TABLE Assessment_Rule_Fees 
DROP FOREIGN KEY assessment_rule_fees_ibfk_1;

ALTER TABLE Assessment_Rule_Fees 
DROP PRIMARY KEY,
CHANGE COLUMN rule_fee_id rule_fee_id_old INT,
CHANGE COLUMN rule_id rule_id_old INT,
CHANGE COLUMN rule_fee_id_hash rule_fee_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN rule_id_hash rule_id VARCHAR(64) NOT NULL;

ALTER TABLE Assessment_Rule_Fees 
ADD FOREIGN KEY (rule_id) REFERENCES Assessment_Rules(rule_id) ON DELETE CASCADE;

ALTER TABLE Assessment_Rule_Fees 
DROP COLUMN rule_fee_id_old,
DROP COLUMN rule_id_old;

ALTER TABLE Assessment_Rule_Fees ADD INDEX idx_rule_id (rule_id);
ALTER TABLE Assessment_Rule_Fees ADD INDEX idx_fee_order (fee_order);

-- ============================================
-- ASSESSMENT_RECORDS TABLE
-- ============================================
ALTER TABLE Assessment_Records 
ADD COLUMN assessment_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN application_id_hash VARCHAR(64),
ADD COLUMN prepared_by_user_id_hash VARCHAR(64),
ADD COLUMN approved_by_user_id_hash VARCHAR(64);

UPDATE Assessment_Records ar2
JOIN Applications a ON ar2.application_id = a.application_id_old
LEFT JOIN Users u1 ON ar2.prepared_by_user_id = u1.user_id_old
LEFT JOIN Users u2 ON ar2.approved_by_user_id = u2.user_id_old
SET ar2.assessment_id_hash = MD5(CONCAT('assess-', ar2.assessment_id)),
    ar2.application_id_hash = a.application_id,
    ar2.prepared_by_user_id_hash = COALESCE(u1.user_id, ''),
    ar2.approved_by_user_id_hash = COALESCE(u2.user_id, '');

ALTER TABLE Assessment_Records 
DROP FOREIGN KEY assessment_records_ibfk_1,
DROP FOREIGN KEY assessment_records_ibfk_2,
DROP FOREIGN KEY assessment_records_ibfk_3;

ALTER TABLE Assessment_Records 
DROP PRIMARY KEY,
CHANGE COLUMN assessment_id assessment_id_old INT,
CHANGE COLUMN application_id application_id_old INT,
CHANGE COLUMN prepared_by_user_id prepared_by_user_id_old INT,
CHANGE COLUMN approved_by_user_id approved_by_user_id_old INT,
CHANGE COLUMN assessment_id_hash assessment_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN application_id_hash application_id VARCHAR(64) NOT NULL,
CHANGE COLUMN prepared_by_user_id_hash prepared_by_user_id VARCHAR(64),
CHANGE COLUMN approved_by_user_id_hash approved_by_user_id VARCHAR(64);

ALTER TABLE Assessment_Records 
ADD FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
ADD FOREIGN KEY (prepared_by_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
ADD FOREIGN KEY (approved_by_user_id) REFERENCES Users(user_id) ON DELETE SET NULL;

ALTER TABLE Assessment_Records 
DROP COLUMN assessment_id_old,
DROP COLUMN application_id_old,
DROP COLUMN prepared_by_user_id_old,
DROP COLUMN approved_by_user_id_old;

ALTER TABLE Assessment_Records ADD INDEX idx_application_id (application_id);
ALTER TABLE Assessment_Records ADD INDEX idx_app_date (app_date);

-- ============================================
-- ASSESSMENT_RECORD_FEES TABLE
-- ============================================
ALTER TABLE Assessment_Record_Fees 
ADD COLUMN record_fee_id_hash VARCHAR(64) UNIQUE,
ADD COLUMN assessment_id_hash VARCHAR(64),
ADD COLUMN fee_id_hash VARCHAR(64);

UPDATE Assessment_Record_Fees arf
JOIN Assessment_Records ar2 ON arf.assessment_id = ar2.assessment_id_old
JOIN Fees_Charges fc ON arf.fee_id = fc.fee_id_old
SET arf.record_fee_id_hash = MD5(CONCAT('rfee-', arf.record_fee_id)),
    arf.assessment_id_hash = ar2.assessment_id,
    arf.fee_id_hash = fc.fee_id;

ALTER TABLE Assessment_Record_Fees 
DROP FOREIGN KEY assessment_record_fees_ibfk_1,
DROP FOREIGN KEY assessment_record_fees_ibfk_2;

ALTER TABLE Assessment_Record_Fees 
DROP PRIMARY KEY,
CHANGE COLUMN record_fee_id record_fee_id_old INT,
CHANGE COLUMN assessment_id assessment_id_old INT,
CHANGE COLUMN fee_id fee_id_old INT,
CHANGE COLUMN record_fee_id_hash record_fee_id VARCHAR(64) PRIMARY KEY,
CHANGE COLUMN assessment_id_hash assessment_id VARCHAR(64) NOT NULL,
CHANGE COLUMN fee_id_hash fee_id VARCHAR(64) NOT NULL;

ALTER TABLE Assessment_Record_Fees 
ADD FOREIGN KEY (assessment_id) REFERENCES Assessment_Records(assessment_id) ON DELETE CASCADE,
ADD FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT;

ALTER TABLE Assessment_Record_Fees 
DROP COLUMN record_fee_id_old,
DROP COLUMN assessment_id_old,
DROP COLUMN fee_id_old;

ALTER TABLE Assessment_Record_Fees ADD INDEX idx_assessment_id (assessment_id);
ALTER TABLE Assessment_Record_Fees ADD INDEX idx_fee_id (fee_id);

-- ============================================
-- SYSTEM_SETTINGS TABLE
-- ============================================
ALTER TABLE System_Settings 
ADD COLUMN setting_id_hash VARCHAR(64) UNIQUE;

UPDATE System_Settings SET setting_id_hash = MD5(CONCAT('setting-', setting_id));

ALTER TABLE System_Settings 
DROP PRIMARY KEY,
CHANGE COLUMN setting_id setting_id_old INT,
CHANGE COLUMN setting_id_hash setting_id VARCHAR(64) PRIMARY KEY;

ALTER TABLE System_Settings ADD INDEX idx_setting_key (setting_key);

-- 2. Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Migration completed successfully
SELECT 'Hash-based ID migration completed successfully' AS status;
