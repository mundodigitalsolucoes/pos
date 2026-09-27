"""Server-side coverage selection; distances use the existing geodesic helper."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

from . import models
from .delivery_order_service import haversine_meters, normalize_postal_code, parse_delivery_postal_codes


@dataclass(frozen=True)
class CoverageResult:
    covered: bool
    distance_meters: float
    zone_id: int | None
    fee_cents: int | None
    estimated_minutes: int | None
    source: str


def overlapping(zone: models.DeliveryZone, others: Iterable[models.DeliveryZone]) -> bool:
    """Half-open bands; touching edges do not overlap."""
    return any(
        other.is_active and other.id != zone.id
        and zone.min_distance_meters < other.max_distance_meters
        and other.min_distance_meters < zone.max_distance_meters
        for other in others
    )


def select_coverage(
    tenant: models.Tenant,
    distance_meters: float,
    zones: Iterable[models.DeliveryZone],
    *,
    postal_code: str | None = None,
) -> CoverageResult:
    """Active bands supersede the legacy radius/fee, including when distance falls in a gap."""
    if not math.isfinite(distance_meters) or distance_meters < 0:
        raise ValueError("Distance must be finite and non-negative")
    active = sorted(
        (z for z in zones if z.is_active and z.tenant_id == tenant.id),
        key=lambda z: (z.min_distance_meters, z.max_distance_meters, z.id or 0),
    )
    if active:
        maximum = max(z.max_distance_meters for z in active)
        for zone in active:
            if zone.min_distance_meters <= distance_meters < zone.max_distance_meters or (
                distance_meters == maximum and zone.max_distance_meters == maximum
            ):
                return CoverageResult(True, distance_meters, zone.id, zone.fee_cents, zone.estimated_minutes, "zones")
        return CoverageResult(False, distance_meters, None, None, None, "zones")
    radius = tenant.delivery_radius_meters
    allowed_postal_codes = parse_delivery_postal_codes(tenant.delivery_postal_codes)
    postal_covered = not allowed_postal_codes or normalize_postal_code(postal_code) in allowed_postal_codes
    covered = postal_covered and (radius is None or radius <= 0 or distance_meters <= radius)
    return CoverageResult(
        covered, distance_meters, None,
        max(0, tenant.delivery_fee_cents or 0) if covered else None,
        None, "legacy",
    )


def distance_from_coordinates(tenant: models.Tenant, latitude: float, longitude: float) -> float:
    """Geodesic straight-line distance, never a road routing estimate."""
    if tenant.latitude is None or tenant.longitude is None:
        raise ValueError("Restaurant coordinates are required")
    if not all(math.isfinite(value) for value in (latitude, longitude)):
        raise ValueError("Coordinates must be finite")
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise ValueError("Coordinates are outside valid ranges")
    return haversine_meters(tenant.latitude, tenant.longitude, latitude, longitude)
