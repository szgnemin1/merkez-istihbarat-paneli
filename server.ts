import express from "express";
import path from "path";
import cors from "cors";
import Parser from "rss-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { Readable } from "stream";

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
    { id: 'bursa-korupark', name: 'Korupark Kavşağı', url: 'https://player.bursa.bel.tr/?stream=Korupark_700', type: 'iframe', active: true },
    { id: 'bursa-stadyum', name: 'Stadyum Kavşağı', url: 'https://player.bursa.bel.tr/?stream=stadyum_700', type: 'iframe', active: true }
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
  customNitterUrl: "",
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

// Force clean/reset CCTV to have Korupark and Stadyum streams as requested by user
appData.cctvStreams = [
  { id: 'bursa-korupark', name: 'Korupark Kavşağı', url: 'https://player.bursa.bel.tr/?stream=Korupark_700', type: 'iframe', active: true },
  { id: 'bursa-stadyum', name: 'Stadyum Kavşağı', url: 'https://player.bursa.bel.tr/?stream=stadyum_700', type: 'iframe', active: true }
];
saveData();

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

function extractMediaFromRssItem(item: any, nitterUrl: string) {
  const media: { type: 'image' | 'video'; url: string }[] = [];

  // 1. Process enclosures if present
  if (item.enclosure && item.enclosure.url) {
    const type = item.enclosure.type || "";
    const isVideo = type.includes("video") || item.enclosure.url.endsWith(".mp4") || item.enclosure.url.endsWith(".webm");
    let url = item.enclosure.url;
    if (url.startsWith("/")) url = `${nitterUrl}${url}`;
    media.push({
      type: isVideo ? 'video' : 'image',
      url: url
    });
  }
  if (Array.isArray(item.enclosures)) {
    for (const enc of item.enclosures) {
      if (enc && enc.url) {
        const type = enc.type || "";
        const isVideo = type.includes("video") || enc.url.endsWith(".mp4") || enc.url.endsWith(".webm");
        let url = enc.url;
        if (url.startsWith("/")) url = `${nitterUrl}${url}`;
        if (!media.some(m => m.url === url)) {
          media.push({
            type: isVideo ? 'video' : 'image',
            url: url
          });
        }
      }
    }
  }

  // 2. Parse HTML content/description
  const content = item.content || item.description || "";
  if (content && typeof content === "string") {
    // Images
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      let src = match[1];
      if (!src) continue;

      // Filter out system icons/logos/emojis
      if (
        src.includes("nitter_icon") ||
        src.includes("favicon") ||
        src.includes("logo") ||
        src.includes("/avatar/") ||
        src.includes("type=svg") ||
        src.endsWith(".svg") ||
        src.includes("emoji") ||
        src.includes("/syndication/")
      ) {
        continue;
      }

      if (src.startsWith("/")) {
        src = `${nitterUrl}${src}`;
      }
      if (!media.some(m => m.url === src)) {
        media.push({ type: 'image', url: src });
      }
    }

    // Videos
    const videoRegex = /<video[^>]+src=["']([^"']+)["']/gi;
    while ((match = videoRegex.exec(content)) !== null) {
      let src = match[1];
      if (src) {
        if (src.startsWith("/")) src = `${nitterUrl}${src}`;
        if (!media.some(m => m.url === src)) {
          media.push({ type: 'video', url: src });
        }
      }
    }

    const sourceRegex = /<source[^>]+src=["']([^"']+)["']/gi;
    while ((match = sourceRegex.exec(content)) !== null) {
      let src = match[1];
      if (src) {
        if (src.startsWith("/")) src = `${nitterUrl}${src}`;
        if (!media.some(m => m.url === src)) {
          media.push({ type: 'video', url: src });
        }
      }
    }

    // Anchor tags containing video link keywords
    const anchorRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    while ((match = anchorRegex.exec(content)) !== null) {
      let href = match[1];
      if (href) {
        const isVideoUrl = href.includes("/video/") || href.includes("/gif/") || href.endsWith(".mp4") || href.includes("format=mp4");
        if (isVideoUrl) {
          if (href.startsWith("/")) href = `${nitterUrl}${href}`;
          if (!media.some(m => m.url === href)) {
            media.push({ type: 'video', url: href });
          }
        }
      }
    }

    // Capture poster as fallback image
    const posterRegex = /<video[^>]+poster=["']([^"']+)["']/gi;
    while ((match = posterRegex.exec(content)) !== null) {
      let src = match[1];
      if (src) {
        if (src.startsWith("/")) src = `${nitterUrl}${src}`;
        if (!media.some(m => m.url === src)) {
          media.push({ type: 'image', url: src });
        }
      }
    }
  }

  return media;
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

  app.get("/api/config/nitter", (req, res) => {
    res.json({ url: appData.customNitterUrl || "" });
  });

  app.post("/api/config/nitter", (req, res) => {
    if (req.body.url !== undefined) {
      // Normalize: remove trailing slash if any
      let rawUrl = req.body.url.trim();
      if (rawUrl.endsWith("/")) {
        rawUrl = rawUrl.slice(0, -1);
      }
      appData.customNitterUrl = rawUrl;
      saveData();
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Missing url parameter" });
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
  app.get("/api/nitter", async (req, res) => {
    const handle = req.query.handle as string;
    if (!handle) {
      return res.status(400).json({ error: "Missing handle parameter" });
    }
    const cleanHandle = handle.replace("@", "");
    
    // Determine which Nitter URLs to try
    const candidates: string[] = [];
    if (appData.customNitterUrl && appData.customNitterUrl.trim()) {
      candidates.push(appData.customNitterUrl.trim());
    } else {
      candidates.push("http://localhost:8080");
      candidates.push("https://nitter.net");
    }

    let success = false;
    for (const nitterUrl of candidates) {
      try {
        const feedUrl = `${nitterUrl}/${cleanHandle}/rss`;
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
            // Extract media for this tweet
            const extracted = extractMediaFromRssItem(item, nitterUrl);
            (item as any).media = extracted.map(m => ({
              type: m.type,
              url: `/api/twitter-media?url=${encodeURIComponent(m.url)}`
            }));
          }
        }
        res.json(feed);
        success = true;
        break; // Stop parsing since we succeeded
      } catch (err: any) {
        console.warn(`Failed fetching from Nitter candidate ${nitterUrl}:`, err.message);
      }
    }

    if (!success) {
      // Return custom warning mock items
      res.json({
        items: [
          {
            guid: "mock-1",
            title: appData.customNitterUrl 
              ? `${handle} belirtilen özel Nitter sunucunuza bağlanamadı (${appData.customNitterUrl}). Lütfen sunucu adresini veya durumunu kontrol edin.`
              : `${handle} Nitter servisine bağlanılamadı. Bu örnek bir mesajdır. (Localhost:8080 Docker konteynerinizi kontrol edin)`,
            link: "#",
            pubDate: new Date().toISOString(),
            creator: handle,
            media: []
          },
          {
            guid: "mock-2",
            title: appData.customNitterUrl
              ? `[SİSTEM UYARISI] Lütfen "Ayarlar" sekmesinden özel sunucu adresini güncelleyin veya boş bırakarak varsayılan modlara geri dönün.`
              : `[SİSTEM UYARISI] Yedek Nitter sunucusu da (nitter.net) yanıt vermiyor veya hız sınırına ulaşıldı.`,
            link: "#",
            pubDate: new Date(Date.now() - 3600000).toISOString(),
            creator: "System",
            media: []
          }
        ]
      });
    }
  });

  // Proxy endpoint for Twitter/Nitter media to solve CORS and direct access issues
  // Optimized with Range headers forwarding for smooth audio/video streaming in standard Web players
  app.get("/api/twitter-media", async (req, res) => {
    const mediaUrl = req.query.url as string;
    if (!mediaUrl) {
      return res.status(400).send("Missing url");
    }
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Propagation of client range headers is critical for iOS/Chrome HTML5 video playback and seek operations (CORS/Buffered streaming)
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const response = await fetch(mediaUrl, { headers });
      
      // We accept 200 OK and 206 Partial Content as successful streaming headers
      if (!response.ok && response.status !== 206) {
        return res.status(response.status).send(`Proxy error: ${response.statusText}`);
      }

      // Propagate crucial streaming headers back to the browser
      const headersToForward = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control'
      ];
      for (const h of headersToForward) {
        const val = response.headers.get(h);
        if (val) {
          res.setHeader(h, val);
        }
      }

      // If range header was used or target answered 206, enforce 206 Partial Content status response
      if (response.status === 206 || req.headers.range) {
        res.status(206);
      } else {
        res.status(response.status);
      }

      if (response.body) {
        Readable.from(response.body as any).pipe(res);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.error("Media proxy fail for url:", mediaUrl, err);
      res.status(500).send("Proxy fail");
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
        // Stream chunk piping for video segments with direct piping to bypass buffer loading delays
        const contentType = response.headers.get("content-type");
        const contentLength = response.headers.get("content-length");
        if (contentType) res.setHeader("Content-Type", contentType);
        if (contentLength) res.setHeader("Content-Length", contentLength);

        // Pipe directly if the fetch body is a ReadableStream (native in newer Node standards)
        if (response.body) {
          Readable.from(response.body as any).pipe(res);
        } else {
          const arrayBuffer = await response.arrayBuffer();
          res.send(Buffer.from(arrayBuffer));
        }
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
