-- MDS Food catalog merchandising metadata per tenant/product.
CREATE TABLE IF NOT EXISTS product_catalog_merchandising (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    labels JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_catalog_merchandising_tenant_product UNIQUE (tenant_id, product_id)
);

CREATE INDEX IF NOT EXISTS ix_product_catalog_merchandising_tenant
    ON product_catalog_merchandising (tenant_id);

CREATE INDEX IF NOT EXISTS ix_product_catalog_merchandising_featured
    ON product_catalog_merchandising (tenant_id, is_featured)
    WHERE is_featured = TRUE;

COMMENT ON TABLE product_catalog_merchandising IS
  'Tenant-scoped merchandising metadata for MDS Food catalog products.';
