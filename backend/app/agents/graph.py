import os
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, AIMessage
from app.agents.state import AgentState
from app.agents.tools import inventory_tools, order_tools, customer_service_tools, intelligence_tools, weather_tools, pricing_tools, risk_tools, action_tools
from app.agents.reliability import safe_llm_invoke
load_dotenv()

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=0,
)

inventory_llm = llm.bind_tools(inventory_tools)
order_llm = llm.bind_tools(order_tools)
support_llm = llm.bind_tools(customer_service_tools)
intelligence_llm = llm.bind_tools(intelligence_tools)
weather_llm = llm.bind_tools(weather_tools)
pricing_llm = llm.bind_tools(pricing_tools)
risk_llm = llm.bind_tools(risk_tools)
actions_llm = llm.bind_tools(action_tools)

INVENTORY_PROMPT = "You are the Inventory Agent for NEXORA. You answer questions about product prices, stock levels, and low-stock alerts using your tools. Be concise."
ORDER_PROMPT = "You are the Order Agent for NEXORA. You answer questions about order status and order history using your tools. Be concise."
SUPPORT_PROMPT = "You are the Customer Service Agent for NEXORA. You answer questions about return policy and shipping using your tools. Be concise and friendly."
INTELLIGENCE_PROMPT = "You are the Product Intelligence Agent for NEXORA. You analyze products using opportunity scores that combine sales, margin, inventory health, and returns. Be concise and business-focused."
WEATHER_PROMPT = "You are the Weather Agent for NEXORA. You provide real weather data and its business impact on product demand and delivery risk. Never invent weather information â€” always use your tool. Be concise."
PRICING_PROMPT = "You are the Pricing Agent for NEXORA. You provide discount/promotion recommendations with projected profit impact. You never apply discounts yourself â€” always remind the user that changes require admin approval. Be concise."
RISK_PROMPT = "You are the Risk Agent for NEXORA. You check orders for fraud/risk signals and report findings. You never cancel or block orders yourself â€” always direct high-risk cases to the Risk & Fraud admin page for human review. Be concise."
ACTIONS_PROMPT = (
    "You are the Actions Agent for NEXORA. You help the user perform operations like assigning "
    "warehouses to orders (use 'propose_smart_ship' when the user wants an order shipped but does NOT "
    "specify which warehouse â€” it automatically picks the best warehouse(s) based on stock â€” and use "
    "'propose_assign_warehouse' only when the user explicitly names a warehouse), updating order status, "
    "warehouses to orders, updating order status, applying discounts, and getting shipping label links. "
    "For any action that changes data (assign warehouse, update status, apply discount), ALWAYS use your "
    "'propose_' tools first â€” never claim an action is done unless the tool result confirms it. "
    "The propose tools will ask the user to confirm; simply relay that confirmation question back to the user "
    "exactly as returned, minus any '__PENDING_ACTION__:' marker line. Be concise."
)


def inventory_node(state: AgentState):
    messages = [SystemMessage(content=INVENTORY_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(inventory_llm, messages, node_name="inventory")]}


def order_node(state: AgentState):
    messages = [SystemMessage(content=ORDER_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(order_llm, messages, node_name="order")]}


def support_node(state: AgentState):
    messages = [SystemMessage(content=SUPPORT_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(support_llm, messages, node_name="support")]}


def intelligence_node(state: AgentState):
    messages = [SystemMessage(content=INTELLIGENCE_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(intelligence_llm, messages, node_name="intelligence")]}


def weather_node(state: AgentState):
    messages = [SystemMessage(content=WEATHER_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(weather_llm, messages, node_name="weather")]}


def pricing_node(state: AgentState):
    messages = [SystemMessage(content=PRICING_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(pricing_llm, messages, node_name="pricing")]}


def risk_node(state: AgentState):
    messages = [SystemMessage(content=RISK_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(risk_llm, messages, node_name="risk")]}


def actions_node(state: AgentState):
    messages = [SystemMessage(content=ACTIONS_PROMPT)] + state["messages"]
    return {"messages": [safe_llm_invoke(actions_llm, messages, node_name="actions")]}


def after_actions_tools(state: AgentState) -> str:
    """After an actions-agent tool runs, check if it returned a __PENDING_ACTION__ marker.
    If so, skip the second LLM call entirely and relay the tool's raw output directly â€”
    this guarantees the marker survives instead of being paraphrased/stripped away by the LLM."""
    last = state["messages"][-1]
    content = getattr(last, "content", "")
    if isinstance(content, str) and "__PENDING_ACTION__:" in content:
        return "actions_pending_passthrough"
    return "actions"


def actions_pending_passthrough_node(state: AgentState):
    """Turn the last tool message (which contains the __PENDING_ACTION__ marker) into the
    final AI reply, verbatim â€” no LLM involved, so the marker can't be lost."""
    last = state["messages"][-1]
    return {"messages": [AIMessage(content=last.content)]}


SUPERVISOR_PROMPT = (
    "You are the Supervisor for NEXORA, an AI commerce operations platform. "
    "Based on the user's message, decide which specialist should handle it by responding with "
    "EXACTLY ONE WORD: 'inventory', 'order', 'support', 'intelligence', 'weather', 'pricing', 'risk', or 'actions'.\n"
    "- inventory: product prices, stock levels, low stock\n"
    "- order: order status, order history (read-only questions)\n"
    "- support: return policy, shipping info, general help\n"
    "- intelligence: which products to promote, business opportunities, product performance analysis\n"
    "- weather: current weather, weather impact on demand or delivery\n"
    "- pricing: discount recommendations, promotion strategy, profit projections (analysis only)\n"
    "- risk: fraud checks, order risk scores, suspicious order patterns\n"
    "- actions: the user wants something DONE â€” assign a warehouse, ship/update an order's status, "
    "apply a discount to a product, get a shipping label link. Also route here if the user's message "
    "looks like a yes/no/confirm/cancel reply (e.g. 'yes', 'haan', 'confirm', 'no', 'cancel', 'theek hai').\n"
    "Respond with only the single word."
)

ACTION_KEYWORDS = [
    "assign", "ship", "bhej", "bhijwa", "bhejwa", "confirm order", "cancel order",
    "discount", "chout", "chhoot", "mark as", "status update", "update status",
    "warehouse se", "warehouse ko", "warehouse assign", "delivered mark", "shipped mark",
]


def supervisor_router(state: AgentState) -> str:
    last_user_msg = ""
    for m in reversed(state["messages"]):
        if hasattr(m, "type") and m.type == "human":
            last_user_msg = m.content.lower()
            break

    if any(kw in last_user_msg for kw in ACTION_KEYWORDS):
        return "actions"

    messages = [SystemMessage(content=SUPERVISOR_PROMPT)] + state["messages"]
    decision = safe_llm_invoke(llm, messages, fallback_text="support", node_name="supervisor").content.strip().lower()
    if "inventory" in decision:
        return "inventory"
    if "order" in decision:
        return "order"
    if "intelligence" in decision:
        return "intelligence"
    if "weather" in decision:
        return "weather"
    if "pricing" in decision:
        return "pricing"
    if "risk" in decision:
        return "risk"
    if "actions" in decision:
        return "actions"
    return "support"


builder = StateGraph(AgentState)
builder.add_node("inventory", inventory_node)
builder.add_node("order", order_node)
builder.add_node("support", support_node)
builder.add_node("intelligence", intelligence_node)
builder.add_node("weather", weather_node)
builder.add_node("pricing", pricing_node)
builder.add_node("risk", risk_node)
builder.add_node("actions", actions_node)
builder.add_node("actions_pending_passthrough", actions_pending_passthrough_node)
builder.add_node("inventory_tools", ToolNode(inventory_tools))
builder.add_node("order_tools", ToolNode(order_tools))
builder.add_node("support_tools", ToolNode(customer_service_tools))
builder.add_node("intelligence_tools", ToolNode(intelligence_tools))
builder.add_node("weather_tools", ToolNode(weather_tools))
builder.add_node("pricing_tools", ToolNode(pricing_tools))
builder.add_node("risk_tools", ToolNode(risk_tools))
builder.add_node("actions_tools", ToolNode(action_tools))

builder.set_conditional_entry_point(
    supervisor_router,
    {
        "inventory": "inventory", "order": "order", "support": "support", "intelligence": "intelligence",
        "weather": "weather", "pricing": "pricing", "risk": "risk", "actions": "actions",
    },
)

builder.add_conditional_edges("inventory", tools_condition, {"tools": "inventory_tools", END: END})
builder.add_conditional_edges("order", tools_condition, {"tools": "order_tools", END: END})
builder.add_conditional_edges("support", tools_condition, {"tools": "support_tools", END: END})
builder.add_conditional_edges("intelligence", tools_condition, {"tools": "intelligence_tools", END: END})
builder.add_conditional_edges("weather", tools_condition, {"tools": "weather_tools", END: END})
builder.add_conditional_edges("pricing", tools_condition, {"tools": "pricing_tools", END: END})
builder.add_conditional_edges("risk", tools_condition, {"tools": "risk_tools", END: END})
builder.add_conditional_edges("actions", tools_condition, {"tools": "actions_tools", END: END})
builder.add_edge("inventory_tools", "inventory")
builder.add_edge("order_tools", "order")
builder.add_edge("support_tools", "support")
builder.add_edge("intelligence_tools", "intelligence")
builder.add_edge("weather_tools", "weather")
builder.add_edge("pricing_tools", "pricing")
builder.add_edge("risk_tools", "risk")
builder.add_conditional_edges(
    "actions_tools", after_actions_tools,
    {"actions": "actions", "actions_pending_passthrough": "actions_pending_passthrough"},
)
builder.add_edge("actions_pending_passthrough", END)

checkpointer = MemorySaver()
agent_graph = builder.compile(checkpointer=checkpointer)

