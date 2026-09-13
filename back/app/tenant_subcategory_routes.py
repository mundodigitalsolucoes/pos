"""Tenant custom product subcategory CRUD and MDS Food catalog category/merchandising CRUD."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel

from .db import get_session
from . import models
from .permissions import Permission, require_permission
from .rate_limits import admin_user_limit
from .tenant_subcategories import (
    add_custom_subcategory,
    remove_custom_subcategory,
    rename_custom_subcategory,
)
from .catalog_modifier_routes import router as catalog_modifier_router
from .catalog_modifier_checkout_routes import router as catalog_modifier_checkout_router

router = APIRouter()
router.include_router(catalog_modifier_router)
router.include_router(catalog_modifier_checkout_router)


class SubcategoryCreateBody(SQLModel):
    category: str = Field(max_length=128)
    name: str = Field(max_length=128)


class SubcategoryRenameBody(SQLModel):
    category: str = Field(max_length=128)
    old_name: str = Field(max_length=128)
    new_name: str = Field(max_length=128)


class SubcategoryDeleteBody(SQLModel):
    category: str = Field(max_length=128)
    name: str = Field(max_length=128)


class CatalogCategoryCreateBody(SQLModel):
    name: str = Field(min_length=1, max_length=128)
    sort_order: int = 0


class CatalogCategoryUpdateBody(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    sort_order: int | None = None
    is_active: bool | None = None


class CatalogMerchandisingBody(SQLModel):
    is_featured: bool = False
    labels: list[str] = Field(default_factory=list, max_length=12)


def _category_rows(session: Session, tenant_id: int) -> list[dict]:
    rows = session.execute(
        text(
            """
            SELECT id, name, sort_order, is_active
            FROM tenant_catalog_category
            WHERE tenant_id = :tenant_id
            ORDER BY sort_order ASC, LOWER(name) ASC, id ASC
            """
        ),
        {"tenant_id": tenant_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def _clean_category_name(name: str) -> str:
    value = (name or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="Informe o nome da categoria.")
    if len(value) > 128:
        raise HTTPException(status_code=400, detail="O nome da categoria é muito longo.")
    return value


def _clean_labels(labels: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in labels:
        value = (raw or "").strip()
        if not value:
            continue
        if len(value) > 40:
            raise HTTPException(status_code=400, detail="Cada etiqueta pode ter no máximo 40 caracteres.")
        normalized = value.casefold()
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(value)
    if len(cleaned) > 12:
        raise HTTPException(status_code=400, detail="Use no máximo 12 etiquetas por produto.")
    return cleaned


def _assert_product_belongs_to_tenant(session: Session, tenant_id: int, product_id: int) -> None:
    found = session.execute(
        text("SELECT id FROM product WHERE id = :product_id AND tenant_id = :tenant_id"),
        {"product_id": product_id, "tenant_id": tenant_id},
    ).first()
    if not found:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")


@router.get("/catalog-categories")
def list_catalog_categories(
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> list[dict]:
    return _category_rows(session, current_user.tenant_id)


@router.post("/catalog-categories")
@admin_user_limit()
def create_catalog_category(
    request: Request,
    response: Response,
    body: CatalogCategoryCreateBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    name = _clean_category_name(body.name)
    try:
        row = session.execute(
            text(
                """
                INSERT INTO tenant_catalog_category (tenant_id, name, sort_order, is_active)
                VALUES (:tenant_id, :name, :sort_order, TRUE)
                RETURNING id, name, sort_order, is_active
                """
            ),
            {
                "tenant_id": current_user.tenant_id,
                "name": name,
                "sort_order": body.sort_order,
            },
        ).mappings().one()
        session.commit()
        return dict(row)
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Esta categoria já existe.") from exc


@router.put("/catalog-categories/{category_id}")
@admin_user_limit()
def update_catalog_category(
    category_id: int,
    request: Request,
    response: Response,
    body: CatalogCategoryUpdateBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    existing = session.execute(
        text(
            """
            SELECT id, name, sort_order, is_active
            FROM tenant_catalog_category
            WHERE id = :id AND tenant_id = :tenant_id
            """
        ),
        {"id": category_id, "tenant_id": current_user.tenant_id},
    ).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")

    name = _clean_category_name(body.name) if body.name is not None else existing["name"]
    sort_order = body.sort_order if body.sort_order is not None else existing["sort_order"]
    is_active = body.is_active if body.is_active is not None else existing["is_active"]
    try:
        row = session.execute(
            text(
                """
                UPDATE tenant_catalog_category
                SET name = :name,
                    sort_order = :sort_order,
                    is_active = :is_active,
                    updated_at = NOW()
                WHERE id = :id AND tenant_id = :tenant_id
                RETURNING id, name, sort_order, is_active
                """
            ),
            {
                "id": category_id,
                "tenant_id": current_user.tenant_id,
                "name": name,
                "sort_order": sort_order,
                "is_active": is_active,
            },
        ).mappings().one()
        session.commit()
        return dict(row)
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Já existe outra categoria com este nome.") from exc


@router.delete("/catalog-categories/{category_id}")
@admin_user_limit()
def delete_catalog_category(
    category_id: int,
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict[str, bool]:
    result = session.execute(
        text(
            """
            DELETE FROM tenant_catalog_category
            WHERE id = :id AND tenant_id = :tenant_id
            RETURNING id
            """
        ),
        {"id": category_id, "tenant_id": current_user.tenant_id},
    ).first()
    if not result:
        session.rollback()
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    session.commit()
    return {"deleted": True}


@router.get("/public/catalog-merchandising/{tenant_id}")
def public_catalog_merchandising(
    tenant_id: int,
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.execute(
        text(
            """
            SELECT m.product_id, m.is_featured, m.labels
            FROM product_catalog_merchandising m
            JOIN product p ON p.id = m.product_id AND p.tenant_id = m.tenant_id
            WHERE m.tenant_id = :tenant_id
              AND (m.is_featured = TRUE OR jsonb_array_length(m.labels) > 0)
            ORDER BY m.is_featured DESC, m.product_id ASC
            """
        ),
        {"tenant_id": tenant_id},
    ).mappings().all()
    return [dict(row) for row in rows]


@router.get("/catalog-merchandising")
def list_catalog_merchandising(
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> list[dict]:
    rows = session.execute(
        text(
            """
            SELECT p.id AS product_id,
                   p.name AS product_name,
                   p.category,
                   COALESCE(m.is_featured, FALSE) AS is_featured,
                   COALESCE(m.labels, '[]'::jsonb) AS labels
            FROM product p
            LEFT JOIN product_catalog_merchandising m
              ON m.product_id = p.id AND m.tenant_id = p.tenant_id
            WHERE p.tenant_id = :tenant_id
            ORDER BY COALESCE(m.is_featured, FALSE) DESC, LOWER(p.name) ASC
            """
        ),
        {"tenant_id": current_user.tenant_id},
    ).mappings().all()
    return [dict(row) for row in rows]


@router.put("/catalog-merchandising/{product_id}")
@admin_user_limit()
def update_catalog_merchandising(
    product_id: int,
    request: Request,
    response: Response,
    body: CatalogMerchandisingBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict:
    _assert_product_belongs_to_tenant(session, current_user.tenant_id, product_id)
    labels = _clean_labels(body.labels)
    row = session.execute(
        text(
            """
            INSERT INTO product_catalog_merchandising
                (tenant_id, product_id, is_featured, labels)
            VALUES
                (:tenant_id, :product_id, :is_featured, CAST(:labels AS jsonb))
            ON CONFLICT (tenant_id, product_id)
            DO UPDATE SET
                is_featured = EXCLUDED.is_featured,
                labels = EXCLUDED.labels,
                updated_at = NOW()
            RETURNING product_id, is_featured, labels
            """
        ),
        {
            "tenant_id": current_user.tenant_id,
            "product_id": product_id,
            "is_featured": body.is_featured,
            "labels": __import__("json").dumps(labels, ensure_ascii=False),
        },
    ).mappings().one()
    session.commit()
    return dict(row)


@router.delete("/catalog-merchandising/{product_id}")
@admin_user_limit()
def reset_catalog_merchandising(
    product_id: int,
    request: Request,
    response: Response,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict[str, bool]:
    _assert_product_belongs_to_tenant(session, current_user.tenant_id, product_id)
    session.execute(
        text(
            """
            DELETE FROM product_catalog_merchandising
            WHERE tenant_id = :tenant_id AND product_id = :product_id
            """
        ),
        {"tenant_id": current_user.tenant_id, "product_id": product_id},
    )
    session.commit()
    return {"reset": True}


@router.post("")
@admin_user_limit()
def create_tenant_subcategory(
    request: Request,
    response: Response,
    body: SubcategoryCreateBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict[str, list[str]]:
    try:
        return add_custom_subcategory(
            session, current_user.tenant_id, body.category, body.name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("")
@admin_user_limit()
def rename_tenant_subcategory(
    request: Request,
    response: Response,
    body: SubcategoryRenameBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict[str, list[str]]:
    try:
        return rename_custom_subcategory(
            session,
            current_user.tenant_id,
            body.category,
            body.old_name,
            body.new_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.delete("")
@admin_user_limit()
def delete_tenant_subcategory(
    request: Request,
    response: Response,
    body: SubcategoryDeleteBody,
    current_user: Annotated[models.User, Depends(require_permission(Permission.PRODUCT_WRITE))],
    session: Session = Depends(get_session),
) -> dict[str, list[str]]:
    try:
        return remove_custom_subcategory(
            session, current_user.tenant_id, body.category, body.name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
