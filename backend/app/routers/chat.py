from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import get_current_user
from app.services.chat_assistant import ChatAssistant

router = APIRouter(prefix="/api/chat", tags=["chat"])

assistant = ChatAssistant()


@router.post("", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    result = assistant.respond(db, payload.message, payload.context_bug_id)
    return schemas.ChatResponse(reply=result.reply, related_bug_ids=result.related_bug_ids)
