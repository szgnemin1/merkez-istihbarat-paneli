import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from 'lucide-react';

interface ForecastData {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface ChartData {
  day: string;
  max: number;
  min: number;
  avg: number;
}

export function WeatherForecast() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather');
        const json = await response.json();
        if (json && json.daily) {
          const daily: ForecastData = json.daily;
          
          const chartData: ChartData[] = daily.time.map((dateStr, index) => {
            const date = new Date(dateStr);
            const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
            const dayName = days[date.getDay()];
            const min = daily.temperature_2m_min[index];
            const max = daily.temperature_2m_max[index];
            
            return {
              day: dayName,
              min: min,
              max: max,
              avg: (min + max) / 2
            };
          });
          
          setData(chartData);
        }
      } catch (err) {
        console.error("Weather fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
     return (
        <div className="flex items-center space-x-2 text-slate-500 animate-pulse bg-slate-900 border border-slate-800 rounded-xl p-4 w-full h-[200px] justify-center text-xs tracking-wider uppercase">
          Veri yükleniyor...
        </div>
     );
  }

  if (data.length === 0) {
    return null;
  }

  // Calculate min and max temperature for Y-axis domain
  const minTemp = Math.min(...data.map(d => d.min));
  const maxTemp = Math.max(...data.map(d => d.max));

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col">
      <div className="flex items-center space-x-2 text-slate-400 mb-4 px-2">
         <Calendar className="w-4 h-4" />
         <span className="text-[10px] font-medium tracking-widest uppercase">7 Günlük Sıcaklık Eğilimi</span>
      </div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }} 
              dy={10}
            />
            <YAxis 
              domain={[Math.floor(minTemp) - 2, Math.ceil(maxTemp) + 2]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
              itemStyle={{ color: '#818cf8' }}
              formatter={(value: number) => [`${value.toFixed(1)}°C`, 'Ortalama']}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="avg" 
              stroke="#818cf8" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorAvg)" 
              activeDot={{ r: 4, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
