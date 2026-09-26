"""Fail-closed radius checks and Brazilian address integration guards."""

import unittest
from unittest.mock import MagicMock, patch

from app import br_address_service as address
from app import models
from app.delivery_order_service import validate_delivery_coverage


class BrazilianDeliveryCoverageTests(unittest.TestCase):
    def setUp(self):
        self.tenant = models.Tenant(name="Restaurante", latitude=-23.55, longitude=-46.63,
                                    delivery_radius_meters=5000)
        self.delivery = {"postal_code": "01001-000", "street": "Praça da Sé", "number": "1",
                         "complement": "", "neighborhood": "Sé", "city": "São Paulo", "state_code": "SP"}

    def test_radius_without_restaurant_coordinates_fails_closed(self):
        self.tenant.latitude = None
        self.assertEqual(validate_delivery_coverage(self.tenant, postal_code="01001000",
                         delivery_latitude=-23.55, delivery_longitude=-46.63), "restaurant_location_required")

    def test_radius_and_postal_filters_both_apply(self):
        self.tenant.delivery_postal_codes = '["01001000"]'
        self.assertEqual(validate_delivery_coverage(self.tenant, postal_code="99999999",
                         delivery_latitude=-23.55, delivery_longitude=-46.63), "outside_delivery_zone")
        self.assertEqual(validate_delivery_coverage(self.tenant, postal_code="01001-000",
                         delivery_latitude=-22, delivery_longitude=-46.63), "outside_delivery_radius")
        self.assertIsNone(validate_delivery_coverage(self.tenant, postal_code="01001000",
                          delivery_latitude=-23.55, delivery_longitude=-46.63))

    def test_address_requires_number_and_valid_cep(self):
        self.assertIn("Brasil", address.full_address(self.delivery))
        with self.assertRaises(address.AddressError):
            address.full_address({**self.delivery, "number": ""})
        with self.assertRaises(address.AddressError):
            address.full_address({**self.delivery, "postal_code": "123"})

    @patch("app.br_address_service.lookup_cep", return_value={"state_code": "RJ"})
    def test_cep_must_match_state(self, _lookup):
        with self.assertRaises(address.AddressError):
            address.verify_cep(self.delivery)

    @patch("app.br_address_service.redis.from_url")
    @patch("app.br_address_service.requests.get")
    def test_geocode_uses_server_result_and_caches(self, get, from_url):
        cache = MagicMock()
        cache.get.return_value = None
        cache.set.return_value = True
        from_url.return_value = cache
        get.return_value.json.return_value = [{"type": "house", "lat": "-23.55", "lon": "-46.63"}]
        self.assertEqual(address.geocode(self.delivery), (-23.55, -46.63))
        self.assertEqual(get.call_args.kwargs["params"]["countrycodes"], "br")
        cache.setex.assert_called_once()

    @patch("app.br_address_service.redis.from_url")
    @patch("app.br_address_service.requests.get")
    def test_geocode_unavailable_does_not_accept_browser_coordinates(self, get, from_url):
        cache = MagicMock()
        cache.get.return_value = None
        cache.set.return_value = False
        from_url.return_value = cache
        with self.assertRaises(address.AddressUnavailable):
            address.geocode(self.delivery)
        get.assert_not_called()
