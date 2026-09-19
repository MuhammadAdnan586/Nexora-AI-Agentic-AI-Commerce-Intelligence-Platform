import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.agents.reliability import safe_llm_invoke
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from app.core.deps import get_current_user
from app.core.database import SessionLocal
from app.models.user import User
from app.models.product import Product
from app.agents.shopping_tools import build_shopping_tools

router = APIRouter(prefix="/shopping", tags=["Shopping Assistant"])

llm = ChatGroq(model="openai/gpt-oss-120b", api_key=os.getenv("GROQ_API_KEY"), temperature=0.4)

SHOPPING_PROMPT = (
    "You are the friendly voice shopping assistant for NEXORA, an AI-powered e-commerce store. "
    "\n\nLANGUAGE: Always reply in the SAME language the customer just used. If they speak in Urdu "
    "(or Roman Urdu, i.e. Urdu written in English letters), reply in Urdu using Roman Urdu script "
    "(Urdu words spelled with English letters, since your reply will be read aloud by a text-to-speech "
    "engine that only supports English). If they speak in English, reply in English. Never mix "
    "languages mid-reply.\n\n"
    "BRAND: You represent NEXORA - an AI-powered commerce brand known for smart recommendations and "
    "great deals. When it feels natural (not every single message), briefly mention NEXORA by name in "
    "a warm, promotional way - e.g. 'at NEXORA we always try to get you the best deal' - but keep it "
    "short, don't oversell.\n\n"
    "TOOLS: Use search_products whenever the customer names or describes a specific item (e.g. a "
    "smartwatch, headphones). Use get_discounted_products whenever the customer asks about deals, "
    "discounts, sales, or offers in general rather than a specific product. Always use a tool before "
    "describing products so the customer's screen can show the actual matching items.\n\n"
    "SALES BEHAVIOR: Warmly welcome the customer, help them find products they'd like, mention prices, "
    "and guide them through adding items to their cart. When you find or mention a product, ALWAYS check "
    "if it has an active discount/promotion and mention it enthusiastically if so (e.g. 'and it's currently "
    "10% off!'). Ask what they're looking for if unclear. Once they're ready to checkout, confirm their "
    "cart contents and ask for their shipping address, then place the order. Keep responses short and "
    "conversational since they will be spoken aloud. Be enthusiastic but not pushy. If the customer's "
    "speech seems garbled, unclear, or doesn't match any real product category, don't guess wildly - "
    "politely ask them to repeat what they're looking for, since voice recognition sometimes mishears words."
)

# In-memory conversation history per user (simple, resets on server restart)
conversations: dict[int, list] = {}


class ShoppingChatRequest(BaseModel):
    message: str


def _serialize_products(ids: list[int]) -> list[dict]:
    """Turn a list of (possibly duplicate) product IDs into ordered, de-duplicated product data."""
    seen: list[int] = []
    for pid in ids:
        if pid not in seen:
            seen.append(pid)
    if not seen:
        return []

    db = SessionLocal()
    try:
        products = db.query(Product).filter(Product.id.in_(seen), Product.is_active == True).all()
        by_id = {p.id: p for p in products}
        result = []
        for pid in seen:
            p = by_id.get(pid)
            if p:
                result.append({
                    "id": p.id,
                    "name": p.name,
                    "price": p.price,
                    "compare_at_price": p.compare_at_price,
                    "image_url": p.image_url,
                })
        return result
    finally:
        db.close()


@router.post("/chat")
def shopping_chat(
    request: ShoppingChatRequest,
    current_user: User = Depends(get_current_user),
):
    found_products: list[int] = []
    tools = build_shopping_tools(current_user.id, found_products)
    llm_with_tools = llm.bind_tools(tools)
    tool_map = {t.name: t for t in tools}

    history = conversations.get(current_user.id, [])
    if not history:
        history.append(SystemMessage(content=SHOPPING_PROMPT))

    history.append(HumanMessage(content=request.message))

    for _ in range(4):  # allow a few tool-call rounds
        response = safe_llm_invoke(llm_with_tools, history, fallback_text="Sorry, I'm having a little trouble right now - could you try that again?")
        history.append(response)

        if not getattr(response, "tool_calls", None):
            conversations[current_user.id] = history[-20:]  # keep recent context only
            return {"reply": response.content, "products": _serialize_products(found_products)}

        for call in response.tool_calls:
            tool_fn = tool_map.get(call["name"])
            result = tool_fn.invoke(call["args"]) if tool_fn else "Unknown tool."
            history.append(ToolMessage(content=str(result), tool_call_id=call["id"]))

    conversations[current_user.id] = history[-20:]
    return {
        "reply": "Sorry, I got a bit stuck there - could you repeat that?",
        "products": _serialize_products(found_products),
    }


@router.post("/reset")
def reset_shopping_conversation(current_user: User = Depends(get_current_user)):
    conversations.pop(current_user.id, None)
    return {"message": "Conversation reset"}