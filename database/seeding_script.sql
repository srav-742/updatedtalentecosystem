-- ====================================================================
-- DATABASE CLEANUP & SEEDING SCRIPT FOR AUTH-SERVICE (MYSQL)
-- Run this in your MySQL database ('authorization' database)
-- ====================================================================

-- STEP 1: CLEAN UP EXISTING TESTING DATA (Clients, Sessions, and Roles mappings)
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE auth_session;
TRUNCATE TABLE auth_session_log;
TRUNCATE TABLE client_roles;
TRUNCATE TABLE client;
TRUNCATE TABLE resource_roles;
TRUNCATE TABLE resources;
TRUNCATE TABLE roles;

SET FOREIGN_KEY_CHECKS = 1;

-- STEP 2: SEED CORE SYSTEM ROLES
INSERT INTO roles (name, is_active) VALUES ('RECRUITER_VIEW_APPLICANTS', 1);

-- STEP 3: REGISTER DOWNSTREAM PROTECTED RESOURCES
-- The 'service' name corresponds to the first segment in the gateway path.
-- The 'path' corresponds to the rewritten path forwarded downstream.
INSERT INTO resources (name, service, path) 
VALUES ('View Applications Endpoint', 'backend_service', '/api/applications');

-- STEP 4: LINK RESOURCES TO ROLES
INSERT INTO resource_roles (resource_id, role_id, is_active)
VALUES (
    (SELECT id FROM resources WHERE path = '/api/applications' AND service = 'backend_service'),
    (SELECT id FROM roles WHERE name = 'RECRUITER_VIEW_APPLICANTS'),
    1
);

-- ====================================================================
-- CLIENT & CLIENT ROLES MANAGEMENT TEMPLATES (MYSQL)
-- ====================================================================

-- 1. CREATE CLIENT (Template & Sanjay Recruiter Example)
-- Template:
-- INSERT INTO client (client_id, client_name, client_secret) 
-- VALUES ('your_client_id', 'Client Name', 'client_secret');

-- Example (Sanjay Recruiter):
-- INSERT INTO client (client_id, client_name, client_secret) 
-- VALUES ('client_Vxt80WooRYdH8paz58b7N0eTfdq1', 'Sanjay Recruiter', 'sanjay_secret_key_2026');


-- 2. ASSIGN ROLES TO CLIENT
-- Grant View Applicants Access (RECRUITER_VIEW_APPLICANTS):
-- INSERT INTO client_roles (client_id, role_id, is_active) 
-- VALUES (
--     (SELECT id FROM client WHERE client_id = 'client_Vxt80WooRYdH8paz58b7N0eTfdq1'), 
--     (SELECT id FROM roles WHERE name = 'RECRUITER_VIEW_APPLICANTS'), 
--     1
-- );


-- 3. CHECK CLIENTS AND ASSIGNED ROLES
-- View all clients:
-- SELECT * FROM client;

-- View all client role mappings:
-- SELECT * FROM client_roles;

-- View joined table showing client name and their active roles:
-- SELECT c.client_name, c.client_id, r.name AS role_name, cr.is_active 
-- FROM client_roles cr 
-- JOIN client c ON cr.client_id = c.id 
-- JOIN roles r ON cr.role_id = r.id;


-- 4. DELETE / REVOKE ACCESS
-- Hard Delete all role mappings for a client:
-- DELETE FROM client_roles 
-- WHERE client_id = (SELECT id FROM client WHERE client_id = 'client_Vxt80WooRYdH8paz58b7N0eTfdq1');

-- Delete a client entirely:
-- DELETE FROM client WHERE client_id = 'client_Vxt80WooRYdH8paz58b7N0eTfdq1';

--DELETE FROM client_roles 
--WHERE client_id = 1 AND role_id = 1;

--INSERT INTO client_roles (client_id, role_id, is_active)
--VALUES (2, 2, 1);

-- ====================================================================

