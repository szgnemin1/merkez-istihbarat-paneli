import React, { useState, useEffect } from 'react';
import { Key, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export function SettingsTab() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/config/gemini')
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      })
      .catch(err => console.error("Could not load setting:", err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    try {
      const res = await fetch('/api/config/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });
      if (res.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="h-full w-full max-w-[1920px] mx-auto p-4 flex flex-col items-center justify-center pointer-events-auto">
      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-medium tracking-tight text-white">Sistem Ayarları</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-widest pl-1">
              Gemini API Anahtarı
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AI_API_KEY_..."
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
            />
            <p className="text-[10px] text-slate-500 pl-1 leading-relaxed">
              Bu anahtar yapay zeka destekli istihbarat özeti için kullanılır. Sunucuya kaydedilir.
            </p>
          </div>

          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {status === 'saving' ? (
              <span className="animate-pulse">Kaydediliyor...</span>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Kaydedildi
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4" />
                Hata Oluştu
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Ayarları Kaydet
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
