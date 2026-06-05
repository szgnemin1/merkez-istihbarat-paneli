import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Terminal, Shield, Zap } from 'lucide-react';

export function SecretSurprise() {
  const [activated, setActivated] = useState(false);

  const activateSurprise = () => {
    if (activated) return;
    setActivated(true);
    
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#818cf8', '#6366f1', '#4f46e5', '#ffffff']
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#818cf8', '#6366f1', '#4f46e5', '#ffffff']
      });
    }, 250);

    setTimeout(() => {
        setActivated(false);
    }, 5000);
  };

  return (
    <div className="w-full relative mt-2 flex flex-col items-center">
       {!activated ? (
           <button 
             onClick={activateSurprise}
             className="group flex flex-col items-center space-y-1 text-slate-800 hover:text-indigo-400 transition-colors duration-500 ease-in-out cursor-pointer active:scale-95"
           >
              <Terminal className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity" />
              <span className="text-[8px] uppercase tracking-widest font-mono opacity-0 group-hover:opacity-100 transition-opacity">Sistem_Girişi</span>
           </button>
       ) : (
           <div className="flex bg-indigo-500/10 border border-indigo-500/50 rounded-xl px-4 py-3 items-center space-x-3 w-full justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
               <Shield className="w-5 h-5 text-indigo-400 animate-pulse" />
               <div className="flex flex-col items-center text-center">
                  <span className="text-indigo-300 text-[10px] uppercase tracking-widest font-bold">Harika Bir İş Çıkarıyorsun!</span>
                  <span className="text-white text-xs font-mono tracking-tight mt-0.5">Sistem ve kameralar güvende. Rahatına bak.</span>
               </div>
               <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
           </div>
       )}
    </div>
  );
}
