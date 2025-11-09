# Tracer Update Enhancement - Setup Guide

## Overview

Sistem tracer update telah ditingkatkan untuk menyimpan ID terkait (related IDs) dari tabel yang diupdate. Ini memungkinkan query yang lebih efisien berdasarkan brand, category, knowledge, SOP, dan quality training tanpa perlu JOIN.

## Perubahan yang Dibuat

### 1. Schema Update (`prisma/schema.prisma`)
- Menambahkan kolom baru ke model `TracerUpdate`:
  - `brandId` (nullable)
  - `categoryId` (nullable)
  - `subcategoryId` (nullable)
  - `knowledgeId` (nullable)
  - `sopId` (nullable)
  - `qualityTrainingId` (nullable)
- Menambahkan index untuk setiap kolom baru untuk performa query yang lebih baik

### 2. Trigger Function Update (`scripts/create-audit-triggers.sql`)
- Menambahkan fungsi `resolve_related_ids()` yang secara otomatis meng-resolve ID terkait berdasarkan tabel
- Update fungsi `audit_trigger_function()` untuk menyimpan ID terkait saat INSERT, UPDATE, atau DELETE
- Support untuk semua tabel: products, knowledge, SOP, quality training

### 3. Migration Script (`scripts/migrate-tracer-updates.sql`)
- Script SQL untuk menambahkan kolom baru ke tabel `tracer_updates`
- Menambahkan index untuk performa query
- Optional backfill script (commented out) untuk update data lama

### 4. Audit Service Update (`src/lib/audit.ts`)
- Menambahkan method baru:
  - `getLogsByBrand(brandId)`
  - `getLogsByCategory(categoryId)`
  - `getLogsBySubcategory(subcategoryId)`
  - `getLogsByKnowledge(knowledgeId)`
  - `getLogsBySOP(sopId)`
  - `getLogsByQualityTraining(qualityTrainingId)`
  - `getLogsWithFilters(filters)` - support filter kombinasi

### 5. API Update (`src/app/api/audit/route.ts`)
- Menambahkan support untuk query parameter:
  - `brandId`
  - `categoryId`
  - `subcategoryId`
  - `knowledgeId`
  - `sopId`
  - `qualityTrainingId`

### 6. Brand Tracking Page (`src/app/admin/products/brand/[id]/tracking/page.tsx`)
- Halaman baru untuk melihat semua tracer update terkait sebuah brand
- Support filter berdasarkan tabel dan action type
- Search functionality
- Pagination

## Setup Instructions

### Step 1: Update Prisma Schema
```bash
npx prisma format
npx prisma generate
```

### Step 2: Run Migration
Jalankan script migration untuk menambahkan kolom baru:
```bash
# Connect to your database and run:
psql $DATABASE_URL -f scripts/migrate-tracer-updates.sql

# Or if using Prisma:
# Create a migration file first
npx prisma migrate dev --name add_related_ids_to_tracer_updates
# Then manually add the SQL from migrate-tracer-updates.sql to the migration file
```

### Step 3: Update Trigger Function
Jalankan script untuk update trigger function:
```bash
npm run setup:audit
# Or manually run the SQL script
psql $DATABASE_URL -f scripts/create-audit-triggers.sql
```

### Step 4: Verify Setup
```bash
npm run check:audit
```

## Cara Penggunaan

### 1. Query Tracer Updates by Brand
```typescript
// Via API
GET /api/audit?brandId=brand-id-here

// Via Service
const auditService = new AuditLogService(prisma)
const logs = await auditService.getLogsByBrand('brand-id-here')
```

### 2. Query dengan Multiple Filters
```typescript
// Via API
GET /api/audit?brandId=brand-id&action=UPDATE&table=produks

// Via Service
const logs = await auditService.getLogsWithFilters({
  brandId: 'brand-id',
  actionType: 'UPDATE',
  sourceTable: 'produks'
})
```

### 3. Akses Brand Tracking Page
Navigate ke:
```
/admin/products/brand/[brandId]/tracking
```

Contoh:
- `/admin/products/brand/clxxxxx/tracking`

## Contoh Relasi yang Disimpan

### Untuk Detail Produk
Saat `detail_produks` diupdate, sistem akan menyimpan:
- `sourceKey`: ID detail produk
- `brandId`: ID brand (dari produk)
- `categoryId`: ID kategori (dari produk)
- `subcategoryId`: ID subkategori (dari produk)

### Untuk Knowledge
Saat `produk_jenis_detail_knowledges` diupdate, sistem akan menyimpan:
- `sourceKey`: ID produk jenis detail knowledge
- `knowledgeId`: ID knowledge (resolved melalui relasi)

### Untuk SOP
Saat `detail_sops` diupdate, sistem akan menyimpan:
- `sourceKey`: ID detail SOP
- `sopId`: ID SOP (dari jenis SOP)

## Efisiensi

### Keuntungan:
1. **Query Lebih Cepat**: Tidak perlu JOIN untuk query berdasarkan brand/category
2. **Indexed**: Semua kolom related ID sudah di-index
3. **Flexible**: Support filter kombinasi multiple related IDs
4. **Scalable**: Denormalisasi data di write-time, bukan read-time

### Trade-off:
- **Storage**: Sedikit lebih banyak storage untuk menyimpan related IDs
- **Write Overhead**: Sedikit overhead saat write (resolve related IDs)
- **Data Consistency**: Related IDs disimpan saat write, jadi jika relasi berubah, data lama tetap menggunakan ID lama (ini adalah expected behavior untuk audit log)

## Testing

Setelah setup, test dengan:
1. Update sebuah detail produk
2. Check tracer_updates table - pastikan brandId, categoryId, subcategoryId terisi
3. Query via API: `GET /api/audit?brandId=<brand-id>`
4. Akses tracking page: `/admin/products/brand/<brand-id>/tracking`

## Troubleshooting

### Issue: Related IDs tidak terisi
- Pastikan trigger function sudah di-update
- Check apakah tabel sudah memiliki trigger yang benar
- Verify relasi antara tabel (foreign keys)

### Issue: Query lambat
- Pastikan index sudah dibuat
- Check apakah ada banyak data tanpa related IDs (data lama)
- Consider running backfill script jika diperlukan

### Issue: Trigger error
- Check PostgreSQL logs
- Verify bahwa semua tabel yang direferensikan ada
- Pastikan kolom yang di-query ada di tabel

## Future Enhancements

- [ ] Backfill script untuk update data lama
- [ ] Support untuk tabel baru (jika ada)
- [ ] Dashboard analytics berdasarkan brand/category
- [ ] Export functionality untuk audit logs
- [ ] Real-time notifications untuk perubahan penting

