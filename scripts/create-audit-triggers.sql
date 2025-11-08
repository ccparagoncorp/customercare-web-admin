-- =====================================================
-- Audit Log System - PostgreSQL Triggers
-- =====================================================
-- Script ini membuat fungsi trigger untuk mencatat semua perubahan
-- pada tabel-tabel dalam database ke tabel tracer_updates
-- =====================================================

-- Hapus fungsi jika sudah ada (untuk update)
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;

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
        
        -- Dapatkan nilai primary key
        key_value := (new_data->>pk_column)::text;
        IF key_value IS NULL THEN
            key_value := 'unknown';
        END IF;
        
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
                changed_by
            ) VALUES (
                gen_random_uuid()::text,
                table_name,
                key_value,
                field_name,
                NULL,
                new_val,
                'INSERT',
                NOW(),
                changed_by_val
            );
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Dapatkan nilai primary key
        key_value := (old_data->>pk_column)::text;
        IF key_value IS NULL THEN
            key_value := 'unknown';
        END IF;
        
        -- Catat hanya kolom yang berubah
        FOR field_name IN SELECT key FROM jsonb_each(new_data)
        LOOP
            old_val := (old_data->>field_name)::text;
            new_val := (new_data->>field_name)::text;
            
            -- Hanya catat jika nilai berubah
            -- Gunakan IS DISTINCT FROM untuk handle NULL dengan benar
            IF old_val IS DISTINCT FROM new_val THEN
                INSERT INTO tracer_updates (
                    id,
                    source_table,
                    source_key,
                    field_name,
                    old_value,
                    new_value,
                    action_type,
                    changed_at,
                    changed_by
                ) VALUES (
                    gen_random_uuid()::text,
                    table_name,
                    key_value,
                    field_name,
                    old_val,
                    new_val,
                    'UPDATE',
                    NOW(),
                    changed_by_val
                );
            END IF;
        END LOOP;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        
        -- Dapatkan nilai primary key
        key_value := (old_data->>pk_column)::text;
        IF key_value IS NULL THEN
            key_value := 'unknown';
        END IF;
        
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
                changed_by
            ) VALUES (
                gen_random_uuid()::text,
                table_name,
                key_value,
                field_name,
                old_val,
                NULL,
                'DELETE',
                NOW(),
                changed_by_val
            );
        END LOOP;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

