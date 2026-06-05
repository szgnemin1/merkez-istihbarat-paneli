/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Clock } from './components/Clock';
import { RssTicker } from './components/RssTicker';
import { Streams } from './components/Streams';
import { YoutubeStreams } from './components/YoutubeStreams';
import { SocialTab } from './components/SocialTab';
import { SettingsTab } from './components/SettingsTab';
import { WeatherComponent } from './components/WeatherComponent';
import { WeatherForecast } from './components/WeatherForecast';
import { OperatorAlarm } from './components/OperatorAlarm';
import { SecretSurprise } from './components/SecretSurprise';
import { ShieldCheck, Home, Map as MapIcon, Video, Youtube, Twitter, Settings } from 'lucide-react';

const TABS = [
  { id: 'home', icon: Home, label: 'Merkez' },
  { id: 'cctv', icon: Video, label: 'CCTV' },
  { id: 'youtube', icon: Youtube, label: 'Yayınlar' },
  { id: 'social', icon: Twitter, label: 'Analiz' },
  { id: 'settings', icon: Settings, label: 'Ayarlar' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className={`h-screen w-full bg-slate-950 font-sans antialiased text-slate-300 flex flex-col overflow-hidden transition-colors duration-700`}>
      <main className="flex-1 min-h-0 relative w-full h-full bg-slate-950">
          {activeTab === 'home' && (
            <div className="h-full w-full max-w-[1920px] mx-auto p-4 flex items-center justify-center pointer-events-auto">
                 <div className="flex flex-col space-y-6 lg:space-y-8 items-center bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 shadow-2xl w-full max-w-2xl">
                    <div className="flex flex-col md:flex-row items-center justify-between w-full gap-6">
                       <Clock />
                       <div className="flex-1 flex justify-end w-full">
                         <WeatherComponent />
                       </div>
                    </div>
                    <WeatherForecast />
                    <OperatorAlarm />
                    <SecretSurprise />
                 </div>
            </div>
          )}

          {activeTab === 'cctv' && (
            <div className="h-full w-full p-0">
               <Streams />
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="h-full w-full p-0">
               <YoutubeStreams />
            </div>
          )}

          {activeTab === 'social' && (
             <SocialTab />
          )}

          {activeTab === 'settings' && (
             <div className="h-full w-full p-0">
               <SettingsTab />
             </div>
          )}
      </main>

      {/* Bottom Thin Icon Navigation Bar - Tablet optimized */}
      <nav className="shrink-0 h-14 border-t border-slate-900 bg-slate-950/90 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.6)] flex items-center justify-center space-x-6 md:space-x-12 px-2 relative z-50">
         {TABS.map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex flex-col items-center justify-center space-y-1 py-1 px-4 transition-all duration-300 border-t-2 ${
               activeTab === tab.id 
                 ? 'text-indigo-400 border-indigo-500 bg-gradient-to-t from-indigo-500/10 to-transparent' 
                 : 'text-slate-500 hover:text-slate-300 border-transparent'
             }`}
           >
             <tab.icon className="w-4 h-4" strokeWidth={activeTab === tab.id ? 2 : 1.5} />
             <span className={`text-[8px] font-medium tracking-widest uppercase transition-all ${
                activeTab === tab.id ? 'opacity-100' : 'opacity-70'
             }`}>
                {tab.label}
             </span>
           </button>
         ))}
      </nav>
    </div>
  );
}

