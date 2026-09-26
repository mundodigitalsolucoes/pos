"""Existing linked products must not restore an explicitly cleared description."""
from __future__ import annotations

import unittest
from uuid import uuid4

from pg_client_mixin import PgClientTestCase
from app import models, security


class TestProductDescriptionUpdate(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(name="Description Test Restaurant", default_language="en")
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)
        self.owner = models.User(
            email=f"product-description-{uuid4().hex[:8]}@amvara.de",
            hashed_password=security.get_password_hash("secret"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()
        self.session.refresh(self.owner)
        token = security.create_access_token({
            "sub": self.owner.email,
            "tenant_id": self.tenant.id,
            "provider_id": None,
            "token_version": self.owner.token_version,
        })
        self.headers = {"Authorization": f"Bearer {token}"}

        self.catalog = models.ProductCatalog(name="Old Pizza Catalog", category="Pizza", description="teste")
        self.legacy = models.Product(tenant_id=self.tenant.id, name="Old Pizza", price_cents=1000,
                                     ingredients="Old topping", description="teste", category="Pizza")
        self.session.add(self.catalog)
        self.session.add(self.legacy)
        self.session.commit()
        self.session.refresh(self.catalog)
        self.session.refresh(self.legacy)
        self.session.add(models.TenantProduct(
            tenant_id=self.tenant.id, catalog_id=self.catalog.id, product_id=self.legacy.id,
            name="Old Pizza", price_cents=1000, is_active=True,
        ))
        self.session.commit()

    def _stored_description(self) -> str | None:
        self.session.expire_all()
        response = self.client.get("/products", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        return next(row["description"] for row in response.json() if row["id"] == self.legacy.id)

    def _menu_description(self) -> str | None:
        response = self.client.get(f"/public/tenants/{self.tenant.id}/menu", params={"lang": "en"})
        self.assertEqual(response.status_code, 200, response.text)
        rows = [p for category in response.json()["categories"] for p in category["products"]]
        return next(row["description"] for row in rows if row["name"] == "Old Pizza")

    def test_existing_product_change_and_clear_with_catalog_fallback(self) -> None:
        updated = "Pizza artesanal com molho de tomate, muçarela e manjericão."
        response = self.client.put(f"/products/{self.legacy.id}", headers=self.headers, json={
            "description": updated, "price_cents": 1250, "ingredients": "Tomate, muçarela, manjericão",
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["description"], updated)
        self.assertEqual(response.json()["price_cents"], 1250)
        self.assertEqual(response.json()["ingredients"], "Tomate, muçarela, manjericão")
        self.assertEqual(self._stored_description(), updated)
        self.assertEqual(self._menu_description(), updated)

        cleared = self.client.put(f"/products/{self.legacy.id}", headers=self.headers, json={"description": ""})
        self.assertEqual(cleared.status_code, 200, cleared.text)
        self.assertEqual(cleared.json()["description"], "")
        self.assertEqual(self._stored_description(), "")
        self.assertIsNone(self._menu_description())
        self.session.refresh(self.legacy)
        self.assertEqual(self.legacy.description, "")

        # Other updates must not restore the catalog description.
        changed_price = self.client.put(f"/products/{self.legacy.id}", headers=self.headers, json={"price_cents": 1300})
        self.assertEqual(changed_price.status_code, 200, changed_price.text)
        self.assertEqual(self._stored_description(), "")

        cleared_with_null = self.client.put(f"/products/{self.legacy.id}", headers=self.headers, json={"description": None})
        self.assertEqual(cleared_with_null.status_code, 200, cleared_with_null.text)
        self.assertEqual(self._stored_description(), "")

    def test_new_product_creation_keeps_description(self) -> None:
        response = self.client.post("/products", headers=self.headers, json={
            "name": "New Pizza", "price_cents": 1800, "description": "Fresh basil", "ingredients": "Tomato",
        })
        self.assertEqual(response.status_code, 200, response.text)
        created_id = response.json()["id"]
        listed = self.client.get("/products", headers=self.headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(next(row["description"] for row in listed.json() if row["id"] == created_id), "Fresh basil")
        menu = self.client.get(f"/public/tenants/{self.tenant.id}/menu", params={"lang": "en"})
        self.assertEqual(menu.status_code, 200, menu.text)
        products = [p for category in menu.json()["categories"] for p in category["products"]]
        self.assertEqual(next(p["description"] for p in products if p["name"] == "New Pizza"), "Fresh basil")

    def test_unset_legacy_description_still_inherits_catalog(self) -> None:
        self.legacy.description = None
        self.session.add(self.legacy)
        self.session.commit()
        self.assertEqual(self._stored_description(), "teste")
        self.assertEqual(self._menu_description(), "teste")


if __name__ == "__main__":
    unittest.main()
