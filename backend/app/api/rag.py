import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.deps import get_db, require_role
from app.core.audit import log_audit
from app.models.user import User, UserRole
from app.models.document import Document
from app.rag.retrieval import retrieve_relevant_chunks

router = APIRouter(prefix="/copilot", tags=["RAG Copilot"])

llm = ChatGroq(model="openai/gpt-oss-120b", api_key=os.getenv("GROQ_API_KEY"), temperature=0)


class DocumentCreate(BaseModel):
    title: str
    category: str | None = None
    content: str


class DocumentResponse(BaseModel):
    id: int
    title: str
    category: str | None

    class Config:
        from_attributes = True


class AskRequest(BaseModel):
    question: str


@router.post("/documents", response_model=DocumentResponse)
def create_document(
    data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    doc = Document(**data.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    return db.query(Document).all()


MIN_RELEVANCE_THRESHOLD = 0.05  # below this, treat retrieval as "not grounded" rather than guess


@router.post("/ask")
def ask_copilot(
    request: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.operations)),
):
    chunks = retrieve_relevant_chunks(db, request.question, top_k=3)

    if not chunks or chunks[0]["relevance_score"] < MIN_RELEVANCE_THRESHOLD:
        log_audit(
            db, current_user.id, "copilot_query",
            details={"question": request.question, "grounded": False},
            result="ungrounded", source="copilot",
        )
        return {
            "answer": "I don't have grounded information about this in the knowledge base — I won't guess. Try adding a relevant document, or rephrase your question.",
            "sources": [],
            "grounded": False,
        }

    context = "\n\n".join([f"[Source: {c['title']}]\n{c['text']}" for c in chunks])

    prompt = (
        "You are the NEXORA Admin Copilot. Answer the question using ONLY the provided context below. "
        "If the context doesn't contain the answer, say so honestly. Cite the source title(s) you used.\n\n"
        f"Context:\n{context}\n\nQuestion: {request.question}"
    )

    response = llm.invoke([
        SystemMessage(content="You are a helpful, precise business assistant that only answers from given context."),
        HumanMessage(content=prompt),
    ])

    log_audit(
        db, current_user.id, "copilot_query",
        details={"question": request.question, "grounded": True, "sources": [c["title"] for c in chunks]},
        result="success", source="copilot",
    )

    return {
        "answer": response.content,
        "sources": [{"title": c["title"], "relevance_score": c["relevance_score"]} for c in chunks],
        "grounded": True,
    }
