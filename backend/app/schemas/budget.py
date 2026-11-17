from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.category import CategoryOut


class BudgetBase(BaseModel):
    category_id: int
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    amount: Decimal = Field(..., gt=0)
    alert_threshold: Optional[int] = Field(80, ge=1, le=100)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    alert_threshold: Optional[int] = Field(None, ge=1, le=100)


class BudgetOut(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None

    model_config = ConfigDict(from_attributes=True)


class BudgetStatusOut(BudgetOut):
    spent_amount: Decimal
    remaining_amount: Decimal
    utilization_percentage: float
    is_warning: bool
    is_exceeded: bool
