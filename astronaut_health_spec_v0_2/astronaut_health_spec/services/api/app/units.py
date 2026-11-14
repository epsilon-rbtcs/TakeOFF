"""Explicit, documented unit conversions.

Only the conversions listed here are performed.  Values whose units are
incompatible (for example absorbed dose in ``mGy`` supplied to a dose-equivalent
measurement expecting ``mSv``) are rejected rather than guessed.
"""
from __future__ import annotations

from typing import Any

from .catalogue import definition_by_code


class UnitConversionError(ValueError):
    pass


# (measurement_code, source_unit) -> (canonical_unit, multiplier)
# A multiplier of ``None`` means that the measurement's canonical unit is not a
# single compatible unit (for example an assay-specific quantity).
LINEAR_CONVERSIONS: dict[tuple[str, str], tuple[str, float]] = {
    ("sleep_duration", "min"): ("h", 1.0 / 60.0),
    ("dose_equivalent", "uSv"): ("mSv", 1.0 / 1000.0),
    ("absorbed_dose", "uGy"): ("mGy", 1.0 / 1000.0),
    # 1 mSv/day = 1000 uSv / 24 h
    ("dose_rate", "mSv/day"): ("uSv/h", 1000.0 / 24.0),
}

# Display strings emitted by the unmodified crew client.  These are explicit
# spelling aliases only; no quantity is converted and no unit is invented.
UNIT_ALIASES: dict[str, str] = {
    "\u00b0C": "degC",
    "0\u201310": "score_0_10",
    "0-10": "score_0_10",
    "g/cm\u00b2": "g/cm2",
    "\u00b5Sv/h": "uSv/h",
    "reported unit": "assay_specific",
}


def normalise_unit(unit: str | None) -> str | None:
    """Map known display-unit spellings to the catalogue's canonical spelling."""
    if unit is None:
        return None
    return UNIT_ALIASES.get(unit, unit)


def canonicalise_numeric(code: str, value: float, unit: str | None) -> tuple[float, str | None]:
    """Return ``(canonical_value, canonical_unit)`` or raise ``UnitConversionError``."""
    definition = definition_by_code(code)
    if definition is None:
        raise UnitConversionError(f"Unknown measurement code '{code}'.")
    canonical_unit = definition.get("canonical_unit")
    allowed = definition.get("allowed_units") or []
    unit = normalise_unit(unit)

    if canonical_unit is None:
        # Value types without a unit (text/boolean/object) keep the original unit.
        return value, unit

    if unit is None:
        raise UnitConversionError(f"Unit is required for measurement '{code}'.")
    if unit not in allowed:
        raise UnitConversionError(f"Unit '{unit}' is not supported for measurement '{code}'.")
    if unit == canonical_unit:
        return value, canonical_unit
    conversion = LINEAR_CONVERSIONS.get((code, unit))
    if conversion is None or conversion[0] != canonical_unit:
        raise UnitConversionError(
            f"Unit '{unit}' cannot be converted to canonical unit '{canonical_unit}' for "
            f"measurement '{code}'."
        )
    return value * conversion[1], canonical_unit


def canonical_value_for_snapshot(
    definition: dict[str, Any], value: float, unit: str | None
) -> tuple[float, str | None]:
    """Canonicalise against a versioned snapshot definition.

    The snapshot is authoritative for observations; the in-code catalogue is
    only a fallback when a snapshot omits detail.
    """
    code = definition.get("code", "")
    canonical_unit = definition.get("canonical_unit")
    allowed = definition.get("allowed_units") or []
    unit = normalise_unit(unit)
    if canonical_unit is None:
        return value, unit
    if unit is None:
        raise UnitConversionError(f"Unit is required for measurement '{code}'.")
    if unit not in allowed:
        raise UnitConversionError(f"Unit '{unit}' is not supported for measurement '{code}'.")
    if unit == canonical_unit:
        return value, canonical_unit
    conversion = LINEAR_CONVERSIONS.get((code, unit))
    if conversion is None or conversion[0] != canonical_unit:
        raise UnitConversionError(
            f"Unit '{unit}' cannot be converted to canonical unit '{canonical_unit}' for "
            f"measurement '{code}'."
        )
    return value * conversion[1], canonical_unit
