-- Tenant-owned delivery distance bands. Existing flat-fee data stays untouched.
CREATE TABLE IF NOT EXISTS delivery_zone (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    min_distance_meters INTEGER NOT NULL CHECK (min_distance_meters >= 0),
    max_distance_meters INTEGER NOT NULL CHECK (max_distance_meters > min_distance_meters),
    fee_cents INTEGER NOT NULL CHECK (fee_cents >= 0),
    estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT delivery_zone_name_nonempty CHECK (length(trim(name)) > 0)
);
CREATE INDEX IF NOT EXISTS ix_delivery_zone_tenant_id ON delivery_zone (tenant_id);
CREATE INDEX IF NOT EXISTS ix_delivery_zone_tenant_active_order ON delivery_zone (tenant_id, is_active, sort_order, min_distance_meters);
