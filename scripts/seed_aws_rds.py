"""
Amazon RDS MySQL User Seeder
============================
Connects to Amazon RDS MySQL (dev-expense-tracker-mysql) and seeds
all 16 team and system users.
"""

import os
import sys

# Attempt importing pymysql
try:
    import pymysql
except ImportError:
    print("PyMySQL not found. Installing pymysql...")
    os.system(f'"{sys.executable}" -m pip install pymysql cryptography')
    import pymysql

# AWS RDS Configuration
DB_HOST = os.environ.get("DB_HOST", "dev-expense-tracker-mysql.c2l604kqkskw.us-east-1.rds.amazonaws.com")
DB_USER = os.environ.get("DB_USER", "trackeradmin")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "ExpensePass2026Secure!")
DB_NAME = os.environ.get("DB_NAME", "expensetracker")
DB_PORT = int(os.environ.get("DB_PORT", 3306))

HASHED_PW = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"

USERS = [
    (1,  "testuser_suite@example.com",   HASHED_PW, "Test Suite User",    "USD", "system"),
    (2,  "user_b_isolation@example.com", HASHED_PW, "User B",              "EUR", "system"),
    (3,  "sec_test_user@example.com",    HASHED_PW, "Security Test User", "USD", "system"),
    (4,  "demo@example.com",             HASHED_PW, "Demo Auditor",       "INR", "system"),
    (5,  "admin@example.com",            HASHED_PW, "Admin Lead",         "INR", "system"),
    (6,  "localuser@example.com",        HASHED_PW, "Local User",         "INR", "system"),
    (7,  "govind@example.com",           HASHED_PW, "Govind Developer",   "INR", "dark"),
    (8,  "anshumaan@example.com",        HASHED_PW, "Anshumaan Khare",    "INR", "dark"),
    (9,  "sarah.connor@finops.corp",     HASHED_PW, "Sarah Connor",       "USD", "light"),
    (10, "alex.chen@cloudsec.io",        HASHED_PW, "Alex Chen",          "USD", "dark"),
    (11, "priya.sharma@techcorp.in",     HASHED_PW, "Priya Sharma",       "INR", "system"),
    (12, "marcus.vance@defense.net",     HASHED_PW, "Marcus Vance",       "EUR", "dark"),
    (13, "elena.rostova@devops.global",  HASHED_PW, "Elena Rostova",      "EUR", "light"),
    (14, "david.kim@audit.internal",     HASHED_PW, "David Kim",          "USD", "system"),
    (15, "rachel.green@startup.co",      HASHED_PW, "Rachel Green",       "USD", "light"),
    (16, "arjun.mehta@enterprise.in",    HASHED_PW, "Arjun Mehta",        "INR", "dark"),
]

def main():
    print("=" * 80)
    print(f"Connecting to Amazon RDS: {DB_HOST}:{DB_PORT}/{DB_NAME}...")
    print("=" * 80)
    
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT,
            autocommit=True
        )
    except Exception as e:
        print(f"Failed to connect to RDS: {e}")
        print("\nNote: The RDS instance is deployed in a private VPC subnet (publicly_accessible=false).")
        print("To connect, run this script from inside the VPC (e.g., via AWS Systems Manager Session Manager")
        print("on instance i-07494c72890414cc5, or using an AWS SSM port forwarding tunnel).")
        sys.exit(1)

    cur = conn.cursor()
    print("Connected successfully! Creating/Verifying users table...")
    
    cur.execute("""
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
    """)

    inserted = 0
    for u in USERS:
        cur.execute("SELECT id FROM users WHERE email = %s", (u[1],))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO users (id, email, hashed_password, full_name, currency, theme, is_active, is_verified) VALUES (%s, %s, %s, %s, %s, %s, 1, 1)",
                u
            )
            inserted += 1

    print(f"Seeding completed. {inserted} new user(s) inserted.")
    
    cur.execute("SELECT id, email, full_name, currency, is_active FROM users ORDER BY id ASC")
    rows = cur.fetchall()
    print(f"\nTotal users in Amazon RDS: {len(rows)}")
    for r in rows:
        print(f"  User #{r[0]}: {r[1]} ({r[2]}) - Currency: {r[3]} - Active: {bool(r[4])}")

    conn.close()

if __name__ == "__main__":
    main()
