import { useEffect, useRef, useState } from 'react';

interface HlsPlayerProps {
  url: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onSelectMain?: () => void;
  isClickableOverlay?: boolean;
}

export function HlsPlayer({ 
  url, 
  autoplay = true, 
  muted = true, 
  controls = true, 
  onSelectMain,
  isClickableOverlay = false 
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [errorRef, setErrorRef] = useState<string | null>(null);

  useEffect(() => {
    if ((window as any).Hls) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setErrorRef('Yayın oynatıcı yüklenemedi (HLS.js loading error).');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !videoRef.current) return;

    const video = videoRef.current;
    const Hls = (window as any).Hls;

    if (!Hls) {
      setErrorRef('HLS oynatıcısı başlatılamadı.');
      return;
    }

    let hls: any = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 10,
        maxBufferLength: 6,
        maxBufferSize: 2 * 1024 * 1024, // Keep buffer small (2MB max) to prevent lag and buffer bloat
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 3,
        liveSyncDuration: 2, // Play 2 seconds behind live edge
        liveMaxLatencyDuration: 5, // Latency margin before catch-up (must be > liveSyncDuration)
        liveSyncPosition: 1.2, // Play as close to the real-time edge as possible
        liveDurationInfinity: true, // Speeds up initial state for infinite live feeds
        progressive: true, // Start rendering while slice is downloading
        highWaterLoopThreshold: 1,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoplay) {
          video.play().catch(() => {
            // Unmuted play might be blocked by browser policy, try muted
            video.muted = true;
            video.play().catch(e => console.warn("Autoplay failed even with muted", e));
          });
        }
      });
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS Chrome/Firefox)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        if (autoplay) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(e => console.warn("Native autoplay failed", e));
          });
        }
      });
    } else {
      setErrorRef('Tarayıcınız bu yayın formatını (M3U8) desteklemiyor.');
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, scriptLoaded, autoplay]);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative">
      {isClickableOverlay && onSelectMain && (
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={onSelectMain}
        />
      )}
      {errorRef ? (
        <div className="text-xs text-red-400 p-4 text-center font-mono">{errorRef}</div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls={controls}
          muted={muted}
          playsInline
          autoPlay={autoplay}
        />
      )}
    </div>
  );
}
