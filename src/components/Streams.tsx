import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Video, Plus, Trash2, Power, EyeOff, Loader2, LayoutGrid, Square, Settings, Radio } from 'lucide-react';
import { HlsPlayer } from './HlsPlayer';

const Player = ReactPlayer as any;

interface Stream {
  id: string;
  name: string;
  url: string;
  active: boolean;
  type: 'cctv' | 'youtube';
}

export function parseYoutubeUrl(urlStr: string): string {
  const url = urlStr.trim();
  
  if (!url) return '';
  
  if (url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8')) {
    return url;
  }
  
  if (url.includes('/channel/')) {
    const channelMatch = url.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    if (channelMatch && channelMatch[1]) {
      return `embed_channel:${channelMatch[1]}`;
    }
  }
  
  if (url.startsWith('UC') && url.length === 24) {
    return `embed_channel:${url}`;
  }

  if (url.includes('/live/')) {
    const liveMatch = url.split('/live/');
    if (liveMatch[1]) {
      return liveMatch[1].split('?')[0].split('&')[0].split('/')[0];
    }
  }

  if (url.includes('/shorts/')) {
    const shortsMatch = url.split('/shorts/');
    if (shortsMatch[1]) {
      return shortsMatch[1].split('?')[0].split('&')[0].split('/')[0];
    }
  }

  if (url.includes('youtu.be/')) {
    const shortMatch = url.split('youtu.be/');
    if (shortMatch[1]) {
      return shortMatch[1].split('?')[0].split('&')[0].split('/')[0];
    }
  }

  if (url.includes('v=')) {
    const vMatch = url.split('v=');
    if (vMatch[1]) {
      return vMatch[1].split('&')[0].split('?')[0];
    }
  }

  if (url.includes('/embed/')) {
    const embedMatch = url.split('/embed/');
    if (embedMatch[1]) {
      return embedMatch[1].split('?')[0].split('&')[0];
    }
  }
  
  const isVideoId = /^[a-zA-Z0-9_-]{11}$/.test(url);
  if (isVideoId) {
    return url;
  }

  return url;
}

export function Streams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cctv' | 'youtube'>('all');
  const [settingsCategory, setSettingsCategory] = useState<'cctv' | 'youtube'>('cctv');
  const [viewMode] = useState<'single' | 'multi'>('multi');
  const [showSettings, setShowSettings] = useState(false);
  const [mainStreamId, setMainStreamId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchAllStreams = async () => {
    try {
      const [cctvRes, youtubeRes] = await Promise.all([
        fetch('/api/streams/cctv'),
        fetch('/api/streams/youtube')
      ]);
      
      const cctvData = await cctvRes.json();
      const youtubeData = await youtubeRes.json();
      
      const combined: Stream[] = [
        ...cctvData.map((s: any) => ({ ...s, type: 'cctv' })),
        ...youtubeData.map((s: any) => ({ ...s, type: 'youtube' }))
      ];
      
      setStreams(combined);
    } catch (e) {
      console.error("Görüntü ve yayın listeleri alınamadı:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllStreams();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;
    setAdding(true);
    try {
      let finalUrl = newUrl;
      if (settingsCategory === 'youtube') {
         finalUrl = parseYoutubeUrl(newUrl);
      }
      
      await fetch(`/api/streams/${settingsCategory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, url: finalUrl })
      });
      setNewName('');
      setNewUrl('');
      fetchAllStreams();
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string, current: boolean, type: 'cctv' | 'youtube') => {
    await fetch(`/api/streams/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current })
    });
    fetchAllStreams();
  };

  const handleDelete = async (id: string, type: 'cctv' | 'youtube') => {
    await fetch(`/api/streams/${type}/${id}`, { method: 'DELETE' });
    if (activeStream?.id === id) setActiveStream(null);
    fetchAllStreams();
  };

  // Filtering list
  const filteredStreams = streams.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.type === selectedCategory;
  });

  const activeStreamsList = filteredStreams.filter(s => s.active);

  // Synchronize playing streams when active changes or categories filter changes
  useEffect(() => {
    if (activeStreamsList.length > 0) {
      if (!activeStream || !activeStreamsList.some(s => s.id === activeStream.id)) {
        setActiveStream(activeStreamsList[0]);
      }
    } else {
      setActiveStream(null);
    }
  }, [selectedCategory, streams]);

  const renderPlayer = (stream: Stream, isMainInMulti: boolean = false) => {
    const isM3u8 = stream.url.toLowerCase().includes('.m3u8') || stream.url.toLowerCase().includes('m3u8');
    
    let videoSrc = '';
    let isYoutubeType = stream.type === 'youtube';
    let isIframeEmbed = false;

    if (isM3u8) {
      videoSrc = stream.url.startsWith('/api/') ? stream.url : `/api/stream-proxy?url=${encodeURIComponent(stream.url)}`;
    } else if (isYoutubeType) {
      const parsed = parseYoutubeUrl(stream.url);
      if (parsed.startsWith('embed_channel:')) {
        const channelId = parsed.replace('embed_channel:', '');
        videoSrc = `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=1`;
      } else if (parsed.includes('http://') || parsed.includes('https://')) {
        videoSrc = parsed;
      } else {
        videoSrc = `https://www.youtube.com/embed/${parsed}?autoplay=1&mute=1`;
      }
    } else {
      // CCTV
      if (stream.url.includes('player.bursa.bel.tr') || stream.url.includes('iframe') || stream.url.includes('embed') || stream.url.includes('http')) {
        videoSrc = stream.url;
        isIframeEmbed = true;
      } else {
        videoSrc = stream.url;
      }
    }

    return (
      <div key={stream.id} className="w-full h-full bg-[#050505] rounded-xl overflow-hidden border border-slate-800 relative group shrink-0 shadow-lg">
         {/* Click catcher when not main to allow selection without breaking iframe interaction */}
         {(!isMainInMulti && viewMode === 'multi') && (
           <div 
             className="absolute inset-0 z-10 cursor-pointer bg-transparent"
             onClick={() => setMainStreamId(stream.id)}
           />
         )}
         {isM3u8 ? (
           <HlsPlayer 
             url={videoSrc}
             autoplay={true}
             muted={true}
             controls={viewMode === 'single' || isMainInMulti}
           />
         ) : (isYoutubeType || isIframeEmbed) ? (
           <iframe 
             src={videoSrc}
             className={`w-full h-full relative z-0 ${!isMainInMulti && viewMode === 'multi' ? 'pointer-events-none' : 'pointer-events-auto'}`} 
             allow="autoplay; encrypted-media; fullscreen"
             allowFullScreen
             frameBorder="0"
           />
         ) : (
           <Player 
             url={videoSrc} 
             playing 
             muted 
             controls={viewMode === 'single' || isMainInMulti}
             width="100%" 
             height="100%"
             style={{ backgroundColor: '#000', position: 'relative', zIndex: 0 }}
             onError={(e: any) => {}}
           />
         )}

         {/* LIVE BLINKER */}
         <div className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded text-white text-[9px] font-mono tracking-widest backdrop-blur-md z-20 border border-white/10 flex items-center space-x-1.5 pointer-events-none">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            <span className="font-bold">LIVE</span>
            <span className="text-slate-400 text-[8px] border-l border-slate-700 pl-1.5 font-sans">
              {stream.type === 'cctv' ? 'KAMERA' : 'YAYIN'}
            </span>
         </div>

         {/* Name overlay */}
         <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 transition-opacity flex justify-between items-end pointer-events-none ${viewMode === 'multi' ? (isMainInMulti ? 'opacity-100' : 'opacity-0 group-hover:opacity-100') : 'opacity-0 group-hover:opacity-100'}`}>
           <span className="text-white text-[11px] font-medium tracking-wider drop-shadow-md truncate max-w-[70%]">
             {stream.name}
           </span>
           {isMainInMulti && viewMode === 'multi' && (
             <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded-full animate-pulse uppercase tracking-wider border border-indigo-500/30">
                ANA GÖRÜNTÜ
             </span>
           )}
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 w-full p-4 lg:p-6 overflow-hidden">
      {/* Player Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 bg-slate-950 rounded-xl border border-slate-900/60 shadow-inner">
        {/* Floating Combined Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center bg-slate-900/90 backdrop-blur-md rounded-lg p-1.5 border border-slate-800 shadow-2xl space-x-2">
          {/* Category Tabs */}
          <div className="flex bg-slate-950 p-0.5 rounded-md border border-slate-800/80">
             <button 
               onClick={() => { setSelectedCategory('all'); setMainStreamId(null); }}
               className={`px-2.5 py-1 text-[10px] rounded transition-all font-bold tracking-wider ${selectedCategory === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
               TÜMÜ
             </button>
             <button 
               onClick={() => { setSelectedCategory('cctv'); setMainStreamId(null); }}
               className={`px-2.5 py-1 text-[10px] rounded transition-all font-bold tracking-wider ${selectedCategory === 'cctv' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
               KAMERA
             </button>
             <button 
               onClick={() => { setSelectedCategory('youtube'); setMainStreamId(null); }}
               className={`px-2.5 py-1 text-[10px] rounded transition-all font-bold tracking-wider ${selectedCategory === 'youtube' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
               YAYIN/TV
             </button>
          </div>

          <div className="w-px h-5 bg-slate-800"></div>

          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-1.5 rounded-md transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Kaynak Yönetimi"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
 
        <div className={`flex-1 flex flex-col overflow-y-auto ${viewMode === 'single' ? 'bg-slate-950 p-4 space-y-4 pt-16' : 'bg-black min-h-0 p-0'}`}>
          {viewMode === 'single' ? (
            <>
              {activeStream ? (
                <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl relative">
                  {renderPlayer(activeStream)}
                </div>
              ) : (
                <div className="w-full rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-slate-500 aspect-video shrink-0 bg-slate-900/40 p-12">
                   <Video className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                   <p className="text-sm font-medium tracking-wide">Aktif görüntüleme kaynağı bulunmuyor veya seçilmedi.</p>
                   <p className="text-xs text-slate-600 mt-1">Ekrana yansıtmak için aşağıdan veya kaynak yönetimi panelinden aktif edin.</p>
                </div>
              )}
 
              {/* Stream Selection Selection Grid */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase pl-1">
                    YAYIN AKIŞI SEÇİMİ ({activeStreamsList.length} AKTİF)
                 </h4>
                 {activeStreamsList.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800/55 text-slate-500 text-xs font-mono">
                      YAYINDA AKTİF LOG BULUNMUYOR LÜTFEN AYARLARDAN AKTİF TUTUN
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                      {activeStreamsList.map(stream => (
                        <button
                          key={stream.id}
                          onClick={() => setActiveStream(stream)}
                          className={`p-3 text-left rounded-xl border transition-all active:scale-[0.98] outline-none flex items-center space-x-2.5 leading-tight ${
                            activeStream?.id === stream.id 
                              ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300 font-semibold shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/20' 
                              : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700 text-slate-400'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${activeStream?.id === stream.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-950 text-slate-500'}`}>
                             {stream.type === 'cctv' ? <Video className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
                          </div>
                          <div className="truncate flex-1 min-w-0">
                            <div className="truncate text-xs tracking-wider uppercase font-medium">{stream.name}</div>
                            <span className="text-[9px] font-mono tracking-widest opacity-60 text-slate-500">
                               {stream.type === 'cctv' ? 'CCTV' : 'YAYIN'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                 )}
              </div>
            </>
          ) : (
            <div className="flex-1 w-full h-full flex flex-col min-h-0">
              {activeStreamsList.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                  <LayoutGrid className="w-10 h-10 opacity-30 animate-pulse text-slate-400" />
                  <span className="font-medium">Mozaik ekran için aktif kaynak bulunmuyor.</span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-wrap gap-1 p-1 min-h-0 content-start bg-slate-950">
                  {activeStreamsList.map(stream => {
                    const n = activeStreamsList.length;
                    const cols = Math.ceil(Math.sqrt(n));
                    const rows = Math.ceil(n / cols);
                    return (
                      <div 
                        key={stream.id} 
                        className="relative min-w-0 min-h-0 transition-all duration-300"
                        style={{
                          flexGrow: 1,
                          flexShrink: 1,
                          flexBasis: `calc((100% - ${(cols - 1) * 4}px) / ${cols})`,
                          height: `calc((100% - ${(rows - 1) * 4}px) / ${rows})`
                        }}
                      >
                         {renderPlayer(stream, stream.id === mainStreamId || (activeStreamsList[0].id === stream.id && !mainStreamId))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
 
      {/* Management Sidebar */}
      {showSettings && (
        <div className="w-full lg:w-80 flex flex-col gap-4 min-h-0 shrink-0">
           {/* Add Stream panel */}
           <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg shrink-0">
              <h3 className="text-xs font-semibold text-white tracking-widest mb-3 uppercase">Yeni Akış Seçimi</h3>

               {/* settings category tabs */}
               <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80 mb-4 h-9">
                  <button 
                    type="button"
                    onClick={() => setSettingsCategory('cctv')}
                    className={`flex-1 text-center py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-all ${settingsCategory === 'cctv' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                     CCTV Kamera
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSettingsCategory('youtube')}
                    className={`flex-1 text-center py-1 text-[10px] uppercase font-bold tracking-wider rounded transition-all ${settingsCategory === 'youtube' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                     TV & Yayın
                  </button>
               </div>

              <form onSubmit={handleAdd} className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder={settingsCategory === 'cctv' ? "Örn: Orhaneli Kavşağı" : "Örn: Haber Global"} 
                  value={newName} 
                  onChange={e=>setNewName(e.target.value)} 
                  required 
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" 
                />
                <input 
                  type="text" 
                  placeholder={settingsCategory === 'cctv' ? "Kamera m3u8 veya iframe embed linki" : "YouTube URL veya M3U8 Yayını"} 
                  value={newUrl} 
                  onChange={e=>setNewUrl(e.target.value)} 
                  required 
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" 
                />
                <button type="submit" disabled={adding} className="w-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 hover:bg-indigo-600/30 py-2 rounded-lg text-xs font-semibold tracking-wide flex justify-center items-center gap-1.5">
                    {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5" />}
                    <span>{settingsCategory === 'cctv' ? 'CCTV KAMERA EKLE' : 'YAYIN / TV EKLE'}</span>
                </button>
              </form>
           </div>
 
           {/* List panel */}
           <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-800 bg-slate-900/50 shrink-0 flex justify-between items-center">
                 <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase pl-1">BÜTÜN AKIŞLAR ({streams.length})</span>
                 <span className="text-[10px] font-mono text-slate-500 uppercase">Filtresiz</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {loading ? (
                    <div className="p-8 text-slate-500 text-xs text-center flex items-center justify-center gap-2">
                       <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                       <span>Yükleniyor...</span>
                    </div>
                 ) : streams.length === 0 ? (
                    <div className="p-4 text-slate-600 text-center text-xs">Yayın listesi boş durumda.</div>
                 ) : (
                    streams.map(stream => (
                      <div key={stream.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${stream.active ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-950/80 border-slate-850 opacity-60'}`}>
                         <div className="flex-1 min-w-0 pr-2">
                           <div className="text-[11px] font-semibold text-slate-200 truncate uppercase mt-0.5">{stream.name}</div>
                           <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                              {stream.type === 'cctv' ? 'CCTV' : 'HABER/YAYIN'}
                           </div>
                         </div>
                         <div className="flex items-center space-x-1 shrink-0">
                            <button 
                              type="button"
                              onClick={() => handleToggle(stream.id, stream.active, stream.type)} 
                              className={`p-1.5 rounded-md transition-colors ${stream.active ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-500 bg-slate-800 hover:bg-slate-700'}`} 
                              title={stream.active ? "Kapat" : "Aktif Et"}
                            >
                              {stream.active ? <Power className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDelete(stream.id, stream.type)} 
                              className="p-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
