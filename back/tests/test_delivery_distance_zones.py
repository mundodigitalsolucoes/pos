"""Distance bands: PostgreSQL-backed API isolation and deterministic coverage."""

from __future__ import annotations

from datetime import timedelta

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.delivery_zones import distance_from_coordinates, select_coverage


class TestDeliveryDistanceZones(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenants = []
        self.headers = []
        for number in (1, 2):
            tenant = models.Tenant(name=f"Zones test {number}", latitude=0.0, longitude=0.0,
                                   delivery_fee_cents=499, delivery_radius_meters=3000)
            self.session.add(tenant)
            self.session.commit()
            self.session.refresh(tenant)
            user = models.User(email=f"zone-{number}@test.local", hashed_password=security.get_password_hash("test-only"),
                               full_name="Owner", role=models.UserRole.owner, tenant_id=tenant.id)
            self.session.add(user)
            self.session.commit()
            self.session.refresh(user)
            token = security.create_access_token({"sub": user.email, "tenant_id": tenant.id,
                "provider_id": None, "token_version": user.token_version}, expires_delta=timedelta(minutes=30))
            self.tenants.append(tenant)
            self.headers.append({"Authorization": f"Bearer {token}"})

    def add_zone(self, minimum=0, maximum=5000, fee=800, minutes=30, active=True, tenant=0):
        return self.client.post('/tenant/delivery-zones', headers=self.headers[tenant], json={
            'name': f'Até {maximum // 1000} km', 'min_distance_meters': minimum,
            'max_distance_meters': maximum, 'fee_cents': fee,
            'estimated_minutes': minutes, 'is_active': active, 'sort_order': minimum,
        })

    def test_crud_activation_and_tenant_isolation(self):
        created = self.add_zone()
        self.assertEqual(created.status_code, 201, created.text)
        zone_id = created.json()['id']
        self.assertEqual(len(self.client.get('/tenant/delivery-zones', headers=self.headers[0]).json()), 1)
        self.assertEqual(self.client.get('/tenant/delivery-zones', headers=self.headers[1]).json(), [])
        self.assertEqual(self.client.put(f'/tenant/delivery-zones/{zone_id}', headers=self.headers[1],
            json={'fee_cents': 1}).status_code, 404)
        self.assertEqual(self.client.delete(f'/tenant/delivery-zones/{zone_id}', headers=self.headers[1]).status_code, 404)
        updated = self.client.put(f'/tenant/delivery-zones/{zone_id}', headers=self.headers[0],
            json={'fee_cents': 1200, 'estimated_minutes': 40})
        self.assertEqual((updated.json()['fee_cents'], updated.json()['estimated_minutes']), (1200, 40))
        self.assertFalse(self.client.put(f'/tenant/delivery-zones/{zone_id}', headers=self.headers[0],
            json={'is_active': False}).json()['is_active'])
        self.assertTrue(self.client.put(f'/tenant/delivery-zones/{zone_id}', headers=self.headers[0],
            json={'is_active': True}).json()['is_active'])
        self.assertEqual(self.client.delete(f'/tenant/delivery-zones/{zone_id}', headers=self.headers[0]).status_code, 204)
        self.assertEqual(self.client.get('/tenant/delivery-zones', headers=self.headers[0]).json(), [])

    def test_invalid_payload_and_overlaps(self):
        for changes in ({'min_distance_meters': -1}, {'fee_cents': -1},
                        {'min_distance_meters': 5000}, {'estimated_minutes': 0}):
            data = {'name': 'Test', 'min_distance_meters': 0, 'max_distance_meters': 5000,
                    'fee_cents': 800, 'estimated_minutes': 30, **changes}
            self.assertEqual(self.client.post('/tenant/delivery-zones', headers=self.headers[0],
                json=data).status_code, 422)
        first = self.add_zone()
        self.assertEqual(first.status_code, 201, first.text)
        self.assertEqual(self.add_zone(4000, 10000).status_code, 409)
        second = self.add_zone(5000, 10000)
        self.assertEqual(second.status_code, 201, second.text)
        self.assertEqual(self.client.put(f"/tenant/delivery-zones/{second.json()['id']}",
            headers=self.headers[0], json={'min_distance_meters': 4000}).status_code, 409)
        inactive = self.add_zone(4000, 6000, active=False)
        self.assertEqual(inactive.status_code, 201)
        self.assertEqual(self.client.put(f"/tenant/delivery-zones/{inactive.json()['id']}",
            headers=self.headers[0], json={'is_active': True}).status_code, 409)
        self.assertEqual(self.add_zone(0, 5000, tenant=1).status_code, 201)
        # A forged tenant_id is rejected rather than used for ownership.
        payload = {'name': 'Tentativa', 'min_distance_meters': 10000,
                   'max_distance_meters': 12000, 'fee_cents': 1,
                   'estimated_minutes': 30, 'tenant_id': self.tenants[1].id}
        reply = self.client.post('/tenant/delivery-zones', headers=self.headers[0], json=payload)
        self.assertEqual(reply.status_code, 201, reply.text)
        self.assertEqual(reply.json()['tenant_id'], self.tenants[0].id)

    def test_selection_borders_gaps_and_legacy(self):
        tenant = self.tenants[0]
        self.assertEqual(select_coverage(tenant, 3000, []).fee_cents, 499)
        self.assertFalse(select_coverage(tenant, 3001, []).covered)
        tenant.delivery_postal_codes = '["15000000"]'
        self.assertFalse(select_coverage(tenant, 1000, []).covered)
        self.assertEqual(select_coverage(tenant, 1000, [], postal_code='15000-000').fee_cents, 499)
        tenant.delivery_postal_codes = None
        a = self.add_zone(0, 5000, 800, 30).json()['id']
        b = self.add_zone(5000, 10000, 1200, 40).json()['id']
        c = self.add_zone(12000, 20000, 1800, 50).json()['id']
        rows = self.session.query(models.DeliveryZone).filter_by(tenant_id=tenant.id).all()
        for distance, expected in [(0, a), (4999, a), (5000, b), (7200, b),
                                   (10000, None), (12000, c), (20000, c), (20001, None)]:
            result = select_coverage(tenant, distance, rows)
            self.assertEqual(result.zone_id, expected)
            self.assertEqual(result.covered, expected is not None)
        self.assertEqual(select_coverage(tenant, 7200, rows).estimated_minutes, 40)
        self.assertEqual(select_coverage(tenant, 7200, rows).fee_cents, 1200)
        self.assertAlmostEqual(distance_from_coordinates(tenant, 0, 0), 0)
        with self.assertRaises(ValueError):
            select_coverage(tenant, -1, rows)
