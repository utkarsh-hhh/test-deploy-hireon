"""
Generic pagination helper used across all list endpoints.
"""
import math
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[Any]
    total: int
    page: int
    limit: int
    pages: int


def paginate(items: list[Any], total: int, page: int, limit: int) -> dict:
    """Build a pagination envelope."""
    pages = math.ceil(total / limit) if limit > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }
