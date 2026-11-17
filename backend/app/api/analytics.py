import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.analytics import (
    CategoryBreakdownItem,
    DailyTrendItem,
    MonthlyTrend,
    SummaryAnalytics,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=SummaryAnalytics)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    current_month = now.month
    current_year = now.year

    # All-time totals
    all_income = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
    ).scalar()

    all_expense = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
    ).scalar()

    total_income = Decimal(str(all_income))
    total_expense = Decimal(str(all_expense))
    total_balance = total_income - total_expense

    # Current month totals
    month_income_raw = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        func.extract("month", Transaction.transaction_date) == current_month,
        func.extract("year", Transaction.transaction_date) == current_year,
    ).scalar()

    month_expense_raw = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        func.extract("month", Transaction.transaction_date) == current_month,
        func.extract("year", Transaction.transaction_date) == current_year,
    ).scalar()

    month_income = Decimal(str(month_income_raw))
    month_expense = Decimal(str(month_expense_raw))
    monthly_savings = month_income - month_expense
    savings_rate = float((monthly_savings / month_income) * 100) if month_income > 0 else 0.0

    # Budget totals for current month
    budget_total_raw = db.query(func.coalesce(func.sum(Budget.amount), 0)).filter(
        Budget.user_id == current_user.id,
        Budget.month == current_month,
        Budget.year == current_year,
    ).scalar()

    budget_total = Decimal(str(budget_total_raw))
    budget_spent = month_expense
    budget_remaining = max(Decimal("0.00"), budget_total - budget_spent)

    tx_count = db.query(func.count(Transaction.id)).filter(
        Transaction.user_id == current_user.id
    ).scalar() or 0

    return SummaryAnalytics(
        total_balance=total_balance,
        total_income=total_income,
        total_expenses=total_expense,
        monthly_savings=monthly_savings,
        savings_rate_percentage=round(savings_rate, 2),
        budget_total=budget_total,
        budget_spent=budget_spent,
        budget_remaining=budget_remaining,
        transaction_count=tx_count,
    )


@router.get("/monthly", response_model=List[MonthlyTrend])
def get_monthly_trends(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    results = []

    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=i * 30)
        m = target_date.month
        y = target_date.year

        inc = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "income",
            func.extract("month", Transaction.transaction_date) == m,
            func.extract("year", Transaction.transaction_date) == y,
        ).scalar()

        exp = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == m,
            func.extract("year", Transaction.transaction_date) == y,
        ).scalar()

        income_dec = Decimal(str(inc))
        expense_dec = Decimal(str(exp))

        results.append(
            MonthlyTrend(
                month_name=calendar.month_abbr[m],
                year=y,
                month=m,
                income=income_dec,
                expense=expense_dec,
                net_savings=income_dec - expense_dec,
            )
        )

    return results


@router.get("/categories", response_model=List[CategoryBreakdownItem])
def get_category_breakdown(
    type: str = Query("expense", pattern="^(income|expense)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(
        Transaction.category_id,
        Category.name.label("category_name"),
        Category.icon.label("category_icon"),
        Category.color.label("category_color"),
        func.sum(Transaction.amount).label("total_amount"),
        func.count(Transaction.id).label("tx_count"),
    ).join(Category, Transaction.category_id == Category.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == type,
    )

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    rows = query.group_by(
        Transaction.category_id, Category.name, Category.icon, Category.color
    ).order_by(func.sum(Transaction.amount).desc()).all()

    total_sum = sum((r.total_amount for r in rows), Decimal("0.00"))

    breakdown = []
    for r in rows:
        amt = Decimal(str(r.total_amount))
        pct = float((amt / total_sum) * 100) if total_sum > 0 else 0.0
        breakdown.append(
            CategoryBreakdownItem(
                category_id=r.category_id,
                category_name=r.category_name,
                category_icon=r.category_icon or "Tag",
                category_color=r.category_color or "#6366f1",
                amount=amt,
                percentage=round(pct, 2),
                transaction_count=r.tx_count,
            )
        )

    return breakdown


@router.get("/trends", response_model=List[DailyTrendItem])
def get_daily_trends(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
    ).all()

    # Map by date
    daily_map = {}
    curr = start_date
    while curr <= end_date:
        daily_map[curr.isoformat()] = {"income": Decimal("0.00"), "expense": Decimal("0.00")}
        curr += timedelta(days=1)

    for t in transactions:
        d_str = t.transaction_date.isoformat()
        if d_str in daily_map:
            daily_map[d_str][t.type] += t.amount

    return [
        DailyTrendItem(
            date=d,
            income=val["income"],
            expense=val["expense"],
        )
        for d, val in sorted(daily_map.items())
    ]
