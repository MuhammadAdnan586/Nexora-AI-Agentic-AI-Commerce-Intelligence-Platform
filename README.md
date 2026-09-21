<div align="center">

![Header](https://capsule-render.vercel.app/api?type=waving&color=0:0f2027,50:203a43,100:2c5364&height=180&section=header&text=NEXORA&fontSize=55&fontColor=ffffff&fontAlignY=38&desc=Agentic%20AI%20Commerce%20Intelligence%20Platform&descAlignY=58&descSize=18&descColor=a8d8ea)

**An e-commerce platform where AI agents don't just chat — they run the business.**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](#)
[![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](#)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](#)


</div>

---

## 🧠 About NEXORA

NEXORA is an AI-powered e-commerce platform that goes beyond a standard online store by embedding a **LangGraph multi-agent system** directly into the shopping and admin experience. Instead of a single chatbot bolted onto a storefront, NEXORA runs a network of specialized AI agents that handle customer conversations, demand forecasting, dynamic pricing, risk scoring, and warehouse/logistics decisions — with guardrails, audit logging, and human-in-the-loop confirmation on every action the agents propose.

Built as a full production-style system — not a notebook demo — with a FastAPI backend, a Next.js admin/warehouse portal, PostgreSQL, Redis, rate limiting, RBAC, and observability baked in from the start.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **AI Shopping Agent** | Conversational product discovery, cart assistance, and order support |
| 🎙️ **Voice AI Widget** | Voice-based shopping interaction, hitting the same agent pipeline as chat |
| 📊 **Demand Forecasting** | ML-driven sales and inventory forecasts to guide restocking |
| 💰 **Dynamic Pricing** | AI-assisted pricing and discount recommendations |
| ⚠️ **Risk Scoring** | Automated order/return risk review |
| 📦 **Warehouse & Logistics Portal** | Inventory, supplier, fleet, and delivery route management |
| 🔍 **RAG Copilot** | Retrieval-augmented Q&A over SOPs and policy documents, with groundedness checks to prevent hallucinated answers |
| 🛡️ **Guardrails & Reliability** | Audit-logged agent actions, Pydantic-validated proposals, retry-safe LLM calls, and rate limiting |
| 📈 **Admin Analytics Dashboard** | Campaigns, customers, approvals, and copilot insights in one place |

---

## 🖼️ Preview

<!-- Add your screenshots here — see suggestions below -->
<div align="center">
  <img src="./docs/screenshots/admin-dashboard.png" width="90%" alt="Admin Dashboard" />
  <br/><br/>
  <img src="./docs/screenshots/agent-actions.png" width="45%" alt="Multi-Agent Action Confirmation" />
  <img src="./docs/screenshots/voice-widget.png" width="45%" alt="Voice AI Shopping Widget" />
</div>

> *Screenshots: admin dashboard overview, multi-agent action confirmation (e.g. smart-ship / discount proposals), and the voice shopping widget. Place your images in `docs/screenshots/` with these filenames, or update the paths above.*

---

## 🏗️ Architecture & Tech Stack

**Backend**
- FastAPI (Python) + SQLAlchemy + Alembic
- **LangGraph** — multi-agent orchestration, stateful workflows
- ML models for forecasting, pricing, risk scoring, and fulfillment routing
- RAG pipeline (ChromaDB/pgvector-style retrieval) with groundedness checks
- Guardrails: audit logging, RBAC, Pydantic action validation, `slowapi` rate limiting

**Frontend**
- Next.js (TypeScript)
- Separate **Admin Portal** and **Warehouse Portal**
- Voice shopping widget (`VoiceShoppingWidget.tsx`)

**Infrastructure**
- PostgreSQL (+ PostGIS for logistics/routing)
- Redis (Upstash) for caching/session state
- Docker for containerized deployment
- Observability: Prometheus, Grafana, Jaeger configs included

---

## 📁 Project Structure

```
ai-ecommerce-platform/
├── backend/
│   ├── app/
│   │   ├── agents/        # LangGraph multi-agent system
│   │   ├── api/            # FastAPI route handlers
│   │   ├── core/           # DB, security, dependencies, audit logging
│   │   ├── ml/              # Forecasting, pricing, risk, routing models
│   │   ├── models/         # SQLAlchemy models
│   │   ├── rag/             # Retrieval-augmented generation
│   │   └── schemas/        # Pydantic schemas
│   ├── alembic/             # DB migrations
│   └── uploads/             # Uploaded documents/images
└── frontend/
    └── src/
        ├── app/
        │   ├── admin/        # Admin dashboard pages
        │   ├── warehouse/    # Warehouse portal pages
        │   └── (storefront)  # Customer-facing pages
        ├── components/
        ├── context/
        └── lib/
```

---

## ⚙️ Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ Guardrails & Reliability

NEXORA's agents don't act blindly. Proposed actions (like `smart_ship`, `apply_discount`, `assign_warehouse`) are surfaced to the admin for **explicit confirmation** before execution, every action is **audit-logged**, and the RAG copilot is designed to **refuse to answer** rather than hallucinate when it doesn't have grounded information — a deliberate reliability trade-off over "always giving an answer."

---

## 📌 Status

Actively developed as part of an ongoing Agentic AI / LLM application portfolio build. Core guardrails, security, and reliability phase complete; UI polish and additional agent capabilities in progress.

---

## 👤 Author

**Muhammad Adnan** — AI Engineer | Agentic AI & LLM Application Developer

- GitHub: [@MuhammadAdnan586](https://github.com/MuhammadAdnan586)
- LinkedIn: [m-adnan-12a816402](https://linkedin.com/in/m-adnan-12a816402)
- Portfolio: [View Portfolio](https://portfolio-eight-delta-7blam1yft8.vercel.app)

<div align="center">

![Footer](https://capsule-render.vercel.app/api?type=waving&color=0:2c5364,50:203a43,100:0f2027&height=100&section=footer)

</div>
