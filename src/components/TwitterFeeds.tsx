import { useState, useEffect } from 'react';
import { Twitter, RefreshCw, AlertCircle, Plus, Trash2, Power, EyeOff, Loader2, Settings, List, Languages } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Tweet {
  guid: string;
  title: string;
  originalTitle?: string;
  isTranslated?: boolean;
  link: string;
  pubDate: string;
  creator: string;
}

interface Handle {
  id: string;
  handle: string;
  active: boolean;
}

export function TwitterFeeds() {
  const [handles, setHandles] = useState<Handle[]>([]);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchHandles = async () => {
    const res = await fetch('/api/twitter-handles');
    const data = await res.json();
    setHandles(data);
    return data as Handle[];
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
           return feed.items.slice(0, 15).map((item: any) => ({
             guid: item.guid || item.id || Math.random().toString(),
             title: item.title,
             originalTitle: item.originalTitle || item.title,
             isTranslated: item.isTranslated || false,
             link: item.link,
             pubDate: item.pubDate,
             creator: item.creator || h.handle
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
      setTweets(allTweets);
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle) return;
    setAdding(true);
    try {
      await fetch('/api/twitter-handles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: newHandle })
      });
      setNewHandle('');
      initFeed();
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`/api/twitter-handles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current })
    });
    initFeed();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/twitter-handles/${id}`, { method: 'DELETE' });
    initFeed();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Twitter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white tracking-wider text-xs uppercase">BİRLEŞTİRİLMİŞ HABER AKIŞI</h3>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           {/* Auto-Translate Toggle Button */}
           <button 
             onClick={() => setAutoTranslate(!autoTranslate)} 
             className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${autoTranslate ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:text-white border border-slate-800 bg-slate-950/20'}`}
             title="Yabancı Gönderileri Türkçe'ye Çevir"
           >
             <Languages className="w-3.5 h-3.5" />
             <span>TR Çeviri</span>
             <span className={`w-1.5 h-1.5 rounded-full ${autoTranslate ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]' : 'bg-slate-600'}`}></span>
           </button>

           <button 
             onClick={() => setShowSettings(!showSettings)} 
             className={`p-1.5 rounded-md transition-colors ${showSettings ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
             title="Kaynak Yönetimi"
           >
             <Settings className="w-3.5 h-3.5" />
           </button>
           <button 
             onClick={() => fetchTweets(handles)} 
             disabled={loading}
             className="text-slate-500 hover:text-white transition-colors disabled:opacity-50 p-1.5 rounded-md hover:bg-slate-800"
             title="Yenile"
           >
             <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {showSettings ? (
        <div className="flex-1 flex flex-col p-4 bg-slate-900/95 z-10 transition-all overflow-hidden h-full">
            <h4 className="text-xs font-medium text-slate-400 tracking-widest uppercase mb-3 border-b border-slate-800 pb-2">Kaynak Hesapları Yönet</h4>
            <form onSubmit={handleAdd} className="flex gap-2 mb-4 shrink-0">
               <input 
                 type="text" 
                 placeholder="@kullanici_adi" 
                 value={newHandle} 
                 onChange={e => setNewHandle(e.target.value)} 
                 required 
                 className="flex-1 bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" 
               />
               <button type="submit" disabled={adding} className="bg-blue-600/20 text-blue-400 border border-blue-500/50 hover:bg-blue-600/30 px-4 rounded-lg text-xs font-medium tracking-wide flex justify-center items-center">
                 {adding ? <Loader2 className="w-4 h-4 animate-spin"/> : 'EKLE'}
               </button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
               {handles.length === 0 ? (
                 <p className="text-xs text-slate-500 text-center py-4">Kayıtlı hesap bulunmuyor.</p>
               ) : (
                  handles.map(h => (
                    <div key={h.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${h.active ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                        <div className="text-sm font-medium text-slate-200 truncate">{h.handle}</div>
                        <div className="flex items-center space-x-1 shrink-0">
                           <button onClick={() => handleToggle(h.id, h.active)} className={`p-1.5 rounded ${h.active ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-500 bg-slate-800 hover:bg-slate-700'}`} title={h.active ? "Sustur" : "Aktif Et"}>
                             {h.active ? <Power className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                           </button>
                           <button onClick={() => handleDelete(h.id)} className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                    </div>
                  ))
               )}
            </div>
            <div className="mt-4 shrink-0">
               <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-medium tracking-widest uppercase">
                  Geri Dön
               </button>
            </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50">
           {loading && tweets.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
                <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500">Tüm Kaynaklar Taranıyor</span>
             </div>
           ) : error && tweets.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-red-500 text-center p-4">
               <AlertCircle className="w-5 h-5 mb-2 opacity-60 text-red-500" />
               <span className="text-xs font-medium text-red-400">{error}</span>
               <span className="text-[10px] text-red-400/50 mt-1 font-mono">localhost:8080 offline olabilir</span>
             </div>
           ) : tweets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                 <List className="w-8 h-8 opacity-20" />
                 <span className="text-xs">Gösterilecek öğe yok</span>
              </div>
           ) : (
             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {tweets.map(tweet => {
                  const displayTitle = autoTranslate && tweet.isTranslated ? tweet.title : (tweet.originalTitle || tweet.title);
                  return (
                    <div key={tweet.guid} className="group p-3.5 rounded-lg bg-slate-800/30 border border-slate-800 hover:bg-slate-800 transition-colors shadow-sm">
                       <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-slate-500 mb-2.5">
                         <div className="flex items-center gap-2">
                           <span className="font-mono text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded">{tweet.creator}</span>
                           {tweet.isTranslated && autoTranslate && (
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-indigo-500/15 text-indigo-400 lowercase border border-indigo-500/20 shrink-0">
                               tr çeviri
                             </span>
                           )}
                         </div>
                         <span>{tweet.pubDate ? formatDistanceToNow(new Date(tweet.pubDate), { addSuffix: true, locale: tr }) : 'Bilinmeyen'}</span>
                       </div>
                       <p className="text-sm text-slate-300 leading-relaxed max-h-24 overflow-hidden line-clamp-3" dangerouslySetInnerHTML={{ __html: displayTitle }}></p>
                    </div>
                  );
                })}
             </div>
           )}
        </div>
      )}
    </div>
  );
}
