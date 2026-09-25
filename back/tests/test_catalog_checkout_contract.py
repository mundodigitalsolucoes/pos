"""Public catalog checkout: tenant boundaries, modifier rules and server pricing."""
from __future__ import annotations

from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi import Request, Response
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlmodel import Session

from app import models
from app.catalog_modifier_checkout_routes import (
    _apply_modifier_snapshots,
    _public_product_snapshot,
    _selected_modifier_ids,
    create_public_catalog_checkout,
)
from app.catalog_modifier_checkout_routes import router as catalog_checkout_router
from app.db import get_session
from app.catalog_modifier_pricing import (
    CatalogModifierValidationError,
    validate_and_price_catalog_modifiers,
)
from app.public_tenant_menu import _load_flat_products


@pytest.fixture
def catalog_session():
    engine = create_engine('sqlite://')
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE catalog_modifier_group (id INTEGER, tenant_id INTEGER, name TEXT, min_select INTEGER, max_select INTEGER, is_required BOOLEAN, sort_order INTEGER, is_active BOOLEAN)'))
        connection.execute(text('CREATE TABLE catalog_product_modifier_group (tenant_id INTEGER, product_id INTEGER, group_id INTEGER, sort_order INTEGER)'))
        connection.execute(text('CREATE TABLE catalog_modifier_option (id INTEGER, tenant_id INTEGER, group_id INTEGER, name TEXT, price_delta_cents INTEGER, sort_order INTEGER, is_active BOOLEAN)'))
        connection.execute(text("INSERT INTO catalog_modifier_group VALUES (10, 1, 'Extras', 1, 1, 1, 0, 1), (20, 2, 'Other tenant', 0, 1, 0, 0, 1)"))
        connection.execute(text('INSERT INTO catalog_product_modifier_group VALUES (1, 101, 10, 0), (2, 202, 20, 0)'))
        connection.execute(text("INSERT INTO catalog_modifier_option VALUES (11, 1, 10, 'Bacon', 250, 0, 1), (12, 1, 10, 'Queijo', 150, 1, 1), (13, 1, 10, 'Disabled', 900, 2, 0), (21, 2, 20, 'Foreign', 100, 0, 1)"))
    with Session(engine) as session:
        yield session
    engine.dispose()


def price(session, ids, *, tenant=1, product=101):
    return validate_and_price_catalog_modifiers(
        session, tenant_id=tenant, product_id=product, selected_option_ids=ids,
    )


def test_modifier_rules_tenant_and_product_scope(catalog_session):
    result = price(catalog_session, [11])
    assert result['price_delta_cents'] == 250
    assert result['groups'][0]['options'][0]['name'] == 'Bacon'
    for ids in ([], [11, 12], [13], [21]):
        with pytest.raises(CatalogModifierValidationError):
            price(catalog_session, ids)
    with pytest.raises(CatalogModifierValidationError):
        price(catalog_session, [11], product=202)
    with pytest.raises(CatalogModifierValidationError):
        price(catalog_session, [11], tenant=2)


def test_payload_ids_must_be_positive_unique_integers():
    assert _selected_modifier_ids({'catalog_modifier_option_ids': [11, 12]}) == [11, 12]
    for ids in ([11, 11], [0], [True], [11.5], ['11'], '11'):
        with pytest.raises(HTTPException):
            _selected_modifier_ids({'catalog_modifier_option_ids': ids})


def test_public_product_availability_and_tenant():
    tenant = models.Tenant(id=1, name='Tenant')
    product = models.Product(id=101, tenant_id=1, name='Burger', price_cents=1200)
    tp = models.TenantProduct(id=9, tenant_id=1, catalog_id=2, product_id=101,
                              name='Burger', price_cents=1350)
    catalog = models.ProductCatalog(id=2, name='Burger', category='Main')
    session = MagicMock()
    session.get.side_effect = lambda model, key: {
        (models.TenantProduct, 9): tp,
        (models.Product, 101): product,
        (models.ProductCatalog, 2): catalog,
    }.get((model, key))
    assert _public_product_snapshot(session, tenant, 9)['price_cents'] == 1350
    tp.is_active = False
    with pytest.raises(HTTPException):
        _public_product_snapshot(session, tenant, 9)
    tp.is_active = True
    tp.available_from = date.today() + timedelta(days=3)
    with pytest.raises(HTTPException):
        _public_product_snapshot(session, tenant, 9)
    tp.available_from = None
    product.tenant_id = 2
    with pytest.raises(HTTPException):
        _public_product_snapshot(session, tenant, 9)


def test_snapshot_uses_server_base_modifier_quantity_and_kds_summary():
    order = SimpleNamespace(id=1, tenant_id=1)
    item = models.OrderItem(order_id=1, product_id=101, product_name='Burger', quantity=2,
                            price_cents=1200, tax_rate_percent=10)
    session = MagicMock()
    session.exec.return_value.all.return_value = [item]
    prepared = [{
        'canonical_product_id': 101, 'price_cents': 1350, 'category': 'Main', 'name': 'Tenant Burger',
        'selected_option_ids': [11], 'modifier': {
            'price_delta_cents': 250,
            'groups': [{'group_id': 10, 'name': 'Extras', 'options': [{'option_id': 11, 'name': 'Bacon', 'price_delta_cents': 250}]}],
            'summary': 'Extras: Bacon',
        },
    }]
    with patch('app.catalog_modifier_checkout_routes._combo_snapshot', return_value=[]), \
         patch('app.catalog_modifier_checkout_routes.promo_svc.eligible_promos', return_value=[]), \
         patch('app.catalog_modifier_checkout_routes.promo_svc.resolve_line_price', return_value={
             'price_cents': 1350, 'list_price_cents': None, 'discount_cents': 0,
             'promo_id': None, 'promo_snapshot': None,
         }):
        _apply_modifier_snapshots(session, order=order, prepared_lines=prepared)
    assert item.price_cents == 1600
    assert item.product_name == 'Tenant Burger'
    assert item.price_cents * item.quantity == 3200
    assert item.customization_answers['catalog_modifier_option_ids'] == [11]
    assert item.customization_summary == 'Extras: Bacon'
    assert item.tax_amount_cents == round(3200 * 10 / 110)
    session.commit.assert_called_once()


def test_checkout_endpoint_forwards_only_option_ids_and_returns_server_total():
    tenant = models.Tenant(id=1, name='Tenant')
    order = models.Order(id=5, tenant_id=1, status=models.OrderStatus.pending,
                         order_channel=models.OrderChannel.satisfecho_delivery,
                         delivery_address='Street 1', customer_phone='+5511999999999')
    item = models.OrderItem(order_id=5, product_id=101, product_name='Burger',
                            quantity=2, price_cents=1600)
    session = MagicMock()
    session.get.return_value = tenant
    session.exec.return_value.all.return_value = [item]
    body = models.PublicSatisfechoDeliveryOrderCreate(
        items=[models.OrderItemCreate(product_id=9, quantity=2,
                                      customization_answers={'catalog_modifier_option_ids': [11]})],
        delivery_address='Street 1', customer_phone='+5511999999999',
    )
    modifier = {'price_delta_cents': 250, 'groups': [{'name': 'Extras'}], 'summary': 'Extras: Bacon'}
    with patch('app.catalog_modifier_checkout_routes._public_product_snapshot', return_value={
        'canonical_product_id': 101, 'price_cents': 1350, 'category': 'Main', 'name': 'Tenant Burger',
    }), patch('app.catalog_modifier_checkout_routes.validate_and_price_catalog_modifiers', return_value=modifier), \
         patch('app.catalog_modifier_checkout_routes.create_satisfecho_delivery_order', return_value=(order, {})) as create, \
         patch('app.catalog_modifier_checkout_routes._apply_modifier_snapshots') as apply, \
         patch('app.catalog_modifier_checkout_routes.tenant_delivery_fee_cents', return_value=300), \
         patch('app.catalog_modifier_checkout_routes.order_delivery_fee_cents', return_value=300), \
         patch('app.main._sign_public_delivery_order_token', return_value='signed-token'):
        result = create_public_catalog_checkout.__wrapped__(
            request=Request({'type': 'http', 'method': 'POST', 'path': '/catalog-checkout', 'headers': []}),
            response=Response(), tenant_id=1, body=body, session=session,
        )
    assert create.call_args.kwargs['lines'] == [{'product_id': 9, 'quantity': 2, 'notes': None}]
    assert create.call_args.kwargs['commit_order'] is False
    assert apply.call_args.kwargs['prepared_lines'][0]['selected_option_ids'] == [11]
    assert result['subtotal_cents'] == 3200
    assert result['delivery_fee_cents'] == 300
    assert result['total_cents'] == 3500


def test_checkout_rolls_back_if_modifier_snapshot_fails():
    tenant = models.Tenant(id=1, name='Tenant')
    order = models.Order(id=5, tenant_id=1, status=models.OrderStatus.pending)
    session = MagicMock()
    session.get.return_value = tenant
    body = models.PublicSatisfechoDeliveryOrderCreate(
        items=[models.OrderItemCreate(product_id=101, quantity=1)],
        delivery_address='Street 1', customer_phone='+5511999999999',
    )
    with patch('app.catalog_modifier_checkout_routes._public_product_snapshot', return_value={
        'canonical_product_id': 101, 'price_cents': 1200, 'category': 'Main', 'name': 'Burger',
    }), patch('app.catalog_modifier_checkout_routes.validate_and_price_catalog_modifiers', return_value={
        'price_delta_cents': 0, 'groups': [], 'summary': None,
    }), patch('app.catalog_modifier_checkout_routes.create_satisfecho_delivery_order', return_value=(order, {})), \
         patch('app.catalog_modifier_checkout_routes._apply_modifier_snapshots', side_effect=RuntimeError('snapshot failed')):
        with pytest.raises(RuntimeError):
            create_public_catalog_checkout.__wrapped__(
                request=Request({'type': 'http', 'method': 'POST', 'path': '/catalog-checkout', 'headers': []}),
                response=Response(), tenant_id=1, body=body, session=session,
            )
    session.rollback.assert_called_once()


def test_public_menu_and_delivery_checkout_use_same_promo_channel():
    tenant = models.Tenant(id=1, name='Tenant')
    product = models.Product(id=101, tenant_id=1, name='Burger', price_cents=1200)
    session = MagicMock()
    session.exec.side_effect = [SimpleNamespace(all=lambda: []), SimpleNamespace(all=lambda: [product])]
    session.get.return_value = tenant
    with patch('app.public_tenant_menu._translated_name', return_value='Burger'), \
         patch('app.public_tenant_menu._translated_description', return_value=None), \
         patch('app.public_tenant_menu.resolve_product_image_url', return_value=None), \
         patch('app.product_stock.product_stock_alert_payload', return_value={}), \
         patch('app.public_tenant_menu.promo_svc.eligible_promos', return_value=[]) as eligible, \
         patch('app.public_tenant_menu.promo_svc.decorate_menu_product') as decorate:
        _load_flat_products(session, 1, 'pt-BR', 'BRL')
    channel = models.OrderChannel.satisfecho_delivery.value
    assert eligible.call_args.kwargs['channel'] == channel
    assert decorate.call_args.kwargs['channel'] == channel


def test_legacy_public_url_uses_identical_checkout_contract():
    from app.main import create_public_satisfecho_delivery_order

    body = models.PublicSatisfechoDeliveryOrderCreate(
        items=[models.OrderItemCreate(product_id=101, quantity=1,
                                      customization_answers={'catalog_modifier_option_ids': [11]})],
        delivery_address='Street 1', customer_phone='+5511999999999',
    )
    session = MagicMock()
    request = Request({'type': 'http', 'method': 'POST', 'path': '/legacy', 'headers': []})
    response = Response()
    with patch('app.catalog_modifier_checkout_routes.create_public_catalog_checkout_impl', return_value={'id': 5}) as checkout:
        result = create_public_satisfecho_delivery_order.__wrapped__(
            request=request, response=response, tenant_id=1, body=body, session=session,
        )
    assert result == {'id': 5}
    assert checkout.call_args.args == (request, response, 1, body, session)


def test_public_catalog_http_route_accepts_modifier_ids_without_client_prices():
    app = FastAPI()
    app.include_router(catalog_checkout_router, prefix='/tenant/subcategories')
    app.dependency_overrides[get_session] = lambda: MagicMock()
    with patch('app.catalog_modifier_checkout_routes.create_public_catalog_checkout_impl', return_value={'id': 5}) as checkout:
        response = TestClient(app).post('/tenant/subcategories/public/catalog-checkout/1', json={
            'items': [{'product_id': 9, 'quantity': 2,
                       'customization_answers': {'catalog_modifier_option_ids': [11]}}],
            'delivery_address': 'Street 1', 'customer_phone': '+5511999999999',
        })
    assert response.status_code == 200, response.text
    assert checkout.call_args.args[3].items[0].customization_answers == {'catalog_modifier_option_ids': [11]}
