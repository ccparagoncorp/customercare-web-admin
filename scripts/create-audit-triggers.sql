-- =====================================================
-- Audit Log System - PostgreSQL Triggers
-- =====================================================
-- Script ini membuat fungsi trigger untuk mencatat semua perubahan
-- pada tabel-tabel dalam database ke tabel tracer_updates
-- Dengan penyimpanan ID terkait untuk query yang lebih efisien
-- =====================================================

-- Hapus fungsi jika sudah ada (untuk update)
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS resolve_related_ids(text, jsonb) CASCADE;

-- Fungsi helper untuk resolve related IDs berdasarkan tabel
CREATE OR REPLACE FUNCTION resolve_related_ids(
    table_name text,
    row_data jsonb
)
RETURNS TABLE(
    brand_id text,
    category_id text,
    subcategory_id text,
    knowledge_id text,
    sop_id text,
    quality_training_id text
) AS $$
DECLARE
    v_brand_id text;
    v_category_id text;
    v_subcategory_id text;
    v_knowledge_id text;
    v_sop_id text;
    v_quality_training_id text;
    v_produk_id text;
    v_detail_knowledge_id text;
    v_jenis_detail_knowledge_id text;
    v_jenis_sop_id text;
    v_jenis_quality_training_id text;
    v_detail_quality_training_id text;
    v_kategori_produk_id text;
BEGIN
    -- Initialize semua variabel ke NULL
    v_brand_id := NULL;
    v_category_id := NULL;
    v_subcategory_id := NULL;
    v_knowledge_id := NULL;
    v_sop_id := NULL;
    v_quality_training_id := NULL;

    -- Handle berdasarkan nama tabel
    CASE table_name
        -- ==================== PRODUCT TABLES ====================
        WHEN 'brands' THEN
            v_brand_id := (row_data->>'id')::text;

        WHEN 'kategori_produks' THEN
            v_brand_id := (row_data->>'brandId')::text;
            v_category_id := (row_data->>'id')::text;

        WHEN 'subkategori_produks' THEN
            v_kategori_produk_id := (row_data->>'kategoriProdukId')::text;
            v_subcategory_id := (row_data->>'id')::text;
            -- Get brandId dari kategori_produks
            SELECT "brandId" INTO v_brand_id
            FROM kategori_produks
            WHERE id = v_kategori_produk_id;
            v_category_id := v_kategori_produk_id;

        WHEN 'produks' THEN
            v_brand_id := (row_data->>'brandId')::text;
            v_category_id := (row_data->>'categoryId')::text;
            v_subcategory_id := (row_data->>'subkategoriProdukId')::text;

        WHEN 'detail_produks' THEN
            v_produk_id := (row_data->>'produkId')::text;
            -- Get brandId, categoryId, subcategoryId dari produks
            SELECT 
                COALESCE("brandId", '')::text,
                COALESCE("categoryId", '')::text,
                COALESCE("subkategoriProdukId", '')::text
            INTO v_brand_id, v_category_id, v_subcategory_id
            FROM produks
            WHERE id = v_produk_id;
            -- Convert empty string to NULL
            IF v_brand_id = '' THEN v_brand_id := NULL; END IF;
            IF v_category_id = '' THEN v_category_id := NULL; END IF;
            IF v_subcategory_id = '' THEN v_subcategory_id := NULL; END IF;

        -- ==================== KNOWLEDGE TABLES ====================
        WHEN 'knowledges' THEN
            v_knowledge_id := (row_data->>'id')::text;

        WHEN 'detail_knowledges' THEN
            v_knowledge_id := (row_data->>'knowledgeId')::text;

        WHEN 'jenis_detail_knowledges' THEN
            v_detail_knowledge_id := (row_data->>'detailKnowledgeId')::text;
            -- Get knowledgeId dari detail_knowledges
            SELECT "knowledgeId" INTO v_knowledge_id
            FROM detail_knowledges
            WHERE id = v_detail_knowledge_id;

        WHEN 'produk_jenis_detail_knowledges' THEN
            v_jenis_detail_knowledge_id := (row_data->>'jenisDetailKnowledgeId')::text;
            -- Get detailKnowledgeId, then knowledgeId
            SELECT dk."knowledgeId" INTO v_knowledge_id
            FROM jenis_detail_knowledges jdk
            JOIN detail_knowledges dk ON dk.id = jdk."detailKnowledgeId"
            WHERE jdk.id = v_jenis_detail_knowledge_id;

        -- ==================== SOP TABLES ====================
        WHEN 'kategori_sops' THEN
            -- No brand relation for SOP
            NULL;

        WHEN 'sops' THEN
            v_sop_id := (row_data->>'id')::text;

        WHEN 'jenis_sops' THEN
            v_sop_id := (row_data->>'sopId')::text;

        WHEN 'detail_sops' THEN
            v_jenis_sop_id := (row_data->>'jenisSOPId')::text;
            -- Get sopId dari jenis_sops
            SELECT "sopId" INTO v_sop_id
            FROM jenis_sops
            WHERE id = v_jenis_sop_id;

        -- ==================== QUALITY TRAINING TABLES ====================
        WHEN 'quality_trainings' THEN
            v_quality_training_id := (row_data->>'id')::text;

        WHEN 'jenis_quality_trainings' THEN
            v_quality_training_id := (row_data->>'qualityTrainingId')::text;

        WHEN 'detail_quality_trainings' THEN
            v_jenis_quality_training_id := (row_data->>'jenisQualityTrainingId')::text;
            -- Get qualityTrainingId dari jenis_quality_trainings
            SELECT "qualityTrainingId" INTO v_quality_training_id
            FROM jenis_quality_trainings
            WHERE id = v_jenis_quality_training_id;

        WHEN 'subdetail_quality_trainings' THEN
            v_detail_quality_training_id := (row_data->>'detailQualityTrainingId')::text;
            -- Get jenisQualityTrainingId, then qualityTrainingId
            SELECT jqt."qualityTrainingId" INTO v_quality_training_id
            FROM detail_quality_trainings dqt
            JOIN jenis_quality_trainings jqt ON jqt.id = dqt."jenisQualityTrainingId"
            WHERE dqt.id = v_detail_quality_training_id;

        ELSE
            -- Unknown table, semua ID tetap NULL
            NULL;
    END CASE;

    -- Return hasil
    RETURN QUERY SELECT 
        v_brand_id,
        v_category_id,
        v_subcategory_id,
        v_knowledge_id,
        v_sop_id,
        v_quality_training_id;
END;
$$ LANGUAGE plpgsql;

-- Buat fungsi trigger yang akan mencatat perubahan
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data jsonb;
    new_data jsonb;
    changed_by_val text;
    key_value text;
    table_name text;
    field_name text;
    old_val text;
    new_val text;
    pk_column text;
    related_ids record;
    current_row_data jsonb;
BEGIN
    -- Dapatkan nama tabel
    table_name := TG_TABLE_NAME;
    
    -- Dapatkan user dari session variable (jika di-set dari aplikasi)
    BEGIN
        changed_by_val := current_setting('app.user_id', true);
        IF changed_by_val = '' THEN
            changed_by_val := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        changed_by_val := NULL;
    END;
    
    -- Dapatkan nama kolom primary key
    SELECT a.attname INTO pk_column
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = TG_RELID AND i.indisprimary
    LIMIT 1;
    
    -- Default ke 'id' jika tidak ditemukan
    IF pk_column IS NULL THEN
        pk_column := 'id';
    END IF;
    
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        current_row_data := new_data;
        
        -- Dapatkan nilai primary key
        key_value := (new_data->>pk_column)::text;
        IF key_value IS NULL THEN
            key_value := 'unknown';
        END IF;
        
        -- Resolve related IDs
        SELECT * INTO related_ids FROM resolve_related_ids(table_name, new_data);
        
        -- Catat semua kolom untuk INSERT
        FOR field_name IN SELECT key FROM jsonb_each(new_data)
        LOOP
            new_val := (new_data->>field_name)::text;
            
            INSERT INTO tracer_updates (
                id,
                source_table,
                source_key,
                field_name,
                old_value,
                new_value,
                action_type,
                changed_at,
                changed_by,
                brand_id,
                category_id,
                subcategory_id,
                knowledge_id,
                sop_id,
                quality_training_id
            ) VALUES (
                gen_random_uuid()::text,
                table_name,
                key_value,
                field_name,
                NULL,
                new_val,
                'INSERT',
                NOW(),
                changed_by_val,
                related_ids.brand_id,
                related_ids.category_id,
                related_ids.subcategory_id,
                related_ids.knowledge_id,
                related_ids.sop_id,
                related_ids.quality_training_id
            );
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        -- Use NEW data for resolving related IDs (in case foreign keys changed)
        current_row_data := new_data;
        
        -- Dapatkan nilai primary key
        key_value := (old_data->>pk_column)::text;
        IF key_value IS NULL THEN
            key_value := 'unknown';
        END IF;
        
        -- Resolve related IDs menggunakan data baru (NEW)
        SELECT * INTO related_ids FROM resolve_related_ids(table_name, new_data);
        
        -- Catat hanya kolom yang berubah
        FOR field_name IN SELECT key FROM jsonb_each(new_data)
        LOOP
            old_val := (old_data->>field_name)::text;
            new_val := (new_data->>field_name)::text;
            
            -- Hanya catat jika nilai berubah
            -- Gunakan IS DISTINCT FROM untuk handle NULL dengan benar
            IF old_val IS DISTINCT FROM new_val THEN
                -- Jika foreign key berubah, resolve ulang related IDs
                IF field_name IN ('brandId', 'categoryId', 'subkategoriProdukId', 'produkId', 
                                  'knowledgeId', 'detailKnowledgeId', 'jenisDetailKnowledgeId',
                                  'sopId', 'jenisSOPId', 'qualityTrainingId', 'jenisQualityTrainingId', 
                                  'detailQualityTrainingId', 'kategoriProdukId') THEN
                    SELECT * INTO related_ids FROM resolve_related_ids(table_name, new_data);
                END IF;
                
                INSERT INTO tracer_updates (
                    id,
                    source_table,
                    source_key,
                    field_name,
                    old_value,
                    new_value,
                    action_type,
                    changed_at,
                    changed_by,
                    brand_id,
                    category_id,
                    subcategory_id,
                    knowledge_id,
                    sop_id,
                    quality_training_id
                ) VALUES (
                    gen_random_uuid()::text,
                    table_name,
                    key_value,
                    field_name,
                    old_val,
                    new_val,
                    'UPDATE',
                    NOW(),
                    changed_by_val,
                    related_ids.brand_id,
                    related_ids.category_id,
                    related_ids.subcategory_id,
                    related_ids.knowledge_id,
                    related_ids.sop_id,
                    related_ids.quality_training_id
                );
            END IF;
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        current_row_data := old_data;
        
        -- Dapatkan nilai primary key
        key_value := (old_data->>pk_column)::text;
        IF key_value IS NULL THEN
            key_value := 'unknown';
        END IF;
        
        -- Resolve related IDs menggunakan data lama (OLD)
        SELECT * INTO related_ids FROM resolve_related_ids(table_name, old_data);
        
        -- Catat semua kolom untuk DELETE
        FOR field_name IN SELECT key FROM jsonb_each(old_data)
        LOOP
            old_val := (old_data->>field_name)::text;
            
            INSERT INTO tracer_updates (
                id,
                source_table,
                source_key,
                field_name,
                old_value,
                new_value,
                action_type,
                changed_at,
                changed_by,
                brand_id,
                category_id,
                subcategory_id,
                knowledge_id,
                sop_id,
                quality_training_id
            ) VALUES (
                gen_random_uuid()::text,
                table_name,
                key_value,
                field_name,
                old_val,
                NULL,
                'DELETE',
                NOW(),
                changed_by_val,
                related_ids.brand_id,
                related_ids.category_id,
                related_ids.subcategory_id,
                related_ids.knowledge_id,
                related_ids.sop_id,
                related_ids.quality_training_id
            );
        END LOOP;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
