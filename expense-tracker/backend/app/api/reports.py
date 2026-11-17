import csv
from datetime import date, datetime
from decimal import Decimal
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly")
def get_monthly_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year

    transactions = db.query(Transaction).options(joinedload(Transaction.category)).filter(
        Transaction.user_id == current_user.id,
        func.extract("month", Transaction.transaction_date) == m,
        func.extract("year", Transaction.transaction_date) == y,
    ).order_by(Transaction.transaction_date.desc()).all()

    total_income = sum((t.amount for t in transactions if t.type == "income"), Decimal("0.00"))
    total_expense = sum((t.amount for t in transactions if t.type == "expense"), Decimal("0.00"))
    net_savings = total_income - total_expense
    savings_rate = float((net_savings / total_income) * 100) if total_income > 0 else 0.0

    # Category breakdown
    category_map = {}
    for t in transactions:
        c_name = t.category.name if t.category else "Uncategorized"
        c_type = t.type
        key = (c_name, c_type)
        if key not in category_map:
            category_map[key] = Decimal("0.00")
        category_map[key] += t.amount

    return {
        "month": m,
        "year": y,
        "currency": current_user.currency,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": net_savings,
        "savings_rate_percentage": round(savings_rate, 2),
        "transaction_count": len(transactions),
        "breakdown": [
            {"category": k[0], "type": k[1], "amount": v}
            for k, v in category_map.items()
        ],
        "transactions": [
            {
                "id": t.id,
                "title": t.title,
                "amount": t.amount,
                "type": t.type,
                "category": t.category.name if t.category else "Other",
                "date": t.transaction_date.isoformat(),
                "payment_method": t.payment_method,
            }
            for t in transactions
        ],
    }


@router.get("/yearly")
def get_yearly_report(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    y = year or datetime.utcnow().year

    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        func.extract("year", Transaction.transaction_date) == y,
    ).all()

    total_income = sum((t.amount for t in transactions if t.type == "income"), Decimal("0.00"))
    total_expense = sum((t.amount for t in transactions if t.type == "expense"), Decimal("0.00"))

    months_data = []
    for m in range(1, 13):
        m_trans = [t for t in transactions if t.transaction_date.month == m]
        m_inc = sum((t.amount for t in m_trans if t.type == "income"), Decimal("0.00"))
        m_exp = sum((t.amount for t in m_trans if t.type == "expense"), Decimal("0.00"))
        months_data.append({
            "month": m,
            "income": m_inc,
            "expense": m_exp,
            "savings": m_inc - m_exp,
        })

    return {
        "year": y,
        "currency": current_user.currency,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_savings": total_income - total_expense,
        "months": months_data,
    }


@router.get("/export")
def export_transactions(
    format: str = Query("csv", pattern="^(csv|pdf)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
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
    if type:
        query = query.filter(Transaction.type == type)

    transactions = query.order_by(Transaction.transaction_date.desc()).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Transaction ID",
            "Date",
            "Title",
            "Type",
            "Category",
            "Amount",
            "Payment Method",
            "Description",
            "Notes",
        ])

        for t in transactions:
            writer.writerow([
                t.id,
                t.transaction_date.isoformat(),
                t.title,
                t.type.capitalize(),
                t.category.name if t.category else "Uncategorized",
                f"{t.amount:.2f}",
                t.payment_method,
                t.description or "",
                t.notes or "",
            ])

        output.seek(0)
        filename = f"transactions_{date.today().isoformat()}.csv"
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    else:
        # Generate PDF using ReportLab
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="ReportTitle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1e293b"),
        )
        subtitle_style = ParagraphStyle(
            name="ReportSubtitle",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748b"),
        )

        elements.append(Paragraph(f"Financial Report - {current_user.full_name}", title_style))
        elements.append(Paragraph(f"Generated on {date.today().strftime('%B %d, %Y')} | Currency: {current_user.currency}", subtitle_style))
        elements.append(Spacer(1, 16))

        total_income = sum((t.amount for t in transactions if t.type == "income"), Decimal("0.00"))
        total_expense = sum((t.amount for t in transactions if t.type == "expense"), Decimal("0.00"))
        net = total_income - total_expense

        # Summary box
        summary_data = [
            ["Total Income", "Total Expense", "Net Balance", "Transactions Count"],
            [f"{current_user.currency} {total_income:.2f}", f"{current_user.currency} {total_expense:.2f}", f"{current_user.currency} {net:.2f}", str(len(transactions))],
        ]
        summary_table = Table(summary_data, colWidths=[130, 130, 130, 130])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#334155")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("FONTSIZE", (0, 1), (-1, 1), 12),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Transactions Table
        table_data = [["Date", "Title", "Category", "Type", "Amount"]]
        for t in transactions[:100]:  # Cap at 100 in table for PDF size
            table_data.append([
                t.transaction_date.strftime("%Y-%m-%d"),
                t.title[:25],
                t.category.name if t.category else "Other",
                t.type.capitalize(),
                f"{current_user.currency} {t.amount:.2f}",
            ])

        tx_table = Table(table_data, colWidths=[80, 160, 120, 80, 100])
        tx_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("ALIGN", (4, 0), (4, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(tx_table)

        doc.build(elements)
        buffer.seek(0)
        filename = f"financial_report_{date.today().isoformat()}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
