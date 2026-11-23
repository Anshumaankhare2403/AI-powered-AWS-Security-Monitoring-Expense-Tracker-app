-- ==============================================================================
-- AMAZON RDS MYSQL SEEDING SCRIPT FOR EXPENSE TRACKER USERS
-- Target: dev-expense-tracker-mysql.c2l604kqkskw.us-east-1.rds.amazonaws.com:3306
-- Database: expensetracker
-- ==============================================================================

USE expensetracker;

-- 1. Ensure `users` table exists in Amazon RDS MySQL
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(500) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    reset_token VARCHAR(255) NULL,
    reset_token_expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insert all 16 users (Password for all accounts is 'Password123!')
-- Hash: $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
INSERT IGNORE INTO users (id, email, hashed_password, full_name, currency, theme, is_active, is_verified) VALUES
(1,  'testuser_suite@example.com',   '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Test Suite User',       'USD', 'system', 1, 1),
(2,  'user_b_isolation@example.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User B',                 'EUR', 'system', 1, 1),
(3,  'sec_test_user@example.com',    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Security Test User',    'USD', 'system', 1, 1),
(4,  'demo@example.com',             '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Demo Auditor',          'INR', 'system', 1, 1),
(5,  'admin@example.com',            '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Admin Lead',            'INR', 'system', 1, 1),
(6,  'localuser@example.com',        '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Local User',            'INR', 'system', 1, 1),
(7,  'govind@example.com',           '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Govind Developer',      'INR', 'dark',   1, 1),
(8,  'anshumaan@example.com',        '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Anshumaan Khare',       'INR', 'dark',   1, 1),
(9,  'sarah.connor@finops.corp',     '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Sarah Connor',          'USD', 'light',  1, 1),
(10, 'alex.chen@cloudsec.io',        '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Alex Chen',               'USD', 'dark',   1, 1),
(11, 'priya.sharma@techcorp.in',     '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Priya Sharma',          'INR', 'system', 1, 1),
(12, 'marcus.vance@defense.net',     '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Marcus Vance',          'EUR', 'dark',   1, 1),
(13, 'elena.rostova@devops.global',  '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Elena Rostova',         'EUR', 'light',  1, 1),
(14, 'david.kim@audit.internal',     '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'David Kim',             'USD', 'system', 1, 1),
(15, 'rachel.green@startup.co',      '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Rachel Green',          'USD', 'light',  1, 1),
(16, 'arjun.mehta@enterprise.in',    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Arjun Mehta',           'INR', 'dark',   1, 1);

-- 3. Verification Query
SELECT id, email, full_name, currency, is_active, is_verified, created_at 
FROM users 
ORDER BY id ASC;
