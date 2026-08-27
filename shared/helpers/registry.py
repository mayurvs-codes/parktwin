"""
ParkTwin AI — Shared Singleton Registry Helper
==============================================
Provides a generic helper to wrap factory functions into process-wide singletons
with (make, get, reset) functions.
"""

from typing import Callable, TypeVar, Tuple, Optional

T = TypeVar("T")


def make_singleton(factory_fn: Callable[..., T]) -> Tuple[Callable[..., T], Callable[[], T], Callable[[Optional[T]], None]]:
    """
    Wrap factory_fn into a process-wide singleton manager.
    Returns (make, get, reset) functions wrapping a closure-captured _instance variable.
    """
    _instance: Optional[T] = None

    def make(*args, **kwargs) -> T:
        return factory_fn(*args, **kwargs)

    def get() -> T:
        nonlocal _instance
        if _instance is None:
            _instance = make()
        return _instance

    def reset(instance: Optional[T] = None) -> None:
        nonlocal _instance
        _instance = instance

    return make, get, reset
