import React, { useState, useEffect } from 'react';
import { TwitterFeeds } from './TwitterFeeds';
import { Sparkles, Loader2, Clock, RefreshCw } from 'lucide-react';

interface RoutineReport {
  id: string;
  timestamp: string;
  hourTitle: string;
  summary: string;
}

export function SocialTab() {
  const [activeSegment, setActiveSegment] = useState<'instant' | 'routine'>('instant');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [routineReports, setRoutineReports] = useState<RoutineReport[]>([]);
  const [routineLoading, setRoutineLoading] = useState(false);

  const fetchRoutineReports = async () => {
    setRoutineLoading(true);
    try {
      const res = await fetch('/api/reports/routine');
      const data = await res.json();
      setRoutineReports(data);
    } catch (e) {
      console.error("Could not fetch routine reports", e);
    } finally {
      setRoutineLoading(false);
    }
  };

  useEffect(() => {
    if (activeSegment === 'routine') {
      fetchRoutineReports();
    }
  }, [activeSegment]);

  const triggerTestReport = async () => {
    setRoutineLoading(true);
    try {
      await fetch('/api/reports/routine/trigger', { method: 'POST' });
      await fetchRoutineReports();
    } catch (e) {
      console.error(e);
    } finally {
      setRoutineLoading(false);
    }
  };

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
         {/* Tab Header */}
         <div className="flex border-b border-slate-800 bg-slate-950/80 z-20 relative">
           <button 
             onClick={() => setActiveSegment('instant')}
             className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeSegment === 'instant' ? 'border-indigo-500 text-indigo-400 bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}`}
           >
             ANLIK ÖZET
           </button>
           <button 
             onClick={() => setActiveSegment('routine')}
             className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${activeSegment === 'routine' ? 'border-emerald-500 text-emerald-400 bg-slate-900/50' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/30'}`}
           >
             RUTİN RAPORLAR
           </button>
         </div>

         <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center z-10 shrink-0">
            <div className="flex items-center space-x-3">
              <div className={`p-1.5 rounded-lg ${activeSegment === 'instant' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {activeSegment === 'instant' ? <Sparkles className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                 <h3 className="font-medium text-white tracking-wider text-sm uppercase">
                    {activeSegment === 'instant' ? 'YAPAY ZEKA İSTİHBARAT ÖZETİ' : 'SAATLİK OTOMATİK RAPORLAR'}
                 </h3>
                 <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-widest">
                    {activeSegment === 'instant' ? 'GEMINI 3.5 FLASH DESTEKLİ' : 'HER SAAT BAŞI GÜNCELLENİR (08:00 - 21:00)'}
                 </p>
              </div>
            </div>

            {activeSegment === 'instant' ? (
              <button 
                onClick={handleSummarize}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                 {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                 <span>{loading ? 'ÖZETLENİYOR...' : 'ŞİMDİ ÖZETLE'}</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={triggerTestReport}
                  disabled={routineLoading}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors disabled:opacity-50 border border-slate-700"
                  title="Manuel test raporu oluştur"
                >
                  TEST OLUŞTUR
                </button>
                <button 
                  onClick={fetchRoutineReports}
                  disabled={routineLoading}
                  className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  title="Listeyi Yenile"
                >
                  <RefreshCw className={`w-4 h-4 ${routineLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
         </div>

         <div className="flex-1 p-6 overflow-y-auto z-10 relative">
            {activeSegment === 'instant' ? (
              // INSTANT SUMMARY
              summary ? (
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
              )
            ) : (
              // ROUTINE REPORTS
              <div className="space-y-6">
                {routineReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-4 mt-20">
                    <Clock className="w-12 h-12 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                      Henüz saatlik rutin rapor oluşturulmamış. Sistem 08:00 - 21:00 arası her saat başı raporları buraya ekleyecektir.
                    </p>
                  </div>
                ) : (
                  routineReports.map(report => (
                    <div key={report.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <h4 className="font-bold text-slate-200 text-sm tracking-wide">{report.hourTitle}</h4>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(report.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="prose prose-invert prose-p:text-sm prose-li:text-sm max-w-none prose-ul:text-slate-300 prose-headings:text-emerald-400 text-slate-300">
                        <div dangerouslySetInnerHTML={{ __html: report.summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    </div>
                  ))
                )}
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
