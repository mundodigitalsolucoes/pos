-- Preserve existing tenant values. Legacy installations use VARCHAR; SQLModel-created
-- PostgreSQL databases can use the native businesstype enum.
DO $$
DECLARE label text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'businesstype') THEN
    FOREACH label IN ARRAY ARRAY[
      'pizzeria','burger','snack_bar','bakery','confectionery','acai',
      'ice_cream','meal_delivery','steakhouse','pastry_shop','food_truck','delivery'
    ] LOOP
      EXECUTE format('ALTER TYPE businesstype ADD VALUE IF NOT EXISTS %L', label);
    END LOOP;
  END IF;
END $$;
