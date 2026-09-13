"""Tenant-scoped custom product categories and subcategories."""

from __future__ import annotations

from copy import deepcopy

from sqlalchemy import inspect, text
from sqlmodel import Session, select

from . import models
from .category_codes import (
    CATEGORY_CODES,
    collapse_category_map_keys,
    normalize_product_category,
)

MAX_NAME_LEN = 128

# Fixed display order for staff UI category dropdowns.
STANDARD_CATEGORY_ORDER: list[str] = [
    CATEGORY_CODES["STARTERS"],
    CATEGORY_CODES["MAIN_COURSE"],
    CATEGORY_CODES["DESSERTS"],
    CATEGORY_CODES["BEVERAGES"],
    CATEGORY_CODES["SIDES"],
]
_STANDARD_CATEGORY_SET = set(STANDARD_CATEGORY_ORDER)


def normalize_custom_subcategories(stored: dict | None) -> dict[str, list[str]]:
    """Return category -> sorted unique subcategory names from tenant JSONB."""
    if not stored or not isinstance(stored, dict):
        return {}
    out: dict[str, list[str]] = {}
    for category, names in stored.items():
        raw_cat = (str(category) if category is not None else "").strip()
        cat = normalize_product_category(raw_cat) or raw_cat
        if not cat:
            continue
        if not isinstance(names, list):
            continue
        existing = set(out.get(cat, []))
        items: list[str] = list(out.get(cat, []))
        for raw in names:
            name = (str(raw) if raw is not None else "").strip()
            if not name or name in existing:
                continue
            existing.add(name)
            items.append(name)
        if items:
            out[cat] = sorted(items)
    return out


def catalog_subcategories(session: Session) -> dict[str, set[str]]:
    """Subcategories from global ProductCatalog."""
    catalog_items = session.exec(select(models.ProductCatalog)).all()
    categories: dict[str, set[str]] = {}
    for item in catalog_items:
        if not item.category:
            continue
        if item.category not in categories:
            categories[item.category] = set()
        if item.subcategory:
            categories[item.category].add(item.subcategory)
    return categories


def product_subcategories(session: Session, tenant_id: int) -> dict[str, set[str]]:
    """Subcategories already used on tenant Product rows."""
    products = session.exec(
        select(models.Product).where(models.Product.tenant_id == tenant_id)
    ).all()
    categories: dict[str, set[str]] = {}
    for product in products:
        cat = (product.category or "").strip()
        sub = (product.subcategory or "").strip()
        if not cat:
            continue
        if cat not in categories:
            categories[cat] = set()
        if sub:
            categories[cat].add(sub)
    return categories


def tenant_catalog_categories(session: Session, tenant_id: int) -> list[str]:
    """Active top-level categories explicitly maintained by the restaurant."""
    bind = session.get_bind()
    if not inspect(bind).has_table("tenant_catalog_category"):
        return []
    rows = session.execute(
        text(
            """
            SELECT name
            FROM tenant_catalog_category
            WHERE tenant_id = :tenant_id AND is_active = TRUE
            ORDER BY sort_order ASC, LOWER(name) ASC, id ASC
            """
        ),
        {"tenant_id": tenant_id},
    ).all()
    return [str(row[0]).strip() for row in rows if row and str(row[0]).strip()]


def merge_category_subcategory_maps(
    *maps: dict[str, set[str]] | dict[str, list[str]],
) -> dict[str, list[str]]:
    """Merge multiple category maps into sorted lists."""
    merged: dict[str, set[str]] = {}
    for raw in maps:
        for category, subs in raw.items():
            raw_cat = (category or "").strip()
            cat = normalize_product_category(raw_cat) or raw_cat
            if not cat:
                continue
            if cat not in merged:
                merged[cat] = set()
            if isinstance(subs, (list, set, tuple)):
                for sub in subs:
                    name = (str(sub) if sub is not None else "").strip()
                    if name:
                        merged[cat].add(name)
    return collapse_category_map_keys(merged)


def tenant_categories_for_ui(session: Session, tenant_id: int) -> dict[str, list[str]]:
    """Catalog + tenant custom + product-derived categories/subcategories for staff UI."""
    tenant = session.get(models.Tenant, tenant_id)
    custom = normalize_custom_subcategories(
        tenant.custom_subcategories if tenant else None
    )
    merged = merge_category_subcategory_maps(
        catalog_subcategories(session),
        {k: set(v) for k, v in custom.items()},
        product_subcategories(session, tenant_id),
    )

    result: dict[str, list[str]] = {
        cat: merged.get(cat, []) for cat in STANDARD_CATEGORY_ORDER
    }

    # Explicit tenant categories are shown even before the first product is assigned.
    for cat in tenant_catalog_categories(session, tenant_id):
        normalized = normalize_product_category(cat) or cat
        if normalized not in result:
            result[normalized] = merged.get(normalized, [])

    for cat, subs in sorted(merged.items()):
        if cat not in result:
            result[cat] = subs
    return result


def _validate_category_name(category: str) -> str:
    raw = (category or "").strip()
    cat = normalize_product_category(raw) or raw
    if not cat:
        raise ValueError("Category is required")
    if len(cat) > MAX_NAME_LEN:
        raise ValueError("Category name is too long")
    return cat


def _validate_subcategory_name(name: str) -> str:
    sub = (name or "").strip()
    if not sub:
        raise ValueError("Subcategory name is required")
    if len(sub) > MAX_NAME_LEN:
        raise ValueError("Subcategory name is too long")
    return sub


def _load_tenant_custom(session: Session, tenant_id: int) -> tuple[models.Tenant, dict[str, list[str]]]:
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise LookupError("Tenant not found")
    return tenant, normalize_custom_subcategories(tenant.custom_subcategories)


def _save_custom(tenant: models.Tenant, custom: dict[str, list[str]]) -> None:
    tenant.custom_subcategories = custom or None


def add_custom_subcategory(
    session: Session, tenant_id: int, category: str, name: str
) -> dict[str, list[str]]:
    cat = _validate_category_name(category)
    sub = _validate_subcategory_name(name)
    tenant, custom = _load_tenant_custom(session, tenant_id)
    existing = set(tenant_categories_for_ui(session, tenant_id).get(cat, []))
    if sub in existing:
        raise ValueError("Subcategory already exists")
    updated = deepcopy(custom)
    updated.setdefault(cat, [])
    if sub not in updated[cat]:
        updated[cat] = sorted([*updated[cat], sub])
    _save_custom(tenant, updated)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant_categories_for_ui(session, tenant_id)


def rename_custom_subcategory(
    session: Session, tenant_id: int, category: str, old_name: str, new_name: str
) -> dict[str, list[str]]:
    cat = _validate_category_name(category)
    old = _validate_subcategory_name(old_name)
    new = _validate_subcategory_name(new_name)
    if old == new:
        return tenant_categories_for_ui(session, tenant_id)
    tenant, custom = _load_tenant_custom(session, tenant_id)
    merged = tenant_categories_for_ui(session, tenant_id)
    existing = set(merged.get(cat, []))
    existing.discard(old)
    if new in existing:
        raise ValueError("Subcategory already exists")
    updated = deepcopy(custom)
    if cat in updated and old in updated[cat]:
        updated[cat] = sorted([new if s == old else s for s in updated[cat]])
        if not updated[cat]:
            del updated[cat]
    _save_custom(tenant, updated)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant_categories_for_ui(session, tenant_id)


def remove_custom_subcategory(
    session: Session, tenant_id: int, category: str, name: str
) -> dict[str, list[str]]:
    cat = _validate_category_name(category)
    sub = _validate_subcategory_name(name)
    tenant, custom = _load_tenant_custom(session, tenant_id)
    updated = deepcopy(custom)
    if cat in updated:
        updated[cat] = [s for s in updated[cat] if s != sub]
        if not updated[cat]:
            del updated[cat]
    _save_custom(tenant, updated)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    return tenant_categories_for_ui(session, tenant_id)
