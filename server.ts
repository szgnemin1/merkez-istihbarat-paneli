import express from "express";
import path from "path";
import cors from "cors";
import Parser from "rss-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

interface RoutineReport {
  id: string;
  timestamp: string;
  hourTitle: string;
  summary: string;
}

const DATA_FILE = path.join(process.cwd(), 'data.json');
let appData = {
  routineReports: [] as RoutineReport[],
  latestSummary: "",
  translations: {} as Record<string, string>,
  twitterHandles: [
    { id: 't1', handle: '@bursabuyuksehir', active: true },
    { id: 't2', handle: '@AFadbaskanlik', active: true }
  ],
  cctvStreams: [
    { id: 'bursa-1', name: 'Orhaneli Kavşağı', url: 'https://player.bursa.bel.tr/?stream=orhanelikavsagi_700', type: 'iframe', active: true },
    { id: 'bursa-2', name: 'Kent Meydanı', url: 'https://player.bursa.bel.tr/?stream=kentmeydani_700', type: 'iframe', active: true },
    { id: 'bursa-3', name: 'Uludağ Yolu', url: 'https://player.bursa.bel.tr/?stream=uludagyolu_700', type: 'iframe', active: true }
  ],
  youtubeStreams: [
    { id: 'ysf1', name: 'NTV', url: 'pqq5c6k70kk', active: true },
    { id: 'ysf2', name: 'CNN Türk', url: '6N8_r2uwLEc', active: true },
    { id: 'ysf3', name: 'Sözcü', url: 'ztmY_cCtUl0', active: true },
    { id: 'ysf4', name: 'Habertürk', url: 'RNVNlJSUFoE', active: true },
    { id: 'ysf5', name: 'Halk TV', url: '8uNelFh0oz4', active: true },
    { id: 'ysf6', name: 'Haber Global', url: 'EqoCJ8BPxtE', active: true }
  ],
  customGeminiApiKey: process.env.GEMINI_API_KEY || "",
  currentAppPassword: process.env.APP_PASSWORD || "admin123"
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(fileContent);
    appData = { ...appData, ...parsed };
    appData.translations = appData.translations || {};
  } catch (e) {
    console.error("Data file load error", e);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf-8');
  } catch (e) {
    console.error("Data file save error", e);
  }
}

async function translateToTurkish(text: string): Promise<string> {
  if (!text || typeof text !== "string") return text;
  
  const cleanText = text.replace(/<[^>]*>/g, "").trim();
  if (!cleanText) return text;

  if (appData.translations && appData.translations[cleanText]) {
    return appData.translations[cleanText];
  }

  if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
    return text;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(cleanText)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (response.ok) {
      const result = await response.json();
      if (result && result[0]) {
        const translated = result[0].map((item: any) => item[0]).join("").trim();
        if (translated) {
          appData.translations[cleanText] = translated;
          saveData();
          return translated;
        }
      }
    }
  } catch (error) {
    console.error("Translate error:", error);
  }
  return text;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(cors());
  app.use(express.json());

  const parser = new Parser();
  // --- End Routine Reports Logic ---

  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password === appData.currentAppPassword) {
      res.json({ success: true, token: "merkez-auth-token-valid" });
    } else {
      res.status(401).json({ success: false, error: "Hatalı şifre" });
    }
  });

  app.post("/api/auth/password", (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (oldPassword === appData.currentAppPassword) {
      appData.currentAppPassword = newPassword;
      saveData();
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: "Mevcut şifre hatalı" });
    }
  });

  app.get("/api/config/gemini", (req, res) => {
    const isSet = !!appData.customGeminiApiKey;
    const masked = isSet && appData.customGeminiApiKey.length > 10 
      ? appData.customGeminiApiKey.substring(0, 6) + "..." + appData.customGeminiApiKey.slice(-4) 
      : (isSet ? "Kayıtlı Anahtar" : "");
    res.json({ isSet, masked });
  });

  app.post("/api/config/gemini", (req, res) => {
    if (req.body.apiKey !== undefined) {
      appData.customGeminiApiKey = req.body.apiKey;
      saveData();
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
      if (feed && feed.items) {
        for (const item of feed.items) {
          if (item.title) {
            const original = item.title;
            const translated = await translateToTurkish(item.title);
            item.originalTitle = original;
            item.title = translated;
            item.isTranslated = original.trim() !== translated.trim();
          }
        }
      }
      res.json(feed);
    } catch (localError: any) {
      try {
        // Fallback to public nitter (might get rate limited but works if local isn't up)
        const feedUrl = `https://nitter.net/${cleanHandle}/rss`;
        const feed = await parser.parseURL(feedUrl);
        if (feed && feed.items) {
          for (const item of feed.items) {
            if (item.title) {
              const original = item.title;
              const translated = await translateToTurkish(item.title);
              item.originalTitle = original;
              item.title = translated;
              item.isTranslated = original.trim() !== translated.trim();
            }
          }
        }
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
      if (!appData.customGeminiApiKey) {
        return res.status(400).json({ error: "API anahtarı ayarlanmamış. Lütfen ayarlardan Gemini API anahtarınızı girin." });
      }

      const ai = new GoogleGenAI({
        apiKey: appData.customGeminiApiKey,
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
      
      const generatedText = response.text || "";
      appData.latestSummary = generatedText;
      saveData();

      res.json({ summary: generatedText });
    } catch (error: any) {
      console.error("Gemini AI API Error:", error);
      res.status(500).json({ error: "Yapay zeka özetleme işlemi başarısız oldu: " + error.message });
    }
  });

  // GET the latest saved summary
  app.get("/api/gemini/latest-summary", (req, res) => {
    res.json({ summary: appData.latestSummary || "" });
  });

  app.get("/api/twitter-handles", (req, res) => {
    res.json(appData.twitterHandles);
  });

  app.post("/api/twitter-handles", (req, res) => {
    const { handle } = req.body;
    if (!handle) return res.status(400).json({ error: "Handle is required" });
    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const newHandle = { id: Date.now().toString(), handle: formattedHandle, active: true };
    appData.twitterHandles.push(newHandle);
    saveData();
    res.json(newHandle);
  });

  app.delete("/api/twitter-handles/:id", (req, res) => {
    appData.twitterHandles = appData.twitterHandles.filter(h => h.id !== req.params.id);
    saveData();
    res.json({ success: true });
  });

  app.put("/api/twitter-handles/:id", (req, res) => {
    const idx = appData.twitterHandles.findIndex(h => h.id === req.params.id);
    if (idx !== -1) {
      appData.twitterHandles[idx] = { ...appData.twitterHandles[idx], ...req.body };
      saveData();
      res.json(appData.twitterHandles[idx]);
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

  // Stream CORS and Referer bypass Proxy API
  app.get("/api/stream-proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("url parameter is required");
    }

    try {
      const isPlaylist = targetUrl.toLowerCase().includes(".m3u8") || targetUrl.toLowerCase().includes("m3u8");
      const parsedTarget = new URL(targetUrl);
      
      const reqHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': parsedTarget.origin + '/',
        'Origin': parsedTarget.origin
      };

      const response = await fetch(targetUrl, { headers: reqHeaders });
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch media resource: ${response.statusText}`);
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Content-Disposition", "inline");

      if (isPlaylist) {
        const text = await response.text();
        const lines = text.split("\n");
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return line;

          // Replace URI attributes inside tag lines (handles quotes dynamically or lack thereof)
          if (trimmed.startsWith("#")) {
            return trimmed.replace(/URI=(["']?)([^"'\s,]+)\1/g, (match, quote, p1) => {
              try {
                const absolute = new URL(p1, targetUrl).href;
                return `URI=${quote}/api/stream-proxy?url=${encodeURIComponent(absolute)}${quote}`;
              } catch {
                return match;
              }
            });
          }

          // Directly rewrite segment/sub-playlist path lines
          try {
            const absolute = new URL(trimmed, targetUrl).href;
            return `/api/stream-proxy?url=${encodeURIComponent(absolute)}`;
          } catch {
            return line;
          }
        });

        res.setHeader("Content-Type", "application/x-mpegURL");
        return res.send(rewrittenLines.join("\n"));
      } else {
        // Stream chunk piping for video segments (buffer-based for absolute server environment safety)
        const contentType = response.headers.get("content-type");
        const contentLength = response.headers.get("content-length");
        if (contentType) res.setHeader("Content-Type", contentType);
        if (contentLength) res.setHeader("Content-Length", contentLength);

        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (error: any) {
      console.error("Stream Proxy Error:", error);
      res.status(500).send("Proxy error: " + error.message);
    }
  });

  // Stream Manager API
  app.get("/api/streams/:type", (req, res) => {
    res.json(req.params.type === 'cctv' ? appData.cctvStreams : appData.youtubeStreams);
  });

  app.post("/api/streams/:type", (req, res) => {
    const isCctv = req.params.type === 'cctv';
    const list = isCctv ? appData.cctvStreams : appData.youtubeStreams;
    const newStream = { id: Date.now().toString(), active: true, ...req.body };
    list.push(newStream);
    saveData();
    res.json(newStream);
  });

  app.delete("/api/streams/:type/:id", (req, res) => {
    if (req.params.type === 'cctv') {
      appData.cctvStreams = appData.cctvStreams.filter(s => s.id !== req.params.id);
    } else {
      appData.youtubeStreams = appData.youtubeStreams.filter(s => s.id !== req.params.id);
    }
    saveData();
    res.json({ success: true });
  });

  app.put("/api/streams/:type/:id", (req, res) => {
    const isCctv = req.params.type === 'cctv';
    const list = isCctv ? appData.cctvStreams : appData.youtubeStreams;
    const idx = list.findIndex(s => s.id === req.params.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...req.body };
      saveData();
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
