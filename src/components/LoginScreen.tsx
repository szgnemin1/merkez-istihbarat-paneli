import React, { useState } from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('merkez_auth_token', data.token);
        onLogin();
      } else {
        setError(data.error || 'Hatalı şifre');
      }
    } catch {
      setError('Sunucu bağlantı hatası');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="h-screen w-full bg-slate-950 font-sans antialiased flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800/50 shadow-2xl w-full max-w-md backdrop-blur-sm relative overflow-hidden">
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)`, 
               backgroundSize: `24px 24px` 
             }}>
        </div>
        
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-4 border border-slate-700/50 shadow-lg">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Merkez İstihbarat</h1>
          <p className="text-slate-400 text-sm">Sisteme erişmek için yetkilendirme gerekiyor</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-widest pl-1">
              Sistem Şifresi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono shadow-inner"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs mt-2 pl-1 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 text-sm font-medium transition-colors disabled:opacity-50 tracking-wide shadow-lg shadow-indigo-900/20"
          >
            {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
