from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import Certificate, User
from schemas import CertificateOut

router = APIRouter(prefix="/certificate", tags=["certificate"])


@router.get("/my", response_model=list[CertificateOut])
def get_my_certificates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Certificate).filter(Certificate.user_id == current_user.id).all()


@router.get("/course/{course_id}", response_model=CertificateOut)
def get_certificate_by_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    certificate = db.query(Certificate).filter(
        Certificate.user_id == current_user.id,
        Certificate.course_id == course_id,
    ).first()

    if certificate is None:
        raise HTTPException(status_code=404, detail="Certificate not found")

    return certificate