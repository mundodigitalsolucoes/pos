-- Keep combos grouped as "Combos" in the public catalog through subcategory,
-- while routing the sellable product through the default kitchen KDS category.

UPDATE product p
SET category = 'Main Course',
    subcategory = 'Combos'
FROM catalog_combo c
WHERE c.product_id = p.id
  AND c.tenant_id = p.tenant_id;
