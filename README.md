# SUKA MAJU Manager — Panduan Deploy

Project ni dah siap sedia untuk dijadikan website betul dengan domain sendiri.

## 1. Test dulu kat laptop (optional tapi disarankan)

```bash
npm install
npm run dev
```

Buka link yang keluar (biasanya http://localhost:5173) untuk test app tu jalan elok.

## 2. Naikkan ke GitHub

1. Pergi github.com → buat account (kalau belum ada) → **New repository** (nama cth: `sukamaju-manager`)
2. Dalam folder project ni, jalankan:

```bash
git init
git add .
git commit -m "SUKA MAJU Manager v1"
git branch -M main
git remote add origin https://github.com/USERNAME/sukamaju-manager.git
git push -u origin main
```

(Tukar `USERNAME` dengan username GitHub kau)

## 3. Deploy guna Vercel (free, senang, disarankan)

1. Pergi **vercel.com** → Sign up guna akaun GitHub kau
2. Klik **Add New → Project**
3. Pilih repo `sukamaju-manager` yang kau push tadi
4. Vercel akan auto-detect ni project Vite — biar default settings, klik **Deploy**
5. Lepas 1-2 minit, kau dapat link cam `sukamaju-manager.vercel.app` — dah live!

## 4. Sambung domain sendiri (cth: sukamaju.my)

1. Beli domain kat mana-mana (Exabytes, GoDaddy, Namecheap dll)
2. Dalam Vercel project → **Settings → Domains** → masukkan domain kau
3. Vercel bagi kau 2 baris DNS (A record / CNAME) untuk masukkan kat tempat kau beli domain tu
4. Tunggu 10 minit - 24 jam untuk propagate, lepas tu domain kau terus buka app ni

## Penting — Pasal Data

App ni guna storan dalam **browser peranti tu sendiri** (`localStorage`). Ni bermakna:

- ✅ Data auto-save, tak hilang bila tutup/refresh browser
- ⚠️ Data **tak sync** antara telefon kau dengan laptop staff kau — setiap peranti ada storan sendiri
- ⚠️ Kalau clear browser data/cache, rekod akan hilang

Kalau kau nak semua staff (Hairul/Aiman/Hakim) share **data yang sama** secara real-time merentasi peranti, kau perlukan **database sebenar** (contoh: Supabase — free tier ada, senang setup). Bagitahu Claude kalau nak upgrade ke arah tu, boleh tolong wire up.

## Struktur Fail

```
sukamaju-web/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx      ← entry point
    ├── App.jsx        ← seluruh app SUKA MAJU Manager
    └── storage.js     ← storan data (localStorage)
```
"# sukamaju-manager" 
