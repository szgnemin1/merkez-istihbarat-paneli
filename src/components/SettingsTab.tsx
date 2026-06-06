import React, { useState, useEffect } from 'react';
import { Key, Save, AlertCircle, CheckCircle2, Lock, ExternalLink, Shield, Globe } from 'lucide-react';

export function SettingsTab() {
  const [apiKey, setApiKey] = useState('');
  const [keyMask, setKeyMask] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const [nitterUrl, setNitterUrl] = useState('');
  const [nitterStatus, setNitterStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    fetch('/api/config/gemini')
      .then(res => res.json())
      .then(data => {
        if (data.masked) {
          setKeyMask(data.masked);
        }
      })
      .catch(err => console.error("Could not load setting:", err));

    fetch('/api/config/nitter')
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setNitterUrl(data.url);
        }
      })
      .catch(err => console.error("Could not load nitter config:", err));
  }, []);

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setStatus('idle');
      return;
    }
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

  const handleSaveNitter = async (e: React.FormEvent) => {
    e.preventDefault();
    setNitterStatus('saving');
    try {
      const res = await fetch('/api/config/nitter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: nitterUrl })
      });
      if (res.ok) {
        setNitterStatus('success');
        setTimeout(() => setNitterStatus('idle'), 3000);
      } else {
        setNitterStatus('error');
      }
    } catch {
      setNitterStatus('error');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdStatus('saving');
    setPwdError('');
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPwdStatus('success');
        setOldPassword('');
        setNewPassword('');
        setTimeout(() => setPwdStatus('idle'), 3000);
      } else {
        setPwdStatus('error');
        setPwdError(data.error || 'Bir hata oluştu');
      }
    } catch {
      setPwdStatus('error');
      setPwdError('Sunucu bağlantı hatası');
    }
  };

  return (
    <div className="h-full w-full mx-auto p-4 flex flex-col items-center overflow-y-auto pointer-events-auto">
      <div className="w-full max-w-2xl mt-8 space-y-8 pb-32">
        
        {/* API Settings Section */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-medium tracking-tight text-white">Yapay Zeka Ayarları</h2>
          </div>

          <form onSubmit={handleSaveApi} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-widest pl-1">
                Gemini API Anahtarı
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={keyMask ? `${keyMask} (Güncellemek için yeni anahtar girin)` : "AI_API_KEY_..."}
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
              />
              {keyMask && !apiKey && (
                <p className="text-xs text-emerald-400 mt-2 font-medium tracking-wide">
                   ✓ Sistemde aktif bir API anahtarı güvenle kayıtlıdır.
                </p>
              )}
            </div>
            
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Nasıl API Anahtarı Alınır?</h3>
              <ol className="list-decimal list-inside text-xs text-slate-400 space-y-2">
                <li><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors">Google AI Studio <ExternalLink className="w-3 h-3"/></a> sayfasına gidin.</li>
                <li>Google hesabınızla giriş yapın.</li>
                <li>"Get API key" (API anahtarı al) butonuna tıklayın.</li>
                <li>"Create API key" diyerek yeni bir projede oluşturun.</li>
                <li>Oluşturulan anahtarı kopyalayıp yukarıdaki kutucuğa yapıştırın.</li>
              </ol>
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
                  Anahtarı Kaydet
                </>
              )}
            </button>
          </form>
        </div>

        {/* Nitter Sunucu Ayarları Section */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-sky-450 text-sky-400" />
            <h2 className="text-xl font-medium tracking-tight text-white">Nitter Sunucu Ayarları (Twitter Feeds)</h2>
          </div>

          <form onSubmit={handleSaveNitter} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-widest pl-1">
                Kendi Nitter Sunucunuzun Adresi (Yayın ve API)
              </label>
              <input
                type="text"
                value={nitterUrl}
                onChange={(e) => setNitterUrl(e.target.value)}
                placeholder="Örn: http://192.168.1.100:8080 veya https://nitter.net"
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all font-mono"
              />
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Kendi sunucunuza Nitter Docker kurulumu yaptıysanız adresini buraya kaydedebilirsiniz (Örn: <span className="font-mono text-sky-400">http://192.168.1.100:8080</span>). Boş bırakırsanız, sistem otomatik olarak yerel Docker konteynerinizi (<span className="font-mono text-indigo-400">http://localhost:8080</span>) kullanmaya çalışır. Eğer o çalışmıyorsa yedek genel sunucu (<span className="font-mono text-indigo-400">nitter.net</span>) üzerinden verileri çeker.
              </p>
            </div>

            <button
              type="submit"
              disabled={nitterStatus === 'saving'}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-sky-600/80 hover:bg-sky-550 hover:bg-sky-500 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {nitterStatus === 'saving' ? (
                <span className="animate-pulse">Kaydediliyor...</span>
              ) : nitterStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Başarıyla Kaydedildi
                </>
              ) : nitterStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Hata Oluştu
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Sunucu Adresini Kaydet
                </>
              )}
            </button>
          </form>
        </div>

        {/* Password Settings Section */}
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800/50 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-medium tracking-tight text-white">Güvenlik ve Giriş</h2>
          </div>

          <form onSubmit={handleSavePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-widest pl-1">
                Mevcut Şifre
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-widest pl-1">
                Yeni Şifre
              </label>
              <div className="relative">
                <Key className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                />
              </div>
            </div>

            {pwdStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs mt-2 pl-1">
                <AlertCircle className="w-3 h-3" />
                <span>{pwdError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pwdStatus === 'saving' || !oldPassword || !newPassword}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {pwdStatus === 'saving' ? (
                <span className="animate-pulse">Değiştiriliyor...</span>
              ) : pwdStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Şifre Değiştirildi
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Şifreyi Güncelle
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
