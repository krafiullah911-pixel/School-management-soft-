import React, { useState } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../../context/AuthContext';
import { GraduationCap, ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, School } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, schoolSettings } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'google' | 'email'>('google');

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setErrorMessage(
        err.message || 'Google sign-in was cancelled or encountered an error. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error('Email sign-in failed:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid email or password. Contact the Super Administrator to set up your staff credentials.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage('Email/Password provider is not yet enabled in the Firebase Console. Please use "Sign in with Google" or enable Email/Password in Firebase Auth.');
      } else {
        setErrorMessage(err.message || 'Failed to sign in. Please verify your internet and credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl text-slate-800 overflow-hidden border border-slate-100">
        {/* School Crest & Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-7 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-400/20 mb-3.5 ring-4 ring-white/10">
              <School className="w-9 h-9" />
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase leading-snug">
              Workers Model Higher Secondary School Pishin
            </h1>
            <p className="text-xs text-amber-300 font-semibold tracking-wide uppercase mt-1">
              Killi Haji Abdul Razzaq, Pishin, Balochistan
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              School Fee and Attendance Management System
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-7">
          {/* Auth Method Selector */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => setLoginMode('google')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginMode === 'google'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginMode === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Staff Email / Password
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loginMode === 'google' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed text-center">
                Sign in with your authorized school Google account to access your assigned role (Super Admin, Principal, Accounts, or Teacher).
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.3l3.7 2.9C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.6 6.3C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.2-6.7-5.2L1.6 16c1.9 3.7 5.8 7 10.4 7z"
                  />
                </svg>
                <span>{isSubmitting ? 'Authenticating...' : 'Sign in with Google'}</span>
              </button>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Initial Super Admin Notice</span>
                </p>
                <p className="text-amber-800">
                  Logging in with <span className="font-mono font-bold text-slate-900">{SUPER_ADMIN_EMAIL}</span> automatically activates the primary Super Administrator dashboard.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="staff@wmhsspishin.edu.pk"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Role Access Guide */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
            <p className="font-bold text-slate-700">Supported System Roles:</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>• <span className="font-semibold text-slate-700">Super Admin:</span> Full Control</div>
              <div>• <span className="font-semibold text-slate-700">Principal:</span> Dues & Reports</div>
              <div>• <span className="font-semibold text-slate-700">Accounts Staff:</span> Fee & Receipts</div>
              <div>• <span className="font-semibold text-slate-700">Teacher:</span> Daily Attendance</div>
            </div>
          </div>
        </div>

        <div className="px-7 py-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Workers Model Higher Secondary School Pishin &bull; Session 2024-2025
        </div>
      </div>
    </div>
  );
};
