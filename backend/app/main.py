import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app import models
from app.core.limiter import limiter
from app.core.observability import setup_logging, setup_tracing, setup_metrics
from app.api import auth, products, categories, cart, orders, admin, analytics, agent, forecasting, weather, rag, warehouse_portal, uploads, labels, shopping_agent, logistics

setup_logging()

app = FastAPI(title="AI E-commerce Platform API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from app.core.database import engine
except Exception:
    engine = None

setup_tracing(app, engine=engine)
setup_metrics(app)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static-uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(agent.router)
app.include_router(forecasting.router)
app.include_router(weather.router)
app.include_router(rag.router)
app.include_router(warehouse_portal.router)
app.include_router(uploads.router)
app.include_router(labels.router)
app.include_router(shopping_agent.router)
app.include_router(logistics.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


