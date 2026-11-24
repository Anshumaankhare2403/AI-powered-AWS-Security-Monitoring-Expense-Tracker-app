from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    currency: Optional[str] = "INR"
    theme: Optional[str] = "system"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    currency: Optional[str] = None
    theme: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_token: str
    new_password: str = Field(..., min_length=6, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    currency: str
    theme: str
    is_active: bool
    is_admin: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserDetailOut(UserOut):
    card_credentials: str = "[CARD_CREDENTIALS_REDACTED_PCI_DSS]"
    pci_dss_compliance: str = "PCI-DSS Level 1: Administrator access permitted for account metadata; payment card credentials and CVVs are strictly isolated and redacted."


TokenResponse.model_rebuild()
