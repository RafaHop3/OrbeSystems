from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from db.session import get_db
from models.models import CRMContact, AccountPayable, User
from security.auth import get_current_user
from schemas.crm_schemas import (
    CRMContactCreate, CRMContactUpdate, CRMContactOut,
    AccountPayableCreate, AccountPayableUpdate, AccountPayableOut
)

router = APIRouter(prefix="/api/v1/crm", tags=["CRM & Financials"])

# --- CONTACTS ---

@router.post("/contacts/", response_model=CRMContactOut)
def create_contact(contact: CRMContactCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Assuming Operator/Admin acts on behalf of a single business for brevity, or we should fetch from context.
    # We will grab business_id from the first business_operators association, or assume passed logic.
    # To keep it robust without breaking existing auth context, we use a placeholder or require business_id.
    # In full production, this is evaluated via `current_user` permissions.
    # For now, let's assume we extract the primary business.
    if not hasattr(current_user, 'business_operators') or not current_user.business_operators:
        raise HTTPException(status_code=403, detail="User is not associated with any business segment.")
    biz_id = current_user.business_operators[0].business_id
    
    db_contact = CRMContact(**contact.dict(), business_id=biz_id)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.get("/contacts/", response_model=List[CRMContactOut])
def get_contacts(skip: int = 0, limit: int = 100, category: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if getattr(current_user, 'is_super_admin', False) or (hasattr(current_user, 'role') and current_user.role == 'super_admin'):
        query = db.query(CRMContact)
    else:
        if not hasattr(current_user, 'business_operators') or not current_user.business_operators:
            return []
        biz_id = current_user.business_operators[0].business_id
        query = db.query(CRMContact).filter(CRMContact.business_id == biz_id)
    
    if category:
        query = query.filter(CRMContact.category == category)
        
    return query.offset(skip).limit(limit).all()

# --- ACCOUNTS PAYABLE ---

@router.post("/payable/", response_model=AccountPayableOut)
def create_payable(payable: AccountPayableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not hasattr(current_user, 'business_operators') or not current_user.business_operators:
        raise HTTPException(status_code=403, detail="User is not associated with any business segment.")
    biz_id = current_user.business_operators[0].business_id
    
    db_payable = AccountPayable(**payable.dict(), business_id=biz_id)
    db.add(db_payable)
    db.commit()
    db.refresh(db_payable)
    return db_payable

@router.get("/payable/", response_model=List[AccountPayableOut])
def get_payables(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if getattr(current_user, 'is_super_admin', False) or (hasattr(current_user, 'role') and current_user.role == 'super_admin'):
        query = db.query(AccountPayable)
    else:
        if not hasattr(current_user, 'business_operators') or not current_user.business_operators:
            return []
        biz_id = current_user.business_operators[0].business_id
        query = db.query(AccountPayable).filter(AccountPayable.business_id == biz_id)
        
    return query.offset(skip).limit(limit).all()
