# Fix: Internal Server Error saat DELETE

## Masalah
Saat menghapus brand, kategori, subkategori, produk, atau tabel lain, muncul error "Internal server error". Ini terjadi karena trigger audit mencoba query ke tabel yang sudah dihapus (karena cascade delete).

## Solusi
Update trigger function dengan error handling yang lebih baik.

## Langkah-langkah

### 1. Update Trigger Function
Jalankan script SQL untuk update trigger function:

```bash
# Connect to database
psql $DATABASE_URL

# Atau jalankan script
psql $DATABASE_URL -f scripts/create-audit-triggers.sql
```

### 2. Atau melalui Setup Script
```bash
npm run setup:audit
```

### 3. Verify
```bash
npm run check:audit
```

## Perubahan yang Dibuat

### Error Handling untuk DELETE
- Menambahkan `BEGIN...EXCEPTION...END` blocks untuk semua query ke tabel terkait
- Jika query gagal (karena data sudah dihapus), variabel akan tetap NULL
- Trigger tidak akan error dan DELETE operation akan berhasil

### Tabel yang Diperbaiki
1. **subkategori_produks**: Query ke `kategori_produks` untuk get `brandId`
2. **detail_produks**: Query ke `produks` untuk get `brandId`, `categoryId`, `subcategoryId`
3. **jenis_detail_knowledges**: Query ke `detail_knowledges` untuk get `knowledgeId`
4. **produk_jenis_detail_knowledges**: Query dengan JOIN untuk get `knowledgeId`
5. **detail_sops**: Query ke `jenis_sops` untuk get `sopId`
6. **detail_quality_trainings**: Query ke `jenis_quality_trainings` untuk get `qualityTrainingId`
7. **subdetail_quality_trainings**: Query dengan JOIN untuk get `qualityTrainingId`

## Penjelasan Teknis

### Sebelum Perbaikan
```sql
SELECT "brandId" INTO v_brand_id
FROM kategori_produks
WHERE id = v_kategori_produk_id;
-- Error jika kategori_produks sudah dihapus (cascade delete)
```

### Setelah Perbaikan
```sql
BEGIN
    SELECT "brandId" INTO v_brand_id
    FROM kategori_produks
    WHERE id = v_kategori_produk_id;
    -- If no data found, v_brand_id will remain NULL (no exception)
EXCEPTION 
    WHEN OTHERS THEN
        -- Any error (e.g., table doesn't exist, constraint violation), keep NULL
        v_brand_id := NULL;
END;
```

## Testing

Setelah update, test dengan:
1. Delete sebuah subkategori yang memiliki kategori
2. Delete sebuah detail produk yang memiliki produk
3. Delete sebuah brand (dengan cascade delete ke kategori)
4. Verify bahwa DELETE berhasil dan audit log tetap tercatat (meski related IDs mungkin NULL)

## Catatan

- Related IDs mungkin NULL untuk data yang dihapus dengan cascade delete
- Ini adalah expected behavior - audit log tetap tercatat meski related IDs tidak bisa di-resolve
- Data audit log tetap lengkap dengan informasi yang tersedia saat DELETE

