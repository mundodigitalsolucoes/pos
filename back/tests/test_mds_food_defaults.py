"""Brazilian commercial defaults apply only when an account creates a new tenant."""

import unittest

from app.mds_food_defaults import new_restaurant_locale


class NewRestaurantLocaleTests(unittest.TestCase):
    def test_new_restaurant_uses_brazilian_profile(self):
        self.assertEqual(new_restaurant_locale(), {
            "country_code": "BR",
            "currency_code": "BRL",
            "currency": "R$",
            "default_language": "pt-BR",
            "timezone": "America/Sao_Paulo",
        })
