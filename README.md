# Merkez İstihbarat ve İzleme Paneli (Command Center Dashboard)

Gelişmiş, modern ve karanlık tema (dark mode) odaklı, güvenlik, istihbarat ve operasyonel takip amacıyla tasarlanmış bir komuta merkezi (Command Center) web uygulamasıdır. 

React, Vite ve Tailwind CSS altyapısı üzerine inşa edilen bu proje, modüler bir yapıya sahip olup dış kaynaklardan veri çekerek tek bir panoda toplar. Aynı zamanda Gemini API entegrasyonu ile haber ve sosyal medya verilerini analiz ederek Türkçe istihbarat özetleri üretir.

**Depo Adresi:** [https://github.com/szgnemin1/merkez-istihbarat-paneli](https://github.com/szgnemin1/merkez-istihbarat-paneli)

## 🚀 Özellikler

- **🏠 Merkez (Ana Sayfa):** 
  - Gerçek zamanlı yüksek hassasiyetli saat gösterimi.
  - Anlık hava durumu (Open-Meteo bağlantılı).
  - Recharts destekli detaylı 7 Günlük Sıcaklık Eğilimi ve tahmin grafiği.
  - Operatör Alarm bileşeni ve gizli "sistem girişi" sürprizi.
  
- **📹 CCTV İzleme:** 
  - Belirlenen IP/CCTV kameralarının veya video akışlarının canlı izlenmesine olanak tanıyan grid (ızgara) yapısı.

- **📡 Yayınlar:**
  - Önemli haber kanallarının veya belirlenmiş canlı yayın alanlarının toplu şekilde izlenebileceği sekme.

- **🤖 Analiz (Yapay Zeka Destekli):**
  - **Gemini AI Entegrasyonu:** Sosyal medya gönderileri (Tweetler vs.) ve haber metinlerini işleyerek (diğer dillerden de olsa) en önemli olayları Türkçe ve maddeler halinde özetleyen otomatik zeka raporlama (İstihbarat) altyapısı.

- **⚙️ Ayarlar:**
  - Platform üzerinden kolayca Gemini API anahtarını girip kayıt edebilme imkanı. Dilerseniz arayüz üzerinden yapay zeka modelini projenize entegre edebilirsiniz.

## 🛠️ Kullanılan Teknolojiler Modülü

- **Framework:** React 19 + TypeScript + Vite
- **Stil & Tasarım:** Tailwind CSS (Modern karanlık "Cosmic Slate" teması)
- **Haritalama & Grafikler:** Recharts (Sıcaklık eğilim grafikleri), Lucide-React (Vektörel İkonlar)
- **API ve AI:** Google Gemini AI (Veri analizi ve özetleme), Open-Meteo (Hava Durumu)
- **Sunucu / Backend Proxy:** Node.js + Express + Vite Middleware (Cors ve Esbuild destekli full-stack yapı)

## 📦 Kurulum Rehberi (Adım Adım)

Projeyi bilgisayarınızda çalıştırmak için aşağıdaki adımları sırasıyla uygulayın. Bilgisayarınızda [Node.js](https://nodejs.org/) (tercihen v18 veya üstü) yüklü olmalıdır.

### Adım 1: Projeyi Bilgisayarınıza Klonlayın
Terminal (CMD/PowerShell) veya komut satırını açıp projeyi indirin:
```bash
git clone https://github.com/szgnemin1/merkez-istihbarat-paneli.git
```

### Adım 2: Proje Klasörüne Girin
```bash
cd merkez-istihbarat-paneli
```

### Adım 3: Gerekli Paketleri ve Bağımlılıkları Yükleyin
Projenin çalışması için gereken tüm NPM kütüphanelerini indirin (bu işlem internet hızınıza bağlı olarak 1-2 dakika sürebilir):
```bash
npm install
```

### Adım 4: Ortam Değişkenlerini (Environment Variables) Ayarlayın
Proje kök dizininde `.env` adında bir dosya oluşturun. İçerisine sistemde kullanacağınız ayarları ve çalışmasını istediğiniz portu girin (VPS üzerinde 1963 portunda çalışması için `PORT=1963` ekleyin):
```env
# Örnek .env dosyası içeriği
GEMINI_API_KEY=sizin_gizli_api_anahtariniz
PORT=1963
```

### Adım 5: Geliştirme (Development) Sunucusunu Başlatın
Uygulamayı geliştirme modunda çalıştırmak için aşağıdaki komutu girin:
```bash
npm run dev
```
Terminalde sunucunun başladığını göreceksiniz. Tarayıcınızdan `http://localhost:1963` adresine giderek istihbarat paneline erişebilirsiniz.

### Adım 6: VPS İçin Canlı (Production) Ortamda Başlatma
Projenin bir VPS üzerinde arka planda (daemon olarak) kesintisiz, 1963 portu ile production modunda çalışmasını sağlamak için Process Manager (örneğin PM2) kullanmanız önerilir.

Her çalıştırmada mükerrer (çift) PM2 süreci oluşmasını önlemek için, eğer varsa eski süreci silip yenisini temiz bir şekilde başlatabilir veya var olanı reload edebilirsiniz:

```bash
# İlk olarak projeyi VPS üzerinde derleyin:
npm run build

# PM2 yüklü değilse yükleyin:
npm install -g pm2

# Varsa eski süreci silin ve uygulamayı PM2 ile 1963 portunda temizce başlatın:
pm2 delete merkez-istihbarat 2>/dev/null || true
PORT=1963 pm2 start npm --name "merkez-istihbarat" -- start
```
Bu komutların ardından siteniz VPS'in IP adresinde `http://vps-ip-adresiniz:1963` üzerinde canlı yayında olacaktır.

### Adım 7: Projeyi Güncelleme (Yeni Versiyonu Çekme)
Eğer GitHub deposunda yeni bir kod güncellemesi (commit) yapıldıysa ve bu yeni özellikleri veya hata düzeltmelerini sunucunuza/bilgisayarınıza çekmek istiyorsanız aşağıdaki komutları kullanabilirsiniz:

```bash
# Değişiklikleri GitHub'dan çekin
git pull origin main

# Eğer yeni bir özellik (paket) eklendiyse yükleyin
npm install

# Projeyi güncel haliyle derleyin
npm run build

# PM2 ile çalışıyorsanız uygulamayı yeniden başlatın
pm2 restart merkez-istihbarat
```

## 📂 Klasör Yapısı

- `src/components/`: Bütün UI bileşenleri (Clock, WeatherForecast, Streams, SocialTab, SettingsTab vb.) buradadır.
- `src/App.tsx`: Ana sayfa, state yönetimi ve sekmeler arası gezinme (Merkez, CCTV, Yayınlar, Analiz, Ayarlar) yapısını barındırır.
- `server.ts`: Express backend sunucusu. Gemini proxy, konfigürasyon sistemi ve dış ağ isteklerini yönetir.
- `index.html` & `src/main.tsx`: React uygulama başlatıcıları ve kök dosyalar.

## 🤝 Katkıda Bulunma

Hata bildirimleri (issues) oluşturabilir veya yeni özellik talepleriniz için [GitHub Deposu](https://github.com/szgnemin1/merkez-istihbarat-paneli) üzerinden PR (Pull Request) gönderebilirsiniz. 

## 📝 Lisans

Bu proje özgür ve açık kaynak kodlu olarak geliştirilmiştir. (MIT)
