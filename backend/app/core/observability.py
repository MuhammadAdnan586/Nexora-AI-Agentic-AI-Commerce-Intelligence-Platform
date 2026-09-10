import time
import os
import logging
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from pythonjsonlogger import jsonlogger

SERVICE_NAME = "nexora-backend"


# ---------- Structured logging (CloudWatch-ready JSON logs) ----------
def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    handler.setFormatter(formatter)
    logger.handlers = [handler]
    return logger


# ---------- OpenTelemetry tracing ----------
_tracer = trace.get_tracer(SERVICE_NAME)


def setup_tracing(app, engine=None):
    global _tracer
    resource = Resource.create({"service.name": SERVICE_NAME})
    provider = TracerProvider(resource=resource)

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    try:
        if otlp_endpoint:
            exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        else:
            exporter = ConsoleSpanExporter()
        provider.add_span_processor(BatchSpanProcessor(exporter))
    except Exception:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer(SERVICE_NAME)

    FastAPIInstrumentor.instrument_app(app)
    RequestsInstrumentor().instrument()
    if engine is not None:
        try:
            SQLAlchemyInstrumentor().instrument(engine=engine)
        except Exception:
            pass

    return _tracer


def get_tracer():
    return _tracer


@contextmanager
def trace_span(name, **attributes):
    with _tracer.start_as_current_span(name) as span:
        for k, v in attributes.items():
            if v is not None:
                span.set_attribute(k, v)
        start = time.time()
        try:
            yield span
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
        finally:
            span.set_attribute("duration_ms", (time.time() - start) * 1000)


# ---------- Prometheus metrics ----------
AGENT_LLM_CALLS = Counter("agent_llm_calls_total", "Total LLM calls per agent node", ["agent_node"])
AGENT_LLM_ERRORS = Counter("agent_llm_errors_total", "Total LLM call failures per agent node", ["agent_node"])
AGENT_LLM_RETRIES = Counter("agent_llm_retries_total", "Total LLM retry attempts", ["agent_node"])
AGENT_LLM_LATENCY = Histogram("agent_llm_latency_seconds", "LLM call latency per agent node", ["agent_node"])
AGENT_LLM_TOKENS = Counter("agent_llm_tokens_total", "Tokens consumed per agent node", ["agent_node", "token_type"])
AGENT_LLM_COST_USD = Counter("agent_llm_cost_usd_total", "Estimated USD cost per agent node", ["agent_node"])
AGENT_TOOL_ERRORS = Counter("agent_tool_errors_total", "Total tool/action execution errors", ["action_type"])
HUMAN_OVERRIDE = Counter("human_override_total", "Human approval decisions on agent-proposed actions", ["decision"])
RAG_RETRIEVAL_SCORE = Histogram("rag_retrieval_score", "Retrieval relevance/groundedness score")
FORECAST_ERROR = Histogram("forecast_error_abs", "Absolute forecast error (actual - predicted)")

# Rough Groq pricing per 1K tokens — adjust to current pricing anytime
MODEL_COST_PER_1K = {
    "openai/gpt-oss-120b": {"prompt": 0.00015, "completion": 0.00060},
}


def record_llm_usage(agent_node: str, ai_message, model_name: str = "openai/gpt-oss-120b"):
    """Pull token usage out of a LangChain AIMessage and record Prometheus metrics."""
    meta = getattr(ai_message, "response_metadata", {}) or {}
    usage = meta.get("token_usage") or meta.get("usage") or {}
    if not usage:
        usage = getattr(ai_message, "usage_metadata", None) or {}

    prompt_tokens = usage.get("prompt_tokens") or usage.get("input_tokens") or 0
    completion_tokens = usage.get("completion_tokens") or usage.get("output_tokens") or 0

    if prompt_tokens:
        AGENT_LLM_TOKENS.labels(agent_node=agent_node, token_type="prompt").inc(prompt_tokens)
    if completion_tokens:
        AGENT_LLM_TOKENS.labels(agent_node=agent_node, token_type="completion").inc(completion_tokens)

    pricing = MODEL_COST_PER_1K.get(model_name)
    if pricing and (prompt_tokens or completion_tokens):
        cost = (prompt_tokens / 1000) * pricing["prompt"] + (completion_tokens / 1000) * pricing["completion"]
        AGENT_LLM_COST_USD.labels(agent_node=agent_node).inc(cost)


def setup_metrics(app):
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
