-- Migration: Add brandId column to produks table
-- This migration adds a direct relationship between Produk and Brand

-- Step 1: Add brandId column (nullable, since it's optional)
ALTER TABLE "produks" 
ADD COLUMN IF NOT EXISTS "brandId" TEXT;

-- Step 2: Add foreign key constraint
ALTER TABLE "produks"
ADD CONSTRAINT "produks_brandId_fkey" 
FOREIGN KEY ("brandId") 
REFERENCES "brands"("id") 
ON DELETE SET NULL;

-- Step 3 (Optional): Migrate existing data
-- If you have existing products with brands through categories/subcategories,
-- you can populate brandId from the category's brand:
UPDATE "produks" p
SET "brandId" = (
  CASE
    -- If product has subcategory, get brand from subcategory's category
    WHEN p."subkategoriProdukId" IS NOT NULL THEN (
      SELECT kp."brandId"
      FROM "subkategori_produks" sp
      JOIN "kategori_produks" kp ON sp."kategoriProdukId" = kp.id
      WHERE sp.id = p."subkategoriProdukId"
    )
    -- If product has category, get brand from category
    WHEN p."categoryId" IS NOT NULL THEN (
      SELECT kp."brandId"
      FROM "kategori_produks" kp
      WHERE kp.id = p."categoryId"
    )
    -- Otherwise, keep NULL
    ELSE NULL
  END
)
WHERE p."brandId" IS NULL;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS "produks_brandId_idx" ON "produks"("brandId");

