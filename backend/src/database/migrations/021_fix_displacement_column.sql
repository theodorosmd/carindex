-- displacement était DECIMAL(4,2) (max 99.99) mais engine_size vient en ccm (ex: 1395)
-- On supporte désormais les deux (litres et ccm jusqu'à 9999)

ALTER TABLE listings
  ALTER COLUMN displacement TYPE DECIMAL(6,2);
