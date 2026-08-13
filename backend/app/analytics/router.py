from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..users.dependencies import require_local_user
from .models import AnalysisSnapshot
from .schemas import DashboardOut, SnapshotOut
from .service import get_dashboard

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    """Always computed live from current transactions — never stale."""
    return get_dashboard(db, user_id)


@router.post("/snapshot", response_model=SnapshotOut)
def save_snapshot(
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    """
    Persists the current health score as a point-in-time record, so
    'historical analysis' (requirement #8) survives even as transactions
    keep changing. Call this whenever you want to checkpoint — e.g. once
    per month, or on demand from the dashboard.
    """
    data = get_dashboard(db, user_id)
    snapshot = AnalysisSnapshot(
        user_id=user_id,
        period_label=date.today().strftime("%Y-%m"),
        health_score=data.health.score,
        savings_rate=data.health.savings_rate,
        total_income=data.health.total_income,
        total_expenses=data.health.total_expenses,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


@router.get("/snapshots", response_model=list[SnapshotOut])
def list_snapshots(
    user_id: str = Depends(require_local_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(AnalysisSnapshot)
        .filter(AnalysisSnapshot.user_id == user_id)
        .order_by(AnalysisSnapshot.created_at.desc())
        .all()
    )
