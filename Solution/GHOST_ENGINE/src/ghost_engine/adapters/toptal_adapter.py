from __future__ import annotations

from collections import deque
from pathlib import Path
from typing import Any

from playwright.async_api import Page

from ghost_engine.adapters.base_adapter import BaseSiteAdapter
from ghost_engine.adapters.graphql_sniff import attach_graphql_sniffers


class ToptalAdapter(BaseSiteAdapter):
    def __init__(self, site_yaml: Path) -> None:
        super().__init__(site_yaml)
        self._dev_graphql_snippets: deque[dict[str, Any]] = deque(maxlen=50)

    async def poll_inbox(self) -> list[dict[str, Any]]:
        return []

    async def intercept_network(self, page: Page) -> None:
        attach_graphql_sniffers(
            page,
            site_id=self.site_id,
            jobs_graphql_url=self.jobs_graphql_url,
            snippets=self._dev_graphql_snippets,
            save_to_disc_callbacks=(self.save_graphql_sniff_payload,),
        )


def load_default() -> ToptalAdapter:
    root = Path(__file__).resolve().parents[3] / "config" / "sites" / "toptal.yaml"
    return ToptalAdapter(root)
