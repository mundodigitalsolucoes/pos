"""Commercial profile for newly created MDS Food restaurants.

Existing tenants retain their stored country, currency and timezone.
"""


def new_restaurant_locale() -> dict[str, str]:
    return {
        "country_code": "BR",
        "currency_code": "BRL",
        "currency": "R$",
        "default_language": "pt-BR",
        "timezone": "America/Sao_Paulo",
    }
