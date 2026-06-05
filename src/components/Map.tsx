import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Navigation2, MapPin, Gauge, Clock, ZoomIn, Crosshair, Map as MapIcon, Route as RouteIcon } from 'lucide-react';
import { renderToString } from 'react-dom/server';

// Fix typical leafet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color: string) => {
  const iconHtml = renderToString(
    <div className={`p-1.5 rounded-full bg-slate-900 border-2 shadow-[0_0_15px_${color}] text-white flex items-center justify-center`} style={{ borderColor: color }}>
      <Crosshair size={18} strokeWidth={2.5} color={color} />
    </div>
  );
  return new L.DivIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const startIcon = createCustomIcon('#3b82f6'); // blue
const endIcon = createCustomIcon('#ef4444'); // red

// Mudanya, Bursa
const DEFAULT_CENTER: [number, number] = [40.3700, 28.8800];

function ClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function LocationController({ userLocation, onLocationFound }: { userLocation: L.LatLng | null, onLocationFound: (loc: L.LatLng) => void }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 14, { animate: true, duration: 1.5 });
    }
  }, [userLocation, map]);
  return null;
}

export function Map() {
  const [pointA, setPointA] = useState<L.LatLng | null>(null);
  const [pointB, setPointB] = useState<L.LatLng | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [showTraffic, setShowTraffic] = useState(false);

  const handleMapClick = (latlng: L.LatLng) => {
    if (!pointA || (pointA && pointB)) {
      setPointA(latlng);
      setPointB(null);
      setRoute([]);
      setRouteInfo(null);
      setError(null);
    } else if (!pointB) {
      setPointB(latlng);
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
       setError("Tarayıcınız konum servisini desteklemiyor.");
       return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
         const latlng = new L.LatLng(position.coords.latitude, position.coords.longitude);
         setUserLocation(latlng);
         setPointA(latlng); // Set user location as start point
         setPointB(null);
         setRoute([]);
         setRouteInfo(null);
         setLoading(false);
      },
      (err) => {
         setError("Konum alınamadı: " + err.message);
         setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    const fetchRoute = async () => {
      if (pointA && pointB) {
        setLoading(true);
        setError(null);
        try {
          // OSRM coordinates are lon,lat
          const start = `${pointA.lng},${pointA.lat}`;
          const end = `${pointB.lng},${pointB.lat}`;
          const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
          
          const response = await fetch(url);
          if (!response.ok) throw new Error("Rota alınamadı.");
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const r = data.routes[0];
            const coordinates = r.geometry.coordinates;
            // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
            const latLons = coordinates.map((coord: number[]) => [coord[1], coord[0]]);
            setRoute(latLons);
            setRouteInfo({ distance: r.distance, duration: r.duration });
          } else {
            throw new Error("Uygun rota bulunamadı.");
          }
        } catch (err: any) {
          setError(err.message || 'Harita servisine ulaşılamıyor.');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRoute();
  }, [pointA, pointB]);

  const formatDistance = (meters: number) => {
      return (meters / 1000).toFixed(1) + ' km';
  };
  
  const formatDuration = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return h > 0 ? `${h}s ${m}d` : `${m} dk`;
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Target Crosshair Overlay (Purely visual) */}
      <div className="absolute inset-0 pointer-events-none z-[400] flex justify-center items-center opacity-5">
        <div className="w-[800px] h-[800px] border border-blue-500 rounded-full flex items-center justify-center">
            <div className="w-[600px] h-[600px] border border-blue-500 rounded-full flex items-center justify-center">
                <div className="w-1 h-8 bg-blue-500 absolute top-0"></div>
                <div className="w-1 h-8 bg-blue-500 absolute bottom-0"></div>
                <div className="h-1 w-8 bg-blue-500 absolute left-0"></div>
                <div className="h-1 w-8 bg-blue-500 absolute right-0"></div>
            </div>
        </div>
      </div>

      {/* Info Panel Panel */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-4">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-5 rounded-2xl shadow-2xl min-w-[280px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </div>
              <h3 className="text-white font-bold text-xs tracking-[0.2em] flex items-center gap-2">
                 <Navigation2 className="w-4 h-4 text-indigo-400" />
                 T/NAV SİSTEMİ
              </h3>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
               <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${pointA ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                 A
               </div>
               <div className="flex-1">
                 <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">BAŞLANGIÇ</p>
                 <p className={`text-xs font-mono font-medium ${pointA ? 'text-white' : 'text-slate-500'}`}>
                   {pointA ? `${pointA.lat.toFixed(4)}, ${pointA.lng.toFixed(4)}` : 'Nokta seçilmedi'}
                 </p>
               </div>
            </div>

            <div className="w-0.5 h-4 bg-slate-700 ml-3"></div>

            <div className="flex items-start gap-3">
               <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${pointB ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                 B
               </div>
               <div className="flex-1">
                 <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">HEDEF</p>
                 <p className={`text-xs font-mono font-medium ${pointB ? 'text-white' : 'text-slate-500'}`}>
                   {pointB ? `${pointB.lat.toFixed(4)}, ${pointB.lng.toFixed(4)}` : 'Nokta seçilmedi'}
                 </p>
               </div>
            </div>
          </div>
          
          {loading && <div className="text-indigo-400 text-[10px] animate-pulse font-medium mt-5 tracking-wider uppercase flex justify-center border border-indigo-500/20 bg-indigo-500/10 py-2 rounded-lg">Uydu Verisi Alınıyor...</div>}
          {error && <div className="text-red-400 text-[10px] uppercase font-medium tracking-wider mt-5 bg-red-400/10 border border-red-500/20 p-2 text-center rounded-lg">{error}</div>}
          
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button 
              onClick={locateUser}
              className="group flex flex-col items-center justify-center py-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700/50 hover:border-slate-500 active:scale-95"
            >
              <LocateFixed className="w-5 h-5 mb-1 text-blue-400 group-hover:text-blue-300" />
              <span className="text-[9px] uppercase tracking-wider font-semibold">Konum</span>
            </button>
            <button 
              onClick={() => setShowTraffic(!showTraffic)}
              className={`group flex flex-col items-center justify-center py-2 rounded-xl transition-all border active:scale-95 ${showTraffic ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 border-slate-700/50 hover:border-slate-500'}`}
            >
              <MapIcon className={`w-5 h-5 mb-1 ${showTraffic ? 'text-orange-400' : 'text-orange-400 group-hover:text-orange-300'}`} />
              <span className="text-[9px] uppercase tracking-wider font-semibold">Trafik</span>
            </button>
          </div>

          {(pointA || pointB) && (
            <button 
              onClick={() => { setPointA(null); setPointB(null); setRoute([]); setRouteInfo(null); setUserLocation(null); }}
              className="mt-2 py-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-[10px] font-bold rounded-xl transition-colors w-full border border-slate-700/50 hover:border-red-500/50 active:scale-95 uppercase tracking-widest"
            >
              Sistem Reset
            </button>
          )}
        </div>

        {/* Route Stats Panel */}
        {routeInfo && !loading && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 pointer-events-none"></div>
            <div className="flex flex-col relative z-10">
               <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <RouteIcon className="w-3 h-3 text-indigo-400"/>
                  Mesafe
               </span>
               <span className="text-xl font-bold tracking-tight text-white font-mono">
                 {formatDistance(routeInfo.distance)}
               </span>
            </div>
            <div className="h-10 w-px bg-slate-700/50 relative z-10"></div>
            <div className="flex flex-col relative z-10">
               <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-orange-400"/>
                  Tahmini
               </span>
               <span className="text-xl font-bold tracking-tight text-white font-mono">
                 {formatDuration(routeInfo.duration)}
               </span>
            </div>
          </div>
        )}
      </div>

      <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%', backgroundColor: '#020617' }} zoomControl={false} dragging={true}>
        <ZoomControl position="bottomright" />
        {showTraffic ? (
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps"
          />
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            className="map-tiles"
          />
        )}
        <ClickHandler onMapClick={handleMapClick} />
        <LocationController userLocation={userLocation} onLocationFound={(loc) => {}} />
        
        {pointA && (
          <Marker position={pointA} icon={startIcon}>
            <Popup className="tactical-popup">A Noktası (Başlangıç)</Popup>
          </Marker>
        )}
        
        {pointB && (
          <Marker position={pointB} icon={endIcon}>
            <Popup className="tactical-popup">B Noktası (Hedef)</Popup>
          </Marker>
        )}
        
        {route.length > 0 && (
          <Polyline 
            positions={route} 
            color="#6366f1" 
            weight={5} 
            opacity={0.8}
            className="animate-pulse"
          />
        )}
      </MapContainer>
      
      {/* Global styles for dark thematic map */}
      <style>{`
         .leaflet-container {
            background: #020617 !important;
            font-family: inherit;
         }
         .map-tiles {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
         }
         .leaflet-control-zoom {
            border: 1px solid rgba(51, 65, 85, 0.8) !important;
            background: rgba(15, 23, 42, 0.9) !important;
            backdrop-filter: blur(8px);
            border-radius: 12px !important;
            overflow: hidden;
         }
         .leaflet-control-zoom a {
            background: transparent !important;
            color: #94a3b8 !important;
            border-bottom: 1px solid rgba(51, 65, 85, 0.5) !important;
         }
         .leaflet-control-zoom a:hover {
            background: rgba(30, 41, 59, 0.8) !important;
            color: #fff !important;
         }
         .tactical-popup .leaflet-popup-content-wrapper,
         .tactical-popup .leaflet-popup-tip {
            background: #0f172a;
            color: #fff;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
         }
      `}</style>
    </div>
  );
}

