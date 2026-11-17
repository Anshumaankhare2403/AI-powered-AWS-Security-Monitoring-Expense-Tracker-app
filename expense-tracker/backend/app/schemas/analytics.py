from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel


class SummaryAnalytics(BaseModel):
    total_balance: Decimal
    total_income: Decimal
    total_expenses: Decimal
    monthly_savings: Decimal
    savings_rate_percentage: float
    budget_total: Decimal
    budget_spent: Decimal
    budget_remaining: Decimal
    transaction_count: int


class MonthlyTrend(BaseModel):
    month_name: str
    year: int
    month: int
    income: Decimal
    expense: Decimal
    net_savings: Decimal


class CategoryBreakdownItem(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    category_color: str
    amount: Decimal
    percentage: float
    transaction_count: int


class DailyTrendItem(BaseModel):
    date: str
    income: Decimal
    expense: Decimal
