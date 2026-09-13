"""Reusable complement/option groups for MDS Food Catalog 2.0."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel

from . import models
from .db import get_session
from .permissions import Permission, require_permission
from .rate_limits import admin_user_limit

router = APIRouter()


class ModifierGroupCreateBody(SQLModel):
    name: str = Field(min_length=1, max_length=128)
    min_select: int = Field(default=0, ge=0)
    max_select: int = Field(default=1, ge=1)
    is_required: bool = False
    sort_order: int = 0


class ModifierGroupUpdateBody(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    min_select: int | None = Field(default=None, ge=0)
    max_select: int | None = Field(default=None, ge=1)
    is_required: bool | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ModifierOptionCreateBody(SQLModel):
    name: str = Field(min_length=1, max_length=128)
    price_delta_cents: int = Field(default=0, ge=0)
    sort_order: int = 0


class ModifierOptionUpdateBody(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    price_delta_cents: int | None = Field(default=None, ge=0)
    sort_order: int | None = None
    is_active: bool | None = None


class ModifierGroupProductsBody(SQLModel):
    product_ids: list[int] = Field(default_factory=list, max_length=1000)


def _clean_name(name: str, label: str) -> str:
    value = (name or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail=f"Informe o nome {label}.")
    return value


def _limits(min_select: int, max_select: int, required: bool) -> tuple[int, int, bool]:
    minimum = max(0, int(min_select))
    maximum = max(1, int(max_select))
    required = bool(required)
    if required and minimum < 1:
        minimum = 1
    if minimum > maximum:
        raise HTTPException(status_code=400, detail="O mínimo de escolhas não pode ser maior que o máximo.")
    return minimum, maximum, required


def _group(session: Session, tenant_id: int, group_id: int) -> dict:
    row = session.execute(
        text("SELECT id,name,min_select,max_select,is_required,sort_order,is_active FROM catalog_modifier_group WHERE id=:id AND tenant_id=:tenant_id"),
        {"id": group_id, "tenant_id": tenant_id},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Grupo de complementos não encontrado.")
    return dict(row)


def _rows(session: Session, tenant_id: int) -> list[dict]:
    groups = session.execute(
        text("SELECT id,name,min_select,max_select,is_required,sort_order,is_active FROM catalog_modifier_group WHERE tenant_id=:tenant_id ORDER BY sort_order,LOWER(name),id"),
        {"tenant_id": tenant_id},
    ).mappings().all()
    options = session.execute(
        text("SELECT id,group_id,name,price_delta_cents,sort_order,is_active FROM catalog_modifier_option WHERE tenant_id=:tenant_id ORDER BY group_id,sort_order,LOWER(name),id"),
        {"tenant_id": tenant_id},
    ).mappings().all()
    links = session.execute(
        text("SELECT group_id,product_id FROM catalog_product_modifier_group WHERE tenant_id=:tenant_id ORDER BY sort_order,product_id"),
        {"tenant_id": tenant_id},
    ).mappings().all()
    by_group: dict[int, list[dict]] = {}
    products: dict[int, list[int]] = {}
    for option in options:
        by_group.setdefault(int(option["group_id"]), []).append(dict(option))
    for link in links:
        products.setdefault(int(link["group_id"]), []).append(int(link["product_id"]))
    result: list[dict] = []
    for raw in groups:
        item = dict(raw)
        gid = int(item["id"])
        item["options"] = by_group.get(gid, [])
        item["product_ids"] = products.get(gid, [])
        result.append(item)
    return result


@router.get("/modifier-groups")
def list_groups(
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> list[dict]:
    return _rows(session, current_user.tenant_id)


@router.post("/modifier-groups")
@admin_user_limit()
def create_group(request: Request, response: Response, body: ModifierGroupCreateBody, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict:
    minimum, maximum, required = _limits(body.min_select, body.max_select, body.is_required)
    try:
        row = session.execute(
            text("INSERT INTO catalog_modifier_group (tenant_id,name,min_select,max_select,is_required,sort_order,is_active) VALUES (:tenant_id,:name,:min_select,:max_select,:is_required,:sort_order,TRUE) RETURNING id,name,min_select,max_select,is_required,sort_order,is_active"),
            {"tenant_id": current_user.tenant_id, "name": _clean_name(body.name, "do grupo"), "min_select": minimum, "max_select": maximum, "is_required": required, "sort_order": body.sort_order},
        ).mappings().one()
        session.commit()
        result = dict(row); result["options"] = []; result["product_ids"] = []
        return result
    except IntegrityError as exc:
        session.rollback(); raise HTTPException(status_code=409, detail="Já existe um grupo com este nome.") from exc


@router.put("/modifier-groups/{group_id}")
@admin_user_limit()
def update_group(group_id: int, request: Request, response: Response, body: ModifierGroupUpdateBody, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict:
    existing = _group(session, current_user.tenant_id, group_id)
    minimum, maximum, required = _limits(body.min_select if body.min_select is not None else existing["min_select"], body.max_select if body.max_select is not None else existing["max_select"], body.is_required if body.is_required is not None else existing["is_required"])
    params = {"id": group_id, "tenant_id": current_user.tenant_id, "name": _clean_name(body.name, "do grupo") if body.name is not None else existing["name"], "min_select": minimum, "max_select": maximum, "is_required": required, "sort_order": body.sort_order if body.sort_order is not None else existing["sort_order"], "is_active": body.is_active if body.is_active is not None else existing["is_active"]}
    try:
        session.execute(text("UPDATE catalog_modifier_group SET name=:name,min_select=:min_select,max_select=:max_select,is_required=:is_required,sort_order=:sort_order,is_active=:is_active,updated_at=NOW() WHERE id=:id AND tenant_id=:tenant_id"), params)
        session.commit()
    except IntegrityError as exc:
        session.rollback(); raise HTTPException(status_code=409, detail="Já existe um grupo com este nome.") from exc
    return next(item for item in _rows(session, current_user.tenant_id) if item["id"] == group_id)


@router.delete("/modifier-groups/{group_id}")
@admin_user_limit()
def delete_group(group_id: int, request: Request, response: Response, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict[str, bool]:
    result = session.execute(text("DELETE FROM catalog_modifier_group WHERE id=:id AND tenant_id=:tenant_id RETURNING id"), {"id": group_id, "tenant_id": current_user.tenant_id}).first()
    if not result:
        session.rollback(); raise HTTPException(status_code=404, detail="Grupo de complementos não encontrado.")
    session.commit(); return {"deleted": True}


@router.post("/modifier-groups/{group_id}/options")
@admin_user_limit()
def create_option(group_id: int, request: Request, response: Response, body: ModifierOptionCreateBody, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict:
    _group(session, current_user.tenant_id, group_id)
    try:
        row = session.execute(text("INSERT INTO catalog_modifier_option (tenant_id,group_id,name,price_delta_cents,sort_order,is_active) VALUES (:tenant_id,:group_id,:name,:price_delta_cents,:sort_order,TRUE) RETURNING id,group_id,name,price_delta_cents,sort_order,is_active"), {"tenant_id": current_user.tenant_id, "group_id": group_id, "name": _clean_name(body.name, "da opção"), "price_delta_cents": body.price_delta_cents, "sort_order": body.sort_order}).mappings().one()
        session.commit(); return dict(row)
    except IntegrityError as exc:
        session.rollback(); raise HTTPException(status_code=409, detail="Já existe uma opção com este nome no grupo.") from exc


@router.put("/modifier-groups/{group_id}/options/{option_id}")
@admin_user_limit()
def update_option(group_id: int, option_id: int, request: Request, response: Response, body: ModifierOptionUpdateBody, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict:
    _group(session, current_user.tenant_id, group_id)
    existing = session.execute(text("SELECT id,name,price_delta_cents,sort_order,is_active FROM catalog_modifier_option WHERE id=:id AND group_id=:group_id AND tenant_id=:tenant_id"), {"id": option_id, "group_id": group_id, "tenant_id": current_user.tenant_id}).mappings().first()
    if not existing: raise HTTPException(status_code=404, detail="Opção não encontrada.")
    params = {"id": option_id, "group_id": group_id, "tenant_id": current_user.tenant_id, "name": _clean_name(body.name, "da opção") if body.name is not None else existing["name"], "price_delta_cents": body.price_delta_cents if body.price_delta_cents is not None else existing["price_delta_cents"], "sort_order": body.sort_order if body.sort_order is not None else existing["sort_order"], "is_active": body.is_active if body.is_active is not None else existing["is_active"]}
    try:
        row = session.execute(text("UPDATE catalog_modifier_option SET name=:name,price_delta_cents=:price_delta_cents,sort_order=:sort_order,is_active=:is_active,updated_at=NOW() WHERE id=:id AND group_id=:group_id AND tenant_id=:tenant_id RETURNING id,group_id,name,price_delta_cents,sort_order,is_active"), params).mappings().one()
        session.commit(); return dict(row)
    except IntegrityError as exc:
        session.rollback(); raise HTTPException(status_code=409, detail="Já existe uma opção com este nome no grupo.") from exc


@router.delete("/modifier-groups/{group_id}/options/{option_id}")
@admin_user_limit()
def delete_option(group_id: int, option_id: int, request: Request, response: Response, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict[str, bool]:
    result = session.execute(text("DELETE FROM catalog_modifier_option WHERE id=:id AND group_id=:group_id AND tenant_id=:tenant_id RETURNING id"), {"id": option_id, "group_id": group_id, "tenant_id": current_user.tenant_id}).first()
    if not result: session.rollback(); raise HTTPException(status_code=404, detail="Opção não encontrada.")
    session.commit(); return {"deleted": True}


@router.put("/modifier-groups/{group_id}/products")
@admin_user_limit()
def set_products(group_id: int, request: Request, response: Response, body: ModifierGroupProductsBody, current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))], session: Session = Depends(get_session)) -> dict:
    _group(session, current_user.tenant_id, group_id)
    product_ids = list(dict.fromkeys(int(pid) for pid in body.product_ids if int(pid) > 0))
    for product_id in product_ids:
        if not session.execute(text("SELECT id FROM product WHERE id=:id AND tenant_id=:tenant_id"), {"id": product_id, "tenant_id": current_user.tenant_id}).first():
            raise HTTPException(status_code=400, detail="Um ou mais produtos não pertencem a este restaurante.")
    session.execute(text("DELETE FROM catalog_product_modifier_group WHERE tenant_id=:tenant_id AND group_id=:group_id"), {"tenant_id": current_user.tenant_id, "group_id": group_id})
    for index, product_id in enumerate(product_ids):
        session.execute(text("INSERT INTO catalog_product_modifier_group (tenant_id,product_id,group_id,sort_order) VALUES (:tenant_id,:product_id,:group_id,:sort_order)"), {"tenant_id": current_user.tenant_id, "product_id": product_id, "group_id": group_id, "sort_order": index * 10})
    session.commit()
    return next(item for item in _rows(session, current_user.tenant_id) if item["id"] == group_id)
