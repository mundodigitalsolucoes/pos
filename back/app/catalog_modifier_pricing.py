"""Server-side validation and pricing for MDS Food Catalog 2.0 modifiers."""

from __future__ import annotations

from sqlalchemy import text
from sqlmodel import Session


class CatalogModifierValidationError(ValueError):
    """Raised when a modifier selection is invalid for a tenant/product."""


def _unique_positive_ids(values: list[int] | None) -> list[int]:
    result: list[int] = []
    seen: set[int] = set()
    for raw in values or []:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            raise CatalogModifierValidationError("Opção de complemento inválida.")
        if value <= 0 or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def validate_and_price_catalog_modifiers(
    session: Session,
    *,
    tenant_id: int,
    product_id: int,
    selected_option_ids: list[int] | None,
) -> dict:
    """Validate selections for a product and return a stable pricing snapshot.

    The client only sends option ids. Names, group rules and price deltas are always
    resolved from the tenant-scoped database so the browser cannot forge prices.
    """
    option_ids = _unique_positive_ids(selected_option_ids)

    groups = session.execute(
        text(
            """
            SELECT g.id, g.name, g.min_select, g.max_select, g.is_required, pg.sort_order
            FROM catalog_product_modifier_group pg
            JOIN catalog_modifier_group g
              ON g.id = pg.group_id
             AND g.tenant_id = pg.tenant_id
            WHERE pg.tenant_id = :tenant_id
              AND pg.product_id = :product_id
              AND g.is_active = TRUE
            ORDER BY pg.sort_order ASC, g.sort_order ASC, g.id ASC
            """
        ),
        {"tenant_id": tenant_id, "product_id": product_id},
    ).mappings().all()

    if not groups:
        if option_ids:
            raise CatalogModifierValidationError(
                "Este produto não possui complementos disponíveis."
            )
        return {"price_delta_cents": 0, "groups": [], "summary": None}

    options = session.execute(
        text(
            """
            SELECT o.id, o.group_id, o.name, o.price_delta_cents, o.sort_order
            FROM catalog_modifier_option o
            JOIN catalog_product_modifier_group pg
              ON pg.group_id = o.group_id
             AND pg.tenant_id = o.tenant_id
            JOIN catalog_modifier_group g
              ON g.id = o.group_id
             AND g.tenant_id = o.tenant_id
            WHERE o.tenant_id = :tenant_id
              AND pg.product_id = :product_id
              AND g.is_active = TRUE
              AND o.is_active = TRUE
            ORDER BY o.group_id ASC, o.sort_order ASC, o.id ASC
            """
        ),
        {"tenant_id": tenant_id, "product_id": product_id},
    ).mappings().all()

    option_by_id = {int(row["id"]): dict(row) for row in options}
    invalid_ids = [oid for oid in option_ids if oid not in option_by_id]
    if invalid_ids:
        raise CatalogModifierValidationError(
            "Uma ou mais opções não pertencem a este produto."
        )

    selected_by_group: dict[int, list[dict]] = {}
    for option_id in option_ids:
        option = option_by_id[option_id]
        selected_by_group.setdefault(int(option["group_id"]), []).append(option)

    snapshot_groups: list[dict] = []
    total_delta = 0
    summary_parts: list[str] = []

    for raw_group in groups:
        group = dict(raw_group)
        group_id = int(group["id"])
        selected = selected_by_group.get(group_id, [])
        count = len(selected)
        minimum = max(0, int(group["min_select"] or 0))
        maximum = max(1, int(group["max_select"] or 1))
        required = bool(group["is_required"])
        if required and minimum < 1:
            minimum = 1

        if count < minimum:
            raise CatalogModifierValidationError(
                f"Selecione pelo menos {minimum} opção(ões) em {group['name']}."
            )
        if count > maximum:
            raise CatalogModifierValidationError(
                f"Selecione no máximo {maximum} opção(ões) em {group['name']}."
            )

        if not selected:
            continue

        snap_options: list[dict] = []
        option_names: list[str] = []
        for option in selected:
            delta = max(0, int(option["price_delta_cents"] or 0))
            total_delta += delta
            option_names.append(str(option["name"]))
            snap_options.append(
                {
                    "option_id": int(option["id"]),
                    "name": str(option["name"]),
                    "price_delta_cents": delta,
                }
            )

        snapshot_groups.append(
            {
                "group_id": group_id,
                "name": str(group["name"]),
                "options": snap_options,
            }
        )
        summary_parts.append(f"{group['name']}: {', '.join(option_names)}")

    return {
        "price_delta_cents": total_delta,
        "groups": snapshot_groups,
        "summary": " · ".join(summary_parts) if summary_parts else None,
    }
