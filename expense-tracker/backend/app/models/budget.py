from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, SmallInteger, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(SmallInteger, nullable=False)
    year = Column(SmallInteger, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    alert_threshold = Column(SmallInteger, nullable=False, default=80)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "month", "year", name="uq_user_category_month_year"),
    )
