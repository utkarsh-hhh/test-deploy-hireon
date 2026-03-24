from uuid import UUID
from typing import Any
from pydantic import BaseModel, model_validator


class OrmSchema(BaseModel):
    """Base for all ORM output schemas. Auto-coerces UUID fields → str."""
    model_config = {"from_attributes": True}

    @model_validator(mode='before')
    @classmethod
    def _coerce_uuids(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: str(v) if isinstance(v, UUID) else v for k, v in data.items()}
        # ORM object — only extract fields that actually exist on the object
        out: dict[str, Any] = {}
        for key in cls.model_fields:
            if not hasattr(data, key):
                continue  # let Pydantic use the field's default value
            try:
                val = getattr(data, key)
                out[key] = str(val) if isinstance(val, UUID) else val
            except Exception:
                pass  # let Pydantic use the field's default value
        return out
