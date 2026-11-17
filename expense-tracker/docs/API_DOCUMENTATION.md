# Expense Tracker & AI-Powered AWS Security Platform - API Documentation

## 1. Overview & Architecture

The Expense Tracker API is built with **Python 3.11** and **FastAPI**, featuring **SQLAlchemy 2.0 ORM**, **Pydantic V2** data validation, **JWT bearer authentication** with token rotation, and **multi-tenant row-level access control**.

- **Base URL**: `http://localhost:8000/api`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Specification**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`
- **Health Check**: `http://localhost:8000/health`

---

## 2. Authentication & Authorization

All protected endpoints require a JWT Bearer token in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```

### 2.1 Register User
- **Endpoint**: `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "full_name": "Jane Doe",
    "currency": "USD"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "Jane Doe",
      "currency": "USD",
      "theme": "light",
      "avatar_url": null,
      "is_active": true,
      "created_at": "2026-11-17T08:00:00Z"
    }
  }
  ```

### 2.2 Login User
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response**: `200 OK` (Returns `access_token`, `refresh_token`, and `user` object)

### 2.3 Refresh Token
- **Endpoint**: `POST /api/auth/refresh`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
- **Response**: `200 OK` (Rotates token: old token is revoked in database, returns new pair)

### 2.4 Forgot Password
- **Endpoint**: `POST /api/auth/forgot-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Password reset token generated.",
    "reset_token": "abcdef12345..."
  }
  ```

### 2.5 Reset Password
- **Endpoint**: `POST /api/auth/reset-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "reset_token": "abcdef12345...",
    "new_password": "NewSecretPassword456!"
  }
  ```
- **Response**: `200 OK`

### 2.6 Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Protected (Bearer Token)
- **Response**: `200 OK` (User profile details)

### 2.7 Update Profile
- **Endpoint**: `PUT /api/auth/profile`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "full_name": "Jane Smith",
    "currency": "EUR",
    "theme": "dark",
    "avatar_url": "https://example.com/photo.jpg"
  }
  ```
- **Response**: `200 OK`

### 2.8 Change Password
- **Endpoint**: `PUT /api/auth/change-password`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "current_password": "OldPassword123!",
    "new_password": "NewPassword456!"
  }
  ```
- **Response**: `200 OK`

---

## 3. Categories API

Manages system-wide default categories and custom user-created categories.

### 3.1 List Categories
- **Endpoint**: `GET /api/categories`
- **Query Parameters**:
  - `type` (optional): `income` or `expense`
- **Access**: Protected
- **Response**: `200 OK` (Array of category items with `id`, `name`, `type`, `icon`, `color`, `is_default`)

### 3.2 Create Custom Category
- **Endpoint**: `POST /api/categories`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "name": "Gym & Fitness",
    "type": "expense",
    "icon": "Dumbbell",
    "color": "#10B981"
  }
  ```
- **Response**: `201 Created`

### 3.3 Update Custom Category
- **Endpoint**: `PUT /api/categories/{id}`
- **Access**: Protected (Only category creator can edit)
- **Response**: `200 OK`

### 3.4 Delete Custom Category
- **Endpoint**: `DELETE /api/categories/{id}`
- **Access**: Protected (Default system categories cannot be deleted)
- **Response**: `200 OK`

---

## 4. Transactions API

Core transaction tracking with search, category filtering, type filtering, pagination, and automated budget limit notifications.

### 4.1 List Transactions
- **Endpoint**: `GET /api/transactions`
- **Query Parameters**:
  - `type` (optional): `income` | `expense`
  - `category_id` (optional): integer
  - `start_date` (optional): `YYYY-MM-DD`
  - `end_date` (optional): `YYYY-MM-DD`
  - `search` (optional): string (searches title, description, notes)
  - `sort_by` (optional): `date` | `amount` | `created_at` (default `date`)
  - `sort_order` (optional): `desc` | `asc` (default `desc`)
  - `page` (optional): integer (default 1)
  - `limit` (optional): integer (default 10, max 100)
- **Response**: `200 OK`
  ```json
  {
    "items": [...],
    "total": 45,
    "page": 1,
    "limit": 10,
    "pages": 5,
    "total_income": "8500.00",
    "total_expense": "3240.50",
    "net_savings": "5259.50"
  }
  ```

### 4.2 Create Transaction
- **Endpoint**: `POST /api/transactions`
- **Access**: Protected
- **Request Body**:
  ```json
  {
    "title": "Grocery Shopping",
    "amount": "125.50",
    "type": "expense",
    "category_id": 1,
    "date": "2026-11-17",
    "payment_method": "credit_card",
    "description": "Weekly supermarket essentials",
    "notes": "Purchased organic vegetables"
  }
  ```
- **Response**: `201 Created`

### 4.3 Get Transaction by ID
- **Endpoint**: `GET /api/transactions/{id}`
- **Access**: Protected

### 4.4 Update Transaction
- **Endpoint**: `PUT /api/transactions/{id}`
- **Access**: Protected

### 4.5 Delete Transaction
- **Endpoint**: `DELETE /api/transactions/{id}`
- **Access**: Protected

---

## 5. Budgets API

Allows users to define monthly category limits and monitor utilization percentages and threshold warnings.

### 5.1 List Budgets
- **Endpoint**: `GET /api/budgets`
- **Query Parameters**:
  - `month` (optional): 1-12 (defaults to current month)
  - `year` (optional): 2020-2100 (defaults to current year)
- **Response**: `200 OK` (Returns list with `spent_amount`, `remaining_amount`, `utilization_percentage`, `is_exceeded`, `is_approaching`)

### 5.2 Create Budget
- **Endpoint**: `POST /api/budgets`
- **Request Body**:
  ```json
  {
    "category_id": 1,
    "amount": "600.00",
    "month": 11,
    "year": 2026,
    "alert_threshold": 80
  }
  ```

### 5.3 Update Budget
- **Endpoint**: `PUT /api/budgets/{id}`

### 5.4 Delete Budget
- **Endpoint**: `DELETE /api/budgets/{id}`

---

## 6. Savings Goals API

Tracks target amounts, milestone progress, and contributions.

### 6.1 List Goals
- **Endpoint**: `GET /api/goals`
- **Response**: `200 OK` (Array with `current_amount`, `progress_percentage`, `remaining_amount`, `is_completed`)

### 6.2 Create Goal
- **Endpoint**: `POST /api/goals`
- **Request Body**:
  ```json
  {
    "title": "Emergency Fund",
    "target_amount": "10000.00",
    "target_date": "2027-12-31",
    "notes": "6 months of living expenses",
    "color": "#4F46E5"
  }
  ```

### 6.3 Update Goal
- **Endpoint**: `PUT /api/goals/{id}`

### 6.4 Delete Goal
- **Endpoint**: `DELETE /api/goals/{id}`

### 6.5 Add Contribution
- **Endpoint**: `POST /api/goals/{id}/contributions`
- **Request Body**:
  ```json
  {
    "amount": "500.00",
    "notes": "November savings deposit"
  }
  ```

---

## 7. Analytics API

Calculates real-time KPIs and time-series metrics.

### 7.1 Financial Summary
- **Endpoint**: `GET /api/analytics/summary`
- **Response**:
  ```json
  {
    "total_balance": "14250.00",
    "total_income": "24000.00",
    "total_expenses": "9750.00",
    "monthly_savings": "2500.00",
    "savings_rate_percentage": 25.64,
    "budget_status": "Healthy"
  }
  ```

### 7.2 Monthly Aggregations
- **Endpoint**: `GET /api/analytics/monthly?year=2026`
- **Response**: 12-month array of `{ month, month_name, income, expense, savings }`

### 7.3 Category Spending Breakdown
- **Endpoint**: `GET /api/analytics/categories?start_date=...&end_date=...`
- **Response**: Array of `{ category_id, category_name, color, amount, percentage }`

### 7.4 Spending Trends
- **Endpoint**: `GET /api/analytics/trends?days=30`
- **Response**: Daily time-series breakdown of income vs expenses.

---

## 8. Reports API

Exporting and aggregate reporting.

### 8.1 Monthly Report
- **Endpoint**: `GET /api/reports/monthly?month=11&year=2026`

### 8.2 Yearly Report
- **Endpoint**: `GET /api/reports/yearly?year=2026`

### 8.3 Streaming File Export
- **Endpoint**: `GET /api/reports/export?format=csv` (or `format=pdf`)
- **Query Parameters**:
  - `format`: `csv` | `pdf`
  - `start_date`, `end_date`, `type`
- **Response**: Binary stream (`text/csv` or `application/pdf`) with `Content-Disposition: attachment`.

---

## 9. Notifications API

- `GET /api/notifications` - Retrieve list of user notifications
- `PUT /api/notifications/{id}/read` - Mark single notification as read
- `POST /api/notifications/read-all` - Mark all notifications as read

---

## 10. Status & Health Check

- `GET /` - API service title and status
- `GET /health` - Database connection verification and schema status
