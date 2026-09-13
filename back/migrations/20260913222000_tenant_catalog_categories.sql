-- MDS Food Catalog 2.0: tenant-defined top-level menu categories.
-- Keeps Product.category as the compatibility field while allowing each restaurant
-- to maintain its own category list and ordering.

CREATE TABLE IF NOT EXISTS tenant_catalog_category (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_catalog_category_name_ci
    ON tenant_catalog_category (tenant_id, LOWER(name));

CREATE INDEX IF NOT EXISTS ix_tenant_catalog_category_tenant_order
    ON tenant_catalog_category (tenant_id, sort_order, name);

COMMENT ON TABLE tenant_catalog_category IS
    'Tenant-scoped top-level categories used by the MDS Food commercial catalog.';
