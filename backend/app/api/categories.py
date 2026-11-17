from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryOut])
def get_categories(
    type: Optional[str] = Query(None, pattern="^(income|expense)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Category).filter(
        or_(
            Category.user_id == current_user.id,
            Category.user_id.is_(None),
            Category.is_default == True,
        )
    )
    if type:
        query = query.filter(Category.type == type)

    return query.order_by(Category.is_default.desc(), Category.name.asc()).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check for duplicate
    existing = db.query(Category).filter(
        or_(Category.user_id == current_user.id, Category.user_id.is_(None)),
        Category.name.ilike(cat_in.name),
        Category.type == cat_in.type,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A category named '{cat_in.name}' already exists for {cat_in.type}.",
        )

    category = Category(
        user_id=current_user.id,
        name=cat_in.name,
        type=cat_in.type,
        icon=cat_in.icon or "Tag",
        color=cat_in.color or "#6366f1",
        is_default=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{id}", response_model=CategoryOut)
def update_category(
    id: int,
    cat_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if category.is_default or category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System default categories cannot be modified. You can only edit your custom categories.",
        )

    if cat_in.name is not None:
        category.name = cat_in.name
    if cat_in.icon is not None:
        category.icon = cat_in.icon
    if cat_in.color is not None:
        category.color = cat_in.color

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(Category.id == id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if category.is_default or category.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System default categories cannot be deleted.",
        )

    db.delete(category)
    db.commit()
    return None
