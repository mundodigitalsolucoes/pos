"""Public delivery checkout with server-priced MDS Food Catalog 2.0 modifiers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, text
from sqlmodel import Session

from . import models
from .catalog_modifier_pricing import (
    CatalogModifierValidationError,
    validate_and_price_catalog_modifiers,
)
from .contact_validation import normalize_phone_e164
from .db import get_session
from .delivery_order_service import (
    create_satisfecho_delivery_order,
    order_delivery_fee_cents,
    tenant_delivery_fee_cents,
    validate_delivery_coverage,
)
from .rate_limits import public_menu_ip_limit
from .settings import settings

router = APIRouter()


def _selected_modifier_ids(customization_answers: dict | None) -> list[int]:
    if not isinstance(customization_answers, dict):
        return []
    raw = customization_answers.get("catalog_modifier_option_ids")
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise HTTPException(status_code=400, detail="Seleção de complementos inválida.")
    result: list[int] = []
    for value in raw:
        try:
            result.append(int(value))
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Seleção de complementos inválida.") from exc
    return result


def _canonical_product_id(session: Session, tenant_id: int, public_product_id: int) -> int:
    tenant_product = session.execute(
        text(
            """
            SELECT product_id
            FROM tenant_product
            WHERE id = :id AND tenant_id = :tenant_id
            """
        ),
        {"id": public_product_id, "tenant_id": tenant_id},
    ).mappings().first()
    if tenant_product is not None:
        linked = tenant_product.get("product_id")
        if linked is None:
            raise HTTPException(
                status_code=400,
                detail="Este item ainda não está disponível para personalização.",
            )
        return int(linked)

    product = session.execute(
        text("SELECT id FROM product WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": public_product_id, "tenant_id": tenant_id},
    ).first()
    if not product:
        raise HTTPException(status_code=400, detail=f"Produto não encontrado: {public_product_id}")
    return public_product_id


def _combo_snapshot(session: Session, tenant_id: int, product_id: int) -> list[dict]:
    """Return the current active combo composition for a product, ready to persist on the order item."""
    rows = session.execute(
        text(
            """
            SELECT i.component_product_id AS product_id,
                   i.quantity,
                   p.name
            FROM catalog_combo c
            JOIN catalog_combo_item i
              ON i.combo_id = c.id
             AND i.tenant_id = c.tenant_id
            JOIN product p
              ON p.id = i.component_product_id
             AND p.tenant_id = i.tenant_id
            WHERE c.tenant_id = :tenant_id
              AND c.product_id = :product_id
              AND c.is_active = TRUE
            ORDER BY i.sort_order, i.id
            """
        ),
        {"tenant_id": tenant_id, "product_id": product_id},
    ).mappings().all()
    return [
        {
            "product_id": int(row["product_id"]),
            "quantity": int(row["quantity"]),
            "name": row["name"],
        }
        for row in rows
    ]


def _apply_modifier_snapshots(
    session: Session,
    *,
    order: models.Order,
    prepared_lines: list[dict],
) -> None:
    order_items = session.exec(
        select(models.OrderItem)
        .where(models.OrderItem.order_id == order.id)
        .order_by(models.OrderItem.id)
    ).all()
    if len(order_items) != len(prepared_lines):
        raise HTTPException(status_code=500, detail="Não foi possível consolidar os complementos do pedido.")

    for order_item, prepared in zip(order_items, prepared_lines, strict=True):
        modifier = prepared["modifier"]
        delta = int(modifier["price_delta_cents"] or 0)
        if delta:
            order_item.price_cents = int(order_item.price_cents or 0) + delta
            if order_item.list_price_cents is not None:
                order_item.list_price_cents = int(order_item.list_price_cents) + delta
            rate = int(order_item.tax_rate_percent or 0)
            if rate > 0:
                total_incl = int(order_item.price_cents) * int(order_item.quantity)
                order_item.tax_amount_cents = round(total_incl * rate / (100 + rate))

        combo = _combo_snapshot(
            session,
            order.tenant_id,
            int(prepared["canonical_product_id"]),
        )
        answers: dict = {}
        summary_parts: list[str] = []

        if combo:
            answers["catalog_combo"] = combo
            summary_parts.append(
                "Combo: " + ", ".join(f'{item["quantity"]}× {item["name"]}' for item in combo)
            )

        if modifier["groups"]:
            answers["catalog_modifier_option_ids"] = prepared["selected_option_ids"]
            answers["catalog_modifiers"] = modifier["groups"]
            if modifier["summary"]:
                summary_parts.append(str(modifier["summary"]))

        if answers:
            order_item.customization_answers = answers
        if summary_parts:
            order_item.customization_summary = " · ".join(summary_parts)
        session.add(order_item)

    session.commit()


@router.post("/public/catalog-checkout/{tenant_id}")
@public_menu_ip_limit()
def create_public_catalog_checkout(
    request: Request,
    response: Response,
    tenant_id: int,
    body: models.PublicSatisfechoDeliveryOrderCreate,
    session: Session = Depends(get_session),
) -> dict:
    """Create public delivery order with reusable catalog modifiers priced server-side."""
    tenant = session.get(models.Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not body.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    address = (body.delivery_address or "").strip()
    if not address:
        raise HTTPException(status_code=400, detail="delivery_address is required")

    raw_phone = (body.customer_phone or "").strip()
    if not raw_phone:
        raise HTTPException(status_code=400, detail="customer_phone is required")
    try:
        phone = normalize_phone_e164(raw_phone, settings.default_phone_country)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid customer_phone") from exc

    coverage_err = validate_delivery_coverage(
        tenant,
        postal_code=body.postal_code,
        delivery_latitude=body.delivery_latitude,
        delivery_longitude=body.delivery_longitude,
    )
    coverage_messages = {
        "postal_code_required": "postal_code is required for delivery",
        "outside_delivery_zone": "Address is outside the delivery zone",
        "delivery_location_required": "Delivery location is required to check delivery radius",
        "delivery_location_invalid": "Invalid delivery location",
        "outside_delivery_radius": "Address is outside the delivery radius",
    }
    if coverage_err:
        raise HTTPException(status_code=400, detail=coverage_messages.get(coverage_err, str(coverage_err)))

    prepared_lines: list[dict] = []
    service_lines: list[dict] = []
    for item in body.items:
        public_product_id = int(item.product_id)
        canonical_product_id = _canonical_product_id(session, tenant_id, public_product_id)
        selected_ids = _selected_modifier_ids(item.customization_answers)
        try:
            modifier = validate_and_price_catalog_modifiers(
                session,
                tenant_id=tenant_id,
                product_id=canonical_product_id,
                selected_option_ids=selected_ids,
            )
        except CatalogModifierValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        prepared_lines.append(
            {
                "canonical_product_id": canonical_product_id,
                "selected_option_ids": selected_ids,
                "modifier": modifier,
            }
        )
        service_lines.append(
            {
                "product_id": public_product_id,
                "quantity": item.quantity,
                "notes": item.notes,
            }
        )

    fee = tenant_delivery_fee_cents(tenant)
    order, outcome = create_satisfecho_delivery_order(
        session,
        tenant_id=tenant_id,
        lines=service_lines,
        delivery_address=address,
        customer_phone=phone,
        customer_name=body.customer_name,
        notes=body.notes,
        courier_user_id=None,
        notify_kitchen=False,
        delivery_fee_cents=fee,
    )
    if not order:
        detail = outcome.get("detail", "create_failed")
        raise HTTPException(status_code=400, detail=str(detail))

    _apply_modifier_snapshots(session, order=order, prepared_lines=prepared_lines)
    session.refresh(order)

    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order.id)
    ).all()
    subtotal_cents = sum((item.price_cents or 0) * item.quantity for item in items)
    delivery_fee = order_delivery_fee_cents(order)
    total_cents = subtotal_cents + delivery_fee
    revolut_configured = bool(
        (tenant.revolut_merchant_secret and tenant.revolut_merchant_secret.strip())
        or (settings.revolut_merchant_secret and settings.revolut_merchant_secret.strip())
    )
    stripe_key = tenant.stripe_publishable_key or settings.stripe_publishable_key or None

    # Import at request time to avoid a module-import cycle with main.py.
    from .main import _sign_public_delivery_order_token

    return {
        "id": order.id,
        "status": order.status.value,
        "order_channel": order.order_channel.value if hasattr(order.order_channel, "value") else str(order.order_channel),
        "delivery_address": order.delivery_address,
        "customer_phone": order.customer_phone,
        "customer_name": order.customer_name,
        "notes": order.notes,
        "table_id": order.table_id,
        "subtotal_cents": subtotal_cents,
        "delivery_fee_cents": delivery_fee,
        "total_cents": total_cents,
        "public_order_token": _sign_public_delivery_order_token(order.id, tenant_id),
        "stripe_publishable_key": stripe_key,
        "revolut_configured": revolut_configured,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }
