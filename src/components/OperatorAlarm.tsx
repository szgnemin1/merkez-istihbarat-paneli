import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';

export function OperatorAlarm() {
  const [alarmTime, setAlarmTime] = useState<string>(''); // HH:mm
  const [isActive, setIsActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
        audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
        audioRef.current.loop = true;
    } catch(e) {}
    
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive && alarmTime && !isRinging) {
        const now = new Date();
        const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (currentHHMM === alarmTime) {
          setIsRinging(true);
          if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, alarmTime, isRinging]);

  const toggleAlarm = () => {
    if (isRinging) {
       setIsRinging(false);
       setIsActive(false);
       if (audioRef.current) {
           audioRef.current.pause();
           audioRef.current.currentTime = 0;
       }
    } else {
       if (isActive) {
          setIsActive(false);
       } else {
          if (alarmTime) {
             setIsActive(true);
             if (audioRef.current) {
                 audioRef.current.muted = true;
                 audioRef.current.play().then(() => {
                     audioRef.current?.pause();
                     if (audioRef.current) {
                         audioRef.current.currentTime = 0;
                         audioRef.current.muted = false;
                     }
                 }).catch(() => {});
             }
          }
       }
    }
  };

  return (
     <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-center w-full min-w-[240px]">
        <div className="flex items-center space-x-2 mb-3">
           <Bell className={`w-4 h-4 ${isRinging ? 'text-red-400 animate-bounce' : isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
           <span className="text-[10px] font-medium tracking-widest text-[#a1a1aa] uppercase">Uyandırma / Hatırlatıcı</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <input 
            type="time" 
            value={alarmTime}
            onChange={e => setAlarmTime(e.target.value)}
            disabled={isActive}
            className="bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-lg text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button 
             onClick={toggleAlarm}
             className={`flex-1 py-2 px-3 rounded-lg font-medium tracking-wider text-xs transition-colors h-[46px] ${
                isRinging ? 'bg-red-500/20 border border-red-500/50 text-red-400' :
                isActive ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700' :
                'bg-indigo-600 text-white hover:bg-indigo-500'
             }`}
          >
             {isRinging ? 'DURDUR' : isActive ? 'İPTAL ET' : 'KUR'}
          </button>
        </div>
     </div>
  );
}
