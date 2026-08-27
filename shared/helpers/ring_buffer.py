"""
ParkTwin AI — Generic Bounded Ring Buffer
==========================================
Generic ring buffer wrapper over collections.deque used for in-memory event buffering.
"""

from __future__ import annotations

from collections import deque
from typing import Generic, Iterable, List, TypeVar

T = TypeVar("T")


class RingBuffer(Generic[T]):
    """Bounded ring buffer that keeps at most ``maxlen`` items (FIFO evictions)."""

    def __init__(self, maxlen: int) -> None:
        self._maxlen = max(1, int(maxlen))
        self._items: deque[T] = deque(maxlen=self._maxlen)

    @property
    def maxlen(self) -> int:
        return self._maxlen

    def append(self, item: T) -> None:
        """Append item to buffer, evicting oldest item if buffer is full."""
        self._items.append(item)

    def extend(self, items: Iterable[T]) -> None:
        """Extend buffer with items."""
        self._items.extend(items)

    def clear(self) -> None:
        """Clear all items from buffer."""
        self._items.clear()

    def to_list(self) -> List[T]:
        """Return items as a list (oldest to newest)."""
        return list(self._items)

    def __len__(self) -> int:
        return len(self._items)

    def __iter__(self):
        return iter(self._items)

    def __getitem__(self, item):
        if isinstance(item, slice):
            return list(self._items)[item]
        return self._items[item]


__all__ = ["RingBuffer"]
