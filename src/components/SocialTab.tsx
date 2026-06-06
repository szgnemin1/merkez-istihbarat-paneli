import React, { useState, useEffect } from 'react';
import { TwitterFeeds } from './TwitterFeeds';
import { Sparkles, Loader2 } from 'lucide-react';

export function SocialTab() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestSummary = async () => {
    setInitLoading(true);
    try {
      const res = await fetch('/api/gemini/latest-summary');
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (e) {
      console.error("Could not fetch latest summary", e);
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestSummary();
  }, []);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    try {
      const handlesRes = await fetch('/api/twitter-handles');
      const handlesData: {handle: string, active: boolean}[] = await handlesRes.json();
      const activeHandles = handlesData.filter(h => h.active);

      let texts: string[] = [];
      const fetchPromises = activeHandles.map(async (h) => {
        const res = await fetch(`/api/nitter?handle=${h.handle}`);
        if(res.ok) {
           const data = await res.json();
           if(data.items) {
              return data.items.slice(0, 5).map((i: any) => `${h.handle}: ${i.title}`);
           }
        }
        return [];
      });

      const results = await Promise.allSettled(fetchPromises);
      results.forEach(res => {
         if(res.status === 'fulfilled') {
            texts = [...texts, ...res.value];
         }
      });

      if (texts.length === 0) {
        texts = ["Şu an ulaşılan veri yok. Sistemin genel durumunu özetle."];
      }

      const aiResponse = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });

      const aiData = await aiResponse.json();
      
      if (!aiResponse.ok) {
        throw new Error(aiData.error || 'Özetleme hatası');
      }

      setSummary(aiData.summary);

    } catch (err: any) {
       console.error(err);
       setError(err.message || 'Bir hata oluştu');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 p-4 lg:p-6 w-full max-w-[1920px] mx-auto overflow-hidden">
       {/* AI Summary Column (LEFT) */}
       <div className="w-full md:w-1/2 flex flex-col min-h-0 h-full bg-slate-900 border border-slate-800 rounded-xl shadow-lg relative overflow-hidden">
         {/* Panel Header */}
         <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                 <h3 className="font-semibold text-white tracking-wider text-sm uppercase">
                    YAPAY ZEKA İSTİHBARAT ÖZETİ
                 </h3>
                 <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-widest">
                    GEMINI 3.5 FLASH DESTEKLİ
                 </p>
              </div>
            </div>

            <button 
              onClick={handleSummarize}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-md shadow-indigo-600/10"
            >
               {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
               <span>{loading ? 'ÖZETLENİYOR...' : 'ŞİMDİ ÖZETLE'}</span>
            </button>
         </div>

         {/* Summary Content */}
         <div className="flex-1 p-6 overflow-y-auto z-10 relative">
            {initLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500">Son Özet Yükleniyor...</span>
               </div>
            ) : summary ? (
               <div className="prose prose-invert prose-p:text-sm prose-li:text-sm max-w-none prose-ul:text-slate-300 prose-headings:text-indigo-300">
                 <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
               </div>
            ) : error ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                 <div className="text-red-400 text-sm font-medium">{error}</div>
                 <button onClick={handleSummarize} className="text-xs text-indigo-400 hover:underline">Tekrar Dene</button>
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-4">
                 <Sparkles className="w-12 h-12 text-slate-600 mb-2" />
                 <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                   Sosyal medya ve haber kaynaklarından gelen güncel akışı analiz etmek ve önemli olayları maddeler halinde özetlemek için <strong className="text-slate-300 font-medium">"Şimdi Özetle"</strong> butonuna basın.
                 </p>
               </div>
            )}
         </div>
         
         {/* Background decoration */}
         <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
       </div>

       {/* Feeds Column (RIGHT) */}
       <div className="w-full md:w-1/2 flex flex-col min-h-0 h-full">
         <div className="flex-1 flex flex-col min-h-0 shadow-lg">
           <TwitterFeeds />
         </div>
       </div>
    </div>
  );
}
