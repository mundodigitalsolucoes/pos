-- MDS Food Catalog 2.0: keep combo ProductRecipe rows derived from component recipes.
-- This lets the existing FIFO inventory service deduct combo ingredients without
-- duplicating stock logic in checkout/order creation paths.

CREATE OR REPLACE FUNCTION rebuild_catalog_combo_recipe(
    p_tenant_id INTEGER,
    p_combo_id BIGINT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_combo_product_id INTEGER;
BEGIN
    SELECT c.product_id
      INTO v_combo_product_id
      FROM catalog_combo c
     WHERE c.id = p_combo_id
       AND c.tenant_id = p_tenant_id;

    IF v_combo_product_id IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM product_recipe
     WHERE tenant_id = p_tenant_id
       AND product_id = v_combo_product_id;

    INSERT INTO product_recipe (
        tenant_id,
        product_id,
        inventory_item_id,
        quantity_required,
        unit,
        waste_percentage,
        notes
    )
    SELECT
        p_tenant_id,
        v_combo_product_id,
        pr.inventory_item_id,
        pr.quantity_required * ci.quantity,
        pr.unit,
        pr.waste_percentage,
        CASE
            WHEN COALESCE(pr.notes, '') = '' THEN '[Combo] ' || component.name
            ELSE '[Combo] ' || component.name || ' — ' || pr.notes
        END
    FROM catalog_combo_item ci
    JOIN product component
      ON component.id = ci.component_product_id
     AND component.tenant_id = ci.tenant_id
    JOIN product_recipe pr
      ON pr.product_id = ci.component_product_id
     AND pr.tenant_id = ci.tenant_id
    WHERE ci.tenant_id = p_tenant_id
      AND ci.combo_id = p_combo_id
    ORDER BY ci.sort_order, ci.id, pr.id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_catalog_combo_recipe_from_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM rebuild_catalog_combo_recipe(OLD.tenant_id, OLD.combo_id);
        RETURN OLD;
    END IF;

    PERFORM rebuild_catalog_combo_recipe(NEW.tenant_id, NEW.combo_id);

    IF TG_OP = 'UPDATE'
       AND (OLD.tenant_id, OLD.combo_id) IS DISTINCT FROM (NEW.tenant_id, NEW.combo_id) THEN
        PERFORM rebuild_catalog_combo_recipe(OLD.tenant_id, OLD.combo_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catalog_combo_item_sync_recipe ON catalog_combo_item;
CREATE TRIGGER trg_catalog_combo_item_sync_recipe
AFTER INSERT OR UPDATE OR DELETE ON catalog_combo_item
FOR EACH ROW
EXECUTE FUNCTION sync_catalog_combo_recipe_from_item();

CREATE OR REPLACE FUNCTION sync_catalog_combo_recipe_from_component_recipe()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_tenant_id INTEGER;
    v_product_id INTEGER;
BEGIN
    v_tenant_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;
    v_product_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.product_id ELSE NEW.product_id END;

    FOR r IN
        SELECT DISTINCT ci.combo_id
          FROM catalog_combo_item ci
         WHERE ci.tenant_id = v_tenant_id
           AND ci.component_product_id = v_product_id
    LOOP
        PERFORM rebuild_catalog_combo_recipe(v_tenant_id, r.combo_id);
    END LOOP;

    IF TG_OP = 'UPDATE'
       AND (OLD.tenant_id, OLD.product_id) IS DISTINCT FROM (NEW.tenant_id, NEW.product_id) THEN
        FOR r IN
            SELECT DISTINCT ci.combo_id
              FROM catalog_combo_item ci
             WHERE ci.tenant_id = OLD.tenant_id
               AND ci.component_product_id = OLD.product_id
        LOOP
            PERFORM rebuild_catalog_combo_recipe(OLD.tenant_id, r.combo_id);
        END LOOP;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_recipe_sync_catalog_combos ON product_recipe;
CREATE TRIGGER trg_product_recipe_sync_catalog_combos
AFTER INSERT OR UPDATE OR DELETE ON product_recipe
FOR EACH ROW
EXECUTE FUNCTION sync_catalog_combo_recipe_from_component_recipe();

-- Backfill existing combos so inventory works immediately after migration.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tenant_id, id FROM catalog_combo LOOP
        PERFORM rebuild_catalog_combo_recipe(r.tenant_id, r.id);
    END LOOP;
END;
$$;
