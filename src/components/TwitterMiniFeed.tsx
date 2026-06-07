import { useState, useEffect } from 'react';
import { Twitter, RefreshCw, AlertCircle, List, Languages, Image, Video, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface Tweet {
  guid: string;
  title: string;
  originalTitle?: string;
  isTranslated?: boolean;
  link: string;
  pubDate: string;
  creator: string;
  media?: MediaItem[];
}

interface Handle {
  id: string;
  handle: string;
  active: boolean;
}

export function TwitterMiniFeed() {
  const [handles, setHandles] = useState<Handle[]>([]);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTweet, setSelectedTweet] = useState<Tweet | null>(null);

  const fetchHandles = async () => {
    try {
      const res = await fetch('/api/twitter-handles');
      const data = await res.json();
      setHandles(data);
      return data as Handle[];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const fetchTweets = async (activeList: Handle[], silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      let allTweets: Tweet[] = [];
      const fetchPromises = activeList.filter(h => h.active).map(async (h) => {
        const response = await fetch(`/api/nitter?handle=${h.handle}`);
        if (!response.ok) return [];
        const feed = await response.json();
        if (feed && feed.items) {
           return feed.items.slice(0, 8).map((item: any) => ({
             guid: item.guid || item.id || Math.random().toString(),
             title: item.title,
             originalTitle: item.originalTitle || item.title,
             isTranslated: item.isTranslated || false,
             link: item.link,
             pubDate: item.pubDate,
             creator: item.creator || h.handle,
             media: item.media || []
           }));
        }
        return [];
      });

      const results = await Promise.allSettled(fetchPromises);
      results.forEach(res => {
         if (res.status === 'fulfilled') {
            allTweets = [...allTweets, ...res.value];
         }
      });
      
      allTweets.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setTweets(allTweets.slice(0, 20)); // Keep a compact list of top 20
    } catch (err: any) {
      setError(err.message || "Bağlantı Hatası");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const initFeed = async () => {
     const data = await fetchHandles();
     await fetchTweets(data);
  };

  useEffect(() => {
    initFeed();
    const interval = setInterval(() => {
       fetchHandles().then(data => fetchTweets(data, true));
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative shadow-md">
      {/* Mini Title bar */}
      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 shrink-0 z-20">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-blue-500/10 text-blue-400">
            <Twitter className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-white tracking-wider text-[10px] uppercase">GÜNCEL SOSYAL AKIŞ</span>
        </div>
        <div className="flex items-center space-x-1.5">
           <button 
             onClick={() => setAutoTranslate(!autoTranslate)} 
             className={`p-1 rounded transition-colors ${autoTranslate ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
             title="Çeviri Aç/Kapa"
           >
             <Languages className="w-3.5 h-3.5" />
           </button>
           <button 
             onClick={() => fetchTweets(handles)} 
             disabled={loading}
             className="text-slate-500 hover:text-white transition-colors disabled:opacity-50 p-1 rounded hover:bg-slate-800"
             title="Yenile"
           >
             <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30">
         {loading && tweets.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-8">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-[9px] font-medium tracking-wider uppercase text-slate-500">Akış Yükleniyor</span>
           </div>
         ) : error && tweets.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-red-500 text-center p-3">
             <AlertCircle className="w-4 h-4 mb-1.5 opacity-60 text-red-400" />
             <span className="text-[10px] text-red-400 font-medium leading-tight">{error}</span>
           </div>
         ) : tweets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-1.5 py-8">
               <List className="w-5 h-5 opacity-20" />
               <span className="text-[10px]">Akış bulunamadı</span>
            </div>
         ) : (
           <div className="flex-1 overflow-y-auto p-2 space-y-2 select-none">
              {tweets.map(tweet => {
                const displayTitle = autoTranslate && tweet.isTranslated ? tweet.title : (tweet.originalTitle || tweet.title);
                return (
                  <div 
                    key={tweet.guid} 
                    onClick={() => setSelectedTweet(tweet)}
                    className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 cursor-pointer transition-all duration-200"
                  >
                     <div className="flex justify-between items-center text-[8px] uppercase tracking-wider text-slate-500 mb-1.5">
                       <div className="flex items-center gap-1.5 truncate">
                         <span className="font-mono text-blue-400 font-semibold px-1 py-0.5 bg-blue-500/5 rounded truncate max-w-[90px]">{tweet.creator}</span>
                         {tweet.isTranslated && autoTranslate && (
                           <span className="px-1 rounded text-[7px] font-bold bg-indigo-500/10 text-indigo-400">TR</span>
                         )}
                       </div>
                       <span className="shrink-0">{tweet.pubDate ? formatDistanceToNow(new Date(tweet.pubDate), { addSuffix: true, locale: tr }) : ''}</span>
                     </div>
                     <p className="text-xs text-slate-300 leading-normal line-clamp-2" dangerouslySetInnerHTML={{ __html: displayTitle }}></p>
                     
                     {tweet.media && tweet.media.length > 0 && (
                       <div className="mt-1.5 flex flex-wrap gap-1 pointer-events-none">
                         {(tweet.media.filter(m => m.type === 'image').length > 0) && (
                           <span className="inline-flex items-center gap-1 text-[7px] uppercase tracking-wider text-sky-400 bg-sky-500/5 px-1 py-0.5 rounded border border-sky-500/10 font-bold whitespace-nowrap">
                             <Image className="w-2 h-2" />
                             Görsel
                           </span>
                         )}
                         {(tweet.media.filter(m => m.type === 'video').length > 0) && (
                           <span className="inline-flex items-center gap-1 text-[7px] uppercase tracking-wider text-amber-400 bg-amber-500/5 px-1 py-0.5 rounded border border-amber-500/10 font-bold whitespace-nowrap">
                             <Video className="w-2 h-2" />
                             Video
                           </span>
                         )}
                       </div>
                     )}
                  </div>
                );
              })}
           </div>
         )}
      </div>

      {/* Detailed Modal popup identical to Main social tab */}
      {selectedTweet && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center space-x-1.5">
                <div className="p-1 px-2 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold uppercase">
                  {selectedTweet.creator}
                </div>
                {selectedTweet.isTranslated && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-indigo-500/15 text-indigo-400">
                    tr çeviri
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedTweet(null)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold font-mono">
                Gönderi Zamanı: {selectedTweet.pubDate ? new Date(selectedTweet.pubDate).toLocaleString('tr-TR') : 'Bilinmeyen'}
              </div>

              <p className="text-sm text-slate-200 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: autoTranslate && selectedTweet.isTranslated ? selectedTweet.title : (selectedTweet.originalTitle || selectedTweet.title) }}></p>

              {selectedTweet.originalTitle && selectedTweet.originalTitle !== selectedTweet.title && (
                <div className="p-2.5 bg-slate-950/40 rounded border border-slate-850 text-[11px] text-slate-400">
                  <div className="font-semibold mb-0.5 uppercase tracking-wider text-[8px] text-slate-500 font-mono">Orijinal Gönderi:</div>
                  <p className="italic">{selectedTweet.originalTitle}</p>
                </div>
              )}

              {selectedTweet.media && selectedTweet.media.length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-2 font-mono">MEDYA / EKLER ({selectedTweet.media.length})</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selectedTweet.media.map((med, idx) => {
                      if (med.type === 'video') {
                        return (
                          <div key={idx} className="relative rounded overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                            <video 
                              src={med.url} 
                              controls 
                              playsInline
                              muted
                              preload="metadata"
                              className="w-full max-h-[220px] object-contain"
                            />
                            <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-amber-500/90 text-[7px] font-bold text-slate-950 uppercase tracking-widest font-mono pointer-events-none">
                              VİDEO
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx} className="relative rounded overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                            <img 
                              src={med.url} 
                              alt="Twitter Medya"
                              className="w-full max-h-[220px] object-contain"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-sky-500/90 text-[7px] font-bold text-white uppercase tracking-widest font-mono pointer-events-none">
                              GÖRSEL
                            </span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950/20 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
              <span>
                {selectedTweet.link && selectedTweet.link !== '#' && (
                  <a 
                    href={selectedTweet.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:underline font-semibold"
                  >
                    Kaynak Akış Adresi &rarr;
                  </a>
                )}
              </span>
              <button 
                onClick={() => setSelectedTweet(null)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold tracking-wider uppercase transition-colors"
              >
                KAPAT
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
