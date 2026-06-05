import express from "express";
import path from "path";
import cors from "cors";
import Parser from "rss-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

interface RoutineReport {
  id: string;
  timestamp: string;
  hourTitle: string;
  summary: string;
}
let routineReports: RoutineReport[] = [];
let lastReportHour = -1;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  const parser = new Parser();

  let customGeminiApiKey = process.env.GEMINI_API_KEY || "";
  let currentAppPassword = process.env.APP_PASSWORD || "admin123";

  // --- Routine Reports Logic ---
  async function generateRoutineReport() {
    if (!customGeminiApiKey) return;
    
    // Evrensel saat (UTC) üzerinden Türkiye saatini (UTC+3) kesin olarak hesaplıyoruz
    const now = new Date();
    const currentTurkeyHour = (now.getUTCHours() + 3) % 24;
    const previousTurkeyHour = currentTurkeyHour === 0 ? 23 : currentTurkeyHour - 1;
    const formattedHourTitle = `${previousTurkeyHour.toString().padStart(2, '0')}.00 - ${previousTurkeyHour.toString().padStart(2, '0')}.59 Rutin Raporu`;

    try {
      const activeHandles = twitterHandles.filter(h => h.active);
      let texts: string[] = [];
      const fetchPromises = activeHandles.map(async (h) => {
        const cleanHandle = h.handle.replace("@", "");
        try {
          // Trying local Nitter, fallback to public Nitter
          let feed = await parser.parseURL(`http://localhost:8080/${cleanHandle}/rss`)
                           .catch(() => parser.parseURL(`https://nitter.net/${cleanHandle}/rss`));
          
          if (feed?.items) {
             return feed.items.slice(0, 5).map((i: any) => `${h.handle}: ${i.title}`);
          }
        } catch (e) {
          return [];
        }
        return [];
      });

      const results = await Promise.allSettled(fetchPromises);
      results.forEach(res => {
        if(res.status === 'fulfilled' && res.value) {
          texts = texts.concat(res.value);
        }
      });

      if (texts.length === 0) {
        texts = ["Geçtiğimiz saat içerisinde herhangi bir veri akışı tespit edilmedi."];
      }

      const ai = new GoogleGenAI({
        apiKey: customGeminiApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Lütfen şu zaman aralığı için (${formattedHourTitle}) hazırlanan aşağıdaki kaynak gönderileri analiz et ve önemli gelişmeleri Türkçe bir özet halinde maddelerle sun:\n\n${texts.join('\n\n')}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      routineReports.unshift({
        id: Date.now().toString(),
        timestamp: now.toISOString(), // Frontend için gerçek evrensel zamanı kaydediyoruz, frontend bunu kullanıcının yerel saatine (+3 TR) çevirecek.
        hourTitle: formattedHourTitle,
        summary: response.text
      });

      if (routineReports.length > 48) routineReports.pop();
    } catch (e) {
      console.error("Hourly routine report generation failed:", e);
    }
  }

  function startHourlyJob() {
    setInterval(async () => {
      const now = new Date();
      const currentTurkeyHour = (now.getUTCHours() + 3) % 24;
      const m = now.getUTCMinutes();

      // Tam saat başlarında (dakika 00), TR saatiyle 08:00 ile 21:00 arasında çalışır
      if (m === 0 && currentTurkeyHour >= 8 && currentTurkeyHour <= 21 && lastReportHour !== currentTurkeyHour) {
        lastReportHour = currentTurkeyHour;
        await generateRoutineReport();
      }
    }, 60 * 1000); // Check every minute
  }
  startHourlyJob();

  app.get("/api/reports/routine", (req, res) => {
    res.json(routineReports);
  });
  
  // Endpoint to manually trigger the report from UI for testing if needed
  app.post("/api/reports/routine/trigger", async (req, res) => {
    await generateRoutineReport();
    res.json({ success: true, reports: routineReports });
  });
  // --- End Routine Reports Logic ---

  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password === currentAppPassword) {
      res.json({ success: true, token: "merkez-auth-token-valid" });
    } else {
      res.status(401).json({ success: false, error: "Hatalı şifre" });
    }
  });

  app.post("/api/auth/password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (oldPassword === currentAppPassword) {
      currentAppPassword = newPassword;
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Mevcut şifre hatalı" });
    }
  });

  app.get("/api/config/gemini", (req, res) => {
    res.json({ apiKey: customGeminiApiKey });
  });

  app.post("/api/config/gemini", (req, res) => {
    if (req.body.apiKey !== undefined) {
      customGeminiApiKey = req.body.apiKey;
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Missing apiKey" });
    }
  });

  // API to fetch typical RSS feeds (Global/Local news)
  app.get("/api/rss", async (req, res) => {
    const feedUrl = req.query.url as string;
    if (!feedUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    
    try {
      const feed = await parser.parseURL(feedUrl);
      res.json(feed);
    } catch (error: any) {
      // Fallback mock data for the UI
      res.json({
        items: [
          { title: `[BAĞLANTI HATASI] ${new URL(feedUrl).hostname} adresinden güncel veri alınamadı.` },
          { title: "[BİLGİ] İnternet ağı, CORS veya RSS kaynağındaki bir sorun nedeniyle geçici örnek veri gösteriliyor." }
        ]
      });
    }
  });

  // API to fetch Nitter feeds
  // Bypasses CORS by querying a Nitter instance, or returning a static fallback for demo purpose
  // The user requested: "Connect backend proxies to the running local Docker Nitter container (http://localhost:8080)"
  app.get("/api/nitter", async (req, res) => {
    const handle = req.query.handle as string;
    if (!handle) {
      return res.status(400).json({ error: "Missing handle parameter" });
    }
    const cleanHandle = handle.replace("@", "");
    
    try {
      // Try local nitter
      const feedUrl = `http://localhost:8080/${cleanHandle}/rss`;
      const feed = await parser.parseURL(feedUrl);
      res.json(feed);
    } catch (localError: any) {
      try {
        // Fallback to public nitter (might get rate limited but works if local isn't up)
        const feed = await parser.parseURL(`https://nitter.net/${cleanHandle}/rss`);
        res.json(feed);
      } catch (publicError) {
         res.json({
           items: [
             {
               guid: "mock-1",
               title: `${handle} Nitter servisine bağlanılamadı. Bu örnek bir mesajdır. (Localhost:8080 Docker konteynerinizi kontrol edin)`,
               link: "#",
               pubDate: new Date().toISOString(),
               creator: handle
             },
             {
               guid: "mock-2",
               title: "[SİSTEM UYARISI] Yedek Nitter sunucusu da (nitter.net) yanıt vermiyor veya hız sınırına ulaşıldı.",
               link: "#",
               pubDate: new Date(Date.now() - 3600000).toISOString(),
               creator: "System"
             }
           ]
         });
      }
    }
  });

  // AI Summarize API using Gemini
  
  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      if (!customGeminiApiKey) {
        return res.status(400).json({ error: "API anahtarı ayarlanmamış. Lütfen ayarlardan Gemini API anahtarınızı girin." });
      }

      const ai = new GoogleGenAI({
        apiKey: customGeminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const { texts } = req.body;
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: "Gerekli metinler eksik." });
      }

      const prompt = `Aşağıdaki haber metinlerini / sosyal medya gönderilerini okuyup, en önemli güncel olayları özetleyen kısa, maddeler halinde ve Türkçe bir istihbarat raporu hazırla (Haberler İngilizce dahi olsa MUTLAKA TÜRKÇE'YE ÇEVİRMELİSİN):\n\n${texts.join('\n\n')}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      
      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("Gemini AI API Error:", error);
      res.status(500).json({ error: "Yapay zeka özetleme işlemi başarısız oldu: " + error.message });
    }
  });

  let twitterHandles = [
    { id: 't1', handle: '@bursabuyuksehir', active: true },
    { id: 't2', handle: '@AFadbaskanlik', active: true }
  ];

  app.get("/api/twitter-handles", (req, res) => {
    res.json(twitterHandles);
  });

  app.post("/api/twitter-handles", (req, res) => {
    const { handle } = req.body;
    if (!handle) return res.status(400).json({ error: "Handle is required" });
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const newHandle = { id: Date.now().toString(), handle: formattedHandle, active: true };
    twitterHandles.push(newHandle);
    res.json(newHandle);
  });

  app.delete("/api/twitter-handles/:id", (req, res) => {
    twitterHandles = twitterHandles.filter(h => h.id !== req.params.id);
    res.json({ success: true });
  });

  app.put("/api/twitter-handles/:id", (req, res) => {
    const idx = twitterHandles.findIndex(h => h.id === req.params.id);
    if (idx !== -1) {
      twitterHandles[idx] = { ...twitterHandles[idx], ...req.body };
      res.json(twitterHandles[idx]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  // Weather Proxy API
  app.get("/api/weather", async (req, res) => {
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.198&longitude=29.071&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto');
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Weather fetch failed" });
    }
  });

  // Stream Manager API
  let cctvStreams = [
    { id: 'bursa-1', name: 'Orhaneli Kavşağı', url: 'https://player.bursa.bel.tr/?stream=orhanelikavsagi_700', type: 'iframe', active: true },
    { id: 'bursa-2', name: 'Kent Meydanı', url: 'https://player.bursa.bel.tr/?stream=kentmeydani_700', type: 'iframe', active: true },
    { id: 'bursa-3', name: 'Uludağ Yolu', url: 'https://player.bursa.bel.tr/?stream=uludagyolu_700', type: 'iframe', active: true }
  ];

  let youtubeStreams = [
    { id: 'ysf1', name: 'NTV', url: 'pqq5c6k70kk', active: true },
    { id: 'ysf2', name: 'CNN Türk', url: '6N8_r2uwLEc', active: true },
    { id: 'ysf3', name: 'Sözcü', url: 'ztmY_cCtUl0', active: true },
    { id: 'ysf4', name: 'Habertürk', url: 'RNVNlJSUFoE', active: true },
    { id: 'ysf5', name: 'Halk TV', url: '8uNelFh0oz4', active: true },
    { id: 'ysf6', name: 'Haber Global', url: 'EqoCJ8BPxtE', active: true }
  ];

  app.get("/api/streams/:type", (req, res) => {
    res.json(req.params.type === 'cctv' ? cctvStreams : youtubeStreams);
  });

  app.post("/api/streams/:type", (req, res) => {
    const list = req.params.type === 'cctv' ? cctvStreams : youtubeStreams;
    const newStream = { id: Date.now().toString(), active: true, ...req.body };
    list.push(newStream);
    res.json(newStream);
  });

  app.delete("/api/streams/:type/:id", (req, res) => {
    if (req.params.type === 'cctv') {
      cctvStreams = cctvStreams.filter(s => s.id !== req.params.id);
    } else {
      youtubeStreams = youtubeStreams.filter(s => s.id !== req.params.id);
    }
    res.json({ success: true });
  });

  app.put("/api/streams/:type/:id", (req, res) => {
    const list = req.params.type === 'cctv' ? cctvStreams : youtubeStreams;
    const idx = list.findIndex(s => s.id === req.params.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...req.body };
      res.json(list[idx]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
