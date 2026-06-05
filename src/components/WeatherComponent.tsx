import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Wind, CloudLightning, CloudSnow } from 'lucide-react';

interface WeatherData {
  temperature: number;
  weathercode: number;
  windspeed: number;
}

export function WeatherComponent() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  // Free Open-Meteo API for Bursa
  // It gives basic wmo codes and current temperature without api key
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather');
        const json = await response.json();
        if (json && json.current_weather) {
          setData(json.current_weather);
        }
      } catch (err) {
        console.error("Weather fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
    // Refresh every 10 min
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
     return (
        <div className="flex items-center space-x-2 text-slate-500 animate-pulse bg-slate-900 border border-slate-800 rounded-lg p-3">
          <Cloud className="w-5 h-5" />
          <span className="text-xs tracking-wider">HARİTA METEOROLOJİ BAĞLANTISI KURULUYOR...</span>
        </div>
     );
  }

  if (!data) {
    return null;
  }

  // WMO Weather interpretation codes
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog and depositing rime fog
  // 51, 53, 55, 56, 57: Drizzle
  // 61, 63, 65, 66, 67: Rain
  // 71, 73, 75, 77: Snow fall
  // 80, 81, 82: Rain showers
  // 95, 96, 99: Thunderstorm
  const code = data.weathercode;
  let Icon = Sun;
  let description = "AÇIK";
  let iconColor = "text-amber-400";
  
  if (code > 0 && code <= 3) {
    Icon = Cloud;
    description = "PARÇALI BULUTLU";
    iconColor = "text-slate-300";
  } else if (code >= 45 && code <= 48) {
    Icon = Cloud;
    description = "SİSLİ";
    iconColor = "text-slate-400";
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    Icon = CloudRain;
    description = "YAĞMURLU";
    iconColor = "text-blue-400";
  } else if (code >= 71 && code <= 77) {
    Icon = CloudSnow;
    description = "KAR YAĞIŞLI";
    iconColor = "text-white";
  } else if (code >= 95) {
    Icon = CloudLightning;
    description = "FIRTINALI";
    iconColor = "text-indigo-400";
  }

  return (
    <div className="flex items-center space-x-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-sm px-5">
       <div className={`p-2 rounded-lg bg-slate-800/50 ${iconColor}`}>
         <Icon className="w-6 h-6" />
       </div>
       <div className="flex flex-col">
         <span className="text-xl font-medium text-white tracking-wide">{Math.round(data.temperature)}°C</span>
         <span className="text-[10px] text-slate-400 font-medium tracking-widest leading-none mt-1">{description}</span>
       </div>
       <div className="pl-4 ml-4 border-l border-slate-800 flex flex-col justify-center">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Wind className="w-3 h-3" />
            <span className="text-[10px] font-mono tracking-wider">{data.windspeed} km/s</span>
          </div>
          <span className="text-[9px] text-slate-600 mt-1 uppercase tracking-widest">Bursa Merkezi</span>
       </div>
    </div>
  );
}
