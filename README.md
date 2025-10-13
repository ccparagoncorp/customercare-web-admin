# Admin Customer Care Paragon

Sistem administrasi customer care Paragon dengan fitur admin dan agent.

## Fitur

- **Authentication & Authorization**: Login dengan NextAuth.js
- **Role-based Access**: Super Admin, Admin, dan Agent
- **Database**: PostgreSQL dengan Prisma ORM
- **UI**: Tailwind CSS dengan desain modern

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Konfigurasi Database

Buat file `.env` di root project:

```env
# Database
DATABASE_URL="your_supabase_connection_string_here"

# Super Admin Configuration
SUPER_ADMIN_EMAIL="admin@ccparagon.com"
SUPER_ADMIN_NAME="Super Admin"
SUPER_ADMIN_PASSWORD="admin123"

# Next.js
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push

# Seed super admin ke database
npm run db:seed
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) untuk melihat aplikasi.

## Login

### Super Admin (Default)
- **Email**: admin@ccparagon.com
- **Password**: admin123

## Struktur Aplikasi

### Roles
- **SUPER_ADMIN**: Akses penuh ke semua fitur
- **ADMIN**: Akses ke fitur administrasi
- **AGENT**: Akses ke fitur customer service

### Routes
- `/login` - Halaman login
- `/admin/dashboard` - Dashboard admin
- `/agent/dashboard` - Dashboard agent
- `/` - Redirect otomatis berdasarkan role

## Database Schema

### User Management
- `User` model dengan role-based access
- Password di-hash dengan bcryptjs
- Support untuk multiple roles

### Produk System
- `Brand` - Merek produk
- `KategoriProduk` - Kategori produk per brand
- `SubkategoriProduk` - Subkategori per kategori
- `Produk` - Detail produk
- `DetailProduk` - Spesifikasi produk

### SOP System
- `KategoriSOP` - Kategori SOP
- `SOP` - Standard Operating Procedure
- `JenisSOP` - Jenis SOP per kategori
- `DetailSOP` - Detail langkah SOP

### Knowledge Base
- `Knowledge` - Artikel pengetahuan
- `DetailKnowledge` - Detail konten pengetahuan

## Scripts

- `npm run dev` - Development server
- `npm run build` - Build production
- `npm run start` - Start production server
- `npm run lint` - ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema ke database
- `npm run db:seed` - Seed super admin

## Tech Stack

- **Framework**: Next.js 15
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Language**: TypeScript
