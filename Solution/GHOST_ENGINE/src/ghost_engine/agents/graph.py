"""Assemble LangGraph StateGraph from nodes (Node 3+).

Registry and traversal-report pointers: ``ghost_engine.agents.graph_layout.GRAPHS``.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from langgraph.graph import END, START, StateGraph

from ghost_engine.agents.nodes.scoring_analytics_nodes import (
    route_after_scoring_l0,
    route_after_scoring_normalize,
    scoring_budget_llm_infer_node,
    scoring_client_dna_node,
    scoring_effort_estimator_node,
    scoring_estimates_snapshot_node,
    scoring_graph_l0,
    scoring_graph_normalize,
    scoring_l2_eligibility_node,
    scoring_l2_ollama_node,
    scoring_market_context_node,
    scoring_merge_notify_state,
    scoring_roi_router_node,
)
from ghost_engine.agents.nodes.cover_letter_pipeline_nodes import (
    cover_letter_footprint_pipeline_node,
    cover_letter_gemini_pipeline_node,
    cover_letter_judge_pipeline_node,
    cover_letter_render_pipeline_node,
    cover_letter_typography_pipeline_node,
    route_after_cover_footprint,
    route_after_cover_gemini,
    route_after_cover_render,
)


def build_graph() -> Any:
    """Return compiled LangGraph when implemented; None until Node 3+."""
    return None


@lru_cache(maxsize=1)
def build_scoring_graph() -> Any:
    """
    Analytical subgraph: normalize → L0 → market → client → effort → ROI → budget_infer (optional) → estimates → L2 gray zone → merge.

    Used by ``BaseSiteAdapter`` sniff path and tests. State is a ``dict``.
    """
    g = StateGraph(dict)
    g.add_node("normalize", scoring_graph_normalize)
    g.add_node("l0", scoring_graph_l0)
    g.add_node("market", scoring_market_context_node)
    g.add_node("client", scoring_client_dna_node)
    g.add_node("effort", scoring_effort_estimator_node)
    g.add_node("roi", scoring_roi_router_node)
    g.add_node("budget_infer", scoring_budget_llm_infer_node)
    g.add_node("estimates", scoring_estimates_snapshot_node)
    g.add_node("l2_eligibility", scoring_l2_eligibility_node)
    g.add_node("l2_ollama", scoring_l2_ollama_node)
    g.add_node("merge_notify", scoring_merge_notify_state)

    g.add_edge(START, "normalize")
    g.add_conditional_edges(
        "normalize",
        route_after_scoring_normalize,
        {"end": END, "l0": "l0"},
    )
    g.add_conditional_edges(
        "l0",
        route_after_scoring_l0,
        {"end": END, "market": "market"},
    )
    g.add_edge("market", "client")
    g.add_edge("client", "effort")
    g.add_edge("effort", "roi")
    g.add_edge("roi", "budget_infer")
    g.add_edge("budget_infer", "estimates")
    g.add_edge("estimates", "l2_eligibility")
    g.add_edge("l2_eligibility", "l2_ollama")
    g.add_edge("l2_ollama", "merge_notify")
    g.add_edge("merge_notify", END)
    return g.compile()


async def ainvoke_scoring_graph(state: dict[str, Any]) -> dict[str, Any]:
    """Run scoring subgraph; returns merged state dict."""
    app = build_scoring_graph()
    return await app.ainvoke(dict(state))


@lru_cache(maxsize=1)
def build_cover_letter_graph() -> Any:
    """
    Cover pipeline: render → Gemini → typography → footprint → Ollama judge.

    Conditional exits: no prompt / skip LLM / Gemini error / footprint block.
    """
    g = StateGraph(dict)
    g.add_node("render", cover_letter_render_pipeline_node)
    g.add_node("gemini", cover_letter_gemini_pipeline_node)
    g.add_node("typography", cover_letter_typography_pipeline_node)
    g.add_node("footprint", cover_letter_footprint_pipeline_node)
    g.add_node("judge", cover_letter_judge_pipeline_node)

    g.add_edge(START, "render")
    g.add_conditional_edges(
        "render",
        route_after_cover_render,
        {"end": END, "gemini": "gemini"},
    )
    g.add_conditional_edges(
        "gemini",
        route_after_cover_gemini,
        {"end": END, "typography": "typography"},
    )
    g.add_edge("typography", "footprint")
    g.add_conditional_edges(
        "footprint",
        route_after_cover_footprint,
        {"end": END, "judge": "judge"},
    )
    g.add_edge("judge", END)
    return g.compile()


async def ainvoke_cover_letter_graph(state: dict[str, Any]) -> dict[str, Any]:
    """Run cover-letter subgraph; returns merged state dict."""
    app = build_cover_letter_graph()
    return await app.ainvoke(dict(state))


def merge_cover_letter_output(final: dict[str, Any]) -> dict[str, Any]:
    """Strip internal pipeline keys for parent LangGraph / callers."""
    keys = (
        "cover_letter_prompt_rendered",
        "cover_letter_security_addon",
        "cover_letter_text",
        "cover_letter_llm_tier",
        "cover_letter_gemini_model",
        "cover_letter_llm_meta",
        "needs_manual_review",
        "decision_logs",
    )
    return {k: final[k] for k in keys if k in final}
