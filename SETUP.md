# Setup Instructions

## 1. Environment Configuration

Buat file `.env` di root project dengan konfigurasi berikut (copy dari `env.example`):

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# Super Admin Configuration (for seeding)
SUPER_ADMIN_EMAIL="cckahf@gmail.com"
SUPER_ADMIN_PASSWORD="Paragon2023"
SUPER_ADMIN_NAME="Admin CC Paragon"
```

### Cara mendapatkan Supabase Configuration:

1. **NEXT_PUBLIC_SUPABASE_URL**:
   - Buka Supabase Dashboard
   - Pilih project Anda
   - Pergi ke Settings > API
   - Copy "Project URL"

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**:
   - Di halaman yang sama (Settings > API)
   - Copy "anon" key (public key)

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - Di halaman yang sama (Settings > API)
   - Copy "service_role" key (private key)

4. **DATABASE_URL**:
   - Pergi ke Settings > Database
   - Copy connection string dari "Connection string" section
   - Ganti `[YOUR-PASSWORD]` dengan password database Anda

## 2. Database Setup

### Generate Prisma Client
```bash
npm run db:generate
```

### Push Schema ke Database
```bash
npm run db:push
```

### Seed Super Admin dengan Supabase Auth
```bash
# Menggunakan Prisma seed (recommended)
npm run db:seed

# Atau menggunakan script Supabase langsung
npm run seed:supabase
```

## 3. Jalankan Development Server

```bash
npm run dev
```

## 4. Login

Buka browser dan akses: http://localhost:3000

Gunakan kredensial super admin:
- **Email**: cckahf@gmail.com
- **Password**: Paragon2023

## 5. Struktur Role

- **SUPER_ADMIN**: Akses penuh, bisa mengelola semua user
- **ADMIN**: Akses ke dashboard admin, tidak bisa mengelola user
- **AGENT**: Akses ke dashboard agent untuk customer service

## 6. Menambah User Baru

1. Login sebagai SUPER_ADMIN
2. Pergi ke Admin Dashboard
3. Klik "Kelola User"
4. Klik "Tambah User"
5. Isi form dan submit

## Troubleshooting

### Error: "Prisma Client not generated"
```bash
npm run db:generate
```

### Error: "Database connection failed"
- Pastikan DATABASE_URL sudah benar
- Pastikan Supabase project aktif
- Pastikan password database benar

### Error: "Supabase client not initialized"
- Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah di-set di .env
- Pastikan kedua key tersebut adalah yang benar dari Supabase Dashboard

### Error: "Super admin not created"
```bash
npm run db:seed
```

Jika masih error, cek:
- DATABASE_URL sudah benar
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY sudah benar
- Database sudah ter-push dengan schema
- Environment variables sudah ter-load

### Error: "Supabase Auth error"
- Pastikan SUPABASE_SERVICE_ROLE_KEY adalah service_role key (bukan anon key)
- Pastikan project Supabase aktif dan tidak dalam mode maintenance
- Cek apakah user sudah ada di Supabase Auth dashboard
