"""Tenant-scoped administrative API for delivery distance bands."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlmodel import Session, select

from . import br_address_service as br_address
from . import models
from .db import get_session
from .delivery_zones import distance_from_coordinates, overlapping, select_coverage
from .permissions import Permission, require_permission

router = APIRouter(prefix="/tenant/delivery-zones", tags=["Delivery zones"])


class ZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    min_distance_meters: int = Field(ge=0)
    max_distance_meters: int = Field(gt=0)
    fee_cents: int = Field(ge=0)
    estimated_minutes: int = Field(gt=0)
    is_active: bool = True
    sort_order: int = 0

    @model_validator(mode="after")
    def validate_range(self) -> "ZoneCreate":
        if self.max_distance_meters <= self.min_distance_meters:
            raise ValueError("A distância final deve superar a distância inicial.")
        if not self.name.strip():
            raise ValueError("Informe o nome da área.")
        return self


class ZoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    min_distance_meters: int | None = Field(default=None, ge=0)
    max_distance_meters: int | None = Field(default=None, gt=0)
    fee_cents: int | None = Field(default=None, ge=0)
    estimated_minutes: int | None = Field(default=None, gt=0)
    is_active: bool | None = None
    sort_order: int | None = None


class PublicDeliveryAddress(BaseModel):
    postal_code: str
    street: str
    number: str
    complement: str = ""
    neighborhood: str
    city: str
    state_code: str


def _lock_tenant(session: Session, tenant_id: int) -> None:
    # Serialize writes within one tenant so concurrent requests cannot insert overlapping bands.
    if session.execute(text("SELECT id FROM tenant WHERE id = :id FOR UPDATE"), {"id": tenant_id}).first() is None:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado.")


def _get_zone(session: Session, tenant_id: int, zone_id: int) -> models.DeliveryZone:
    zone = session.exec(select(models.DeliveryZone).where(
        models.DeliveryZone.id == zone_id, models.DeliveryZone.tenant_id == tenant_id,
    )).first()
    if zone is None:
        raise HTTPException(status_code=404, detail="Área não encontrada.")
    return zone


def _assert_not_overlapping(session: Session, zone: models.DeliveryZone) -> None:
    if not zone.is_active:
        return
    zones = session.exec(select(models.DeliveryZone).where(
        models.DeliveryZone.tenant_id == zone.tenant_id,
        models.DeliveryZone.is_active == True,  # noqa: E712
    )).all()
    if overlapping(zone, zones):
        raise HTTPException(status_code=409, detail="Esta área sobrepõe outra área ativa.")


@router.get("", response_model=list[models.DeliveryZone])
def list_zones(
    user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
) -> list[models.DeliveryZone]:
    return list(session.exec(select(models.DeliveryZone).where(
        models.DeliveryZone.tenant_id == user.tenant_id,
    ).order_by(models.DeliveryZone.sort_order, models.DeliveryZone.min_distance_meters)).all())


@router.post("", response_model=models.DeliveryZone, status_code=201)
def create_zone(
    body: ZoneCreate,
    user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> models.DeliveryZone:
    _lock_tenant(session, user.tenant_id)
    zone = models.DeliveryZone(tenant_id=user.tenant_id, **body.model_dump())
    zone.name = zone.name.strip()
    _assert_not_overlapping(session, zone)
    session.add(zone)
    session.commit()
    session.refresh(zone)
    return zone


@router.put("/{zone_id}", response_model=models.DeliveryZone)
def update_zone(
    zone_id: int,
    body: ZoneUpdate,
    user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> models.DeliveryZone:
    _lock_tenant(session, user.tenant_id)
    zone = _get_zone(session, user.tenant_id, zone_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is None:
            raise HTTPException(status_code=422, detail=f"{key} não pode ser nulo.")
        if key == "name":
            value = value.strip()
            if not value:
                raise HTTPException(status_code=422, detail="Informe o nome da área.")
        setattr(zone, key, value)
    if zone.max_distance_meters <= zone.min_distance_meters:
        raise HTTPException(status_code=422, detail="A distância final deve superar a inicial.")
    _assert_not_overlapping(session, zone)
    zone.updated_at = datetime.now(timezone.utc)
    session.add(zone)
    session.commit()
    session.refresh(zone)
    return zone


@router.delete("/{zone_id}", status_code=204)
def delete_zone(
    zone_id: int,
    user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> None:
    _lock_tenant(session, user.tenant_id)
    session.delete(_get_zone(session, user.tenant_id, zone_id))
    session.commit()


@router.post("/quote/{tenant_id}")
def quote_delivery_address(
    tenant_id: int,
    body: PublicDeliveryAddress,
    session: Session = Depends(get_session),
) -> dict:
    """Validate a Brazilian address and quote delivery coverage server-side."""
    tenant = session.get(models.Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Restaurante não encontrado.")
    data = body.model_dump()
    try:
        br_address.full_address(data)
        br_address.verify_cep(data)
    except br_address.AddressError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except br_address.AddressUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    zones = list(session.exec(select(models.DeliveryZone).where(
        models.DeliveryZone.tenant_id == tenant_id,
        models.DeliveryZone.is_active == True,  # noqa: E712
    )).all())
    requires_coordinates = bool(zones) or (tenant.delivery_radius_meters or 0) > 0
    if requires_coordinates and (tenant.latitude is None or tenant.longitude is None):
        return {"covered": False, "reason": "restaurant_location_required", "latitude": None,
                "longitude": None, "distance_meters": None, "delivery_fee_cents": None,
                "estimated_minutes": None, "zone_id": None, "pricing_source": None}

    latitude = longitude = None
    distance_meters = 0.0
    if requires_coordinates:
        try:
            latitude, longitude = br_address.geocode(data)
            distance_meters = distance_from_coordinates(tenant, latitude, longitude)
        except br_address.AddressError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except br_address.AddressUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Localização de entrega inválida.") from exc

    coverage = select_coverage(
        tenant, distance_meters, zones, postal_code=body.postal_code,
    )
    return {
        "covered": coverage.covered,
        "reason": None if coverage.covered else "outside_delivery_zone",
        "latitude": latitude,
        "longitude": longitude,
        "distance_meters": round(coverage.distance_meters) if requires_coordinates else None,
        "delivery_fee_cents": coverage.fee_cents,
        "estimated_minutes": coverage.estimated_minutes,
        "zone_id": coverage.zone_id,
        "pricing_source": coverage.source,
    }
