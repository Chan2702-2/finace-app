# Sistem Keuangan - Dokumentasi

Sistem web operasional pencatatan keuangan berbasis HTML + CSS + JavaScript dengan backend Supabase.

## 📁 Struktur Project

```
finance-system/
├── index.html              # Redirect ke dashboard
├── login.html              # Halaman login
├── dashboard.html          # Dashboard utama
├── invoice.html            # Manajemen invoice
├── finance.html            # Pencatatan transaksi
├── recon.html              # Rekonsiliasi pembayaran
├── reports.html            # Laporan dan export
├── assets/
│   ├── css/
│   │   └── style.css       # Styling utama
│   ├── js/
│   │   ├── app.js          # Modul utama aplikasi
│   │   ├── auth.js         # Modul autentikasi
│   │   ├── dashboard.js    # Modul dashboard
│   │   ├── invoice.js      # Modul invoice
│   │   ├── finance.js      # Modul keuangan
│   │   ├── recon.js        # Modul rekonsiliasi
│   │   └── reports.js      # Modul laporan
│   └── img/                # Folder gambar
├── components/             # Komponen reusable
├── config/
│   ├── schema.sql          # Schema database Supabase
│   └── supabase.js         # Konfigurasi Supabase
└── README.md              # Dokumentasi ini
```

## 🚀 Cara Install dan Menjalankan

### 1. Setup Supabase

1. Buat account di [Supabase](https://supabase.com)
2. Buat project baru
3. Buka SQL Editor dan jalankan script dari `config/schema.sql`
4. Copy URL dan Anon Key dari Settings > API

### 2. Konfigurasi Project

Edit file `config/supabase.js`:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 3. Menjalankan Lokal

#### Menggunakan VS Code Live Server:
1. Buka folder `finance-system` di VS Code
2. Install extension "Live Server"
3. Klik kanan pada `login.html` > "Open with Live Server"

#### Menggunakan Python:
```bash
cd finance-system
python -m http.server 8000
```
Buka `http://localhost:8000` di browser

### 4. Deploy ke Vercel

1. Push project ke GitHub
2. Hubungkan ke Vercel
3. Done! Website langsung online

## 📝 Cara Penggunaan

### Login
1. Daftar akun baru atau login dengan email/password
2. Setelah login, akan diarahkan ke dashboard

### Invoice
1. Klik "Tambah Invoice" untuk membuat invoice baru
2. Isi data client dan item-item invoice
3. Sistem akan otomatis menghitung total
4. Status invoice: Pending → Terkirim → Lunas
5. Saat status berubah ke Lunas, otomatis tercatat sebagai pendapatan

### Keuangan
1. Catat pemasukan dan pengeluaran manual
2. Gunakan filter untuk melihat jenis tertentu
3. Saldo dihitung otomatis dari total pemasukan - pengeluaran

### Rekonsiliasi
1. Input data pembayaran dari mitra
2. Sistem akan menghitung selisih antara tagihan dan pembayaran
3. Jika selisih ≠ 0, akan ada notifikasi otomatis

### Laporan
1. Pilih jenis laporan (Keuangan/Invoice/Rekonsiliasi)
2. Atur filter tanggal
3. Klik "Buat Laporan"
4. Export ke PDF atau Excel

## 🔔 Sistem Notifikasi

Notifikasi muncul di kanan atas navbar untuk:
- Rekonsiliasi tidak cocok (selisih ≠ 0)
- Invoice belum lunas
- Invoice melewati jatuh tempo

Notifikasi menggunakan Supabase Realtime.

## 🔐 Keamanan

- Row Level Security (RLS) aktif di semua tabel
- User hanya bisa mengakses data miliknya sendiri
- Authentikasi via Supabase Auth

## 📦 Dependencies

- **Supabase JS**: Database, Auth, Realtime
- **Chart.js**: Grafik dashboard
- **SheetJS (XLSX)**: Export Excel
- **jsPDF**: Export PDF

CDN links sudah termasuk di HTML files.

## 🛠️ Pengembangan

### Menambah Halaman Baru
1. Buat HTML file di root folder
2. Copy struktur dari halaman lain
3. Include JS modules yang diperlukan
4. Modul JS baru harus memiliki fungsi `init()`

### Menambah Fitur
1. Edit modul JS yang sesuai
2. Gunakan helper functions dari `app.js`:
   - `App.showToast()` - Tampilkan notifikasi
   - `App.formatCurrency()` - Format Rupiah
   - `App.formatDate()` - Format tanggal
   - `App.showLoading()` / `App.hideLoading()` - Loading state

## 📄 Database Schema

### Tabel Utama

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Data user (via Supabase Auth) |
| `invoices` | Data invoice client |
| `transactions` | Transaksi keuangan |
| `reconciliations` | Data rekonsiliasi |
| `notifications` | Notifikasi sistem |
| `logs` | Audit log |

### Relasi

```
users (1) ──── (N) invoices
users (1) ──── (N) transactions
users (1) ──── (N) reconciliations
users (1) ──── (N) notifications
```

## 🎨 Customization

### Warna Tema
Edit file `assets/css/style.css`, bagian `:root`:
```css
:root {
    --primary: #4F46E5;      /* Warna utama */
    --success: #10B981;      /* Hijau */
    --warning: #F59E0B;      /* Kuning */
    --danger: #EF4444;       /* Merah */
}
```

### Sidebar
Lebar sidebar: `--sidebar-width: 260px;`

## 📝 Catatan

1. Pastikan Supabase RLS policies sudah aktif
2. Untuk produksi, aktifkan email confirmation di Supabase
3. Backup database secara berkala
4. Monitor usage di Supabase dashboard

## 📧 Support

Untuk pertanyaan atau issue, silakan hubungi developer.
