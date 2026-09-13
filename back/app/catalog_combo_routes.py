"""Sellable combo management for MDS Food Catalog 2.0."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import text
from sqlmodel import Session, SQLModel, select

from . import models
from .db import get_session
from .permissions import Permission, require_permission
from .rate_limits import admin_user_limit

router = APIRouter()


class ComboItemBody(SQLModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=99)


class ComboCreateBody(SQLModel):
    name: str = Field(min_length=1, max_length=180)
    price_cents: int = Field(ge=0)
    description: str | None = Field(default=None, max_length=4000)
    items: list[ComboItemBody] = Field(default_factory=list, min_length=1, max_length=50)


class ComboUpdateBody(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    price_cents: int | None = Field(default=None, ge=0)
    description: str | None = Field(default=None, max_length=4000)
    is_active: bool | None = None
    items: list[ComboItemBody] | None = Field(default=None, min_length=1, max_length=50)


def _clean_name(value: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Informe o nome do combo.")
    return cleaned


def _combo(session: Session, tenant_id: int, combo_id: int) -> dict:
    row = session.execute(
        text(
            """
            SELECT c.id, c.product_id, c.is_active,
                   p.name, p.price_cents, p.description
            FROM catalog_combo c
            JOIN product p ON p.id = c.product_id AND p.tenant_id = c.tenant_id
            WHERE c.id = :combo_id AND c.tenant_id = :tenant_id
            """
        ),
        {"combo_id": combo_id, "tenant_id": tenant_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Combo não encontrado.")
    return dict(row)


def _validate_items(session: Session, tenant_id: int, items: list[ComboItemBody], combo_product_id: int | None = None) -> list[ComboItemBody]:
    if not items:
        raise HTTPException(status_code=400, detail="Adicione pelo menos um produto ao combo.")
    unique: dict[int, ComboItemBody] = {}
    for item in items:
        pid = int(item.product_id)
        if combo_product_id is not None and pid == combo_product_id:
            raise HTTPException(status_code=400, detail="O combo não pode conter ele mesmo.")
        product = session.exec(
            select(models.Product).where(
                models.Product.id == pid,
                models.Product.tenant_id == tenant_id,
            )
        ).first()
        if not product:
            raise HTTPException(status_code=400, detail="Um ou mais produtos do combo não pertencem a este restaurante.")
        nested = session.execute(
            text("SELECT id FROM catalog_combo WHERE tenant_id=:tenant_id AND product_id=:product_id"),
            {"tenant_id": tenant_id, "product_id": pid},
        ).first()
        if nested:
            raise HTTPException(status_code=400, detail="Combos não podem ser usados como itens de outro combo.")
        unique[pid] = ComboItemBody(product_id=pid, quantity=max(1, int(item.quantity)))
    return list(unique.values())


def _replace_items(session: Session, tenant_id: int, combo_id: int, items: list[ComboItemBody]) -> None:
    session.execute(
        text("DELETE FROM catalog_combo_item WHERE tenant_id=:tenant_id AND combo_id=:combo_id"),
        {"tenant_id": tenant_id, "combo_id": combo_id},
    )
    for index, item in enumerate(items):
        session.execute(
            text(
                """
                INSERT INTO catalog_combo_item
                    (tenant_id, combo_id, component_product_id, quantity, sort_order)
                VALUES
                    (:tenant_id, :combo_id, :product_id, :quantity, :sort_order)
                """
            ),
            {
                "tenant_id": tenant_id,
                "combo_id": combo_id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "sort_order": index * 10,
            },
        )


def _list_payload(session: Session, tenant_id: int) -> dict:
    combo_rows = session.execute(
        text(
            """
            SELECT c.id, c.product_id, c.is_active,
                   p.name, p.price_cents, p.description
            FROM catalog_combo c
            JOIN product p ON p.id = c.product_id AND p.tenant_id = c.tenant_id
            WHERE c.tenant_id = :tenant_id
            ORDER BY LOWER(p.name), c.id
            """
        ),
        {"tenant_id": tenant_id},
    ).mappings().all()
    item_rows = session.execute(
        text(
            """
            SELECT i.combo_id, i.component_product_id AS product_id,
                   i.quantity, p.name
            FROM catalog_combo_item i
            JOIN product p
              ON p.id = i.component_product_id
             AND p.tenant_id = i.tenant_id
            WHERE i.tenant_id = :tenant_id
            ORDER BY i.combo_id, i.sort_order, i.id
            """
        ),
        {"tenant_id": tenant_id},
    ).mappings().all()
    by_combo: dict[int, list[dict]] = {}
    for row in item_rows:
        by_combo.setdefault(int(row["combo_id"]), []).append(dict(row))

    combos: list[dict] = []
    combo_product_ids: set[int] = set()
    for row in combo_rows:
        item = dict(row)
        combo_product_ids.add(int(item["product_id"]))
        item["items"] = by_combo.get(int(item["id"]), [])
        combos.append(item)

    products = session.exec(
        select(models.Product)
        .where(models.Product.tenant_id == tenant_id)
        .order_by(models.Product.name)
    ).all()
    available_products = [
        {
            "id": int(product.id),
            "name": product.name,
            "price_cents": product.price_cents,
            "category": product.category,
        }
        for product in products
        if product.id is not None and int(product.id) not in combo_product_ids
    ]
    return {"combos": combos, "available_products": available_products}


@router.get("/combos")
def list_combos(
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    return _list_payload(session, current_user.tenant_id)


@router.post("/combos")
@admin_user_limit()
def create_combo(
    request: Request,
    response: Response,
    body: ComboCreateBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    tenant_id = current_user.tenant_id
    items = _validate_items(session, tenant_id, body.items)
    product = models.Product(
        tenant_id=tenant_id,
        name=_clean_name(body.name),
        price_cents=int(body.price_cents),
        description=(body.description or "").strip() or None,
        category="Combos",
    )
    session.add(product)
    session.flush()
    row = session.execute(
        text(
            """
            INSERT INTO catalog_combo (tenant_id, product_id, is_active)
            VALUES (:tenant_id, :product_id, TRUE)
            RETURNING id
            """
        ),
        {"tenant_id": tenant_id, "product_id": product.id},
    ).mappings().one()
    _replace_items(session, tenant_id, int(row["id"]), items)
    session.commit()
    return _list_payload(session, tenant_id)


@router.put("/combos/{combo_id}")
@admin_user_limit()
def update_combo(
    combo_id: int,
    request: Request,
    response: Response,
    body: ComboUpdateBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    tenant_id = current_user.tenant_id
    existing = _combo(session, tenant_id, combo_id)
    product = session.exec(
        select(models.Product).where(
            models.Product.id == existing["product_id"],
            models.Product.tenant_id == tenant_id,
        )
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto do combo não encontrado.")

    if body.name is not None:
        product.name = _clean_name(body.name)
    if body.price_cents is not None:
        product.price_cents = int(body.price_cents)
    if body.description is not None:
        product.description = body.description.strip() or None
    product.category = "Combos"

    if body.is_active is not None:
        session.execute(
            text(
                "UPDATE catalog_combo SET is_active=:active, updated_at=NOW() WHERE id=:id AND tenant_id=:tenant_id"
            ),
            {"active": bool(body.is_active), "id": combo_id, "tenant_id": tenant_id},
        )
        product.available_until = None if body.is_active else date.today() - timedelta(days=1)

    if body.items is not None:
        items = _validate_items(session, tenant_id, body.items, combo_product_id=int(product.id))
        _replace_items(session, tenant_id, combo_id, items)

    session.add(product)
    session.commit()
    return _list_payload(session, tenant_id)
