import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    # Register test user
    email = "testuser_suite@example.com"
    pwd = "TestPassword123!"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "Test Suite User",
        "currency": "USD",
    })
    if reg_res.status_code == 201:
        data = reg_res.json()
        token = data["access_token"]
        user_id = str(data["user"]["id"])
    else:
        # User might already exist in persistent DB, login
        login_res = client.post("/api/auth/login", json={"email": email, "password": pwd})
        data = login_res.json()
        token = data["access_token"]
        user_id = str(data["user"]["id"])
        
    return {
        "Authorization": f"Bearer {token}",
        "X-User-Id": user_id,
    }


@pytest.fixture(scope="module")
def user_b_headers():
    email = "user_b_isolation@example.com"
    pwd = "UserBPassword123!"
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "User B",
        "currency": "EUR",
    })
    if reg_res.status_code == 201:
        data = reg_res.json()
        token = data["access_token"]
        user_id = str(data["user"]["id"])
    else:
        login_res = client.post("/api/auth/login", json={"email": email, "password": pwd})
        data = login_res.json()
        token = data["access_token"]
        user_id = str(data["user"]["id"])
    return {
        "Authorization": f"Bearer {token}",
        "X-User-Id": user_id,
    }


def test_auth_me(auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "testuser_suite@example.com"


def test_categories_api(auth_headers):
    # Get categories
    res = client.get("/api/categories", headers=auth_headers)
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) >= 16

    # Create custom category
    cat_res = client.post("/api/categories", headers=auth_headers, json={
        "name": "Custom Gym",
        "type": "expense",
        "icon": "Dumbbell",
        "color": "#10b981",
    })
    assert cat_res.status_code in [201, 400]


def test_transaction_crud_and_analytics(auth_headers):
    # Fetch an expense category
    cat_res = client.get("/api/categories?type=expense", headers=auth_headers)
    cat_id = cat_res.json()[0]["id"]

    # 1. Create Income
    inc_cat = client.get("/api/categories?type=income", headers=auth_headers).json()[0]["id"]
    client.post("/api/transactions", headers=auth_headers, json={
        "title": "Monthly Salary",
        "amount": 5000.00,
        "type": "income",
        "category_id": inc_cat,
        "transaction_date": "2026-11-01",
        "payment_method": "bank_transfer",
    })

    # 2. Create Expense
    exp_res = client.post("/api/transactions", headers=auth_headers, json={
        "title": "Grocery Shopping",
        "amount": 150.50,
        "type": "expense",
        "category_id": cat_id,
        "transaction_date": "2026-11-05",
        "payment_method": "credit_card",
        "description": "Weekly essentials",
    })
    assert exp_res.status_code == 201
    tx_id = exp_res.json()["id"]

    # 3. Get Transactions List
    list_res = client.get("/api/transactions", headers=auth_headers)
    assert list_res.status_code == 200
    tx_data = list_res.json()
    assert tx_data["total"] >= 1
    assert Decimal(str(tx_data["total_income"])) >= Decimal("5000.00")

    # 4. Analytics Summary
    summary_res = client.get("/api/analytics/summary", headers=auth_headers)
    assert summary_res.status_code == 200
    assert float(summary_res.json()["total_income"]) >= 5000.00

    # 5. Delete Expense
    del_res = client.delete(f"/api/transactions/{tx_id}", headers=auth_headers)
    assert del_res.status_code == 204


def test_budgets_api(auth_headers):
    cat_res = client.get("/api/categories?type=expense", headers=auth_headers)
    cat_id = cat_res.json()[0]["id"]

    # Create or update budget
    b_res = client.post("/api/budgets", headers=auth_headers, json={
        "category_id": cat_id,
        "month": 11,
        "year": 2026,
        "amount": 800.00,
        "alert_threshold": 80,
    })
    assert b_res.status_code in [201, 400]

    # Get budgets
    get_res = client.get("/api/budgets?month=11&year=2026", headers=auth_headers)
    assert get_res.status_code == 200
    assert isinstance(get_res.json(), list)


def test_savings_goals(auth_headers):
    # Create Goal
    goal_res = client.post("/api/goals", headers=auth_headers, json={
        "title": "Vacation Trip",
        "target_amount": 2000.00,
        "initial_amount": 500.00,
        "target_date": "2026-12-31",
        "category": "Travel",
        "color": "#06b6d4",
    })
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]
    assert goal_res.json()["progress_percentage"] == 25.0

    # Add Contribution
    contrib_res = client.post(f"/api/goals/{goal_id}/contributions", headers=auth_headers, json={
        "amount": 250.00,
        "note": "Extra freelance pay",
    })
    assert contrib_res.status_code == 201

    # Verify updated goal
    updated_goal = client.get(f"/api/goals/{goal_id}", headers=auth_headers).json()
    assert float(updated_goal["current_amount"]) == 750.00
    assert updated_goal["progress_percentage"] == 37.5


def test_reports_and_export(auth_headers):
    # Monthly Report
    m_res = client.get("/api/reports/monthly?month=11&year=2026", headers=auth_headers)
    assert m_res.status_code == 200

    # CSV Export
    csv_res = client.get("/api/reports/export?format=csv", headers=auth_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    # PDF Export
    pdf_res = client.get("/api/reports/export?format=pdf", headers=auth_headers)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]


def test_cross_user_isolation(auth_headers, user_b_headers):
    # User A creates a transaction
    inc_cat = client.get("/api/categories?type=income", headers=auth_headers).json()[0]["id"]
    tx_res = client.post("/api/transactions", headers=auth_headers, json={
        "title": "User A Private Bonus",
        "amount": 9999.00,
        "type": "income",
        "category_id": inc_cat,
        "transaction_date": "2026-11-10",
    })
    assert tx_res.status_code == 201
    user_a_tx_id = tx_res.json()["id"]

    # User B attempts to access User A's transaction
    access_attempt = client.get(f"/api/transactions/{user_a_tx_id}", headers=user_b_headers)
    assert access_attempt.status_code == 404, "User B was able to access User A's private transaction!"

    # User B attempts to delete User A's transaction
    delete_attempt = client.delete(f"/api/transactions/{user_a_tx_id}", headers=user_b_headers)
    assert delete_attempt.status_code == 404, "User B was able to delete User A's private transaction!"
