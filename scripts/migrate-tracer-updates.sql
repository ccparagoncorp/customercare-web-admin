-- =====================================================
-- Migration: Add Related ID Columns to tracer_updates
-- =====================================================
-- Script ini menambahkan kolom untuk menyimpan ID terkait
-- agar dapat query berdasarkan brand, category, dll dengan efisien
-- =====================================================

-- Tambahkan kolom baru (nullable karena data lama tidak memiliki nilai)
ALTER TABLE tracer_updates
ADD COLUMN IF NOT EXISTS brand_id TEXT,
ADD COLUMN IF NOT EXISTS category_id TEXT,
ADD COLUMN IF NOT EXISTS subcategory_id TEXT,
ADD COLUMN IF NOT EXISTS knowledge_id TEXT,
ADD COLUMN IF NOT EXISTS sop_id TEXT,
ADD COLUMN IF NOT EXISTS quality_training_id TEXT;

-- Tambahkan index untuk query yang lebih cepat
CREATE INDEX IF NOT EXISTS idx_tracer_updates_brand_id ON tracer_updates(brand_id) WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracer_updates_category_id ON tracer_updates(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracer_updates_subcategory_id ON tracer_updates(subcategory_id) WHERE subcategory_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracer_updates_knowledge_id ON tracer_updates(knowledge_id) WHERE knowledge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracer_updates_sop_id ON tracer_updates(sop_id) WHERE sop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracer_updates_quality_training_id ON tracer_updates(quality_training_id) WHERE quality_training_id IS NOT NULL;

-- Optional: Backfill data lama (jika diperlukan)
-- Script ini akan update tracer_updates yang sudah ada dengan related IDs
-- Note: Ini mungkin memakan waktu jika ada banyak data
-- Uncomment jika ingin backfill data lama

/*
-- Backfill untuk product-related tables
UPDATE tracer_updates tu
SET 
    brand_id = CASE 
        WHEN tu.source_table = 'brands' THEN tu.source_key
        WHEN tu.source_table = 'kategori_produks' THEN (
            SELECT "brandId"::text FROM kategori_produks WHERE id::text = tu.source_key
        )
        WHEN tu.source_table = 'produks' THEN (
            SELECT "brandId"::text FROM produks WHERE id::text = tu.source_key
        )
        WHEN tu.source_table = 'detail_produks' THEN (
            SELECT p."brandId"::text 
            FROM detail_produks dp
            JOIN produks p ON p.id = dp."produkId"
            WHERE dp.id::text = tu.source_key
        )
        ELSE NULL
    END,
    category_id = CASE
        WHEN tu.source_table = 'kategori_produks' THEN tu.source_key
        WHEN tu.source_table = 'produks' THEN (
            SELECT "categoryId"::text FROM produks WHERE id::text = tu.source_key
        )
        WHEN tu.source_table = 'detail_produks' THEN (
            SELECT p."categoryId"::text 
            FROM detail_produks dp
            JOIN produks p ON p.id = dp."produkId"
            WHERE dp.id::text = tu.source_key
        )
        ELSE NULL
    END
WHERE tu.brand_id IS NULL OR tu.category_id IS NULL;
*/

COMMENT ON COLUMN tracer_updates.brand_id IS 'ID brand terkait untuk query efisien';
COMMENT ON COLUMN tracer_updates.category_id IS 'ID category terkait untuk query efisien';
COMMENT ON COLUMN tracer_updates.subcategory_id IS 'ID subcategory terkait untuk query efisien';
COMMENT ON COLUMN tracer_updates.knowledge_id IS 'ID knowledge terkait untuk query efisien';
COMMENT ON COLUMN tracer_updates.sop_id IS 'ID SOP terkait untuk query efisien';
COMMENT ON COLUMN tracer_updates.quality_training_id IS 'ID quality training terkait untuk query efisien';

