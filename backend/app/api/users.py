from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_current_user
from app.core.security import get_password_hash, verify_password
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import (
    PasswordChange,
    UserCreate,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut, summary="Get current logged-in user profile")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve profile details of the currently authenticated local user.
    """
    return current_user


@router.put("/me", response_model=UserOut, summary="Update current user profile")
def update_current_user_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update editable profile fields for the authenticated user (name, currency, theme, avatar).
    """
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.currency is not None:
        current_user.currency = user_in.currency
    if user_in.theme is not None:
        current_user.theme = user_in.theme
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password", summary="Change current user password")
def update_current_user_password(
    req: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update password after verifying the existing credentials.
    """
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


@router.get("", response_model=List[UserOut], summary="List all local users in database")
def list_users(
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    search: Optional[str] = Query(None, description="Search by email or full name"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all local users registered in the database with optional search & pagination.
    """
    query = db.query(User)
    if search:
        search_filter = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                User.email.ilike(search_filter),
                User.full_name.ilike(search_filter),
            )
        )
    return query.order_by(User.id.asc()).offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=UserOut, summary="Get user by ID")
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch a single user by their primary key ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )
    return user


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED, summary="Create a new local user")
def create_local_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Directly provision a new user in the database (local / administrator use).
    """
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user_in.email}' already exists.",
        )

    hashed_pw = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
        currency=user_in.currency or "INR",
        theme=user_in.theme or "system",
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.delete("/{user_id}", summary="Deactivate or delete user by ID")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deactivate a user account by ID.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )
    
    # Soft delete: mark inactive
    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} (ID {user_id}) has been deactivated."}
