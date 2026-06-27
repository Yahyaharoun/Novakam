-- Add UNIQUE constraint to shop name and slug
ALTER TABLE shops ADD CONSTRAINT shops_name_key UNIQUE (name);
ALTER TABLE shops ADD CONSTRAINT shops_slug_key UNIQUE (slug);
