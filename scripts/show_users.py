import os
import sys
import sqlite3

# Try finding DB in current dir or backend/
db_candidates = [
    os.path.join(os.path.dirname(__file__), "..", "backend", "expense_tracker.db"),
    os.path.join(os.path.dirname(__file__), "..", "expense_tracker.db"),
    "backend/expense_tracker.db",
    "expense_tracker.db",
]

db_path = None
for p in db_candidates:
    abs_p = os.path.abspath(p)
    if os.path.exists(abs_p):
        db_path = abs_p
        break

if not db_path:
    print("Error: Could not locate expense_tracker.db database file.")
    sys.exit(1)

print("=" * 110)
print(f"DATABASE FILE: {db_path}")
print("SQL QUERY: SELECT id, email, full_name, currency, is_active, is_verified, created_at FROM users ORDER BY id ASC;")
print("=" * 110)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT id, email, full_name, currency, theme, is_active, is_verified, created_at FROM users ORDER BY id ASC;")
rows = cur.fetchall()

header = f"{'ID':<4} | {'EMAIL':<30} | {'FULL NAME':<24} | {'CURRENCY':<8} | {'THEME':<8} | {'ACTIVE':<6} | {'VERIFIED':<8}"
print(header)
print("-" * 110)

for r in rows:
    print(f"{r['id']:<4} | {r['email']:<30} | {r['full_name']:<24} | {r['currency']:<8} | {r['theme']:<8} | {str(bool(r['is_active'])):<6} | {str(bool(r['is_verified'])):<8}")

print("-" * 110)
print(f"TOTAL USERS IN DATABASE: {len(rows)}")
print("=" * 110)
conn.close()
