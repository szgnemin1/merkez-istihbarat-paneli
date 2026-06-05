import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-start justify-center">
      <div className="text-4xl lg:text-5xl font-mono text-white tracking-tight font-medium">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-xs lg:text-sm font-medium tracking-widest text-[#a1a1aa] uppercase mt-1">
        {format(time, 'EEEE, d MMMM yyyy', { locale: tr })}
      </div>
    </div>
  );
}
