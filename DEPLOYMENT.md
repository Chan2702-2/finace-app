# Deployment Guide - Vercel + Supabase

## Masalah Umum: "Gabisa Konek ke Vercel"

Jika lo gabisa konek Supabase ke Vercel, biasanya karena:

### 1. Environment Variables Belum Disetting

**Langkah-langkah di Vercel:**

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih project lo
3. Klik **Settings** > **Environment Variables**
4. Tambahin dua variabel ini:
   - `SUPABASE_URL` = URL dari Supabase (bukan URL browser, tapi dari Settings > API)
   - `SUPABASE_ANON_KEY` = Anon Key dari Supabase (Settings > API)

**Cara dapat credentials dari Supabase:**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project lo
3. Klik **Settings** (ikon gear) > **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`

### 2. CORS Issues

Supabase defaultnya cuma bolehin akses dari domain tertentu. 

**Tambahin domain Vercel lo di Supabase:**

1. Supabase Dashboard > **Settings** > **API**
2. Scroll ke **URL Configuration** > **Redirect URLs**
3. Tambahin:
   - `https://your-project-name.vercel.app`
   - `http://localhost:3000` (untuk local development)

### 3. Local Development dengan Environment Variables

Buat file `.env.local` di root project:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

Terus restart dev server lo.

### 4. Verifikasi Koneksi

Buka browser dev tools (F12) > Console. Kalo ada error kayak:

- `Failed to fetch` →cek URL dan internet
- `AuthApiError: invalid API key` →cek ANON_KEY
- `CORS error` →tambahin Redirect URL di Supabase

### 5. Cara Deploy ke Vercel (Step by Step)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login ke Vercel
vercel login

# 3. Deploy
cd finance-system
vercel

# 4. Ikuti instruksi di CLI:
# - Set up and deploy? Yes
# - Which scope? Pilih akun lo
# - Link to existing project? No
# - Project name? finance-system (atau nama lain)
# - Directory? ./
# - Want to modify settings? Yes
# - Build Command? (kosongin aja)
# - Output Directory? ./
# - Override settings? No
```

### 6. Setelah Deploy, Setting Environment Variables di Vercel

```bash
# Tambahin environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY

# Deploy lagi biar keapply
vercel --prod
```

Atau lewat Dashboard:
1. Vercel Dashboard > Project > Settings > Environment Variables
2. Tambahin variabel satu per satu
3. Redeploy project

### 7. Troubleshooting

**Error:** `TypeError: Cannot read property 'auth' of undefined`

**Solusi:** Supabase client belom kebaca. Cek:
- Apakah `<script src="config/supabase.js"></script>` ada sebelum script lain
- Apakah `window.supabaseConfig` udah terdefinisi

**Error:** `NetworkError` 

**Solusi:** 
- Cek URL Supabase bener apa nggak
- Coba akses URL Supabase di browser langsung (`https://your-project.supabase.co`)
- Kalo gabisa diakses, berarti project Supabase lo bermasalah

### 8. Catatan Penting

- **JANGAN** push credentials ke GitHub!
- Pakai `.env.example` sebagai template, tapi `.env.local` jangan di-commit
- Environment variables di Vercel harus disetting manual lewat Dashboard atau CLI

---

Kalo masih ada masalah,cek console browser error message-nya apa dan google error itu bro.
