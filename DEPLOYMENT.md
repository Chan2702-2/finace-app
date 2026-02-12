# Cara Deploy ke Vercel & Setup Supabase

## 📦 Step 1: Setup Supabase

### 1.1 Buat Akun Supabase
1. Buka [supabase.com](https://supabase.com)
2. Klik "Start your project" atau "Sign Up"
3. Daftar dengan GitHub, Google, atau email
4. Verifikasi email jika diperlukan

### 1.2 Buat Project Baru
1. Setelah login, klik "New Project"
2. Pilih organization (biasanya account personal)
3. Isi detail project:
   - **Name**: finance-system (atau nama lain)
   - **Database Password**: Simpan password ini!
   - **Region**: Southeast Asia (Singapore) - terdekat dari Indonesia
4. Klik "Create new project"
5. Tunggu beberapa menit hingga project siap

### 1.3 Setup Database Schema
1. Di dashboard Supabase, klik **SQL Editor** di sidebar kiri
2. Klik **New query**
3. Copy isi file `config/schema.sql`
4. Paste ke editor
5. Klik **Run** (atau Ctrl+Enter)
6. Jika berhasil, akan ada notifikasi "Success. No rows returned"

### 1.4 Get API Credentials
1. Di dashboard Supabase, klik **Settings** (gear icon) di sidebar kiri
2. Klik **API**
3. Copy nilai berikut:
   - **Project URL**: https://xxxxx.supabase.co
   - **anon public key**: Starts with eyJ...
4. Edit file `config/supabase.js` dan ganti:
```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 1.5 Verifikasi Database Tables
1. Di dashboard Supabase, klik **Table Editor** di sidebar
2. Anda harus melihat tabel-tabel ini:
   - users
   - invoices
   - transactions
   - reconciliations
   - notifications
   - logs

---

## 🚀 Step 2: Deploy ke Vercel

### 2.1 Push ke GitHub
1. Buat repository baru di GitHub:
   - Buka [github.com](https://github.com)
   - Klik "+" > "New repository"
   - Nama: finance-system
   - Visibility: Public atau Private
   - Klik "Create repository"

2. Push project ke GitHub:
```bash
cd finance-system
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finance-system.git
git push -u origin main
```

### 2.2 Connect ke Vercel
1. Buka [vercel.com](https://vercel.com)
2. Klik "Sign Up" / "Log In"
3. Login dengan GitHub
4. Klik "Add New..." > "Project"
5. Pilih repository "finance-system" dari list
6. Klik "Import"

### 2.3 Configure Vercel
1. **Framework Preset**: Leave as "Other" / "Vite" (tidak penting untuk static files)
2. **Root Directory**: Leave as "."
3. **Build Command**: Kosongkan
4. **Output Directory**: Leave as "."
5. Klik **Deploy**

### 2.4 Tunggu Deploy Selesai
1. Vercel akan build dan deploy project
2. URL akan terlihat seperti: https://finance-system.vercel.app
3. Klik URL untuk test aplikasi

---

## 🔧 Step 3: Konfigurasi Tambahan

### 3.1 Enable Email Auth (Optional)
1. Di Supabase Dashboard > Authentication > Providers
2. Pastikan "Email" enabled
3. (Optional) Enable "Confirm email" jika ingin user verifikasi email

### 3.2 Environment Variables di Vercel (Optional)
Jika menggunakan environment variables:
1. Di Vercel Dashboard > Project > Settings > Environment Variables
2. Add variable:
   - KEY: SUPABASE_URL
   - VALUE: https://your-project.supabase.co
3. Add variable:
   - KEY: SUPABASE_ANON_KEY  
   - VALUE: your-anon-key
4. Redeploy project

---

## 🧪 Step 4: Testing

### Test Login
1. Buka URL Vercel Anda
2. Klik "Daftar" di halaman login
3. Isi email & password
4. Jika "Email not confirmed", cek email dan klik link verifikasi

### Test CRUD Operations
1. Buat invoice baru
2. Catat transaksi keuangan
3. Tambah data rekonsiliasi
4. Generate laporan

---

## ❗ Troubleshooting

### "Failed to fetch" Error
- Pastikan Supabase URL & anon key benar di `config/supabase.js`
- Cek RLS policies di Supabase

### Page tidak load di Vercel
- Pastikan semua path di HTML menggunakan relative path (tanpa `/` di awal)
- Vercel menggunakan SPA routing, tapi project ini menggunakan static HTML

### Database error
- Cek apakah schema.sql sudah di-run
- Cek apakah tables sudah dibuat di Table Editor

### Realtime tidak bekerja
- Pastikan Supabase Realtime enabled di Replication settings
- Cek browser console untuk error

---

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Cek dokumentasi Supabase: https://supabase.com/docs
2. Cek dokumentasi Vercel: https://vercel.com/docs
3. Atau hubungi developer
