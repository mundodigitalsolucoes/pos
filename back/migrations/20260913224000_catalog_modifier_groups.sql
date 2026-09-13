-- MDS Food Catalog 2.0: reusable modifier groups/options linked to products.
-- Keeps legacy ProductQuestion untouched for backward compatibility.

CREATE TABLE IF NOT EXISTS catalog_modifier_group (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
    max_select INTEGER NOT NULL DEFAULT 1 CHECK (max_select >= 1),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_catalog_modifier_group_min_max CHECK (min_select <= max_select)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_modifier_group_name_ci
    ON catalog_modifier_group (tenant_id, LOWER(name));

CREATE INDEX IF NOT EXISTS ix_catalog_modifier_group_tenant_order
    ON catalog_modifier_group (tenant_id, sort_order, id);

CREATE TABLE IF NOT EXISTS catalog_modifier_option (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES catalog_modifier_group(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    price_delta_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_modifier_option_name_ci
    ON catalog_modifier_option (tenant_id, group_id, LOWER(name));

CREATE INDEX IF NOT EXISTS ix_catalog_modifier_option_group_order
    ON catalog_modifier_option (tenant_id, group_id, sort_order, id);

CREATE TABLE IF NOT EXISTS catalog_product_modifier_group (
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES catalog_modifier_group(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, product_id, group_id)
);

CREATE INDEX IF NOT EXISTS ix_catalog_product_modifier_group_product
    ON catalog_product_modifier_group (tenant_id, product_id, sort_order, group_id);

COMMENT ON TABLE catalog_modifier_group IS
    'Reusable tenant-scoped complement/option groups for MDS Food Catalog 2.0.';
COMMENT ON TABLE catalog_modifier_option IS
    'Options inside reusable complement groups, including additional price.';
COMMENT ON TABLE catalog_product_modifier_group IS
    'N:N assignment of reusable modifier groups to tenant products.';
