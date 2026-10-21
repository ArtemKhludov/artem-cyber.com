"""
Registry of LangGraph topologies in this package.

- **Builders / invoke:** ``ghost_engine.agents.graph`` (``build_*``, ``ainvoke_*``).
- **Node implementations:** ``ghost_engine.agents.nodes.*``
- **Traversal reports (human + JSON):**
  - Job scoring: ``ghost_engine.scoring.gate_ledger.build_scoring_traversal_report``
  - Cover letter: ``ghost_engine.scoring.cover_gate_ledger.build_cover_traversal_report``
  - Ops AI diagnosis: ``ghost_engine.ops.diag_gate_ledger.build_ops_diag_traversal_report``

See ``docs/agent_graphs.md`` for diagrams and file map.
"""

from __future__ import annotations

from typing import TypedDict


class GraphSpec(TypedDict, total=False):
    description: str
    builder: str
    invoke_async: str
    state_type: str
    nodes_module: str
    routing: tuple[str, ...]
    traversal_report: str


GRAPHS: dict[str, GraphSpec] = {
    "scoring_gri": {
        "description": "Normalize → L0 → market/client/effort/roi → budget_infer (YAML) → estimates → L2 gray Ollama → merge",
        "builder": "ghost_engine.agents.graph.build_scoring_graph",
        "invoke_async": "ghost_engine.agents.graph.ainvoke_scoring_graph",
        "state_type": "dict",
        "nodes_module": "ghost_engine.agents.nodes.scoring_analytics_nodes",
        "routing": (
            "route_after_scoring_normalize",
            "route_after_scoring_l0",
        ),
        "traversal_report": "ghost_engine.scoring.gate_ledger.build_scoring_traversal_report",
    },
    "cover_letter": {
        "description": "Render prompt → Gemini → typography → footprint regex → Ollama judge",
        "builder": "ghost_engine.agents.graph.build_cover_letter_graph",
        "invoke_async": "ghost_engine.agents.graph.ainvoke_cover_letter_graph",
        "state_type": "dict",
        "nodes_module": "ghost_engine.agents.nodes.cover_letter_pipeline_nodes",
        "routing": (
            "route_after_cover_render",
            "route_after_cover_gemini",
            "route_after_cover_footprint",
        ),
        "traversal_report": "ghost_engine.scoring.cover_gate_ledger.build_cover_traversal_report",
    },
}


def list_graph_names() -> tuple[str, ...]:
    return tuple(sorted(GRAPHS.keys()))
