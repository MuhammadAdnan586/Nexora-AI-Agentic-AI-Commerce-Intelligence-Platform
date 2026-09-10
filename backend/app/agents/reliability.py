import time
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import requests

from app.core.observability import (
    trace_span, AGENT_LLM_CALLS, AGENT_LLM_ERRORS, AGENT_LLM_RETRIES,
    AGENT_LLM_LATENCY, record_llm_usage,
)

logger = logging.getLogger(__name__)


def safe_llm_invoke(llm, messages, fallback_text="I'm having trouble processing that right now. Please try again in a moment.", node_name="unknown"):
    """Invoke an LLM with retries, tracing and metrics; return a safe fallback message if it ultimately fails."""

    def _log_retry(retry_state):
        AGENT_LLM_RETRIES.labels(agent_node=node_name).inc()
        logger.warning("llm_retry", extra={"agent_node": node_name, "attempt": retry_state.attempt_number})

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(Exception),
        reraise=True,
        before_sleep=_log_retry,
    )
    def _call():
        return llm.invoke(messages)

    AGENT_LLM_CALLS.labels(agent_node=node_name).inc()
    start = time.time()
    with trace_span(f"llm.invoke.{node_name}", agent_node=node_name):
        try:
            result = _call()
            AGENT_LLM_LATENCY.labels(agent_node=node_name).observe(time.time() - start)
            record_llm_usage(node_name, result)
            return result
        except Exception as e:
            AGENT_LLM_ERRORS.labels(agent_node=node_name).inc()
            AGENT_LLM_LATENCY.labels(agent_node=node_name).observe(time.time() - start)
            logger.error("llm_call_failed", extra={"agent_node": node_name, "error": str(e)})
            from langchain_core.messages import AIMessage
            return AIMessage(content=fallback_text)


def safe_external_get(url, params=None, timeout=8, fallback=None):
    """Call an external API with a timeout; return fallback (or raise) on failure."""
    with trace_span("external.api.get", url=url):
        try:
            response = requests.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as e:
            logger.warning("external_api_failed", extra={"url": url, "error": str(e)})
            if fallback is not None:
                return fallback
            raise
