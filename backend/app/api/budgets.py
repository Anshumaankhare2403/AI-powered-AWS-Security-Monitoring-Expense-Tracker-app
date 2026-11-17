from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetOut, BudgetStatusOut, BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", response_model=List[BudgetStatusOut])
def get_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    budgets = db.query(Budget).options(joinedload(Budget.category)).filter(
        Budget.user_id == current_user.id,
        Budget.month == m,
        Budget.year == y,
    ).all()

    results = []
    for b in budgets:
        # Sum expenses in category for this month/year
        spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == b.category_id,
            Transaction.type == "expense",
            func.extract("month", Transaction.transaction_date) == m,
            func.extract("year", Transaction.transaction_date) == y,
        ).scalar()

        spent_dec = Decimal(str(spent))
        remaining = max(Decimal("0.00"), b.amount - spent_dec)
        utilization = float((spent_dec / b.amount) * 100) if b.amount > 0 else 0.0

        is_warning = utilization >= b.alert_threshold and utilization < 100.0
        is_exceeded = utilization >= 100.0

        results.append(
            BudgetStatusOut(
                id=b.id,
                user_id=b.user_id,
                category_id=b.category_id,
                month=b.month,
                year=b.year,
                amount=b.amount,
                alert_threshold=b.alert_threshold,
                created_at=b.created_at,
                updated_at=b.updated_at,
                category=b.category,
                spent_amount=spent_dec,
                remaining_amount=remaining,
                utilization_percentage=round(utilization, 2),
                is_warning=is_warning,
                is_exceeded=is_exceeded,
            )
        )

    return results


@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify category exists and is expense type
    category = db.query(Category).filter(
        Category.id == budget_in.category_id,
        Category.type == "expense",
    ).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID or category is not an expense category.",
        )

    # Check for existing budget for same user/category/month/year
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == budget_in.category_id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A budget for '{category.name}' in {budget_in.month}/{budget_in.year} already exists.",
        )

    budget = Budget(
        user_id=current_user.id,
        category_id=budget_in.category_id,
        month=budget_in.month,
        year=budget_in.year,
        amount=budget_in.amount,
        alert_threshold=budget_in.alert_threshold or 80,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.put("/{id}", response_model=BudgetOut)
def update_budget(
    id: int,
    budget_in: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(
        Budget.id == id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")

    if budget_in.amount is not None:
        budget.amount = budget_in.amount
    if budget_in.alert_threshold is not None:
        budget.alert_threshold = budget_in.alert_threshold

    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(
        Budget.id == id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found.")

    db.delete(budget)
    db.commit()
    return None
