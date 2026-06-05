import { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Video, Plus, Trash2, Power, EyeOff, Loader2, LayoutGrid, Square, Settings } from 'lucide-react';

interface Stream {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export function Streams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [showSettings, setShowSettings] = useState(false);
  const [mainStreamId, setMainStreamId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/streams/cctv');
      const data = await res.json();
      setStreams(data);
      if (data.length > 0 && !activeStream && data.find((s: Stream) => s.active)) {
        setActiveStream(data.find((s: Stream) => s.active) || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStreams(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;
    setAdding(true);
    try {
      await fetch('/api/streams/cctv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, url: newUrl })
      });
      setNewName('');
      setNewUrl('');
      fetchStreams();
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`/api/streams/cctv/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current })
    });
    fetchStreams();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/streams/cctv/${id}`, { method: 'DELETE' });
    if (activeStream?.id === id) setActiveStream(null);
    fetchStreams();
  };

  const activeStreamsList = streams.filter(s => s.active);
  const mainStream = activeStreamsList.find(s => s.id === mainStreamId) || activeStreamsList[0];
  const otherStreams = activeStreamsList.filter(s => s !== mainStream);

  const renderPlayer = (stream: Stream, isMainInMulti: boolean = false) => (
    <div key={stream.id} className="w-full h-full bg-[#050505] rounded-xl overflow-hidden border border-slate-800 relative group shrink-0">
       {/* Click catcher when not main to allow selection without breaking iframe interaction */}
       {(!isMainInMulti && viewMode === 'multi') && (
         <div 
           className="absolute inset-0 z-10 cursor-pointer"
           onClick={() => setMainStreamId(stream.id)}
         />
       )}
       {stream.url.includes('player.bursa.bel.tr') || stream.url.includes('iframe') || stream.url.includes('embed') ? (
         <iframe 
           src={stream.url} 
           className="w-full h-full relative z-0" 
           allowFullScreen
           allow="autoplay; fullscreen"
           frameBorder="0"
         />
       ) : (
         <ReactPlayer 
           url={stream.url} 
           playing 
           muted 
           controls={viewMode === 'single' || isMainInMulti}
           width="100%" 
           height="100%"
           style={{ backgroundColor: '#000', position: 'relative', zIndex: 0 }}
           onError={(e) => {}}
         />
       )}
       <div className="absolute top-3 left-3 bg-black/60 px-2 py-1 rounded text-white text-[9px] font-mono tracking-widest backdrop-blur-md z-20 border border-white/10 flex items-center space-x-2">
         <span className="relative flex h-1.5 w-1.5">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
         </span>
         <span>LIVE</span>
       </div>
       {viewMode === 'multi' && (
          <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/70 to-transparent z-20 transition-opacity flex justify-between items-end ${isMainInMulti ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <span className="text-white text-[11px] font-medium tracking-wider drop-shadow-md">
              {stream.name}
            </span>
            {isMainInMulti && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[9px] font-bold rounded-full animate-pulse uppercase tracking-wider border border-red-500/30">
                 ANA EKRAN
              </span>
            )}
          </div>
       )}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 w-full">
      {/* Player Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 bg-black">
        {/* Floating Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-2xl">
           <button 
             onClick={() => setShowSettings(!showSettings)} 
             className={`p-1.5 rounded-md transition-colors ${showSettings ? 'bg-indigo-500/80 text-white' : 'text-slate-300 hover:text-white hover:bg-white/20'}`}
             title="Kaynak Yönetimi"
           >
             <Settings className="w-4 h-4" />
           </button>
           <div className="w-px h-4 bg-white/20 mx-1"></div>
           <button onClick={() => setViewMode('single')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'single' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'}`} title="Tekli Görünüm">
              <Square className="w-4 h-4" />
           </button>
           <button onClick={() => setViewMode('multi')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'multi' ? 'bg-white/20 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'}`} title="Çoklu Görünüm">
              <LayoutGrid className="w-4 h-4" />
           </button>
        </div>

        <div className={`flex-1 flex flex-col overflow-y-auto ${viewMode === 'single' ? 'bg-slate-950 p-4 space-y-4' : 'bg-black min-h-0 p-0'}`}>
          {viewMode === 'single' ? (
            <>
              {activeStream ? renderPlayer(activeStream) : (
                <div className="w-full rounded-xl border border-slate-800 border-dashed flex items-center justify-center text-slate-500 aspect-video shrink-0 bg-slate-900/50">
                   Yayında aktif kamera bulunmuyor veya seçilmedi.
                </div>
              )}

              {/* Stream Selection */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {activeStreamsList.map(stream => (
                  <button
                    key={stream.id}
                    onClick={() => setActiveStream(stream)}
                    className={`p-3 text-left rounded-lg border text-sm transition-all active:scale-[0.98] ${
                      activeStream?.id === stream.id 
                        ? 'bg-pink-500/10 border-pink-500/30 text-pink-300 font-medium' 
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700/80 text-slate-400'
                    }`}
                  >
                    <div className="truncate tracking-wide text-[11px]">{stream.name}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 w-full h-full flex flex-col min-h-0">
              {activeStreamsList.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                  Aktif kamera bulunmuyor.
                </div>
              ) : (
                <div className="w-full h-full flex flex-wrap gap-1 p-1 min-h-0 content-start">
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
           <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg shrink-0">
              <h3 className="text-xs font-medium text-slate-300 tracking-widest mb-3 uppercase">Yeni Kamera Ekle</h3>
              <form onSubmit={handleAdd} className="flex flex-col gap-3">
                <input type="text" placeholder="Kamera Adı" value={newName} onChange={e=>setNewName(e.target.value)} required className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500" />
                <input type="url" placeholder="Akış URL (örn: player.bursa.bel.tr... veya .m3u8)" value={newUrl} onChange={e=>setNewUrl(e.target.value)} required className="w-full bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pink-500" />
                <button type="submit" disabled={adding} className="w-full bg-pink-600/20 text-pink-400 border border-pink-500/50 hover:bg-pink-600/30 py-2 rounded-lg text-xs font-medium tracking-wide flex justify-center items-center">
                   {adding ? <Loader2 className="w-4 h-4 animate-spin"/> : 'EKLE'}
                </button>
              </form>
           </div>

           <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-0">
              <div className="p-3 border-b border-slate-800 bg-slate-900/50 shrink-0">
                 <span className="text-xs font-medium text-slate-400 tracking-widest uppercase pl-1">Yönetim Listesi</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {loading ? <div className="p-4 text-slate-500 text-xs text-center">Yükleniyor...</div> : 
                   streams.map(stream => (
                     <div key={stream.id} className={`flex items-center justify-between p-2 rounded-lg border ${stream.active ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-950 border-slate-800 opacity-60'}`}>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-[11px] font-medium text-slate-200 truncate">{stream.name}</div>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                           <button onClick={() => handleToggle(stream.id, stream.active)} className={`p-1.5 rounded ${stream.active ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-500 bg-slate-800 hover:bg-slate-700'}`} title={stream.active ? "Kapat" : "Aktif Et"}>
                             {stream.active ? <Power className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                           </button>
                           <button onClick={() => handleDelete(stream.id)} className="p-1.5 text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded">
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                     </div>
                   ))
                 }
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
