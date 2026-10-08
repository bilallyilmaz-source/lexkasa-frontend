# LexKasa — Kendi Sunucunuza Kurulum Kılavuzu

Bu rehber, LexKasa uygulamasını kendi sunucunuzda (VPS, DigitalOcean, Hetzner, kendi evinizdeki bilgisayar vb.) ücretsiz bulut veritabanıyla çalıştırmak içindir.

---

## 1. Ücretsiz Bulut Veritabanı: MongoDB Atlas

### 1.1 Hesap Açma (3 dakika)
1. https://www.mongodb.com/cloud/atlas/register adresine girin
2. E-posta ile kayıt olun (Google ile de olur)
3. **"Build a Database"** → **M0 FREE** planı seçin
4. **Provider**: AWS (en hızlısı)
5. **Region**: `eu-central-1` (Frankfurt) veya `eu-west-1` (İrlanda) — Türkiye'ye en yakın
6. **Cluster Name**: `lexkasa-cluster` (istediğiniz isim)
7. **"Create"** tıklayın (cluster hazırlanması 1-3 dk)

### 1.2 Veritabanı Kullanıcısı Oluşturma
1. Sol menüden **Database Access** → **"Add New Database User"**
2. **Authentication Method**: Password
3. **Username**: `lexkasa_user`
4. **Password**: Güçlü bir şifre oluşturun (not edin — birazdan kullanacaksınız)
5. **Built-in Role**: `Read and write to any database`
6. **Add User**

### 1.3 Ağ Erişimi (IP Whitelist)
1. Sol menüden **Network Access** → **"Add IP Address"**
2. **Allow Access from Anywhere** seçin (0.0.0.0/0)
   - Not: Kendi sunucunuzun IP'si sabitse sadece onu eklemek daha güvenli
3. **Confirm**

### 1.4 Bağlantı String'ini Alın
1. **Database** sayfasına dönün → cluster'ınızın yanındaki **"Connect"** butonu
2. **"Drivers"** seçin
3. Python / Node.js fark etmez — Python seçili bırakın
4. Çıkan URL şuna benzeyecek:
   ```
   mongodb+srv://lexkasa_user:<password>@lexkasa-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **`<password>`** kısmını az önce oluşturduğunuz şifreyle değiştirin
6. Bu URL'yi not edin, birazdan `.env` dosyasına yapıştıracağız

---

## 2. Kodu Sunucunuza İndirme

### 2.1 Kaynak Kodu
Emergent'ten indirdiğiniz ZIP dosyası (`lexkasa-source.zip`) veya GitHub repo'nuzdan:

```bash
# Opsiyon A — GitHub'dan
git clone https://github.com/<kullaniciadiniz>/lexkasa.git
cd lexkasa

# Opsiyon B — ZIP'ten
unzip lexkasa-source.zip -d lexkasa
cd lexkasa
```

### 2.2 Sunucu Gereksinimleri
- **Python 3.11+**
- **Node.js 20+**
- **Yarn** (`npm install -g yarn`)
- (MongoDB **yerel kurulmasına gerek yok** — Atlas kullanıyoruz)

---

## 3. Backend Kurulumu

### 3.1 Python Bağımlılıkları
```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows'ta: venv\Scripts\activate
pip install -r requirements.txt
```

### 3.2 Ortam Değişkenleri
`backend/.env` dosyası oluşturun:

```bash
MONGO_URL="mongodb+srv://lexkasa_user:ŞİFRENİZ@lexkasa-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="lexkasa_db"
CORS_ORIGINS="https://sizin-domain.com,http://localhost:3000"
JWT_SECRET="buraya-rastgele-64-karakter-hex-girin"
ADMIN_EMAIL="admin@sizin-firma.com"
ADMIN_PASSWORD="GÜÇLÜ_ŞİFRE_GİRİN"
```

**JWT_SECRET oluşturmak için:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3.3 Backend'i Başlatma
```bash
# Geliştirme için:
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Prodüksiyon için (önerilen: systemd veya pm2 ile):
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
```

İlk başlatmada otomatik olarak:
- 4 kasa oluşturulur (Merkez, Banka, Emanet, İcra)
- Admin kullanıcı oluşturulur (`.env`'deki bilgilerle)
- MongoDB index'leri ayarlanır

Doğrulama:
```bash
curl http://localhost:8001/api/
# Yanıt: {"service":"LexKasa API","status":"ok"}
```

---

## 4. Frontend Kurulumu

### 4.1 Bağımlılıklar
```bash
cd frontend
yarn install
```

### 4.2 Ortam Değişkeni
`frontend/.env` dosyası oluşturun:

```bash
REACT_APP_BACKEND_URL=https://api.sizin-domain.com
```

**Yerel test için:**
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4.3 Frontend'i Çalıştırma

**Geliştirme modu:**
```bash
yarn start      # http://localhost:3000
```

**Prodüksiyon derlemesi:**
```bash
yarn build
# Çıktı: frontend/build/ klasörü
# Bu klasörü nginx, Apache veya statik hosting ile servis edin
```

---

## 5. Prodüksiyon için Nginx Örneği

`/etc/nginx/sites-available/lexkasa`:

```nginx
# Backend API
server {
    listen 443 ssl http2;
    server_name api.sizin-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.sizin-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sizin-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Frontend
server {
    listen 443 ssl http2;
    server_name sizin-domain.com;

    ssl_certificate /etc/letsencrypt/live/sizin-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sizin-domain.com/privkey.pem;

    root /var/www/lexkasa/frontend/build;
    index index.html;
    try_files $uri /index.html;
}
```

SSL sertifikası için **Let's Encrypt** (ücretsiz):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sizin-domain.com -d api.sizin-domain.com
```

---

## 6. Systemd Servisi (Backend Otomatik Başlatma)

`/etc/systemd/system/lexkasa-backend.service`:

```ini
[Unit]
Description=LexKasa FastAPI Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/lexkasa/backend
Environment="PATH=/var/www/lexkasa/backend/venv/bin"
ExecStart=/var/www/lexkasa/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

Etkinleştirme:
```bash
sudo systemctl enable lexkasa-backend
sudo systemctl start lexkasa-backend
sudo systemctl status lexkasa-backend    # Durum kontrolü
```

---

## 7. MongoDB Atlas Otomatik Yedekleme (ÜCRETLİ — opsiyonel)

M0 (ücretsiz) planda otomatik yedek **yoktur**. Yedek almak için:

### Ücretsiz Alternatif — Manuel Yedekleme Scripti
`/home/lexkasa/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGO_URL" --out="/backup/mongo_$DATE"
# Son 7 yedeği tut
find /backup -maxdepth 1 -type d -name "mongo_*" -mtime +7 -exec rm -rf {} \;
```

Crontab (günlük 03:00):
```bash
0 3 * * * /home/lexkasa/backup.sh
```

---

## 8. Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| `MONGO_URL env var not found` | `backend/.env` dosyası var mı? İçinde `MONGO_URL="..."` yazıyor mu? |
| `Authentication failed` | Atlas'ta kullanıcı adı/şifre doğru mu? Şifrede özel karakter varsa URL-encode edin (`@` → `%40`) |
| `Network timeout` to Atlas | Network Access'te `0.0.0.0/0` izni verildi mi? Sunucunuzun IP'si eklendi mi? |
| Frontend "Network Error" | `REACT_APP_BACKEND_URL` doğru mu? CORS_ORIGINS'de frontend domain'i var mı? |
| `admin@... Giriş başarısız` | Backend ilk başlatıldığında admin seed'lenir. Log'a bakın: `tail -f /var/log/lexkasa-backend.log` |

---

## 9. Alternatif: Vercel + MongoDB Atlas (Daha Kolay)

Sunucu yönetmek istemiyorsanız:

- **Frontend** → Vercel'e deploy (`vercel --prod`)
- **Backend** → Railway, Render veya Fly.io'ya deploy
- **Veritabanı** → MongoDB Atlas M0 (yukarıdaki aynı adımlar)

Üçü de ücretsiz planla başlayabilir, aylık toplam **0 TL** maliyet.

---

## 10. Önemli Notlar

- `.env` dosyalarını **asla** GitHub'a push etmeyin (`.gitignore` zaten korur)
- Admin şifresini (`ADMIN_PASSWORD`) prodüksiyonda **mutlaka güçlü bir şifreyle değiştirin**
- `JWT_SECRET`'ı asla paylaşmayın — token sahteciliğini engeller
- İlk kurulumdan sonra kullanıcı yönetim panelinden ek kullanıcılar ekleyin (ileride eklenecek özellik)

İyi çalışmalar! Takıldığınız yerde Emergent sohbetinden sormaya devam edebilirsiniz. ⚖️
