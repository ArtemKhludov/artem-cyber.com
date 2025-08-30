"""Consecutive identical reason keys for operator alerts (L0 mass-drop, etc.)."""

from __future__ import annotations

from ghost_engine.browser.feed_policy import ops_l0_streak_threshold


class ConsecutiveKeyStreak:
    """Count consecutive observations of the same string key; fire once when threshold reached."""

    __slots__ = ("_key", "_count")

    def __init__(self) -> None:
        self._key: str | None = None
        self._count: int = 0

    def reset(self) -> None:
        self._key = None
        self._count = 0

    def record(self, key: str) -> tuple[bool, int]:
        """
        Register one drop with ``key`` (e.g. l0_code).

        Returns ``(threshold_hit, current_streak_after_this_event)``.
        On hit, internal counter resets so the next streak starts fresh.
        """
        k = (key or "").strip()
        thr = ops_l0_streak_threshold()
        if not k:
            self.reset()
            return (False, 0)
        if k == self._key:
            self._count += 1
        else:
            self._key = k
            self._count = 1
        if self._count >= thr:
            prev = self._count
            self.reset()
            return (True, prev)
        return (False, self._count)
