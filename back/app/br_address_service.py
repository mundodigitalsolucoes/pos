"""Brazilian address lookup and server-side geocoding for delivery coverage."""

import hashlib
import math
import os
import re
from functools import lru_cache

import redis
import requests


class AddressError(ValueError):
    pass


class AddressUnavailable(RuntimeError):
    pass


FIELDS = ("postal_code", "street", "number", "complement", "neighborhood", "city", "state_code")


def normalize_cep(value: str | None) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) != 8:
        raise AddressError("CEP inválido. Informe oito dígitos.")
    return digits


def full_address(data: dict) -> str:
    cep = normalize_cep(data.get("postal_code"))
    required = ("street", "number", "neighborhood", "city", "state_code")
    if any(len(str(data.get(field) or "")) > 120 for field in (*required, "complement")):
        raise AddressError("Endereço muito longo. Confira os campos.")
    if any(not str(data.get(field) or "").strip() for field in required):
        raise AddressError("Informe logradouro, número, bairro, cidade e UF.")
    uf = str(data["state_code"]).strip().upper()
    if not re.fullmatch(r"[A-Z]{2}", uf):
        raise AddressError("UF inválida.")
    parts = [str(data["street"]).strip(), str(data["number"]).strip()]
    if data.get("complement"):
        parts.append(str(data["complement"]).strip())
    parts += [str(data["neighborhood"]).strip(), str(data["city"]).strip(), uf, cep, "Brasil"]
    return ", ".join(parts)


@lru_cache(maxsize=1024)
def lookup_cep(cep: str) -> dict:
    code = normalize_cep(cep)
    try:
        response = requests.get(f"https://viacep.com.br/ws/{code}/json/", timeout=5)
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise AddressUnavailable("Consulta de CEP indisponível. Tente novamente.") from exc
    if not isinstance(result, dict):
        raise AddressUnavailable("Consulta de CEP indisponível. Tente novamente.")
    if result.get("erro"):
        raise AddressError("CEP não encontrado. Confira os números.")
    return {"postal_code": code, "street": result.get("logradouro", ""),
            "neighborhood": result.get("bairro", ""), "city": result.get("localidade", ""),
            "state_code": result.get("uf", "")}


def verify_cep(data: dict) -> None:
    """Reject nonexistent ZIPs and obvious mismatches without overriding user corrections."""
    found = lookup_cep(data.get("postal_code"))
    if str(found["state_code"]).upper() != str(data.get("state_code") or "").upper().strip():
        raise AddressError("O CEP não corresponde à UF informada. Confira o endereço.")


def geocode(data: dict) -> tuple[float, float]:
    """Cache by full address; Redis coordinates requests across workers (1/s provider limit)."""
    # Apartment/suite details help the courier but usually hurt geocoder matching.
    address = full_address({**data, "complement": ""})
    url = os.getenv("BR_GEOCODER_URL", "https://nominatim.openstreetmap.org/search")
    agent = os.getenv("BR_GEOCODER_USER_AGENT", "MDSFood/1.0 (https://mdsfood.testesite.tech)")
    cache_key = "mds:geo:" + hashlib.sha256(address.casefold().encode()).hexdigest()
    try:
        client = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"),
                                socket_connect_timeout=1, socket_timeout=1)
        cached = client.get(cache_key)
        if cached:
            lat, lon = (float(part) for part in cached.decode().split(","))
            return lat, lon
        if not client.set("mds:geo:rate", "1", nx=True, ex=2):
            raise AddressUnavailable("Localização ocupada. Tente novamente em alguns segundos.")
    except redis.RedisError as exc:
        raise AddressUnavailable("Localização temporariamente indisponível.") from exc
    try:
        response = requests.get(url, params={"q": address, "format": "jsonv2", "limit": 1,
                                             "countrycodes": "br", "addressdetails": 1},
                                headers={"User-Agent": agent}, timeout=8)
        response.raise_for_status()
        results = response.json()
        if not isinstance(results, list) or not results:
            raise AddressError("Não conseguimos localizar este endereço. Confira os dados.")
        result = results[0]
        if not isinstance(result, dict):
            raise AddressUnavailable("Resposta de localização inválida. Tente novamente.")
        # A street or house result avoids treating a city centroid as a delivery address.
        if result.get("type") not in ("house", "residential", "street", "road", "footway") and result.get("addresstype") not in ("house_number", "road"):
            raise AddressError("Não conseguimos localizar este endereço com precisão. Confira o número e a rua.")
        lat, lon = float(result["lat"]), float(result["lon"])
        if not math.isfinite(lat) or not math.isfinite(lon) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("invalid coordinates")
        client.setex(cache_key, 86400, f"{lat},{lon}")
        return lat, lon
    except (requests.RequestException, ValueError, TypeError, KeyError) as exc:
        if isinstance(exc, AddressError):
            raise
        raise AddressUnavailable("Não foi possível consultar a localização agora. Tente novamente.") from exc
