import { useState, useEffect } from 'react';
import { Rss, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RSS_FEEDS = [
  { name: 'AFAD Son Depremler', url: 'http://deprem.afad.gov.tr/apiv2/event/rss' },
  { name: 'TRT Haber Yurt', url: 'https://www.trthaber.com/yurt_articles.rss' },
];

interface TickerItem {
  title: string;
  source: string;
}

export function RssTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAllFeeds = async () => {
      try {
        const promises = RSS_FEEDS.map(async (feed) => {
          const res = await fetch(`/api/rss?url=${encodeURIComponent(feed.url)}`);
          if (!res.ok) return [];
          const data = await res.json();
          if (data.items) {
            return data.items.slice(0, 5).map((item: any) => ({
              title: item.title,
              source: feed.name
            }));
          }
          return [];
        });

        const results = await Promise.all(promises);
        const allItems = results.flat().sort(() => 0.5 - Math.random()); // Shuffle
        setItems(allItems);
        setError(false);
      } catch (err) {
        console.error("RSS Ticker Fetch Error:", err);
        setError(true);
      }
    };

    fetchAllFeeds();
    const interval = setInterval(fetchAllFeeds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center h-10 shadow-sm relative">
      <div className="flex items-center justify-center px-3 shrink-0 transition-opacity z-10 border-r border-slate-800 bg-red-500/10 h-full">
        <div className="relative flex h-1.5 w-1.5 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
        </div>
        <span className="text-red-400 font-semibold text-[9px] tracking-widest uppercase">SON DAKİKA</span>
      </div>
      
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10"></div>
        {error ? (
          <div className="flex items-center text-red-400 text-xs px-4">
             <AlertTriangle className="w-3.5 h-3.5 mr-2" />
             RSS Akışları alınamadı.
          </div>
        ) : items.length > 0 ? (
          <motion.div 
            className="flex whitespace-nowrap items-center px-4 h-full"
            animate={{ x: ["100%", "-100%"] }}
            transition={{
              repeat: Infinity,
              duration: 35,
              ease: "linear"
            }}
          >
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center text-slate-300 text-xs mx-6 shrink-0">
                <span className="font-mono text-indigo-400/80 mr-2 border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 rounded">[{item.source}]</span>
                <span className="tracking-wide text-slate-200">{item.title}</span>
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="text-slate-500 text-xs px-4 flex items-center gap-2">
             <div className="w-3 h-3 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
             Veri Bekleniyor...
          </div>
        )}
      </div>
    </div>
  );
}
