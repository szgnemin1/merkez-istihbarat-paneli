# Merkez İstihbarat ve İzleme Paneli (Command Center Dashboard)

Gelişmiş, modern ve karanlık tema (dark mode) odaklı, güvenlik, istihbarat ve operasyonel takip amacıyla tasarlanmış bir komuta merkezi (Command Center) web uygulamasıdır. 

React, Vite ve Tailwind CSS altyapısı üzerine inşa edilen bu proje, modüler bir yapıya sahip olup dış kaynaklardan veri çekerek tek bir panoda toplar. Aynı zamanda Gemini API entegrasyonu ile haber ve sosyal medya verilerini analiz ederek Türkçe istihbarat özetleri üretir.

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

## 🛠️ Kullanılan Teknolojiler Modülü

- **Framework:** React 19 + TypeScript + Vite
- **Stil & Tasarım:** Tailwind CSS (Modern karanlık "Cosmic Slate" teması)
- **Haritalama & Grafikler:** Recharts (Sıcaklık eğilim grafikleri), Lucide-React (Vektörel İkonlar)
- **API ve AI:** Google Gemini AI (Veri analizi ve özetleme), Open-Meteo (Hava Durumu)
- **Sunucu / Backend Proxy:** Node.js + Express + Vite Middleware (Cors ve Esbuild destekli full-stack yapı)

## 📦 Kurulum

Projeyi yerel ortamınızda (local) çalıştırmak için aşağıdaki adımları izleyebilirsiniz.

1. **Depoyu Klonlayın:**
   ```bash
   git clone <repo-url>
   cd <project-folder>
   ```

2. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

3. **Çevre Değişkenlerini (Environment Variables) Ayarlayın:**
   Proje ana dizininde `.env` adında bir dosya oluşturun ve Google Gemini API anahtarınızı ekleyin:
   ```env
   GEMINI_API_KEY=sizin_gizli_api_anahtariniz
   ```

4. **Geliştirme Sunucusunu Başlatın:**
   ```bash
   npm run dev
   ```
   Bu komut sunucuyu `http://localhost:3000` adresinde başlatacaktır.

5. **Production Build (Opsiyonel):**
   ```bash
   npm run build
   npm start
   ```

## 📂 Klasör Yapısı

- `src/components/`: Bütün UI bileşenleri (Clock, WeatherForecast, Streams, SocialTab vb.) buradadır.
- `src/App.tsx`: Ana sayfa, state yönetimi ve sekmeler arası gezinme (Merkez, CCTV, Yayınlar, Analiz) yapısı.
- `server.ts`: Express backend sunucusu. Gemini API proxy ve dış ağ isteklerini yönetir.
- `index.html` & `src/main.tsx`: React uygulama başlatıcıları.

## 🤝 Katkıda Bulunma

Hata bildirimleri (issues) oluşturabilir veya yeni özellik talepleriniz için PR (Pull Request) gönderebilirsiniz. 

## 📝 Lisans

Bu proje MIT lisansı altında paylaşılmaktadır.
