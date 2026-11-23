from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.models.category import Category
from app.models.user import User
from app.core.security import get_password_hash
import app.models  # Ensure all models are registered with Base.metadata

DEFAULT_EXPENSE_CATEGORIES = [
    {"name": "Food", "icon": "Utensils", "color": "#ef4444"},
    {"name": "Shopping", "icon": "ShoppingBag", "color": "#ec4899"},
    {"name": "Transportation", "icon": "Car", "color": "#f97316"},
    {"name": "Entertainment", "icon": "Film", "color": "#8b5cf6"},
    {"name": "Education", "icon": "GraduationCap", "color": "#3b82f6"},
    {"name": "Healthcare", "icon": "HeartPulse", "color": "#14b8a6"},
    {"name": "Bills", "icon": "Receipt", "color": "#eab308"},
    {"name": "Rent", "icon": "Home", "color": "#6366f1"},
    {"name": "Travel", "icon": "Plane", "color": "#06b6d4"},
    {"name": "Other", "icon": "MoreHorizontal", "color": "#64748b"},
]

DEFAULT_INCOME_CATEGORIES = [
    {"name": "Salary", "icon": "Briefcase", "color": "#10b981"},
    {"name": "Freelancing", "icon": "Laptop", "color": "#059669"},
    {"name": "Business", "icon": "TrendingUp", "color": "#047857"},
    {"name": "Investments", "icon": "PieChart", "color": "#0d9488"},
    {"name": "Gifts", "icon": "Gift", "color": "#84cc16"},
    {"name": "Other", "icon": "Coins", "color": "#64748b"},
]


def init_db(db: Session = None):
    # Create tables
    Base.metadata.create_all(bind=engine)

    close_session = False
    if db is None:
        db = SessionLocal()
        close_session = True

    try:
        # Seed default expense categories if they don't exist
        for item in DEFAULT_EXPENSE_CATEGORIES:
            existing = db.query(Category).filter(
                Category.user_id.is_(None),
                Category.name == item["name"],
                Category.type == "expense"
            ).first()
            if not existing:
                category = Category(
                    user_id=None,
                    name=item["name"],
                    type="expense",
                    icon=item["icon"],
                    color=item["color"],
                    is_default=True
                )
                db.add(category)

        # Seed default income categories if they don't exist
        for item in DEFAULT_INCOME_CATEGORIES:
            existing = db.query(Category).filter(
                Category.user_id.is_(None),
                Category.name == item["name"],
                Category.type == "income"
            ).first()
            if not existing:
                category = Category(
                    user_id=None,
                    name=item["name"],
                    type="income",
                    icon=item["icon"],
                    color=item["color"],
                    is_default=True
                )
                db.add(category)

        # Seed default users if they don't exist
        default_users = [
            {
                "email": "admin@example.com",
                "full_name": "Admin Lead",
                "password": "Anuj24#",
                "currency": "INR",
                "theme": "system",
            },
            {
                "email": "anuj@example.com",
                "full_name": "Anuj Admin",
                "password": "Anuj24#",
                "currency": "INR",
                "theme": "dark",
            },
            {
                "email": "demo@example.com",
                "full_name": "Demo Auditor",
                "password": "Password123!",
                "currency": "INR",
                "theme": "system",
            },
            {
                "email": "localuser@example.com",
                "full_name": "Local User",
                "password": "Password123!",
                "currency": "INR",
                "theme": "system",
            },
            {
                "email": "govind@example.com",
                "full_name": "Govind Developer",
                "password": "Password123!",
                "currency": "INR",
                "theme": "dark",
            },
            {
                "email": "anshumaan@example.com",
                "full_name": "Anshumaan Khare",
                "password": "Password123!",
                "currency": "INR",
                "theme": "dark",
            },
            {
                "email": "sarah.connor@finops.corp",
                "full_name": "Sarah Connor",
                "password": "Password123!",
                "currency": "USD",
                "theme": "light",
            },
            {
                "email": "alex.chen@cloudsec.io",
                "full_name": "Alex Chen",
                "password": "Password123!",
                "currency": "USD",
                "theme": "dark",
            },
            {
                "email": "priya.sharma@techcorp.in",
                "full_name": "Priya Sharma",
                "password": "Password123!",
                "currency": "INR",
                "theme": "system",
            },
            {
                "email": "marcus.vance@defense.net",
                "full_name": "Marcus Vance",
                "password": "Password123!",
                "currency": "EUR",
                "theme": "dark",
            },
            {
                "email": "elena.rostova@devops.global",
                "full_name": "Elena Rostova",
                "password": "Password123!",
                "currency": "EUR",
                "theme": "light",
            },
            {
                "email": "david.kim@audit.internal",
                "full_name": "David Kim",
                "password": "Password123!",
                "currency": "USD",
                "theme": "system",
            },
            {
                "email": "rachel.green@startup.co",
                "full_name": "Rachel Green",
                "password": "Password123!",
                "currency": "USD",
                "theme": "light",
            },
            {
                "email": "arjun.mehta@enterprise.in",
                "full_name": "Arjun Mehta",
                "password": "Password123!",
                "currency": "INR",
                "theme": "dark",
            },
        ]
        for u in default_users:
            is_adm = u["email"].lower() in ["admin@example.com", "anuj@example.com"]
            existing_user = db.query(User).filter(User.email == u["email"].lower()).first()
            if not existing_user:
                new_user = User(
                    email=u["email"].lower(),
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    currency=u["currency"],
                    theme=u["theme"],
                    is_active=True,
                    is_verified=True,
                    is_admin=is_adm,
                )
                db.add(new_user)
            elif is_adm:
                existing_user.hashed_password = get_password_hash(u["password"])
                existing_user.is_active = True
                existing_user.is_verified = True
                existing_user.is_admin = True

        db.commit()
    finally:
        if close_session:
            db.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
