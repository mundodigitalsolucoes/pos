-- MDS Food Catalog 2.0: sellable combos backed by a normal Product row.
-- The Product remains the canonical sellable item; these tables store composition metadata.

CREATE TABLE IF NOT EXISTS catalog_combo (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_catalog_combo_tenant_product UNIQUE (tenant_id, product_id)
);

CREATE INDEX IF NOT EXISTS ix_catalog_combo_tenant
    ON catalog_combo (tenant_id, id);

CREATE TABLE IF NOT EXISTS catalog_combo_item (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    combo_id BIGINT NOT NULL REFERENCES catalog_combo(id) ON DELETE CASCADE,
    component_product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 99),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_catalog_combo_component UNIQUE (tenant_id, combo_id, component_product_id)
);

CREATE INDEX IF NOT EXISTS ix_catalog_combo_item_combo
    ON catalog_combo_item (tenant_id, combo_id, sort_order, id);

COMMENT ON TABLE catalog_combo IS
    'Sellable MDS Food combo metadata linked to a normal tenant Product.';
COMMENT ON TABLE catalog_combo_item IS
    'Fixed component products and quantities that compose an MDS Food combo.';
