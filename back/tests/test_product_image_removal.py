"""Product-image removal uses the tenant-scoped product and preserves provider assets."""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app import models
from app.main import remove_product_image


def test_remove_image_clears_tenant_product_reference_and_own_file():
    product = models.Product(id=12, tenant_id=7, name='Teste', price_cents=1200,
                             image_filename='local.webp')
    session = MagicMock()
    session.exec.return_value.first.return_value = product
    with patch('app.main._delete_product_image_on_disk') as unlink:
        result = remove_product_image(MagicMock(), 12, SimpleNamespace(tenant_id=7), session)
    assert result.image_filename is None
    session.commit.assert_called_once()
    unlink.assert_called_once_with('local.webp', 7)
    query = session.exec.call_args.args[0]
    assert {12, 7}.issubset(set(query.compile().params.values()))


def test_remove_image_keeps_shared_provider_file():
    product = models.Product(id=12, tenant_id=7, name='Teste', price_cents=1200,
                             image_filename='providers/shared/products/photo.webp')
    session = MagicMock()
    session.exec.return_value.first.return_value = product
    with patch('app.main._delete_product_image_on_disk') as unlink:
        remove_product_image(MagicMock(), 12, SimpleNamespace(tenant_id=7), session)
    assert product.image_filename is None
    unlink.assert_not_called()


def test_remove_image_rejects_unknown_or_foreign_product():
    session = MagicMock()
    session.exec.return_value.first.return_value = None
    with pytest.raises(HTTPException) as exc:
        remove_product_image(MagicMock(), 12, SimpleNamespace(tenant_id=7), session)
    assert exc.value.status_code == 404
    session.commit.assert_not_called()
