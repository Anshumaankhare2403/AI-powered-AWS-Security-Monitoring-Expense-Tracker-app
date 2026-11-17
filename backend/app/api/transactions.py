from datetime import date
from decimal import Decimal
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.budget import Budget
from app.models.category import Category
from app.models.notification import Notification
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionListResponse,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def check_budget_threshold(user_id: int, category_id: int, trans_date: date, db: Session):
    """
    Checks if an expense causes category budget utilization to cross alert_threshold or 100%.
    Generates a notification if necessary.
    """
    month = trans_date.month
    year = trans_date.year

    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category_id == category_id,
        Budget.month == month,
        Budget.year == year,
    ).first()

    if not budget:
        return

    # Calculate total spent in this category for this month
    total_spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == user_id,
        Transaction.category_id == category_id,
        Transaction.type == "expense",
        func.extract("month", Transaction.transaction_date) == month,
        func.extract("year", Transaction.transaction_date) == year,
    ).scalar()

    total_spent_dec = Decimal(str(total_spent))
    utilization = (total_spent_dec / budget.amount) * 100

    category = db.query(Category).filter(Category.id == category_id).first()
    category_name = category.name if category else "Category"

    if utilization >= 100:
        notif = Notification(
            user_id=user_id,
            title="Budget Exceeded!",
            message=f"You have exceeded your {month}/{year} budget for '{category_name}'. Spent: {total_spent_dec:.2f} of {budget.amount:.2f} ({utilization:.1f}%).",
            type="budget_exceeded",
        )
        db.add(notif)
        db.commit()
    elif utilization >= budget.alert_threshold:
        notif = Notification(
            user_id=user_id,
            title="Budget Warning",
            message=f"You have reached {utilization:.1f}% of your {month}/{year} budget for '{category_name}'.",
            type="budget_warning",
        )
        db.add(notif)
        db.commit()


@router.get("", response_model=TransactionListResponse)
def get_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category_id: Optional[int] = None,
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    search: Optional[str] = None,
    sort_by: str = Query("transaction_date", pattern="^(transaction_date|amount|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).options(joinedload(Transaction.category)).filter(
        Transaction.user_id == current_user.id
    )

    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if type:
        query = query.filter(Transaction.type == type)
    if search:
        query = query.filter(
            or_(
                Transaction.title.ilike(f"%{search}%"),
                Transaction.description.ilike(f"%{search}%"),
                Transaction.notes.ilike(f"%{search}%"),
            )
        )

    # Compute aggregates for current filter
    all_filtered = query.all()
    total_count = len(all_filtered)
    total_income = sum((t.amount for t in all_filtered if t.type == "income"), Decimal("0.00"))
    total_expense = sum((t.amount for t in all_filtered if t.type == "expense"), Decimal("0.00"))
    net_amount = total_income - total_expense

    # Sorting
    sort_column = getattr(Transaction, sort_by)
    if order == "desc":
        query = query.order_by(sort_column.desc(), Transaction.id.desc())
    else:
        query = query.order_by(sort_column.asc(), Transaction.id.asc())

    # Pagination
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()
    total_pages = max(1, math.ceil(total_count / limit))

    return TransactionListResponse(
        items=items,
        total=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages,
        total_income=total_income,
        total_expense=total_expense,
        net_amount=net_amount,
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    trans_in: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(
        Category.id == trans_in.category_id,
        or_(Category.user_id == current_user.id, Category.user_id.is_(None)),
    ).first()

    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")

    transaction = Transaction(
        user_id=current_user.id,
        category_id=trans_in.category_id,
        title=trans_in.title,
        amount=trans_in.amount,
        type=trans_in.type,
        transaction_date=trans_in.transaction_date,
        payment_method=trans_in.payment_method or "other",
        description=trans_in.description,
        notes=trans_in.notes,
        receipt_url=trans_in.receipt_url,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # If expense, check budget alerts
    if transaction.type == "expense":
        check_budget_threshold(current_user.id, transaction.category_id, transaction.transaction_date, db)

    return transaction


@router.get("/{id}", response_model=TransactionOut)
def get_transaction(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).options(joinedload(Transaction.category)).filter(
        Transaction.id == id,
        Transaction.user_id == current_user.id,
    ).first()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    return transaction


@router.put("/{id}", response_model=TransactionOut)
def update_transaction(
    id: int,
    trans_in: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(
        Transaction.id == id,
        Transaction.user_id == current_user.id,
    ).first()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    if trans_in.category_id is not None:
        category = db.query(Category).filter(
            Category.id == trans_in.category_id,
            or_(Category.user_id == current_user.id, Category.user_id.is_(None)),
        ).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category ID.")
        transaction.category_id = trans_in.category_id

    if trans_in.title is not None:
        transaction.title = trans_in.title
    if trans_in.amount is not None:
        transaction.amount = trans_in.amount
    if trans_in.type is not None:
        transaction.type = trans_in.type
    if trans_in.transaction_date is not None:
        transaction.transaction_date = trans_in.transaction_date
    if trans_in.payment_method is not None:
        transaction.payment_method = trans_in.payment_method
    if trans_in.description is not None:
        transaction.description = trans_in.description
    if trans_in.notes is not None:
        transaction.notes = trans_in.notes
    if trans_in.receipt_url is not None:
        transaction.receipt_url = trans_in.receipt_url

    db.commit()
    db.refresh(transaction)

    if transaction.type == "expense":
        check_budget_threshold(current_user.id, transaction.category_id, transaction.transaction_date, db)

    return transaction


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(
        Transaction.id == id,
        Transaction.user_id == current_user.id,
    ).first()

    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    db.delete(transaction)
    db.commit()
    return None
