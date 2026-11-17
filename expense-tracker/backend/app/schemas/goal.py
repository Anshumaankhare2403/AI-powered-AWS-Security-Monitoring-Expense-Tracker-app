from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ContributionBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    note: Optional[str] = None
    contribution_date: Optional[datetime] = None


class ContributionCreate(ContributionBase):
    pass


class ContributionOut(ContributionBase):
    id: int
    goal_id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    target_amount: Decimal = Field(..., gt=0)
    target_date: Optional[date] = None
    category: Optional[str] = None
    color: Optional[str] = "#10b981"


class GoalCreate(GoalBase):
    initial_amount: Optional[Decimal] = Field(Decimal("0.00"), ge=0)


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    target_amount: Optional[Decimal] = Field(None, gt=0)
    target_date: Optional[date] = None
    category: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(in_progress|completed|cancelled)$")


class GoalOut(GoalBase):
    id: int
    user_id: int
    current_amount: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    remaining_amount: Decimal
    progress_percentage: float
    contributions: Optional[List[ContributionOut]] = []

    model_config = ConfigDict(from_attributes=True)
