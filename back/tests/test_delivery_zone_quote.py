from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app import models
from app.delivery_zone_routes import PublicDeliveryAddress, quote_delivery_address


def _address() -> PublicDeliveryAddress:
    return PublicDeliveryAddress(
        postal_code="01001000",
        street="Praça da Sé",
        number="1",
        complement="",
        neighborhood="Sé",
        city="São Paulo",
        state_code="SP",
    )


def test_quote_returns_active_zone_fee_distance_and_eta():
    tenant = models.Tenant(
        id=1,
        name="Tenant",
        latitude=-23.5505,
        longitude=-46.6333,
        delivery_fee_cents=999,
    )
    zone = models.DeliveryZone(
        id=7,
        tenant_id=1,
        name="0-5 km",
        min_distance_meters=0,
        max_distance_meters=5000,
        fee_cents=800,
        estimated_minutes=35,
        is_active=True,
    )
    session = MagicMock()
    session.get.return_value = tenant
    session.exec.return_value.all.return_value = [zone]

    with patch("app.delivery_zone_routes.br_address.verify_cep"), \
         patch("app.delivery_zone_routes.br_address.geocode", return_value=(-23.5600, -46.6400)), \
         patch("app.delivery_zone_routes.distance_from_coordinates", return_value=3200.4):
        result = quote_delivery_address(1, _address(), session)

    assert result["covered"] is True
    assert result["delivery_fee_cents"] == 800
    assert result["estimated_minutes"] == 35
    assert result["zone_id"] == 7
    assert result["distance_meters"] == 3200
    assert result["pricing_source"] == "zones"


def test_quote_rejects_distance_outside_active_zones():
    tenant = models.Tenant(
        id=1,
        name="Tenant",
        latitude=-23.5505,
        longitude=-46.6333,
    )
    zone = models.DeliveryZone(
        id=7,
        tenant_id=1,
        name="0-5 km",
        min_distance_meters=0,
        max_distance_meters=5000,
        fee_cents=800,
        estimated_minutes=35,
        is_active=True,
    )
    session = MagicMock()
    session.get.return_value = tenant
    session.exec.return_value.all.return_value = [zone]

    with patch("app.delivery_zone_routes.br_address.verify_cep"), \
         patch("app.delivery_zone_routes.br_address.geocode", return_value=(-23.7000, -46.8000)), \
         patch("app.delivery_zone_routes.distance_from_coordinates", return_value=7000.0):
        result = quote_delivery_address(1, _address(), session)

    assert result["covered"] is False
    assert result["delivery_fee_cents"] is None
    assert result["zone_id"] is None
    assert result["reason"] == "outside_delivery_zone"
    assert result["pricing_source"] == "zones"


def test_quote_without_active_zones_keeps_legacy_fixed_fee():
    tenant = models.Tenant(
        id=1,
        name="Tenant",
        delivery_fee_cents=300,
        delivery_radius_meters=None,
    )
    session = MagicMock()
    session.get.return_value = tenant
    session.exec.return_value.all.return_value = []

    with patch("app.delivery_zone_routes.br_address.verify_cep"):
        result = quote_delivery_address(1, _address(), session)

    assert result["covered"] is True
    assert result["delivery_fee_cents"] == 300
    assert result["estimated_minutes"] is None
    assert result["zone_id"] is None
    assert result["distance_meters"] is None
    assert result["pricing_source"] == "legacy"


def test_quote_fails_closed_when_restaurant_location_is_missing():
    tenant = models.Tenant(
        id=1,
        name="Tenant",
        latitude=None,
        longitude=None,
    )
    zone = models.DeliveryZone(
        id=7,
        tenant_id=1,
        name="0-5 km",
        min_distance_meters=0,
        max_distance_meters=5000,
        fee_cents=800,
        estimated_minutes=35,
        is_active=True,
    )
    session = MagicMock()
    session.get.return_value = tenant
    session.exec.return_value.all.return_value = [zone]

    with patch("app.delivery_zone_routes.br_address.verify_cep"):
        result = quote_delivery_address(1, _address(), session)

    assert result["covered"] is False
    assert result["reason"] == "restaurant_location_required"
    assert result["delivery_fee_cents"] is None


def test_quote_returns_404_for_unknown_tenant():
    session = MagicMock()
    session.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        quote_delivery_address(999, _address(), session)

    assert exc.value.status_code == 404
