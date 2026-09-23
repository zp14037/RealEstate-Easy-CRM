import React, { useState, useEffect } from 'react';
import { 
  getStoredAccessToken, 
  getStoredGoogleUser, 
  signInWithGoogle, 
  signOutGoogle,
  GoogleUserProfile 
} from '../services/googleAuth';
import { LogOut, Calendar, Check, AlertCircle } from 'lucide-react';

export const GoogleAuthButton: React.FC = () => {
  const [user, setUser] = useState<GoogleUserProfile | null>(() => getStoredGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(() => !!getStoredAccessToken());
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setUser(e.detail?.user || null);
      setHasToken(!!e.detail?.loggedIn);
    };

    window.addEventListener('crm-google-auth-changed', handleAuthChange);
    return () => window.removeEventListener('crm-google-auth-changed', handleAuthChange);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      setUser(res.user);
      setHasToken(true);
      window.dispatchEvent(new CustomEvent('crm-show-toast', {
        detail: { msg: `✅ Connected as ${res.user.name || res.user.email || 'Google User'}! Calendar sync ready.` }
      }));
    } catch (err: any) {
      console.error('Google Login Error:', err);
      window.dispatchEvent(new CustomEvent('crm-show-toast', {
        detail: { msg: `Google Sign-in failed: ${err.message}`, isError: true }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOutGoogle();
    setShowDropdown(false);
    window.dispatchEvent(new CustomEvent('crm-show-toast', {
      detail: { msg: 'Signed out of Google Calendar.' }
    }));
  };

  if (hasToken && user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all text-xs font-semibold text-emerald-900 cursor-pointer shadow-xs"
          title="Google Calendar Connected - Click for options"
        >
          {user.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || 'User'} 
              className="w-5 h-5 rounded-full object-cover border border-emerald-400"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {(user.name?.[0] || user.email?.[0] || 'G').toUpperCase()}
            </div>
          )}
          <span className="hidden xl:inline max-w-[120px] truncate">{user.name || user.email}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300" title="Connected" />
        </button>

        {showDropdown && (
          <div 
            className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2"
            onMouseLeave={() => setShowDropdown(false)}
          >
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Google Calendar Sync Active</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Google Account</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
      title="Sign in with Google to enable automatic background calendar sync"
    >
      {/* Official Google G Logo */}
      <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.39 7.33 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.43l4.02-3.14z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
        />
      </svg>
      <span className="hidden sm:inline">
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </span>
      <span className="sm:hidden">
        {loading ? '...' : 'Sign In'}
      </span>
    </button>
  );
};
