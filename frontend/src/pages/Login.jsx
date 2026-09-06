import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, ArrowRight, Lock, Mail, Sparkles, User, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('ravi.kumar@abdm.gov.in');
  const [password, setPassword] = useState('demo123456');
  const [loading, setLoading] = useState(false);
  const { instantDemoLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    // Normal seamless instant login
    const name = email.includes('ravi') 
      ? 'Ravi Kumar' 
      : email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Patient User';
    
    instantDemoLogin(email || 'ravi.kumar@abdm.gov.in', name, '91-4521-8890-4123');
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 150);
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-3xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-600/20">
            <HeartPulse className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-brand-950 tracking-tight">
          ClariMed
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Unified AI Health Record Ecosystem for ABDM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-brand-900/5 sm:rounded-3xl sm:px-10 border border-brand-100 space-y-6">
          
          {/* Active Demo Patient Profile Card */}
          <div className="p-4 bg-brand-50/80 border border-brand-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              RK
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-brand-950 truncate">Ravi Kumar</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-200/70 text-brand-900">ABDM Verified</span>
              </div>
              <p className="text-xs text-slate-500 font-mono">ABHA: 91-4521-8890-4123</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-brand-900 uppercase tracking-wider mb-1">
                Patient Email / ABHA ID
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-brand-400" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ravi.kumar@abdm.gov.in"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-brand-50/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-900 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-brand-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-brand-50/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-brand-200" />
              <span>{loading ? 'Entering Vault...' : 'Enter Health Vault'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            India's Digital Health Mission Platform (Creative Tinkers)
          </div>
        </div>
      </div>
    </div>
  );
};
