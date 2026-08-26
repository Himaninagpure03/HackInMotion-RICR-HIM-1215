from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str


class RecommendationOut(BaseModel):
    recommendations: list[str]
    summary: str
