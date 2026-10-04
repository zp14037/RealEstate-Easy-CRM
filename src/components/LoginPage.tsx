import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { signInWithGoogle, GoogleUserProfile } from '../services/googleAuth';

interface LoginPageProps {
  onLoginSuccess: (username: string, profile?: GoogleUserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleSubmitting(true);

    try {
      const res = await signInWithGoogle();
      const userIdentifier = res.user.email || res.user.name || 'Google User';
      
      if (rememberMe) {
        localStorage.setItem('crm_auth_user', userIdentifier);
        localStorage.setItem('crm_auth_provider', 'google');
      } else {
        sessionStorage.setItem('crm_auth_user', userIdentifier);
        sessionStorage.setItem('crm_auth_provider', 'google');
      }

      onLoginSuccess(userIdentifier, res.user);
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setError(err.message || 'Google sign-in was cancelled or encountered an error.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // Handle Credentials Sign-In
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // Verify credentials
    if (cleanUser === 'zuber0902' && cleanPass === 'zuber@0902@') {
      setTimeout(() => {
        setIsSubmitting(false);
        if (rememberMe) {
          localStorage.setItem('crm_auth_user', cleanUser);
          localStorage.setItem('crm_auth_provider', 'admin');
        } else {
          sessionStorage.setItem('crm_auth_user', cleanUser);
          sessionStorage.setItem('crm_auth_provider', 'admin');
        }
        onLoginSuccess(cleanUser);
      }, 400);
    } else {
      setTimeout(() => {
        setIsSubmitting(false);
        setError('Invalid username or password. Please verify your credentials.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }, 350);
    }
  };

  const handleFillDemo = () => {
    setUsername('zuber0902');
    setPassword('zuber@0902@');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#071324] text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Decorative luxury gradient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="px-6 sm:px-12 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA8010] flex items-center justify-center text-[#0B1B32] shadow-lg shadow-[#D4AF37]/20">
            <Building2 className="w-5 h-5 text-[#0B1B32]" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
              RealEstate <span className="text-[#D4AF37]">Easy CRM</span>
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Dubai Luxury Real Estate Edition
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Cloud Database & Google Sync</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div 
          className={`w-full max-w-md bg-[#0B1B32]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 relative transition-transform ${
            isShaking ? 'animate-bounce' : ''
          }`}
          style={{
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.08)'
          }}
        >
          {/* Subtle Top Gold Accent Line */}
          <div className="absolute top-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          {/* Card Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              Portal Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with Google to access your custom tables & data across any device
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Sign In with Google */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200 disabled:opacity-50"
            >
              {isGoogleSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  {/* Google Multi-Color SVG Logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Or Sign In with Admin Credentials
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (e.g. zuber0902)"
                  className="w-full bg-[#071324] border border-white/15 focus:border-[#D4AF37] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#071324] border border-white/15 focus:border-[#D4AF37] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Auto-Fill Hint */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-[#071324] text-[#D4AF37] focus:ring-0 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                title="Fill credentials for zuber0902"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Fill Admin</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA8010] hover:from-[#E5BF47] hover:to-[#B88C15] text-[#0B1B32] font-bold text-sm shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0B1B32] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Admin: <strong className="text-slate-200">zuber0902</strong></span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Supabase Synced
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-500 z-10 border-t border-white/5">
        <p>© 2026 RealEstate Easy CRM · Dubai Real Estate System · Cross-Device Sync Active</p>
      </footer>
    </div>
  );
};
