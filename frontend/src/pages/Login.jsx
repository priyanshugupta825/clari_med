import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, ArrowRight, Lock, Mail, Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles, Loader2, Zap, UserCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('divyata@abdm.gov.in');
  const [password, setPassword] = useState('divyata123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, instantDemoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handle1ClickDemo = () => {
    instantDemoLogin('divyata@abdm.gov.in', 'Divyata Sharma', '91-4521-8890-4123');
    navigate(from, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-slate-50 to-sand-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-3xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/25 ring-8 ring-brand-100/60">
            <HeartPulse className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold text-brand-950 tracking-tight">
          Welcome to ClariMed
        </h2>
        <p className="mt-1.5 text-center text-xs sm:text-sm text-slate-500 font-medium max-w-xs mx-auto">
          Unified AI-powered Personal Health Record ecosystem for India's ABDM
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-xl shadow-slate-200/50 sm:rounded-3xl sm:px-9 border border-brand-100/80 space-y-5">
          
          {/* 1-Click Instant Demo Login Box (Divyata Sharma) */}
          <div className="p-4 bg-gradient-to-r from-brand-100/90 via-brand-50 to-indigo-50/80 border border-brand-200/90 rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                  DS
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-brand-950">Divyata Sharma</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ABDM Active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">ABHA: 91-4521-8890-4123</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handle1ClickDemo}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
              <span>1-Click Demo Login as Divyata &rarr;</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink-0 mx-3 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Or Sign in with credentials</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-brand-900 uppercase tracking-wider mb-1.5">
                Email Address / ABHA
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="divyata@abdm.gov.in"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-slate-50/40 focus:bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-brand-900 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-10 py-2.5 sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-slate-50/40 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm shadow-md shadow-brand-600/25 hover:shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Create Account Link */}
          <div className="text-center pt-1">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl border border-brand-200 bg-brand-50/50 hover:bg-brand-100/60 text-brand-900 font-semibold text-xs transition-colors"
            >
              Create a New Patient Account &rarr;
            </Link>
          </div>

          {/* Security Badge */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted with ABDM & DPDP Security Standards</span>
          </div>
        </div>
      </div>
    </div>
  );
};
