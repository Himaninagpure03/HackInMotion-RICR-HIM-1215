import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..users.dependencies import require_local_user
from .schemas import ChatMessage, RecommendationOut
from .service import chat_complete, get_recommendations

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chatbot"])


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatMessage,
    db: Session = Depends(get_db),
    user_id: str = Depends(require_local_user),
):
    try:
        reply = await chat_complete(db, user_id, body.message)
        return ChatResponse(reply=reply)
    except Exception:
        logger.exception("Chat error")
        return ChatResponse(reply="Failed to get response from AI model.")


@router.get("/recommendations", response_model=RecommendationOut)
async def recommendations(
    db: Session = Depends(get_db),
    user_id: str = Depends(require_local_user),
):
    try:
        return await get_recommendations(db, user_id)
    except Exception:
        logger.exception("Recommendations error")
        return RecommendationOut(
            recommendations=[
                "Unable to generate recommendations right now."
                " Please try again later."
            ],
            summary="AI recommendations are temporarily unavailable.",
        )
