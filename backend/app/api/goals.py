from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.goal import GoalContribution, SavingsGoal
from app.models.notification import Notification
from app.models.user import User
from app.schemas.goal import (
    ContributionCreate,
    ContributionOut,
    GoalCreate,
    GoalOut,
    GoalUpdate,
)

router = APIRouter(prefix="/goals", tags=["Savings Goals"])


def format_goal_out(g: SavingsGoal) -> GoalOut:
    remaining = max(Decimal("0.00"), g.target_amount - g.current_amount)
    progress = float((g.current_amount / g.target_amount) * 100) if g.target_amount > 0 else 0.0
    return GoalOut(
        id=g.id,
        user_id=g.user_id,
        title=g.title,
        target_amount=g.target_amount,
        current_amount=g.current_amount,
        target_date=g.target_date,
        category=g.category,
        status=g.status,
        color=g.color or "#10b981",
        created_at=g.created_at,
        updated_at=g.updated_at,
        remaining_amount=remaining,
        progress_percentage=round(min(progress, 100.0), 2),
        contributions=g.contributions,
    )


@router.get("", response_model=List[GoalOut])
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goals = db.query(SavingsGoal).options(joinedload(SavingsGoal.contributions)).filter(
        SavingsGoal.user_id == current_user.id
    ).order_by(SavingsGoal.status.asc(), SavingsGoal.created_at.desc()).all()

    return [format_goal_out(g) for g in goals]


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    initial = goal_in.initial_amount or Decimal("0.00")
    goal = SavingsGoal(
        user_id=current_user.id,
        title=goal_in.title,
        target_amount=goal_in.target_amount,
        current_amount=initial,
        target_date=goal_in.target_date,
        category=goal_in.category,
        color=goal_in.color or "#10b981",
        status="completed" if initial >= goal_in.target_amount else "in_progress",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    if initial > 0:
        contrib = GoalContribution(
            goal_id=goal.id,
            user_id=current_user.id,
            amount=initial,
            note="Initial deposit",
        )
        db.add(contrib)
        db.commit()
        db.refresh(goal)

    return format_goal_out(goal)


@router.get("/{id}", response_model=GoalOut)
def get_goal(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(SavingsGoal).options(joinedload(SavingsGoal.contributions)).filter(
        SavingsGoal.id == id,
        SavingsGoal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found.")
    return format_goal_out(goal)


@router.put("/{id}", response_model=GoalOut)
def update_goal(
    id: int,
    goal_in: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == id,
        SavingsGoal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found.")

    if goal_in.title is not None:
        goal.title = goal_in.title
    if goal_in.target_amount is not None:
        goal.target_amount = goal_in.target_amount
    if goal_in.target_date is not None:
        goal.target_date = goal_in.target_date
    if goal_in.category is not None:
        goal.category = goal_in.category
    if goal_in.color is not None:
        goal.color = goal_in.color
    if goal_in.status is not None:
        goal.status = goal_in.status

    # Recalculate status
    if goal.current_amount >= goal.target_amount:
        goal.status = "completed"

    db.commit()
    db.refresh(goal)
    return format_goal_out(goal)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == id,
        SavingsGoal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found.")

    db.delete(goal)
    db.commit()
    return None


@router.post("/{id}/contributions", response_model=ContributionOut, status_code=status.HTTP_201_CREATED)
def add_contribution(
    id: int,
    contrib_in: ContributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(SavingsGoal).filter(
        SavingsGoal.id == id,
        SavingsGoal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found.")

    contribution = GoalContribution(
        goal_id=goal.id,
        user_id=current_user.id,
        amount=contrib_in.amount,
        note=contrib_in.note,
    )
    db.add(contribution)

    # Increment goal current amount
    goal.current_amount += contrib_in.amount
    if goal.current_amount >= goal.target_amount and goal.status != "completed":
        goal.status = "completed"
        # Create celebration notification
        notif = Notification(
            user_id=current_user.id,
            title="Goal Achieved! 🎉",
            message=f"Congratulations! You reached your savings goal '{goal.title}' of {goal.target_amount:.2f}.",
            type="goal_reached",
        )
        db.add(notif)

    db.commit()
    db.refresh(contribution)
    return contribution
