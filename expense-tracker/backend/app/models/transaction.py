from datetime import datetime, date
from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(Enum("income", "expense", name="transaction_type_enum"), nullable=False, index=True)
    transaction_date = Column(Date, nullable=False, default=date.today, index=True)
    payment_method = Column(String(50), nullable=False, default="other")
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    receipt_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

    __table_args__ = (
        Index("idx_transactions_user_date", "user_id", "transaction_date"),
        Index("idx_transactions_user_type_date", "user_id", "type", "transaction_date"),
    )
