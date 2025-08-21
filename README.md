# Antarmuka Chatbot Satu Data Jakarta

Proyek ini adalah antarmuka pengguna (frontend) berbasis web untuk berinteraksi dengan **"Po' Tata"**, sebuah chatbot AI yang dirancang untuk menjawab pertanyaan seputar data Provinsi DKI Jakarta.  
Aplikasi ini dibangun menggunakan **React** dan **Vite**, serta dirancang untuk berkomunikasi dengan backend API terpisah.

---

## ✨ Fitur
- **Antarmuka Chat Real-time**: Pengguna dapat mengirim pesan dan menerima respons secara streaming (SSE).
- **Manajemen Sesi**: Setiap sesi percakapan memiliki ID unik untuk menjaga konteks.
- **Render Markdown**: Jawaban dari AI yang mengandung format Markdown (seperti daftar atau tebal) akan ditampilkan dengan benar.
- **Visualisasi Data**: Mampu merender grafik Vega-Lite yang dikirim oleh backend untuk visualisasi data.
- **Tampilan Proses**: Menampilkan indikator saat AI sedang memanggil alat (tools) dan memproses data.
- **Desain Responsif**: Tampilan yang bersih dan dapat diakses di berbagai perangkat.

---

## 🛠️ Teknologi yang Digunakan
- **Framework**: React  
- **Build Tool**: Vite  
- **Styling**: Tailwind CSS  
- **Ikon**: Lucide React  
- **Visualisasi**: Vega-Embed  

---

## 🚀 Panduan Instalasi dan Penggunaan

### 📋 Prasyarat
- Node.js (versi **18** atau lebih baru) atau **Bun**.  
- Akses ke backend API yang sedang berjalan.  

---

### 1. Clone Repositori
    git clone https://github.com/hiadore/Sample-Chatbot-SatuData-Frontend.git
    cd Sample-Chatbot-SatuData-Frontend

---

### 2. Instal Dependensi
Pilih salah satu sesuai package manager yang Anda gunakan:

**Menggunakan Bun (Direkomendasikan):**
    
    bun install

**Menggunakan NPM:**
    
    npm install

---

### 3. Konfigurasi Environment Variables
Aplikasi ini memerlukan **API key** untuk berkomunikasi dengan backend.

1. Buat file baru bernama `.env` di dalam direktori utama.  
2. Salin isi dari `.env.example` (jika ada) atau tambahkan baris berikut:

       VITE_CHATBOT_API_KEY="kunci_api_rahasia_anda"
       VITE_CHATBOT_API_BASE_URL="base_url_api_backend"

3. Ganti `kunci_api_rahasia_anda` dengan API key yang valid yang sudah diatur di server backend.
4. Ganti `base_url_api_backend`, dengan url dari server backend, misal `http://localhost:8000`

---

### 4. Menjalankan Server Pengembangan
Setelah instalasi dan konfigurasi selesai, jalankan server pengembangan lokal:

**Menggunakan Bun:**
    
    bun dev

**Menggunakan NPM:**
    
    npm run dev

Buka browser Anda dan kunjungi:  
👉 http://localhost:5173 (atau port lain yang ditampilkan di terminal).

---

### 5. Membangun untuk Produksi
Untuk men-deploy aplikasi ini ke layanan hosting statis seperti **Cloudflare Pages** atau **Vercel**, buat build produksi:

**Menggunakan Bun:**
    
    bun run build

**Menggunakan NPM:**
    
    npm run build

Perintah ini akan membuat direktori `dist` yang berisi semua file statis yang siap untuk di-deploy.

---
