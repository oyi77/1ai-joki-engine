# 1. Cek & Copy .env
if (-Not (Test-Path ".env")) {
    Write-Host "📄 Membuat .env dari .env.example..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️ Silakan edit file .env nanti jika ada konfigurasi khusus (misal: API Keys)." -ForegroundColor Yellow
}

# 2. Install dependensi Backend
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Menginstal dependensi Backend..." -ForegroundColor Cyan
    npm install
}

# 3. Install dependensi Dashboard
if (-Not (Test-Path "dashboard/node_modules")) {
    Write-Host "📦 Menginstal dependensi Dashboard..." -ForegroundColor Cyan
    Set-Location dashboard
    npm install
    Set-Location ..
}

# 4. Inisialisasi Database SQLite
Write-Host "🗄️ Menginisialisasi Database..." -ForegroundColor Cyan
npm run db:init

# 5. Informasi Server
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "✅ Sistem siap dijalankan!" -ForegroundColor Green
Write-Host "📡 API Server berjalan di http://localhost:3000" -ForegroundColor Green
Write-Host "🖥️  Dashboard berjalan di http://localhost:3001" -ForegroundColor Green
Write-Host "💡 Untuk menghentikan, tutup window terminal yang baru terbuka." -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Green

# 6. Jalankan API Server di window baru
Write-Host "Membuka terminal baru untuk API..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev:api"

# 7. Jalankan Dashboard di window baru
Write-Host "Membuka terminal baru untuk Dashboard..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev", "--prefix", "dashboard"
